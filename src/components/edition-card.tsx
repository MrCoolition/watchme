"use client";

import { memo, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Archive, ArrowDownToLine, Check, Download, FileImage, FileJson, Layers3, LoaderCircle, Maximize2, Minus, Plus } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { WatchFace } from "@/components/watch-face";
import { drawEditionCard, editionFilename, editionPng, serializeWatchSvg } from "@/lib/edition-card";
import { getEditionPages, resolveEditionReferences, type EditionReference } from "@/lib/edition-details";
import { createEditionArchive, editionArchiveFilename } from "@/lib/edition-archive";
import { isFlagshipFamily } from "@/lib/presets";
import type { WatchDesign, WeatherData } from "@/lib/types";

export interface EditionCardDialogProps {
  design: WatchDesign; name: string; timezone?: string; secondaryTimezone?: string;
  lume: boolean; eclipse?: boolean; isDraft?: boolean; onClose: () => void;
  weather?: WeatherData; chronographElapsed?: number; chronographRunning?: boolean;
  lightPosition?: { x: number; y: number };
}
const ExportWatch = memo(WatchFace);
type ReadyCard = { canvas: HTMLCanvasElement; png?: Blob };
type EditionSnapshot = { watchSvg: string; capturedAt: string; timezone: string; secondaryTimezone: string };

export function EditionCardDialog(props: EditionCardDialogProps) {
  // Changed inputs start a fresh session; old pending work cannot replace the new edition.
  const key = JSON.stringify([props.design, props.name, props.timezone, props.secondaryTimezone, props.lume, props.eclipse, props.isDraft]);
  return <EditionCardSession key={key} {...props}/>;
}

function EditionCardSession({ design, name, timezone, secondaryTimezone, lume, eclipse = false, isDraft = false, weather, chronographElapsed = 0, chronographRunning = false, lightPosition, onClose }: EditionCardDialogProps) {
  // Live timer/weather updates behind the dialog must never change an edition already being composed.
  const [presentation] = useState(() => ({
    weather: weather ? { ...weather } : null, chronographElapsed, chronographRunning,
    lightPosition: lightPosition ? { ...lightPosition } : undefined,
  }));
  const pages = useMemo(() => getEditionPages(design), [design]);
  const tabsId = useId();
  const watchRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cards = useRef(new Map<string, ReadyCard>());
  const snapshot = useRef<EditionSnapshot | null>(null);
  const references = useRef<EditionReference[]>([]);
  const mounted = useRef(false);
  const downloadUrls = useRef(new Map<string, number>());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"png" | "zip" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("Preparing your complete edition…");
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fittedWidth, setFittedWidth] = useState(320);
  const selectedPage = pages[selectedIndex] || pages[0];
  const referenceCount = design.catalogReferences?.length || 0;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Already-clicked downloads retain their own 30-second cleanup timers after the dialog closes.
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setFittedWidth(Math.max(120, Math.min(width - 32, (height - 32) * 0.8)));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let secondFrame = 0;
    // WatchFace positions its hands after mount. Every card uses this one settled capture.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(async () => {
        try {
          if (!snapshot.current) {
            const svg = watchRef.current?.querySelector("svg");
            if (!svg) throw new Error("The watch preview is not ready. Please try again.");
            snapshot.current = {
              watchSvg: serializeWatchSvg(svg), capturedAt: new Date().toISOString(),
              timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
              secondaryTimezone: secondaryTimezone || "Europe/London",
            };
          }
          let resolvedReferences: EditionReference[] = [];
          if (referenceCount) {
            setMessage("Resolving your saved catalog references…");
            // Load the complete catalog only when this edition needs reference metadata.
            const catalog = await import("@/lib/watch-catalog");
            if (cancelled) return;
            resolvedReferences = resolveEditionReferences(design, catalog.WATCH_CATALOG_ENTRIES);
          }
          const rendered = new Map<string, ReadyCard>();
          for (const [index, page] of pages.entries()) {
            if (cancelled) return;
            setMessage(`Rendering ${page.label.toLowerCase()} · ${index + 1} of ${pages.length} cards…`);
            const canvas = document.createElement("canvas");
            await drawEditionCard(canvas, {
              design, name, lume, eclipse, isDraft, page, references: resolvedReferences,
              watchSvg: snapshot.current.watchSvg,
              timezone: snapshot.current.timezone, secondaryTimezone: snapshot.current.secondaryTimezone,
            });
            rendered.set(page.id, { canvas });
          }
          if (cancelled) return;
          cards.current = rendered; references.current = resolvedReferences;
          setError(null); setReady(true); setMessage("Made by you. Every detail, ready to keep.");
        } catch (cause) {
          if (cancelled) return;
          setError(cause instanceof Error ? cause.message : "Your complete edition could not be prepared. Please try again.");
          setMessage("The edition is not ready. Retry to prepare every card and reference.");
        }
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [design, name, timezone, secondaryTimezone, lume, eclipse, isDraft, pages, referenceCount, attempt]);

  useEffect(() => {
    if (!ready) return;
    const source = cards.current.get(selectedPage.id)?.canvas;
    const target = canvasRef.current;
    if (!source || !target) return;
    target.width = source.width; target.height = source.height;
    target.getContext("2d")?.drawImage(source, 0, 0);
  }, [ready, selectedPage.id]);

  function selectPage(index: number) {
    setSelectedIndex(index); setZoom(1);
    frameRef.current?.scrollTo({ left: 0, top: 0 });
  }
  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % pages.length : event.key === "ArrowLeft" ? (index - 1 + pages.length) % pages.length : event.key === "Home" ? 0 : event.key === "End" ? pages.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); selectPage(next); tabRefs.current[next]?.focus();
  }
  async function pngFor(pageId: string) {
    const card = cards.current.get(pageId);
    if (!card) throw new Error("This card is not ready. Please prepare the edition again.");
    card.png ??= await editionPng(card.canvas);
    return card.png;
  }
  function deliver(blob: Blob, filename: string) {
    if (!mounted.current) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    // Safari needs time to consume the object URL after the download click.
    const timer = window.setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.current.delete(url); }, 30_000);
    downloadUrls.current.set(url, timer);
  }
  async function downloadSelected() {
    if (!ready || busy) return;
    setBusy("png"); setError(null); setMessage(`Preparing ${selectedPage.label.toLowerCase()} PNG…`);
    try {
      const png = await pngFor(selectedPage.id);
      if (!mounted.current) return;
      deliver(png, editionFilename(name, design, selectedPage));
      setMessage("Download started. Your edition is ready to keep.");
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "The PNG download could not be started.");
    } finally { if (mounted.current) setBusy(null); }
  }
  async function downloadComplete() {
    if (!ready || busy || !snapshot.current) return;
    setBusy("zip"); setError(null);
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const [index, page] of pages.entries()) {
        if (!mounted.current) return;
        setMessage(`Packing ${page.label.toLowerCase()} · ${index + 1} of ${pages.length} cards…`);
        const png = await pngFor(page.id);
        files.push({ name: editionFilename(name, design, page), data: new Uint8Array(await png.arrayBuffer()) });
      }
      if (!mounted.current) return;
      const manifest = {
        format: "watchme-edition", version: 1, name, capturedAt: snapshot.current.capturedAt, isDraft,
        design, timezone: snapshot.current.timezone, secondaryTimezone: snapshot.current.secondaryTimezone,
        presentation: { lume, eclipse, ...presentation }, references: references.current,
        pages: pages.map(page => ({ ...page, filename: editionFilename(name, design, page) })),
      };
      files.push({ name: "design.json", data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
      deliver(createEditionArchive(files), editionArchiveFilename(name, design));
      setMessage(`Complete edition downloaded: ${pages.length} PNG cards and your design file.`);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "The complete edition could not be downloaded. Please try again.");
    } finally { if (mounted.current) setBusy(null); }
  }
  const pageDescription = selectedPage.kind === "portrait" ? "Your watch, captured in one moment. The finish, personal mark and design fingerprint are all here." : selectedPage.kind === "build" ? "Every selected part, color, function and seconds setting. A complete record of your design, including reference-only specifications." : "Your saved catalog inspiration and its original source. These references accompany your design.";

  return <Dialog title="Your edition card" eyebrow={isFlagshipFamily(design.family) ? "WATCHMÉ BLACK LABEL / COLLECTOR EDITION" : "WATCHMÉ / COLLECTOR EDITION"} onClose={onClose} wide notice={error ? { message: error, error: true } : null}>
    <div className="edition-workshop">
      <div className="edition-introduction"><p>Your design. Documented in full.</p><span>{isDraft ? "UNSAVED DRAFT" : "CURRENT DESIGN"}<i/>{pages.length} CARDS + DESIGN FILE</span></div>
      <div className="edition-page-tabs" role="tablist" aria-label="Edition pages">{pages.map((page, index) => <button key={page.id} ref={element => { tabRefs.current[index] = element; }} id={`${tabsId}-tab-${page.id}`} role="tab" aria-label={page.label} aria-selected={selectedPage.id === page.id} aria-controls={`${tabsId}-preview`} tabIndex={selectedPage.id === page.id ? 0 : -1} onClick={() => selectPage(index)} onKeyDown={event => navigateTabs(event, index)}><span>{String(index + 1).padStart(2, "0")}</span>{page.label}</button>)}</div>
      <div className="edition-workbench">
        <div className="edition-preview-area" role="tabpanel" id={`${tabsId}-preview`} aria-labelledby={`${tabsId}-tab-${selectedPage.id}`}>
          <div className="edition-preview-toolbar"><span>1080 × 1350 <i> / </i> PNG</span><div className="edition-zoom-controls" role="group" aria-label="Preview zoom"><button aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}><Minus size={15}/></button><button aria-label="Fit preview" onClick={() => { setZoom(1); frameRef.current?.scrollTo({ left: 0, top: 0 }); }}><Maximize2 size={13}/><span>{zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}</span></button><button aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}><Plus size={15}/></button></div></div>
          <div className="edition-preview-frame" ref={frameRef} aria-busy={!ready && !error} tabIndex={0} aria-label="Edition preview, scroll to explore when zoomed">
            <div className="edition-preview-content"><div className="edition-preview-sheet" style={{ width: fittedWidth * zoom }}><canvas ref={canvasRef} width={1080} height={1350} role="img" aria-label={`${name} edition card preview`} data-edition-page={selectedPage.id}/>{!ready && <div className="edition-render-overlay" aria-hidden="true">{error ? <FileImage size={30}/> : <LoaderCircle size={28} className="spin"/>}<span>{error ? "Ready when you are." : "Composing your edition…"}</span></div>}</div></div>
          </div>
        </div>
        <aside className="edition-collection-info">
          <div className="edition-page-note"><span className="eyebrow">CARD {String(selectedIndex + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}</span><h3>{selectedPage.label}</h3><p>{pageDescription}</p></div>
          <div className="edition-pack-contents"><span className="eyebrow">THE COMPLETE EDITION</span><div><FileImage size={16}/><span>{pages.length} PNG cards<small>Portrait, build sheet{referenceCount ? " & references" : ""}</small></span></div><div><FileJson size={16}/><span>Your complete design file<small>Parts, settings, time zones{referenceCount ? ` & ${referenceCount} references` : ""}</small></span></div><div><Layers3 size={16}/><span>One captured moment<small>Every card shares the same watch artwork</small></span></div></div>
          <div className="edition-download-actions">
            {error && !ready ? <button className="button-primary" onClick={() => { setError(null); setMessage("Preparing your complete edition…"); setAttempt(value => value + 1); }}><LoaderCircle size={16}/>Try again</button> : <>
              <button className="button-primary" aria-label="Download complete edition" disabled={!ready || Boolean(busy)} onClick={downloadComplete}>{busy === "zip" ? <LoaderCircle size={17} className="spin"/> : <Archive size={17}/>}<span>{busy === "zip" ? "Packing your edition…" : "Download complete edition"}<small>ALL CARDS + DESIGN.JSON / ZIP</small></span><ArrowDownToLine size={15}/></button>
              <button className="button-secondary" aria-label="Download PNG" disabled={!ready || Boolean(busy)} onClick={downloadSelected}>{busy === "png" ? <LoaderCircle size={16} className="spin"/> : <Download size={16}/>}Download PNG<span>THIS CARD</span></button>
            </>}
            <p className="edition-progress" role="status" aria-live="polite">{ready && !busy && !error && <Check size={13}/>}<span>{message}</span></p>
            <p className="edition-device-note">Created on this device. Yours to keep.</p>
          </div>
        </aside>
      </div>
    </div>
    <div className="edition-capture-source" aria-hidden="true" inert ref={watchRef}><ExportWatch design={design} timezone={timezone} secondaryTimezone={secondaryTimezone} lume={lume} eclipse={eclipse} weather={presentation.weather} chronographElapsed={presentation.chronographElapsed} chronographRunning={presentation.chronographRunning} lightPosition={presentation.lightPosition} live={false} framing="watch"/></div>
  </Dialog>;
}
