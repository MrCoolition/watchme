"use client";
import { useState } from "react";
import { ArrowRight, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, logout, recoverAccount, register } from "@/app/account-actions";
import { PassphraseField, RecoveryCodePanel } from "@/components/account-settings";
import { WatchFace } from "@/components/watch-face";
import { PRESETS } from "@/lib/presets";
const flagship = PRESETS.find(preset => preset.id === "reactor")!;
type EntranceMode = "signin" | "create" | "recover";
export function PrivateEntrance({ setupRequired = false, unavailable, authenticated = false }: { setupRequired?: boolean; unavailable?: string; authenticated?: boolean }) {
  const [mode, setMode] = useState<EntranceMode>("signin");
  const [username, setUsername] = useState(""); const [passphrase, setPassphrase] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [recoveryInput, setRecoveryInput] = useState(""); const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  function changeMode(next: EntranceMode) { setMode(next); setPassphrase(""); setConfirmation(""); setRecoveryInput(""); setError(""); }
  function enter() {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Account changes must discard all client and router state.
    window.location.assign("/");
  }
  async function switchAccount() {
    setBusy(true); setError("");
    try {
      await logout();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Signing out must unmount all state from the previous account.
      window.location.assign("/login");
    }
    catch { setError("Couldn’t sign out. Please try again."); setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (mode !== "signin" && passphrase !== confirmation) { setError("Your passphrases don’t match."); return; }
    setBusy(true);
    try {
      if (mode === "signin") {
        const result = await login({ username, passphrase });
        if (!result.ok) setError(result.error);
        else { setPassphrase(""); enter(); }
      } else if (mode === "create") {
        const result = await register({ username, passphrase });
        if (!result.ok) setError(result.error);
        else { setUsername(result.data.account.username); setPassphrase(""); setConfirmation(""); setIssuedCode(result.data.recoveryCode); }
      } else {
        const result = await recoverAccount({ username, recoveryCode: recoveryInput, passphrase });
        if (!result.ok) setError(result.error);
        else { setPassphrase(""); setConfirmation(""); setRecoveryInput(""); setIssuedCode(result.data.recoveryCode); }
      }
    } catch { setError("We couldn’t complete that request. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className={`private-entrance ${mode !== "signin" || issuedCode ? "entrance-expanded" : ""}`} id="main-content"><div className="entrance-left">{issuedCode ? <span className="wordmark entrance-brand">WATCHMÉ<span className="wordmark-dot">●</span></span> : <Link className="wordmark entrance-brand" href="/">WATCHMÉ<span className="wordmark-dot">●</span></Link>}<div className="entrance-content"><span className="eyebrow"><span className="status-dot"/> YOUR PRIVATE COLLECTION</span><h1>Your time.<br/><span>Your signature.</span></h1><p className="entrance-description">Extraordinary watches.<br/>An entirely personal point of view.</p>
    {setupRequired ? <div className="entrance-notice"><LockKeyhole size={20}/><div><h2>Your studio is almost ready.</h2><p>Private access is being set up. Once it’s ready, your collection will be waiting right here.</p></div></div> : unavailable ? <div className="entrance-notice"><ShieldCheck size={20}/><div><h2>Your collection is taking a moment.</h2><p>{unavailable}</p><button className="text-button" onClick={() => router.refresh()}>Try again <ArrowRight size={15}/></button></div></div> : issuedCode ? <RecoveryCodePanel code={issuedCode} username={username} onAcknowledge={enter}/> : authenticated ? <div className="entrance-signed-in"><ShieldCheck size={23}/><h2>Your collection is ready.</h2><p>You’re signed in on this device.</p><button className="button-primary" type="button" onClick={enter}>Enter the studio<ArrowRight size={17}/></button><button className="text-button" type="button" onClick={() => void switchAccount()} disabled={busy}>{busy ? <LoaderCircle size={15} className="spin"/> : <UserRound size={15}/>}Use another account</button>{error && <p className="inline-error" role="alert">{error}</p>}</div> : <>
      <div className="entrance-modes" role="group" aria-label="Collection access">{([["signin", "Sign in"], ["create", "Create collection"], ["recover", "Recover access"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} disabled={busy} onClick={() => changeMode(value)}>{label}</button>)}</div>
      <form className="entrance-form account-entrance-form" onSubmit={submit} aria-label={mode === "signin" ? "Sign in" : mode === "create" ? "Create collection" : "Recover access"}>
        {mode !== "signin" && <p className="entrance-mode-note">{mode === "create" ? "A collection of your own. Choose a username and a memorable passphrase." : "Use your username and recovery code to choose a new passphrase."}</p>}
        <label className="account-field" htmlFor="account-username"><span>Username</span><span className="username-field"><UserRound size={16}/><input id="account-username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={event => setUsername(event.target.value.toLowerCase())} placeholder="yourname" pattern="[a-z0-9_]{3,24}" minLength={3} maxLength={24} required disabled={busy}/></span></label>
        {mode === "create" && <p className="account-field-note">3–24 lowercase letters, numbers or underscores.</p>}
        {mode === "recover" && <label className="account-field" htmlFor="account-recovery"><span>Recovery code</span><span className="username-field"><KeyRound size={16}/><input id="account-recovery" name="recovery-code" autoComplete="off" autoCapitalize="none" spellCheck={false} value={recoveryInput} onChange={event => setRecoveryInput(event.target.value)} required maxLength={256} disabled={busy}/></span></label>}
        <PassphraseField key={`${mode}-passphrase`} label={mode === "recover" ? "New passphrase" : "Passphrase"} value={passphrase} onChange={setPassphrase} autoComplete={mode === "signin" ? "current-password" : "new-password"} minimum={mode === "signin" ? 1 : 15} disabled={busy}/>
        {mode !== "signin" && <><PassphraseField key={`${mode}-confirm`} label={mode === "recover" ? "Confirm new passphrase" : "Confirm passphrase"} value={confirmation} onChange={setConfirmation} disabled={busy}/><p className="account-field-note">At least 15 characters. Spaces are welcome.</p></>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="submit" className="button-primary" disabled={busy || username.length < 3 || !passphrase || mode !== "signin" && (passphrase.length < 15 || !confirmation)}>{busy ? <LoaderCircle size={17} className="spin"/> : mode === "signin" ? "Enter the studio" : mode === "create" ? "Create my collection" : "Reset passphrase"}<ArrowRight size={17}/></button>
        {mode === "signin" ? <p className="entrance-owner-help">Existing collection? Sign in as <strong>coolition</strong> with your current passphrase.</p> : <p className="entrance-recovery-help">{mode === "create" ? "You’ll receive a recovery code to save before entering your studio." : "Your existing recovery code will be replaced. Save the new one before entering your studio."}</p>}
        <span className="entrance-security"><ShieldCheck size={13}/> Your collection. Your account.</span>
      </form>
    </>}
    </div><footer className="entrance-footer">THE ART OF MAKING TIME YOURS.</footer></div><div className="entrance-art"><div className="entrance-art-top"><span className="eyebrow">BLACK LABEL</span><span className="edition-index">07 <span>/ {String(PRESETS.length).padStart(2, "0")}</span></span></div><div className="entrance-watch"><WatchFace design={flagship.design} timezone="America/New_York" live/></div><div className="entrance-art-caption"><div><span className="eyebrow">MECHANICAL CHRONOGRAPH</span><h2>REACTOR.</h2></div><span className="entrance-reference">WM—007<br/>WATCHMÉ BLACK LABEL</span></div></div></main>;
}
