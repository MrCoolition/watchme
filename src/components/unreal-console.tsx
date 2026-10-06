"use client";

import { memo, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Minus, Moon, Redo2, Snowflake, Undo2, Waves } from "lucide-react";
import { WatchFace } from "@/components/watch-face";
import { normalizeDesign } from "@/lib/presets";
import { getAtmosphere, isUnrealTexture } from "@/lib/unreal";
import type { Atmosphere, WatchDesign, WeatherData } from "@/lib/types";

const AtmospherePreview = memo(WatchFace);
const ATMOSPHERE_COLORS = [
  { name: "Polar", value: "#9BE7FF" }, { name: "Mint", value: "#99F5CE" },
  { name: "Violet", value: "#C6A7FF" }, { name: "Ember", value: "#FFB68A" }, { name: "Rose", value: "#FFA7D0" },
];

export function UnrealConsole({ design, name, timezone, secondaryTimezone, lume, weather, chronographElapsed, chronographRunning, dirty, canUndo, canRedo, onChange, onUndo, onRedo, onSave, onClose }: {
  design: WatchDesign; name: string; timezone: string; secondaryTimezone: string; lume: boolean;
  weather?: WeatherData; chronographElapsed: number; chronographRunning: boolean;
  dirty: boolean; canUndo: boolean; canRedo: boolean; onChange: (design: WatchDesign) => void;
  onUndo: () => void; onRedo: () => void; onSave: () => void; onClose: () => void;
}) {
  const atmosphere = getAtmosphere(design);
  const liquid = design.texture === "liquid";
  const active = isUnrealTexture(design.texture);
  const update = <K extends keyof Atmosphere>(key: K, value: Atmosphere[K]) => onChange(normalizeDesign({ ...design, atmosphere: { ...atmosphere, [key]: value } }));
  return <div className="unreal-console" style={{ "--atmosphere-color": atmosphere.color } as CSSProperties}>
    <div className="unreal-console-preview">
      <div className="unreal-preview-label"><span>UNREAL / LIVE ATMOSPHERE</span><i className={atmosphere.calm ? "is-calm" : ""}/></div>
      <div className="unreal-preview-watch"><AtmospherePreview design={design} timezone={timezone} secondaryTimezone={secondaryTimezone} lume={lume} weather={weather} chronographElapsed={chronographElapsed} chronographRunning={chronographRunning} framing="face" live/></div>
      <div className="unreal-preview-caption"><h3>{name}</h3><p>{!active ? "Choose liquid or snow to bring the atmosphere back." : liquid ? "Touch the dial. Disturb the surface." : "Touch the dial. Stir the snowfall."}</p><span>DRAG HORIZONTALLY · OR USE ARROW KEYS</span></div>
      <div className="unreal-history"><button className="icon-button" aria-label="Undo change" disabled={!canUndo} onClick={onUndo}><Undo2 size={16}/></button><span>{dirty ? "Draft saved on this device" : "Your world, your pace"}</span><button className="icon-button" aria-label="Redo change" disabled={!canRedo} onClick={onRedo}><Redo2 size={16}/></button></div>
    </div>
    <div className="unreal-console-controls">
      <div className="unreal-medium" role="group" aria-label="Atmosphere material"><button aria-label="Liquid atmosphere" aria-pressed={design.texture === "liquid"} onClick={() => onChange(normalizeDesign({ ...design, texture: "liquid" }))}><Waves size={18}/><span>Liquid<small>A living surface</small></span></button><button aria-label="Snow atmosphere" aria-pressed={design.texture === "snow"} onClick={() => onChange(normalizeDesign({ ...design, texture: "snow" }))}><Snowflake size={18}/><span>Snow<small>A private winter</small></span></button></div>
      <label className="atmosphere-range"><span>Intensity<strong>{Math.round(atmosphere.intensity)}<small>%</small></strong></span><input type="range" min={0} max={100} step={1} aria-label="Atmosphere intensity" value={atmosphere.intensity} onChange={event => update("intensity", Number(event.target.value))}/><small>{liquid ? "From quiet ripples to restless motion." : "From a gentle drift to a swirling storm."}</small></label>
      <label className="atmosphere-range"><span>Density<strong>{Math.round(atmosphere.density)}<small>%</small></strong></span><input type="range" min={0} max={100} step={1} aria-label="Atmosphere density" value={atmosphere.density} onChange={event => update("density", Number(event.target.value))}/><small>{liquid ? "Choose how many droplets float over the surface." : "Choose how much snow fills your world."}</small></label>
      <div className="atmosphere-color"><label>Atmosphere color<input type="color" aria-label="Atmosphere color" value={atmosphere.color} onChange={event => update("color", event.target.value)}/><span>{atmosphere.color.toUpperCase()}</span></label><div role="group" aria-label="Atmosphere color palette">{ATMOSPHERE_COLORS.map(color => <button key={color.value} title={color.name} aria-label={`${color.name} atmosphere`} aria-pressed={atmosphere.color.toLowerCase() === color.value.toLowerCase()} style={{ background: color.value }} onClick={() => update("color", color.value)}>{atmosphere.color.toLowerCase() === color.value.toLowerCase() && <Check size={14}/>}</button>)}</div></div>
      <div className="atmosphere-gravity"><label className="select-label">Gravity<select aria-label="Atmosphere gravity" value={atmosphere.gravity} onChange={event => update("gravity", event.target.value as Atmosphere["gravity"])}><option value="down">Down — let it fall</option><option value="float">Float — suspend the moment</option><option value="up">Up — defy gravity</option></select></label><span aria-hidden="true">{atmosphere.gravity === "down" ? <ArrowDown size={18}/> : atmosphere.gravity === "up" ? <ArrowUp size={18}/> : <Minus size={18}/>}</span></div>
      <button className={`atmosphere-calm ${atmosphere.calm ? "is-active" : ""}`} aria-label="Calm mode" aria-pressed={atmosphere.calm} onClick={() => update("calm", !atmosphere.calm)}><Moon size={18}/><span><strong>Calm mode</strong><small>Still until you touch it. Your motion preferences are respected.</small></span><i>{atmosphere.calm ? "ON" : "OFF"}</i></button>
      <div className="unreal-save"><button className="button-primary" aria-label="Save creation" onClick={onSave}><Check size={16}/><span>Save creation</span><ArrowUpRight size={15}/></button><button className="text-button" onClick={onClose}>Back to my watch</button><p>Every atmosphere setting stays in your draft. Save to keep it in your collection.</p></div>
    </div>
  </div>;
}
