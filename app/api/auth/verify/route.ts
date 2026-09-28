import { verifyProofPayload, consumeNonce, createUserSession } from "../../../lib/userAuth";
import { ключАдреса, проверитьПодпись, человекочитаемый } from "../../../lib/ton/proof";
import { upsertUserLogin } from "../../../lib/users";
import { parseJson, verifyRequestSchema } from "../../../lib/validation";

export const dynamic = "force-dynamic";

/**
 * Домены, с которых принимается подпись. Домен входит в подписанные кошельком
 * байты, поэтому подпись со стороннего сайта здесь бесполезна — но только если
 * мы действительно сверяем домен, а не принимаем любой.
 *
 * Список берётся из окружения, чтобы предпросмотр на своём поддомене тоже мог
 * пускать внутрь. Пусто — только боевой домен.
 */
function допустимыеДомены(): string[] {
  const свои = (process.env.TON_AUTH_DOMAINS ?? "")
    .split(",")
    .map((д) => д.trim())
    .filter(Boolean);
  return ["doffa.coffee", "www.doffa.coffee", ...свои];
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, verifyRequestSchema);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const body = parsed.data;

  // 1. Наш ли это код и не просрочен ли он.
  const код = verifyProofPayload(body.proof.payload);
  if (!код) return Response.json({ error: "Код устарел, попробуй войти заново" }, { status: 401 });

  // 2. Подпись: домен, время, код и сама ed25519-подпись.
  //
  // Причину отказа наружу не отдаём. «Домен не тот» и «подпись не совпала» —
  // разные подсказки для того, кто подбирает; человеку же обе означают одно:
  // войти не получилось, попробуй ещё раз.
  const подпись = проверитьПодпись(
    { address: body.address, publicKey: body.publicKey, proof: body.proof },
    { домены: допустимыеДомены(), код: body.proof.payload },
  );
  if (!подпись.ok) {
    console.warn("auth/verify: подпись отклонена —", подпись.причина);
    return Response.json({ error: "Подпись не подошла, попробуй войти заново" }, { status: 401 });
  }

  // 3. Ключ обязан управлять этим адресом. Без этой проверки подпись доказывает
  // только владение каким-то ключом — и любой мог бы назваться чужим адресом.
  //
  // Сеть не ответила — вход заканчивается отказом. Пропустить человека, не
  // сумев проверить, это не осторожность, а дыра.
  const сетевойКлюч = await ключАдреса(body.address);
  if (!сетевойКлюч) {
    return Response.json(
      { error: "Не удалось сверить кошелёк с сетью. Попробуй ещё раз через минуту." },
      { status: 503 },
    );
  }
  if (сетевойКлюч !== body.publicKey.trim().toLowerCase()) {
    console.warn("auth/verify: ключ не управляет адресом");
    return Response.json({ error: "Подпись не подошла, попробуй войти заново" }, { status: 401 });
  }

  try {
    // 4. Одноразовость: код, уже потраченный, — это повтор.
    const свежий = await consumeNonce(код.nonce, код.exp);
    if (!свежий) return Response.json({ error: "Код уже использован, войди заново" }, { status: 401 });

    // Ключом в базе служит сырой адрес: человекочитаемых форм у одного адреса
    // несколько (EQ и UQ), и сравнивать по ним значит однажды не узнать
    // вернувшегося человека.
    const адрес = `${подпись.raw.workchain}:${подпись.raw.hash.toString("hex")}`;
    const user = await upsertUserLogin(адрес);
    await createUserSession(адрес, request.headers.get("user-agent") ?? undefined);
    return Response.json({
      ok: true,
      user: { ...user, friendly: человекочитаемый(подпись.raw) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 503 });
  }
}
