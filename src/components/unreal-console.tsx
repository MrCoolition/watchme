"use client";

import { memo, useId, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Building2, Check, Gift, Minus, Moon, Mountain, Orbit, Redo2, Sparkles, Trees, Undo2 } from "lucide-react";
import { WatchFace } from "@/components/watch-face";
import { normalizeDesign } from "@/lib/presets";
import { getAtmosphere, isUnrealTexture, WHITEOUT_SCENES } from "@/lib/unreal";
import type { Atmosphere, WatchDesign, WeatherData, WhiteoutScene } from "@/lib/types";

const AtmospherePreview = memo(WatchFace);
const ATMOSPHERE_COLORS = [
  { name: "Polar", value: "#9BE7FF" }, { name: "Mint", value: "#99F5CE" },
  { name: "Violet", value: "#C6A7FF" }, { name: "Ember", value: "#FFB68A" }, { name: "Rose", value: "#FFA7D0" },
];

const SCENE_ICONS = { glacier: Mountain, forest: Trees, city: Building2, christmas: Gift, aurora: Sparkles, observatory: Orbit };

const SceneArtwork = memo(function SceneArtwork({ scene, color }: { scene: WhiteoutScene; color: string }) {
  const prefix = useId().replace(/:/g, "");
  const glow = `${prefix}-sky`, snow = `${prefix}-snow`;
  return <svg viewBox="0 0 220 96" aria-hidden="true" focusable="false" className="whiteout-scene-art">
    <defs><radialGradient id={glow} cx=".68" cy=".1" r=".95"><stop stopColor={color} stopOpacity=".29"/><stop offset="1" stopColor="#08111B"/></radialGradient><linearGradient id={snow} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#DDEDF0"/><stop offset="1" stopColor={color} stopOpacity=".24"/></linearGradient></defs>
    <rect width="220" height="96" fill={`url(#${glow})`}/>
    {scene === "glacier" && <><path d="M0 79L46 22L76 51L126 12L183 74L211 47L232 86Z" fill="#254453"/><path d="M46 22L76 51L61 46L52 53L47 39L37 47L31 42ZM126 12L159 48L140 42L132 48L123 30L114 40L101 39Z" fill="#D4EFF4"/><path d="M-8 89L59 62L92 75L132 57L181 84L220 65V96H0Z" fill={`url(#${snow})`} opacity=".5"/><path d="M117 37L108 63L118 57L111 81M49 40L58 67" fill="none" stroke={color} strokeOpacity=".65"/></>}
    {scene === "forest" && <><circle cx="167" cy="24" r="12" fill="#DEF3E6" opacity=".8"/>{[12, 44, 78, 120, 153, 189, 218].map((x, index) => { const y = 18 + index % 3 * 10; return <g key={x}><path d={`M${x} ${y}l-15 26h8l-14 21h10l-12 17h47l-12-17h9l-14-21h8Z`} fill={index % 2 ? "#183A39" : "#0B2528"}/><path d={`M${x} ${y}l-9 16h8l-6 12h13l-6-12h9Z`} fill="#ACD2C7" opacity=".75"/></g>; })}<path d="M0 86Q62 72 117 86T220 82V96H0Z" fill={`url(#${snow})`} opacity=".55"/></>}
    {scene === "city" && <><path d="M0 94V48H17V27H39V44H57V16H75V41H84V61H102V31H124V18H147V51H164V37H188V57H205V29H220V96Z" fill="#142538"/><path d="M57 16H75M124 18H147M17 27H39M205 29H220" stroke="#DAEDF1" strokeWidth="2"/>{[22, 32, 61, 71, 108, 117, 130, 141, 171, 181, 211].map((x, index) => <g key={x} fill={index % 3 ? "#F5C393" : "#89B6D1"} opacity=".65">{[45, 58, 71].map(y => <rect key={y} x={x} y={y} width="3" height="5" rx=".5"/>)}</g>)}<path d="M0 91H220" stroke="#E9F4F8" strokeWidth="2"/><path d="M77 90Q112 77 159 89" fill="none" stroke={color} strokeOpacity=".25" strokeWidth="3"/></>}
    {scene === "christmas" && <><circle cx="174" cy="24" r="10" fill="#FFF0C9" opacity=".9"/><path d="M0 85Q76 66 112 82T220 77V96H0Z" fill={`url(#${snow})`} opacity=".65"/><path d="M75 83V59L98 41L124 59V83Z" fill="#5B3C38"/><path d="M71 61L98 38L128 61" fill="none" stroke="#E9ECDA" strokeWidth="4"/><rect x="95" y="63" width="12" height="14" rx="1" fill="#FFCD7A"/><path d="M161 29L145 49H152L140 67H148L136 84H186L174 67H182L168 49H176Z" fill="#154B40"/><path d="M147 50L171 57L146 67L177 78" fill="none" stroke="#F3D080" strokeWidth="1.2"/>{[[156, 45], [171, 57], [146, 67], [175, 78], [157, 77]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill={i % 2 ? "#ED7778" : "#FFE8A6"}/>)}<path d="M161 19L163 24L169 25L164 28L165 34L161 30L157 34L158 28L153 25L159 24Z" fill="#FFE6A0"/></>}
    {scene === "aurora" && <><path d="M-10 53Q42-9 106 31T234 7" fill="none" stroke={color} strokeOpacity=".12" strokeWidth="34"/><path d="M-10 50Q42-12 106 28T234 4" fill="none" stroke={color} strokeOpacity=".34" strokeWidth="14"/><path d="M-10 44Q42-18 106 22T234-2" fill="none" stroke="#C2F9E7" strokeOpacity=".6" strokeWidth="2"/><path d="M4 42Q58 16 105 42T234 22" fill="none" stroke="#B495E9" strokeOpacity=".2" strokeWidth="11"/><path d="M0 89L37 62L69 79L112 54L150 79L187 64L220 88V96H0Z" fill="#173443"/><path d="M112 54L133 70L118 67L111 61L103 69L91 69Z" fill="#A7D3D9"/></>}
    {scene === "observatory" && <><circle cx="173" cy="25" r="10" fill="#E7DCFC" opacity=".8"/><ellipse cx="173" cy="25" rx="19" ry="4" transform="rotate(-24 173 25)" fill="none" stroke={color} strokeWidth="1.2"/><path d="M18 39L54 25L79 38L102 16" fill="none" stroke="#CED6FF" strokeOpacity=".27" strokeWidth=".6"/>{[[18, 39], [54, 25], [79, 38], [102, 16]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#EDEAFF"/>)}<path d="M0 96L43 83L73 90L120 74L175 91L220 79V96Z" fill={`url(#${snow})`} opacity=".5"/><path d="M84 85V65Q87 44 108 43Q128 43 133 65V85Z" fill="#354555"/><path d="M82 66H135" stroke="#C9DDE9" strokeWidth="3"/><path d="M106 44Q100 53 102 65" stroke="#BBCEDC" strokeWidth="3" fill="none"/><path d="M110 43L105 27L123 21L129 37Z" fill="#71869B"/><path d="M106 27L124 21" stroke="#DCEBF8" strokeWidth="2"/></>}
    {Array.from({ length: 18 }, (_, index) => <circle key={index} cx={(index * 47 + 13) % 220} cy={(index * 29 + 7) % 88} r={index % 3 ? ".7" : "1.25"} fill="#EEF9FF" opacity={index % 3 ? ".38" : ".75"}/>)}
  </svg>;
});

export function UnrealConsole({ design, name, timezone, secondaryTimezone, lume, weather, chronographElapsed, chronographRunning, dirty, canUndo, canRedo, onChange, onUndo, onRedo, onSave, onClose }: {
  design: WatchDesign; name: string; timezone: string; secondaryTimezone: string; lume: boolean;
  weather?: WeatherData; chronographElapsed: number; chronographRunning: boolean;
  dirty: boolean; canUndo: boolean; canRedo: boolean; onChange: (design: WatchDesign) => void;
  onUndo: () => void; onRedo: () => void; onSave: () => void; onClose: () => void;
}) {
  const atmosphere = getAtmosphere(design);
  const active = isUnrealTexture(design.texture);
  const currentScene = WHITEOUT_SCENES.find(scene => scene.id === atmosphere.scene) || WHITEOUT_SCENES[0];
  const update = <K extends keyof Atmosphere>(key: K, value: Atmosphere[K]) => onChange(normalizeDesign({ ...design, atmosphere: { ...atmosphere, [key]: value } }));
  return <div className="unreal-console" style={{ "--atmosphere-color": atmosphere.color } as CSSProperties}>
    <div className="unreal-console-preview">
      <div className="unreal-preview-label"><span>WHITEOUT / {currentScene.name.toUpperCase()}</span><i className={atmosphere.calm ? "is-calm" : ""}/></div>
      <div className="unreal-preview-watch"><AtmospherePreview design={design} timezone={timezone} secondaryTimezone={secondaryTimezone} lume={lume} weather={weather} chronographElapsed={chronographElapsed} chronographRunning={chronographRunning} framing="face" live/></div>
      <div className="unreal-preview-caption"><h3>{name}</h3><p>{!active ? "Choose a scene to step back into winter." : "Touch the dial. Stir the snowfall."}</p><span>DRAG HORIZONTALLY · OR USE ARROW KEYS</span></div>
      <div className="unreal-history"><button className="icon-button" aria-label="Undo change" disabled={!canUndo} onClick={onUndo}><Undo2 size={16}/></button><span>{dirty ? "Draft saved on this device" : "Your world, your pace"}</span><button className="icon-button" aria-label="Redo change" disabled={!canRedo} onClick={onRedo}><Redo2 size={16}/></button></div>
    </div>
    <div className="unreal-console-controls">
      <section className="whiteout-worlds" aria-label="WHITEOUT scenes"><div className="whiteout-worlds-heading"><span>CHOOSE YOUR WORLD</span><span>06 SCENES</span></div><div className="whiteout-scene-grid" role="group" aria-label="Snow scene">{WHITEOUT_SCENES.map(scene => { const Icon = SCENE_ICONS[scene.id]; return <button type="button" key={scene.id} data-whiteout-scene={scene.id} aria-label={`${scene.name} scene`} aria-pressed={active && atmosphere.scene === scene.id} className="whiteout-scene-card" style={{ "--scene-color": scene.color } as CSSProperties} onClick={() => onChange(normalizeDesign({ ...design, texture: "snow", atmosphere: { ...atmosphere, scene: scene.id } }))}><SceneArtwork scene={scene.id} color={scene.color}/><span className="whiteout-scene-heading"><Icon size={14}/><strong>{scene.name}</strong><i>{active && atmosphere.scene === scene.id ? <Check size={13}/> : <ArrowUpRight size={12}/>}</i></span><span className="whiteout-scene-description">{scene.description}</span></button>; })}</div><p className="whiteout-scene-current" aria-live="polite">{active ? `${currentScene.name} is your current world.` : "Select a scene to add snowfall to this watch."}</p></section>
      <label className="atmosphere-range"><span>Intensity<strong>{Math.round(atmosphere.intensity)}<small>%</small></strong></span><input type="range" min={0} max={100} step={1} aria-label="Atmosphere intensity" value={atmosphere.intensity} onChange={event => update("intensity", Number(event.target.value))}/><small>From a gentle drift to a swirling storm.</small></label>
      <label className="atmosphere-range"><span>Density<strong>{Math.round(atmosphere.density)}<small>%</small></strong></span><input type="range" min={0} max={100} step={1} aria-label="Atmosphere density" value={atmosphere.density} onChange={event => update("density", Number(event.target.value))}/><small>Choose how much snow fills your world.</small></label>
      <div className="atmosphere-color"><label>Atmosphere color<input type="color" aria-label="Atmosphere color" value={atmosphere.color} onChange={event => update("color", event.target.value)}/><span>{atmosphere.color.toUpperCase()}</span></label><div role="group" aria-label="Atmosphere color palette">{ATMOSPHERE_COLORS.map(color => <button key={color.value} title={color.name} aria-label={`${color.name} atmosphere`} aria-pressed={atmosphere.color.toLowerCase() === color.value.toLowerCase()} style={{ background: color.value }} onClick={() => update("color", color.value)}>{atmosphere.color.toLowerCase() === color.value.toLowerCase() && <Check size={14}/>}</button>)}</div></div>
      <div className="atmosphere-gravity"><label className="select-label">Gravity<select aria-label="Atmosphere gravity" value={atmosphere.gravity} onChange={event => update("gravity", event.target.value as Atmosphere["gravity"])}><option value="down">Down — let it fall</option><option value="float">Float — suspend the moment</option><option value="up">Up — defy gravity</option></select></label><span aria-hidden="true">{atmosphere.gravity === "down" ? <ArrowDown size={18}/> : atmosphere.gravity === "up" ? <ArrowUp size={18}/> : <Minus size={18}/>}</span></div>
      <button className={`atmosphere-calm ${atmosphere.calm ? "is-active" : ""}`} aria-label="Calm mode" aria-pressed={atmosphere.calm} onClick={() => update("calm", !atmosphere.calm)}><Moon size={18}/><span><strong>Calm mode</strong><small>Still until you touch it. Your motion preferences are respected.</small></span><i>{atmosphere.calm ? "ON" : "OFF"}</i></button>
      <div className="unreal-save"><button className="button-primary" aria-label="Save creation" onClick={onSave}><Check size={16}/><span>Save creation</span><ArrowUpRight size={15}/></button><button className="text-button" onClick={onClose}>Back to my watch</button><p>Every atmosphere setting stays in your draft. Save to keep it in your collection.</p></div>
    </div>
  </div>;
}
