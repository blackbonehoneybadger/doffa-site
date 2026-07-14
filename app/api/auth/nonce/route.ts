import { issueNonce } from "../../../lib/userAuth";
import { parseJson, nonceRequestSchema } from "../../../lib/validation";

export async function POST(request: Request) {
  const parsed = await parseJson(request, nonceRequestSchema);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { message, token } = issueNonce(parsed.data.wallet);
  return Response.json({ message, token });
}
