"use client";
import { memo, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, CircleDot, Sparkles, Watch } from "lucide-react";
import { ATELIER_LOOKS, applyAtelierLook } from "@/lib/atelier";
import type { WatchDesign } from "@/lib/types";
import type { WatchFraming } from "@/hooks/use-display-preferences";
import { WatchFace } from "@/components/watch-face";
const Face = memo(WatchFace);

export function FramingControls({ framing, onChange }: { framing: WatchFraming; onChange: (framing: WatchFraming) => void }) {
  return <div className="framing-controls" role="group" aria-label="Watch presentation"><button aria-label="Face only" aria-pressed={framing === "face"} onClick={() => onChange("face")}><CircleDot size={15}/><span>Face only</span></button><button aria-label="Full watch" aria-pressed={framing === "watch"} onClick={() => onChange("watch")}><Watch size={15}/><span>Full watch</span></button></div>;
}

export function CompanionTime({ timezone, className = "", compact = false }: { timezone: string; className?: string; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(new Date());
    const visible = () => { clearInterval(interval); if (!document.hidden) { tick(); interval = setInterval(tick, 1000); } };
    visible(); document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, []);
  const zone = timezone || "UTC";
  const time = now ? new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now) : "—:—";
  const seconds = now ? new Intl.DateTimeFormat("en-US", { timeZone: zone, second: "2-digit" }).format(now).padStart(2, "0") : "—";
  const date = now ? new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(now) : "YOUR TIME, FRONT & CENTER";
  return <div className={`companion-time ${compact ? "is-compact" : ""} ${className}`}><time dateTime={now?.toISOString()}>{time}<span>{seconds}</span></time><p><span>{date}</span><i/><span>{(zone.split("/").at(-1) || zone).replaceAll("_", " ")}</span></p></div>;
}

export function AtelierLooks({ design, timezone, onApply }: { design: WatchDesign; timezone: string; onApply: (id: string) => void }) {
  const previews = useMemo(() => ATELIER_LOOKS.map(look => ({ look, preview: applyAtelierLook(design, look.id) })), [design]);
  return <div className="atelier-panel"><div className="atelier-intro"><span className="eyebrow"><Sparkles size={13}/> THE ATELIER</span><h3>Good taste.<br/>Wild possibilities.</h3><p>Six fully considered looks. One tap to make a statement.</p></div><div className="atelier-looks">{previews.map(({ look, preview }) => {
    const selected = Object.entries(look.parts).every(([key, value]) => design[key as keyof WatchDesign] === value);
    return <button key={look.id} className={`atelier-look ${selected ? "is-selected" : ""}`} aria-label={`Apply ${look.name} look`} aria-pressed={selected} onClick={() => onApply(look.id)} style={{ "--look-color": look.color } as CSSProperties}><div className="atelier-preview"><Face design={preview} timezone={timezone || "UTC"} live={false} framing="face"/></div><div className="atelier-look-copy"><strong>{look.name}</strong><span>{look.description}</span></div><span className="atelier-look-action">{selected ? <Check size={13}/> : <ArrowUpRight size={13}/>}</span></button>;
  })}</div><p className="atelier-footnote">Your case, functions and signature stay yours. Every look is a starting point.</p></div>;
}
