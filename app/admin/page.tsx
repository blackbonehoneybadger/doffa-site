import { isAuthed } from "../lib/adminAuth";
import { reportServerError } from "../lib/serverError";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let authed = false;
  try {
    authed = await isAuthed();
  } catch (error) {
    reportServerError("admin page session read failed", error);
  }
  return <AdminClient initialAuthed={authed} />;
}
