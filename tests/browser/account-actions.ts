// UI fixture doubles. Authentication is verified separately against real Next.js + Neon.
import type { ActionResult } from "../../src/lib/types";
export async function logout(): Promise<void> { location.reload(); }
export async function changePassphrase(): Promise<ActionResult<null>> { return { ok: true, data: null }; }
export async function regenerateRecoveryCode(): Promise<ActionResult<{ recoveryCode: string }>> {
  return { ok: true, data: { recoveryCode: "fixture-only-recovery-code" } };
}
