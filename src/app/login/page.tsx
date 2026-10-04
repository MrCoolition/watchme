import { redirect } from "next/navigation";
import { getAuthStatus } from "@/lib/auth";
import { PrivateEntrance } from "@/components/private-entrance";
export const dynamic = "force-dynamic";
export default async function LoginPage() { const status = await getAuthStatus(); if (status === "authenticated") redirect("/"); return <PrivateEntrance setupRequired={status === "setup-required"}/>; }
