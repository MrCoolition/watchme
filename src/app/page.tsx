import { redirect } from "next/navigation";
import { getAuthStatus } from "@/lib/auth";
import { loadStudio } from "@/app/actions";
import { WatchStudio } from "@/components/watch-studio";
import { PrivateEntrance } from "@/components/private-entrance";
export const dynamic = "force-dynamic";
export default async function Home() {
  const status = await getAuthStatus();
  if (status === "setup-required") return <PrivateEntrance setupRequired/>;
  if (status !== "authenticated") redirect("/login");
  const studio = await loadStudio();
  if (!studio.ok) return <PrivateEntrance unavailable={studio.error}/>;
  return <WatchStudio initialData={studio.data}/>;
}
