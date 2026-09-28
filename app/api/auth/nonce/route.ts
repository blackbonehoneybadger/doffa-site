import { issueProofPayload } from "../../../lib/userAuth";

// Код входа не зависит от кошелька: какой адрес подключит человек, решается
// уже в кошельке. Поэтому тело запроса здесь не читается вовсе — читать было
// бы нечего, а лишнее поле в запросе только создаёт видимость проверки.
export const dynamic = "force-dynamic";

export async function POST() {
  const { payload, exp } = issueProofPayload();
  return Response.json({ payload, exp });
}
