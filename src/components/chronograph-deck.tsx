"use client";
import { Flag, Pause, Play, RotateCcw } from "lucide-react";
import { formatDuration } from "@/lib/timers";
import type { useTimers } from "@/hooks/use-timers";

export function ChronographDeck({ timers, onLapHistory, immersive = false }: { timers: ReturnType<typeof useTimers>; onLapHistory: () => void; immersive?: boolean }) {
  const running = timers.state.chronograph.startedAt !== null;
  const action = running ? "Pause" : timers.elapsed > 0 ? "Resume" : "Start";
  const laps = timers.state.chronograph.laps;
  return <section className={`chronograph-deck ${immersive ? "is-immersive" : ""}`} aria-label="Chronograph controls"><div className="chrono-deck-readout"><span className="chrono-deck-label"><i className={running ? "is-running" : ""}/>CHRONOGRAPH</span><output aria-label="Chronograph elapsed">{formatDuration(timers.elapsed, true)}</output><button className="chrono-lap-history" aria-label="Lap history" onClick={onLapHistory}>{laps.length ? `LAP ${String(laps.length).padStart(2, "0")} · ${formatDuration(laps[laps.length - 1], true)}` : "Lap history"}</button></div><div className="chrono-deck-buttons"><button className="chrono-primary" aria-label={`${action} chronograph`} onClick={timers.chronoToggle}>{running ? <Pause size={16}/> : <Play size={16}/>}<span>{action}</span></button><button aria-label="Record lap" title="Record lap" disabled={!running} onClick={timers.lap}><Flag size={17}/><span>Lap</span></button><button aria-label="Reset chronograph" title="Reset chronograph" onClick={timers.chronoReset}><RotateCcw size={17}/><span>Reset</span></button></div></section>;
}
