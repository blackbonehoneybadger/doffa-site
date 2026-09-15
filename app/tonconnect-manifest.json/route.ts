// Манифест TON Connect. Кошелёк читает его перед подключением и показывает
// человеку, к какому сайту он подключается.
//
// Почему маршрут, а не файл в public/. В манифесте обязано стоять то самое
// происхождение, с которого открыт сайт. Статический файл пришлось бы прибить
// гвоздями к боевому домену — и тогда любой предпросмотр ветки показывал бы
// кошельку чужой адрес. Здесь адрес берётся из самого запроса.

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  // За прокси Vercel настоящий домен приезжает в заголовке; без него берём
  // адрес запроса. Подставлять сюда что-то своё нельзя: кошелёк сверит.
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;
  return Response.json(
    {
      url: origin,
      name: "DOFFA",
      iconUrl: `${origin}/brand/doffa-logo.jpeg`,
      termsOfUseUrl: `${origin}/legal/payments`,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
