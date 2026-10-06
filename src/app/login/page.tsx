import { getAuthStatus } from "@/lib/auth";
import { PrivateEntrance } from "@/components/private-entrance";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  let status: Awaited<ReturnType<typeof getAuthStatus>>;
  try { status = await getAuthStatus(); }
  catch { return <PrivateEntrance unavailable="Access is temporarily unavailable. Please try again in a moment."/>; }
  return <PrivateEntrance authenticated={status === "authenticated"} setupRequired={status === "setup-required"}/>;
}
