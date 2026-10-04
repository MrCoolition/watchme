"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Bookmark, Check, ChevronLeft, ChevronRight, ExternalLink, Layers3, LoaderCircle, Search, Sparkles, Volume2, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { WatchFace } from "@/components/watch-face";
import { MAX_CATALOG_REFERENCES, normalizeDesign } from "@/lib/presets";
import type { CatalogAction, CatalogEntry } from "@/lib/watch-catalog";
import type { WatchDesign, WeatherData } from "@/lib/types";

type CatalogModule = typeof import("@/lib/watch-catalog");
type CatalogView = "entries" | "references" | "terms";
type SupportFilter = "all" | "apply" | "reference";
const PAGE_SIZE = 36;
const EMPTY_REFERENCES: string[] = [];
const CatalogWatchPreview = memo(WatchFace);

function supportLabel(action: CatalogAction) {
  return action.kind === "appearance" ? "Appearance" : action.kind === "complication" ? "Working function" : action.kind === "tool" ? "Studio tool" : "Reference";
}
function safeSourceUrl(value?: string) {
  if (!value) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export function WatchCatalog({ design, name, timezone, secondaryTimezone, lume, weather, onChange, onClose, onTool }: {
  design: WatchDesign;
  name: string;
  timezone: string;
  secondaryTimezone: string;
  lume: boolean;
  weather?: WeatherData;
  onChange: (design: WatchDesign) => void;
  onClose: () => void;
  onTool: (tool: "instruments" | "settings") => void;
}) {
  const [catalog, setCatalog] = useState<CatalogModule | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [view, setView] = useState<CatalogView>("entries");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [support, setSupport] = useState<SupportFilter>("all");
  const [availability, setAvailability] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const references = design.catalogReferences || EMPTY_REFERENCES;

  useEffect(() => {
    let active = true;
    // Keep the entire workbook out of the initial watch bundle.
    import("@/lib/watch-catalog").then(module => { if (active) setCatalog(module); }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [attempt]);

  const indexedEntries = useMemo(() => catalog?.WATCH_CATALOG_ENTRIES.map(entry => ({
    entry, action: catalog.getCatalogAction(entry),
    search: [entry.option, entry.category, entry.subcategory, entry.description, entry.notes, entry.availability].filter(Boolean).join(" ").toLocaleLowerCase(),
  })) || [], [catalog]);
  const subcategories = useMemo(() => [...new Set(indexedEntries.filter(({ entry }) => !category || entry.category === category).map(({ entry }) => entry.subcategory))], [indexedEntries, category]);
  const availabilities = useMemo(() => [...new Set(indexedEntries.map(({ entry }) => entry.availability))], [indexedEntries]);
  const searchWords = useMemo(() => deferredQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), [deferredQuery]);
  const results = useMemo(() => indexedEntries.filter(({ entry, action, search }) => {
    return (view !== "references" || references.includes(entry.id))
      && (!category || entry.category === category)
      && (!subcategory || entry.subcategory === subcategory)
      && (!availability || entry.availability === availability)
      && (support === "all" || (support === "reference" ? action.kind === "reference" : action.kind !== "reference"))
      && searchWords.every(word => search.includes(word));
  }), [indexedEntries, view, references, category, subcategory, availability, support, searchWords]);
  const terms = useMemo(() => catalog?.WATCH_CATALOG_TERMS.filter(term => searchWords.every(word => `${term.term} ${term.meaning}`.toLocaleLowerCase().includes(word))) || [], [catalog, searchWords]);
  const resultCount = view === "terms" ? terms.length : results.length;
  const pageCount = Math.max(1, Math.ceil(resultCount / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const selected = indexedEntries.find(({ entry }) => entry.id === selectedId) || null;
  const sourceUrl = safeSourceUrl(selected?.entry.sourceUrl);
  const saved = selected ? references.includes(selected.entry.id) : false;

  function resetPage() { setPage(0); setSelectedId(null); setNotice(null); }
  function changeView(next: CatalogView) { setView(next); setCategory(""); setSubcategory(""); setSupport("all"); setAvailability(""); resetPage(); }
  function clearFilters() { setQuery(""); setCategory(""); setSubcategory(""); setAvailability(""); setSupport("all"); resetPage(); }
  function speakTime() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) { setNotice({ message: "Spoken time is unavailable in this browser.", error: true }); return; }
    const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone || undefined }).format(new Date());
    const utterance = new SpeechSynthesisUtterance(`The time is ${time}.`);
    utterance.lang = "en-US";
    utterance.onerror = event => { if (event.error !== "interrupted" && event.error !== "canceled") setNotice({ message: "This browser could not speak the time. Please try again.", error: true }); };
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
    setNotice({ message: `Speaking the current time: ${time}.` });
  }
  function applyEntry(entry: CatalogEntry) {
    if (!catalog) return;
    const action = catalog.getCatalogAction(entry);
    if (action.kind === "reference") return;
    if (action.kind === "tool") { if (action.tool === "speak") speakTime(); else onTool(action.tool); return; }
    const result = catalog.applyCatalogOption(design, entry);
    if (!result.design) { setNotice({ message: result.error || "This option does not fit the current design.", error: true }); return; }
    onChange(result.design);
    setNotice({ message: `${action.label} applied. Save your watch to keep this design.` });
  }
  function toggleReference(entry: CatalogEntry) {
    const alreadySaved = references.includes(entry.id);
    if (!alreadySaved && references.length >= MAX_CATALOG_REFERENCES) { setNotice({ message: `This watch already has ${MAX_CATALOG_REFERENCES} references. Remove one to save another.`, error: true }); return; }
    onChange(normalizeDesign({ ...design, catalogReferences: alreadySaved ? references.filter(id => id !== entry.id) : [...references, entry.id] }));
    setNotice({ message: alreadySaved ? "Reference removed from this design." : "Reference attached to this design. Save your watch to keep it." });
    if (alreadySaved && view === "references") setSelectedId(null);
  }

  return <Dialog title="The parts library." eyebrow="WATCHMÉ / THE COMPLETE CATALOG" onClose={onClose} wide>
    <div className={`watch-catalog ${selected ? "has-selection" : ""}`}>
      {!catalog ? <div className="catalog-loading">{loadError ? <><BookOpen size={32}/><h3>The catalog could not load.</h3><p>Your watch and draft are still here.</p><button className="button-secondary" onClick={() => { setLoadError(false); setAttempt(value => value + 1); }}>Try again</button></> : <><LoaderCircle size={28} className="spin"/><p>Opening the parts library…</p></>}</div> : <>
        <div className="catalog-toolbar">
          <div className="catalog-view-tabs" role="group" aria-label="Catalog view">
            <button aria-pressed={view === "entries"} onClick={() => changeView("entries")}><Layers3 size={14}/>All entries<span>{catalog.WATCH_CATALOG_ENTRIES.length.toLocaleString()}</span></button>
            <button aria-pressed={view === "references"} onClick={() => changeView("references")}><Bookmark size={14}/>Saved references<span>{references.length}</span></button>
            <button aria-pressed={view === "terms"} onClick={() => changeView("terms")}><BookOpen size={14}/>Watch terms<span>{catalog.WATCH_CATALOG_TERMS.length}</span></button>
          </div>
          <label className="catalog-search"><Search size={18}/><input autoFocus type="search" aria-label="Search catalog" placeholder={view === "terms" ? "Look up a watchmaking term…" : "A material, a complication, an idea…"} value={query} maxLength={180} onChange={event => { setQuery(event.target.value); resetPage(); }}/>{query && <button aria-label="Clear catalog search" onClick={() => { setQuery(""); resetPage(); }}><X size={16}/></button>}</label>
          {view !== "terms" && <div className="catalog-filters">
            <label><span>Category</span><select aria-label="Catalog category" value={category} onChange={event => { setCategory(event.target.value); setSubcategory(""); resetPage(); }}><option value="">Every category</option>{catalog.CATALOG_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
            <label><span>Subcategory</span><select aria-label="Catalog subcategory" value={subcategory} onChange={event => { setSubcategory(event.target.value); resetPage(); }}><option value="">Every subcategory</option>{subcategories.map(value => <option key={value}>{value}</option>)}</select></label>
            <label><span>Availability</span><select aria-label="Catalog availability" value={availability} onChange={event => { setAvailability(event.target.value); resetPage(); }}><option value="">Any availability</option>{availabilities.map(value => <option key={value}>{value}</option>)}</select></label>
            <div className="catalog-support" role="group" aria-label="App support">{([['all', 'All'], ['apply', 'Apply now'], ['reference', 'Reference']] as const).map(([value, label]) => <button key={value} aria-pressed={support === value} onClick={() => { setSupport(value); resetPage(); }}>{label}</button>)}</div>
          </div>}
        </div>
        <div className="catalog-results-header"><p role="status">{resultCount.toLocaleString()} {view === "terms" ? "terms" : "entries"}{view === "references" ? " in this design" : " to explore"}</p><button className="text-button" onClick={clearFilters}>Reset filters</button></div>
        {view === "terms" ? <div className="catalog-terms">{terms.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(term => <article key={`${term.sourceRow}-${term.term}`}><span>THE WATCHMAKER’S LANGUAGE</span><h3>{term.term}</h3><p>{term.meaning}</p></article>)}{!terms.length && <div className="catalog-empty"><BookOpen size={26}/><h3>No matching terms.</h3><p>Try a broader word or clear your search.</p></div>}</div> : <div className="catalog-body">
          <div className="catalog-list" aria-label="Catalog results">
            {results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(({ entry, action }) => <button key={entry.id} className={`catalog-entry ${selectedId === entry.id ? "is-selected" : ""}`} aria-label={`View ${entry.option}`} aria-pressed={selectedId === entry.id} onClick={() => { setSelectedId(entry.id); setNotice(null); }}><span className="catalog-entry-category">{entry.category}<i> / </i>{entry.subcategory}</span><strong>{entry.option}</strong><span className={`catalog-support-badge ${action.kind}`}>{action.kind === "reference" ? <BookOpen size={11}/> : <Sparkles size={11}/>} {supportLabel(action)}</span>{references.includes(entry.id) && <Bookmark className="catalog-entry-bookmark" size={13} fill="currentColor"/>}<ArrowUpRight className="catalog-entry-arrow" size={15}/></button>)}
            {!results.length && <div className="catalog-empty"><Search size={26}/><h3>{view === "references" && !references.length ? "Keep your inspiration close." : "No matching parts."}</h3><p>{view === "references" && !references.length ? "Save a catalog reference to attach it to this watch." : "Try a different search or loosen the filters."}</p><button className="text-button" onClick={view === "references" && !references.length ? () => changeView("entries") : clearFilters}>Explore the catalog<ArrowRight size={15}/></button></div>}
          </div>
          <aside className="catalog-detail" aria-label="Catalog entry details">
            <button className="catalog-back text-button" onClick={() => { setSelectedId(null); setNotice(null); }}><ArrowLeft size={16}/>Back to results</button>
            <div className="catalog-watch-preview"><CatalogWatchPreview design={design} timezone={timezone} secondaryTimezone={secondaryTimezone} framing="face" live={false} lume={lume} weather={weather}/><span>{name}<small>YOUR CURRENT DESIGN</small></span></div>
            {selected ? <>
              <div className="catalog-detail-heading"><span>{selected.entry.category} / {selected.entry.subcategory}</span><h3>{selected.entry.option}</h3><span className={`catalog-support-badge ${selected.action.kind}`}>{supportLabel(selected.action)}</span></div>
              <p className="catalog-description">{selected.entry.description}</p>
              <dl className="catalog-metadata"><div><dt>Availability</dt><dd>{selected.entry.availability}</dd></div><div><dt>Source</dt><dd>{typeof selected.entry.sourceRow === "number" ? `${catalog.WATCH_CATALOG_SOURCE.catalogSheet} · row ${selected.entry.sourceRow}` : selected.entry.sourceLabel || "Supplemental specification"}</dd></div></dl>
              {selected.entry.notes && <div className="catalog-notes"><h4>From the catalog</h4><p>{selected.entry.notes}</p></div>}
              {selected.action.kind === "reference" && <p className="catalog-reference-note"><BookOpen size={14}/><span>{selected.action.reason}</span></p>}
              {sourceUrl && <a className="catalog-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">Read the original source<ExternalLink size={13}/></a>}
              <div className="catalog-detail-actions">
                {notice && <p className={notice.error ? "inline-error" : "catalog-success"} role={notice.error ? "alert" : "status"}>{!notice.error && <Check size={14}/>}<span>{notice.message}</span></p>}
                {selected.action.kind !== "reference" && <button className="button-primary" aria-label="Apply catalog option" onClick={() => applyEntry(selected.entry)}>{selected.action.kind === "tool" && selected.action.tool === "speak" ? <Volume2 size={16}/> : <Sparkles size={16}/>}<span>{selected.action.label}</span></button>}
                <button className="button-secondary" aria-label={saved ? "Remove catalog reference" : "Save catalog reference"} aria-pressed={saved} disabled={!saved && references.length >= MAX_CATALOG_REFERENCES} onClick={() => toggleReference(selected.entry)}><Bookmark size={15} fill={saved ? "currentColor" : "none"}/>{saved ? "Remove reference" : "Save reference"}<span>{references.length}/{MAX_CATALOG_REFERENCES}</span></button>
                <button className="text-button catalog-return" onClick={onClose}>Back to my watch<ArrowUpRight size={14}/></button>
              </div>
            </> : <div className="catalog-detail-empty"><Sparkles size={22}/><h3>Build a point of view.</h3><p>Explore the complete catalog. Apply a working option or save a reference to your design.</p><span>Changes stay in your draft until you save the watch.</span></div>}
          </aside>
        </div>}
        <footer className="catalog-footer"><span title={catalog.WATCH_CATALOG_SOURCE.filename}>{catalog.WATCH_CATALOG_SOURCE.entryCount.toLocaleString()} workbook entries · {catalog.WATCH_CATALOG_SUPPLEMENT.length} added specifications</span><nav aria-label="Catalog pagination"><button aria-label="Previous catalog page" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelectedId(null); }}><ChevronLeft size={18}/></button><span>{currentPage + 1} <i>/</i> {pageCount}</span><button aria-label="Next catalog page" disabled={currentPage + 1 >= pageCount} onClick={() => { setPage(currentPage + 1); setSelectedId(null); }}><ChevronRight size={18}/></button></nav></footer>
      </>}
    </div>
  </Dialog>;
}
