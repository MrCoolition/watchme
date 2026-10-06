import { redirect } from "next/navigation";
import { getAuthStatus } from "@/lib/auth";
import { loadStudio } from "@/app/actions";
import { WatchStudio } from "@/components/watch-studio";
import { PrivateEntrance } from "@/components/private-entrance";
export const dynamic = "force-dynamic";
export default async function Home() {
  let status: Awaited<ReturnType<typeof getAuthStatus>>;
  try { status = await getAuthStatus(); }
  catch { return <PrivateEntrance unavailable="Access is temporarily unavailable. Please try again in a moment."/>; }
  if (status === "setup-required") return <PrivateEntrance setupRequired/>;
  if (status !== "authenticated") redirect("/login");
  const studio = await loadStudio();
  if (!studio.ok) return <PrivateEntrance unavailable={studio.error}/>;
  return <WatchStudio key={studio.data.account.id} initialData={studio.data}/>;
}
