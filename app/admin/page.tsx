import { isAuthed } from "../lib/adminAuth";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAuthed();
  return <AdminClient initialAuthed={authed} />;
}
