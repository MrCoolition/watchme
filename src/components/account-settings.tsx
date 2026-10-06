"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, Copy, Download, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { changePassphrase, regenerateRecoveryCode } from "@/app/account-actions";
import type { AccountSummary } from "@/lib/types";

export function PassphraseField({ label, value, onChange, autoComplete = "new-password", minimum = 15, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void;
  autoComplete?: "current-password" | "new-password"; minimum?: number; disabled?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <label className="account-field" htmlFor={id}><span>{label}</span><span className="password-field"><LockKeyhole size={16}/><input id={id} name={label.toLowerCase().replaceAll(" ", "-")} type={visible ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} minLength={minimum} maxLength={1024} required disabled={disabled}/><button className="icon-button" type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} onClick={() => setVisible(!visible)} disabled={disabled}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>;
}

/** Recovery material exists only in component memory and an explicit user download. */
export function RecoveryCodePanel({ code, username, onAcknowledge, destination = "studio" }: {
  code: string; username: string; onAcknowledge: () => void; destination?: "studio" | "account";
}) {
  const [copyStatus, setCopyStatus] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopyStatus("Recovery code copied."); }
    catch { setCopyStatus("Copy isn’t available here. Select the code or download it instead."); }
  }
  function download() {
    const body = `WATCHMÉ recovery code\n\nUsername: ${username}\nRecovery code: ${code}\n\nKeep this code somewhere private, such as your password manager.\nUse it with your username to reset your passphrase.\nA replacement recovery code makes this one invalid.\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `watchme-${username}-recovery-code.txt`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="recovery-code-panel" aria-labelledby="recovery-code-heading">
    <div className="recovery-code-icon"><KeyRound size={23}/></div><span className="eyebrow">KEEP THIS SOMEWHERE PRIVATE</span><h2 id="recovery-code-heading">Your way back in.</h2>
    <p>This is the only time this recovery code will be shown. Save it in your password manager or download a private copy.</p>
    <div className="recovery-code-box"><span>{username}</span><code aria-label="Recovery code" data-recovery-code>{code}</code></div>
    <div className="recovery-code-actions"><button type="button" className="button-secondary" onClick={() => void copy()}><Copy size={15}/>Copy recovery code</button><button type="button" className="button-secondary" onClick={download}><Download size={15}/>Download recovery code</button></div>
    {copyStatus && <p className="recovery-copy-status" role="status">{copyStatus}</p>}
    <p className="recovery-code-note">There’s no email recovery. If you lose both your passphrase and this code, you won’t be able to recover your collection.</p>
    <button type="button" className="button-primary recovery-acknowledge" onClick={onAcknowledge}><Check size={16}/><span>I’ve saved my recovery code</span><ArrowRight size={16}/></button><small>{destination === "studio" ? "Continue to your collection." : "Return to account settings."}</small>
  </section>;
}

export function AccountSettings({ account, onRecoveryCreated, onLock, onRecoveryVisibilityChange, onPreferences }: {
  account: AccountSummary; onRecoveryCreated: () => void; onLock: () => void; onPreferences: () => void;
  onRecoveryVisibilityChange?: (visible: boolean) => void;
}) {
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [recoveryPassphrase, setRecoveryPassphrase] = useState(""); const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"passphrase" | "recovery" | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function change(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (next !== confirmation) { setError("Your new passphrases don’t match."); return; }
    setBusy("passphrase");
    try {
      const result = await changePassphrase({ currentPassphrase: current, passphrase: next }, account.id);
      if (!result.ok) setError(result.error);
      else { setCurrent(""); setNext(""); setConfirmation(""); setMessage("Passphrase updated. You’re still signed in on this device."); }
    } catch { setError("Couldn’t update your passphrase. Please try again."); }
    finally { setBusy(null); }
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setBusy("recovery");
    try {
      const result = await regenerateRecoveryCode({ passphrase: recoveryPassphrase }, account.id);
      if (!result.ok) setError(result.error);
      else { setCurrent(""); setNext(""); setConfirmation(""); setRecoveryPassphrase(""); setRecoveryCode(result.data.recoveryCode); onRecoveryVisibilityChange?.(true); onRecoveryCreated(); }
    } catch { setError("Couldn’t create a recovery code. Please try again."); }
    finally { setBusy(null); }
  }
  if (recoveryCode) return <RecoveryCodePanel code={recoveryCode} username={account.username} destination="account" onAcknowledge={() => { setRecoveryCode(null); onRecoveryVisibilityChange?.(false); setMessage("Your replacement recovery code is ready. Keep it private."); }}/>;
  return <div className="account-settings">
    <div className="account-identity"><span>{account.username.slice(0, 2).toUpperCase()}</span><div><strong>{account.username}</strong><small>Your personal collection</small></div><ShieldCheck size={20}/></div>
    <button type="button" className="account-preferences-link" onClick={onPreferences}>Collection preferences<ArrowRight size={15}/></button>
    {!account.hasRecoveryCode && <div className="account-recovery-prompt"><KeyRound size={19}/><div><strong>Give yourself a way back in.</strong><p>Create a recovery code below so you can reset a forgotten passphrase.</p></div></div>}
    {error && <p className="inline-error" role="alert">{error}</p>}{message && <p className="account-success" role="status"><Check size={15}/>{message}</p>}
    <form className="account-security-form" onSubmit={change}><div className="account-section-heading"><span>01</span><h3>Change passphrase</h3></div><PassphraseField label="Current passphrase" value={current} onChange={setCurrent} autoComplete="current-password" minimum={1} disabled={busy !== null}/><PassphraseField label="New passphrase" value={next} onChange={setNext} disabled={busy !== null}/><PassphraseField label="Confirm new passphrase" value={confirmation} onChange={setConfirmation} disabled={busy !== null}/><p className="account-field-note">At least 15 characters. Spaces are welcome.</p><button className="button-primary" type="submit" disabled={busy !== null || !current || next.length < 15 || !confirmation}>{busy === "passphrase" ? <LoaderCircle size={16} className="spin"/> : <LockKeyhole size={16}/>}Update passphrase</button></form>
    <form className="account-security-form" onSubmit={generate}><div className="account-section-heading"><span>02</span><h3>Recovery code</h3></div><p className="account-explanation">{account.hasRecoveryCode ? "Generate a replacement if your code is lost or no longer private. Your previous code will stop working." : "Your recovery code can reset a forgotten passphrase. It’s shown once, with no email required."}</p><PassphraseField label="Passphrase to generate recovery code" value={recoveryPassphrase} onChange={setRecoveryPassphrase} autoComplete="current-password" minimum={1} disabled={busy !== null}/><button className="button-secondary" type="submit" disabled={busy !== null || !recoveryPassphrase}>{busy === "recovery" ? <LoaderCircle size={16} className="spin"/> : <KeyRound size={16}/>}Generate recovery code</button></form>
    <div className="account-lock"><button type="button" className="text-button" disabled={busy !== null} onClick={onLock}><LockKeyhole size={15}/>Lock the studio</button><span>Your saved watches stay in your account.</span></div>
  </div>;
}
