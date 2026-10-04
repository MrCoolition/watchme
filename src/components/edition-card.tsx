"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { WatchFace } from "@/components/watch-face";
import { drawEditionCard, editionFilename, editionPng, serializeWatchSvg } from "@/lib/edition-card";
import type { WatchDesign } from "@/lib/types";

export interface EditionCardDialogProps {
  design: WatchDesign;
  name: string;
  timezone?: string;
  secondaryTimezone?: string;
  lume: boolean;
  eclipse?: boolean;
  isDraft?: boolean;
  onClose: () => void;
}

export function EditionCardDialog({ design, name, timezone, secondaryTimezone, lume, eclipse = false, isDraft = false, onClose }: EditionCardDialogProps) {
  const watchRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const downloadUrls = useRef(new Set<string>());
  const [status, setStatus] = useState<"rendering" | "ready" | "downloading" | "downloaded" | "error">("rendering");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let secondFrame = 0;
    // WatchFace sets its timestamp-derived hands in a mount effect. Capture after paint.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(async () => {
        const svg = watchRef.current?.querySelector("svg");
        const canvas = canvasRef.current;
        if (!svg || !canvas) return;
        try {
          await drawEditionCard(canvas, { design, name, lume, eclipse, watchSvg: serializeWatchSvg(svg) });
          if (!cancelled) { setError(null); setStatus("ready"); }
        } catch (cause) {
          if (!cancelled) { setError(cause instanceof Error ? cause.message : "The edition card could not be rendered."); setStatus("error"); }
        }
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [design, name, timezone, secondaryTimezone, lume, eclipse, attempt]);

  useEffect(() => {
    const urls = downloadUrls.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); };
  }, []);

  async function download() {
    if (!canvasRef.current || status === "rendering" || status === "downloading" || status === "error") return;
    setStatus("downloading"); setError(null);
    try {
      const png = await editionPng(canvasRef.current);
      const url = URL.createObjectURL(png);
      downloadUrls.current.add(url);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = editionFilename(name, design);
      document.body.append(anchor); anchor.click(); anchor.remove();
      // Keep the URL alive long enough for Safari to consume the download.
      window.setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.current.delete(url); }, 30_000);
      setStatus("downloaded");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The PNG download could not be started."); setStatus("ready");
    }
  }

  return <Dialog title="Your edition card" eyebrow={design.family === "reactor" ? "WATCHMÉ BLACK LABEL" : "THE PRIVATE STUDIO"} onClose={onClose} wide notice={error ? { message: error, error: true } : null}>
    <p className="muted" style={{ fontSize: 12, lineHeight: 1.65, marginBottom: 18 }}>A keepsake of {isDraft ? "your current draft" : "your current design"}, exactly as previewed. Your finish, personal mark and design fingerprint travel with it.</p>
    <div style={{ position: "relative", maxWidth: 380, margin: "0 auto", background: "#080b0d", border: "1px solid #64727755", borderRadius: 3, overflow: "hidden", aspectRatio: "4 / 5" }} aria-busy={status === "rendering"}>
      <canvas ref={canvasRef} width={1080} height={1350} role="img" aria-label={`${name} edition card preview`} style={{ display: "block", width: "100%", height: "auto" }} />
      {status === "rendering" && <div role="status" style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", justifyItems: "center", gap: 16, color: "#B7C9C1", fontSize: 12 }}><LoaderCircle size={24} />Rendering your edition…</div>}
    </div>
    <div aria-hidden="true" inert ref={watchRef} style={{ position: "fixed", left: -10000, top: 0, width: 640, height: 720, pointerEvents: "none", opacity: 0 }}>
      <WatchFace design={design} timezone={timezone} secondaryTimezone={secondaryTimezone} lume={lume} eclipse={eclipse} live={false} framing="watch" />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 14, fontSize: 10, letterSpacing: ".03em", color: "#96A68C" }}><span>1080 × 1350 · PNG</span><span>{isDraft ? "UNSAVED DRAFT" : "CURRENT DESIGN"} · CREATED ON THIS DEVICE</span></div>
    <p role="status" aria-live="polite" style={{ fontSize: 11, color: "#B7C9A7", minHeight: 18, marginTop: 12 }}>{status === "downloaded" ? "Download started. Your edition is ready to keep." : "Made by you. Ready for your camera roll."}</p>
    <div className="dialog-actions" style={{ flexWrap: "wrap", marginTop: 16 }}>
      {status === "error" ? <button className="button-primary" onClick={() => { setStatus("rendering"); setError(null); setAttempt(value => value + 1); }}>Try again</button> : <button className="button-primary" disabled={status === "rendering" || status === "downloading"} onClick={download}>{status === "downloading" ? <LoaderCircle size={16} /> : <Download size={16} />}{status === "downloading" ? "Preparing PNG…" : "Download PNG"}</button>}
    </div>
  </Dialog>;
}
