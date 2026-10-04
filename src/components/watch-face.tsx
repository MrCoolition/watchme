"use client";

import { useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";
import type { WatchDesign, WeatherData } from "@/lib/types";
import { getClockParts, getHandAngles } from "@/lib/time";

export interface WatchFaceProps {
  design: WatchDesign;
  timezone?: string;
  secondaryTimezone?: string;
  lume?: boolean;
  live?: boolean;
  chronographElapsed?: number;
  weather?: WeatherData | null;
  className?: string;
}

const MATERIALS = {
  steel: { light: "#F1F3F1", mid: "#919B9D", dark: "#343C40", deep: "#171E21", face: "#D4DCDA" },
  titanium: { light: "#E1E6E7", mid: "#7F8D97", dark: "#3E4B55", deep: "#18232D", face: "#B5C1C8" },
  gold: { light: "#FFE6A3", mid: "#B69752", dark: "#675127", deep: "#302710", face: "#E8CB87" },
  rose: { light: "#FFE0CE", mid: "#BF907A", dark: "#754C3E", deep: "#36211F", face: "#EFC0A6" },
  graphite: { light: "#8F989B", mid: "#4A535B", dark: "#24292F", deep: "#101317", face: "#BEC6CA" },
};

function shade(hex: string, multiplier: number) {
  return `#${[1, 3, 5].map((offset) => Math.min(255, Math.round(parseInt(hex.slice(offset, offset + 2), 16) * multiplier)).toString(16).padStart(2, "0")).join("")}`;
}

function casePath(shape: WatchDesign["caseShape"]) {
  if (shape === "octagonal") return "M220 132 H420 L538 250 V450 L420 568 H220 L102 450 V250 Z";
  if (shape === "cushion") return "M198 133 Q320 110 442 133 Q526 149 545 225 Q565 350 545 475 Q526 551 442 567 Q320 590 198 567 Q114 551 95 475 Q75 350 95 225 Q114 149 198 133Z";
  if (shape === "tonneau") return "M191 119 Q320 94 449 119 Q489 125 505 168 Q551 350 505 532 Q489 575 449 581 Q320 606 191 581 Q151 575 135 532 Q89 350 135 168 Q151 125 191 119Z";
  return "M320 130 A220 220 0 1 1 319.99 130Z";
}

function Hand({ kind, length, width, metal, lume, accent }: { kind: WatchDesign["hands"]; length: number; width: number; metal: string; lume: boolean; accent: string }) {
  const tip = 350 - length;
  const glow = lume ? accent : "#C3D7CA";
  if (kind === "dauphine") return <>
    <path d={`M320 ${tip} L${320 + width} 345 L324 371 L316 371 L${320 - width} 345Z`} fill={metal} stroke="#05080A" strokeWidth="1" />
    <path d={`M320 ${tip} L320 369 L${320 - width} 345Z`} fill={lume ? accent : "#FCE6D8"} opacity={lume ? 0.9 : 0.55} />
  </>;
  if (kind === "sword" || kind === "skeleton") return <>
    <path d={`M320 ${tip} L${320 + width} ${tip + 29} L325 365 L315 365 L${320 - width} ${tip + 29}Z`} fill={metal} stroke="#111A1D" strokeWidth="1" />
    <path d={`M320 ${tip + 13} L${320 + width - 4} ${tip + 31} L322 337 L318 337 L${320 - width + 4} ${tip + 31}Z`} fill={kind === "skeleton" && !lume ? "#141C1F" : glow} />
    {kind === "skeleton" && <path d={`M317 ${tip + 22}H323V${tip + 53}H317Z`} fill={glow} />}
  </>;
  return <>
    <path d={`M${320 - width / 2} ${tip + 7} L320 ${tip} L${320 + width / 2} ${tip + 7} V369 H${320 - width / 2}Z`} fill={metal} stroke="#0B1417" strokeWidth="1" />
    <path d={`M${323 - width / 2} ${tip + 13} L320 ${tip + 7} L${317 + width / 2} ${tip + 13} V333 H${323 - width / 2}Z`} fill={glow} />
    <path d={`M${320 - width / 2} ${tip + 9}V369`} stroke="white" strokeOpacity=".6" />
  </>;
}

export function WatchFace({ design, timezone, secondaryTimezone = "Europe/London", lume = false, live = true, chronographElapsed = 0, weather, className }: WatchFaceProps) {
  const uniqueId = useId().replace(/:/g, "");
  const id = (name: string) => `${uniqueId}-${name}`;
  const fill = (name: string) => `url(#${id(name)})`;
  const rootRef = useRef<SVGSVGElement>(null);
  const hourRef = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);
  const gmtRef = useRef<SVGGElement>(null);
  const subHourRef = useRef<SVGGElement>(null);
  const subMinuteRef = useRef<SVGGElement>(null);
  const subSecondRef = useRef<SVGGElement>(null);
  const dateRef = useRef<SVGTextElement>(null);
  const accessibleTimeRef = useRef<SVGDescElement>(null);
  const elapsedRef = useRef(chronographElapsed);
  useEffect(() => { elapsedRef.current = chronographElapsed; }, [chronographElapsed]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastFrame = 0;
    let calendarSecond = -1;
    let primary = getClockParts(Date.now(), timezone);
    let secondary = getClockParts(Date.now(), secondaryTimezone);
    const rotate = (ref: { current: SVGGElement | null }, angle: number, x = 320, y = 350) => ref.current?.setAttribute("transform", `rotate(${angle} ${x} ${y})`);
    function update() {
      const now = Date.now();
      if (Math.floor(now / 1000) !== calendarSecond) {
        calendarSecond = Math.floor(now / 1000);
        primary = getClockParts(now, timezone);
        secondary = getClockParts(now, secondaryTimezone);
        if (dateRef.current) dateRef.current.textContent = String(primary.day).padStart(2, "0");
        if (accessibleTimeRef.current) accessibleTimeRef.current.textContent = `${String(primary.hour).padStart(2, "0")}:${String(primary.minute).padStart(2, "0")}:${String(primary.second).padStart(2, "0")} ${timezone || "local time"}`;
      }
      const millis = live && !reduced.matches ? now % 1000 : 0;
      const angles = getHandAngles({ ...primary, millisecond: millis });
      rotate(hourRef, angles.hour);
      rotate(minuteRef, angles.minute);
      rotate(gmtRef, getHandAngles({ ...secondary, millisecond: millis }).gmt);
      rotate(secondRef, design.complication === "chronograph" ? elapsedRef.current / 1000 % 60 * 6 : angles.second);
      if (design.complication === "chronograph") {
        rotate(subSecondRef, angles.second, 239, 350);
        rotate(subMinuteRef, elapsedRef.current / 60000 % 30 * 12, 401, 350);
        rotate(subHourRef, elapsedRef.current / 3600000 % 12 * 30, 320, 438);
      } else if (design.complication === "regulator") {
        rotate(subHourRef, angles.hour, 320, 276);
        rotate(subSecondRef, angles.second, 320, 443);
      } else {
        rotate(subSecondRef, angles.second, 320, 443);
      }
    }
    function stop() { cancelAnimationFrame(frame); if (timer) clearTimeout(timer); }
    function tick(timestamp: number) {
      if (timestamp - lastFrame >= 24) { update(); lastFrame = timestamp; }
      frame = requestAnimationFrame(tick);
    }
    function start() {
      stop();
      if (document.hidden || !visible) return;
      update();
      if (live && !reduced.matches) frame = requestAnimationFrame(tick);
      else timer = setTimeout(start, live ? 1000 : 30000);
    }
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); }, { rootMargin: "80px" }) : null;
    observer?.observe(node);
    document.addEventListener("visibilitychange", start);
    reduced.addEventListener("change", start);
    start();
    return () => { stop(); observer?.disconnect(); document.removeEventListener("visibilitychange", start); reduced.removeEventListener("change", start); };
  }, [timezone, secondaryTimezone, live, design.complication, design.family]);

  const metal = MATERIALS[design.metal];
  const isLight = parseInt(design.dialColor.slice(1, 3), 16) > 145 && parseInt(design.dialColor.slice(3, 5), 16) > 145;
  const ink = lume ? design.accentColor : isLight ? "#26353E" : "#DCE4E3";
  const mutedInk = lume ? shade(design.accentColor, 0.45) : isLight ? "#4D5D67" : "#A3B6B5";
  const chrono = design.complication === "chronograph";
  const regulator = design.complication === "regulator";
  const gmt = design.complication === "gmt";
  const smallSeconds = design.family === "vesper" && design.complication === "none";
  const outline = casePath(design.caseShape);
  const markerRadius = gmt ? 135 : 148;
  const dialClip = fill("dial-clip");
  const roman = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  const dialOpacity = lume ? 0.16 : 1;
  const screwPositions = design.caseShape === "octagonal" ? [[225, 151], [415, 151], [518, 255], [518, 445], [415, 549], [225, 549], [122, 445], [122, 255]] : design.caseShape === "tonneau" ? [[189, 139], [451, 139], [506, 260], [506, 440], [451, 561], [189, 561], [134, 440], [134, 260]] : [];
  const subdial = (x: number, y: number, r: number, divisions: number, label: string) => <g key={label}>
    <circle cx={x} cy={y} r={r + 3} fill={fill("bezel")} />
    <circle cx={x} cy={y} r={r + 1} fill="#080E14" stroke={metal.dark} strokeWidth="1" />
    <circle cx={x} cy={y} r={r - 2} fill={fill("counter")} stroke={lume ? "#18312A" : "#70817E"} strokeWidth=".5" />
    {[...Array(5)].map((_, index) => <circle key={index} cx={x} cy={y} r={r - 8 - index * 4} fill="none" stroke={ink} strokeOpacity=".045" strokeWidth="1" />)}
    {[...Array(divisions)].map((_, index) => <path key={index} d={`M${x} ${y - r + 5}v${index % 5 === 0 ? 5 : 2.4}`} transform={`rotate(${index * 360 / divisions} ${x} ${y})`} stroke={ink} strokeOpacity={index % 5 === 0 ? 0.9 : 0.45} strokeWidth={index % 5 === 0 ? 1.2 : 0.6} />)}
    <text x={x} y={y - r + 18} textAnchor="middle" fill={mutedInk} fontSize="8" letterSpacing="1">{label}</text>
    <circle cx={x} cy={y} r="3.5" fill={metal.face} />
  </g>;

  return <svg ref={rootRef} viewBox="0 0 640 720" className={className} role="img" aria-labelledby={`${id("title")} ${id("time")}`} style={{ overflow: "visible", width: "100%", height: "100%", maxHeight: "100%", display: "block", "--watch-accent": design.accentColor } as CSSProperties}>
    <title id={id("title")}>Watchme {design.family} — {design.metal} {design.caseShape} watch</title>
    <desc id={id("time")} ref={accessibleTimeRef}>Live watch showing your selected time zone.</desc>
    <defs>
      <linearGradient id={id("metal")} x1="0" y1="0" x2=".9" y2="1" gradientUnits="objectBoundingBox"><stop stopColor={metal.light} /><stop offset=".12" stopColor={metal.mid} /><stop offset=".30" stopColor={metal.dark} /><stop offset=".45" stopColor={metal.light} /><stop offset=".51" stopColor={metal.mid} /><stop offset=".68" stopColor={metal.deep} /><stop offset=".86" stopColor={metal.mid} /><stop offset="1" stopColor={metal.light} /></linearGradient>
      <linearGradient id={id("brushed")} x1="0" y1="0" x2="1" y2=".05"><stop stopColor={metal.dark} /><stop offset=".16" stopColor={metal.mid} /><stop offset=".36" stopColor={metal.light} /><stop offset=".54" stopColor={metal.mid} /><stop offset=".77" stopColor={metal.dark} /><stop offset=".93" stopColor={metal.mid} /><stop offset="1" stopColor={metal.deep} /></linearGradient>
      <linearGradient id={id("bezel")} x1="0" y1="0" x2=".75" y2="1"><stop stopColor={metal.light} /><stop offset=".25" stopColor={metal.mid} /><stop offset=".48" stopColor={metal.deep} /><stop offset=".52" stopColor={metal.light} /><stop offset=".78" stopColor={metal.dark} /><stop offset="1" stopColor={metal.light} /></linearGradient>
      <linearGradient id={id("hand")}><stop stopColor={metal.light} /><stop offset=".46" stopColor={metal.face} /><stop offset=".51" stopColor={metal.dark} /><stop offset="1" stopColor={metal.mid} /></linearGradient>
      <linearGradient id={id("rubber")}><stop stopColor="#070B0E" /><stop offset=".12" stopColor="#222B31" /><stop offset=".24" stopColor="#0D1217" /><stop offset=".70" stopColor="#161F25" /><stop offset=".90" stopColor="#252E34" /><stop offset="1" stopColor="#070B0E" /></linearGradient>
      <linearGradient id={id("leather")}><stop stopColor="#08090C" /><stop offset=".17" stopColor="#242024" /><stop offset=".50" stopColor="#131215" /><stop offset=".89" stopColor="#2A252A" /><stop offset="1" stopColor="#08090C" /></linearGradient>
      <radialGradient id={id("dial")} cx=".38" cy=".28" r=".82"><stop stopColor={shade(design.dialColor, 1.48)} /><stop offset=".47" stopColor={design.dialColor} /><stop offset="1" stopColor={shade(design.dialColor, isLight ? 0.67 : 0.27)} /></radialGradient>
      <radialGradient id={id("counter")}><stop stopColor={shade(design.dialColor, 0.8)} /><stop offset=".85" stopColor={shade(design.dialColor, 0.42)} /><stop offset="1" stopColor="#060B10" /></radialGradient>
      <linearGradient id={id("crystal")} x1="0" y1="0" x2=".75" y2="1"><stop stopColor="white" stopOpacity=".11" /><stop offset=".32" stopColor="white" stopOpacity=".018" /><stop offset=".60" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" stopOpacity=".035" /></linearGradient>
      <radialGradient id={id("ambient")}><stop stopColor={design.accentColor} stopOpacity={lume ? ".12" : ".045"} /><stop offset="1" stopColor={design.accentColor} stopOpacity="0" /></radialGradient>
      <pattern id={id("grain")} width="2" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5H2" stroke="white" strokeOpacity=".07" strokeWidth=".4" /><path d="M0 2H2" stroke="black" strokeOpacity=".11" strokeWidth=".4" /></pattern>
      <pattern id={id("grid")} width="13" height="13" patternUnits="userSpaceOnUse"><rect width="11.5" height="11.5" x=".75" y=".75" fill="#030B09" fillOpacity=".10" stroke="#010906" strokeOpacity=".45" strokeWidth="1" /><path d="M1 11.5V1H11.5" fill="none" stroke="#BDF3CF" strokeOpacity=".17" strokeWidth=".8" /><path d="M3 4H9M3 6H9M3 8H9" stroke="black" strokeOpacity=".14" strokeWidth=".5" /></pattern>
      <pattern id={id("horizontal")} width="24" height="10" patternUnits="userSpaceOnUse"><path d="M0 2H24" stroke="#C5E6FF" strokeOpacity=".15" strokeWidth="1.4" /><path d="M0 4H24" stroke="#020A14" strokeOpacity=".54" strokeWidth="2" /><path d="M0 7H24" stroke="#050A12" strokeOpacity=".20" /></pattern>
      <pattern id={id("leather-grain")} width="26" height="22" patternUnits="userSpaceOnUse"><path d="M0 0H25V20H0M0 9H25M12 0V9M7 9V20" fill="none" stroke="#060709" strokeOpacity=".65" strokeWidth="1" /><path d="M1 1H24M1 10H24" stroke="white" strokeOpacity=".035" /></pattern>
      <clipPath id={id("dial-clip")}><circle cx="320" cy="350" r="178" /></clipPath>
      <clipPath id={id("case-clip")}><path d={outline} /></clipPath>
      <filter id={id("shadow")} x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#000" floodOpacity=".65" /></filter>
      <filter id={id("hand-shadow")} x="-70%" y="-30%" width="240%" height="180%"><feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000" floodOpacity=".8" /></filter>
      <filter id={id("glow")} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="2.2" /><feComposite in="SourceGraphic" operator="over" /></filter>
    </defs>

    <ellipse cx="320" cy="354" rx="315" ry="335" fill={fill("ambient")} />
    <g opacity={lume ? 0.27 : 1}>
      {design.strap === "bracelet" ? <g>
        {[...Array(14)].map((_, i) => {
          const y = i < 7 ? i * 29 - 33 : 545 + (i - 7) * 29;
          const inset = i < 7 ? (6 - i) * 2 : (i - 7) * 2;
          return <g key={i}>
            <path d={`M${211 + inset} ${y}H${429 - inset}L${432 - inset} ${y + 26}Q320 ${y + 37} ${208 + inset} ${y + 26}Z`} fill={fill("brushed")} stroke={metal.deep} strokeWidth="2" />
            <path d={`M${256 + inset / 3} ${y + 1}H${384 - inset / 3}V${y + 26}Q320 ${y + 33} ${256 + inset / 3} ${y + 26}Z`} fill={fill("metal")} stroke={metal.dark} strokeWidth=".9" />
            <path d={`M${213 + inset} ${y + 2}H${427 - inset}`} stroke={metal.light} strokeOpacity=".7" />
            <path d={`M${215 + inset} ${y + 5}H${425 - inset}V${y + 22}H${215 + inset}Z`} fill={fill("grain")} />
          </g>;
        })}
      </g> : <g>
        <path d="M230-20H410L425 198H215ZM215 502H425L410 740H230Z" fill={fill(design.strap)} stroke="#070A0C" strokeWidth="3" />
        {design.strap === "leather" ? <>
          <path d="M234-20H406L418 196H222ZM222 503H418L406 740H234Z" fill={fill("leather-grain")} />
          <path d="M242-10L255 182M398-10L385 182M253 526L241 730M387 526L399 730" stroke={design.metal === "rose" ? "#C39C83" : "#697B91"} strokeOpacity=".6" strokeWidth="1.8" strokeDasharray="4 4" />
        </> : <>
          {[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><path d={`M246 ${i * 24 + 1}H394M245 ${560 + i * 24}H395`} stroke="#000" strokeOpacity=".65" strokeWidth="4" /><path d={`M246 ${i * 24 + 4}H394M245 ${563 + i * 24}H395`} stroke="#4F5B63" strokeOpacity=".35" strokeWidth="1" /></g>)}
          <path d="M228 0L241 161M412 0L399 161M240 551L227 720M400 551L413 720" stroke={design.accentColor} strokeOpacity=".6" strokeWidth="2" />
        </>}
      </g>}
    </g>

    <g filter={fill("shadow")} opacity={lume ? 0.38 : 1}>
      <path d="M208 175L214 115Q320 96 426 115L432 175M208 525L214 585Q320 604 426 585L432 525" fill={fill("brushed")} stroke={metal.dark} strokeWidth="2" />
      {chrono && <g><path d="M516 230L549 220Q558 232 552 249L526 259Z" fill={fill("metal")} stroke={metal.deep} strokeWidth="2" /><path d="M526 441L553 451Q559 468 549 480L516 470Z" fill={fill("metal")} stroke={metal.deep} strokeWidth="2" /><path d="M547 224L553 241M549 457L546 473" stroke={design.accentColor} strokeWidth="4" /></g>}
      <path d="M531 329H554V371H531Z" fill={fill("metal")} stroke={metal.deep} strokeWidth="2" />
      <rect x="548" y="323" width="30" height="54" rx="7" fill={fill("brushed")} stroke={metal.deep} strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${552 + i * 4} 328V372`} stroke={i % 2 ? metal.light : metal.dark} strokeWidth="1.5" />)}
      <path d="M578 332Q590 350 578 368" fill={fill("metal")} stroke={metal.light} strokeWidth=".8" />
      <path d={outline} fill={fill("metal")} stroke="#060A0D" strokeWidth="3" />
      <path d={outline} fill="none" stroke={metal.light} strokeOpacity=".55" strokeWidth="1" transform="translate(320 350) scale(.982) translate(-320 -350)" />
      <path d={outline} fill={fill("brushed")} stroke={metal.deep} strokeWidth="2" transform="translate(320 350) scale(.951) translate(-320 -350)" />
      <path d={outline} fill={fill("grain")} transform="translate(320 350) scale(.95) translate(-320 -350)" />
      {design.caseShape === "cushion" && <><path d="M102 284H129V416H102M538 284H511V416H538" fill={fill("metal")} stroke={metal.dark} strokeWidth="2" /><path d="M104 290V410M536 290V410" stroke={metal.light} strokeOpacity=".65" /></>}
      {design.caseShape === "tonneau" && <><path d="M165 190Q128 350 165 510M475 190Q512 350 475 510" fill="none" stroke="#080C11" strokeWidth="9" /><path d="M164 205Q134 350 164 495M476 205Q506 350 476 495" fill="none" stroke={design.accentColor} strokeOpacity=".4" strokeWidth="2" /></>}
      <circle cx="320" cy="350" r={design.caseShape === "round" && design.family === "vesper" ? "207" : "201"} fill={fill("bezel")} stroke={metal.deep} strokeWidth="2" />
      <circle cx="320" cy="350" r="192" fill="#091115" stroke={metal.light} strokeWidth="1.5" />
      <circle cx="320" cy="350" r="187" fill={fill("metal")} />
      <circle cx="320" cy="350" r="181" fill="#010608" stroke={metal.deep} strokeWidth="2" />
      {screwPositions.map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="6.3" fill={metal.deep} stroke={metal.light} strokeWidth=".7" /><circle cx={x} cy={y} r="4.1" fill={fill("metal")} /><path d={`M${x - 3} ${y + 1.5}L${x + 3} ${y - 1.5}`} stroke={metal.deep} strokeWidth="1.2" /></g>)}
    </g>

    <circle cx="320" cy="350" r="178" fill={lume ? "#030B0C" : fill("dial")} />
    <g clipPath={dialClip} opacity={dialOpacity}>
      {(design.texture === "grid" || design.texture === "horizontal") && <circle cx="320" cy="350" r="178" fill={fill(design.texture)} />}
      {design.texture === "sunburst" && <g>{[...Array(180)].map((_, i) => <path key={i} d="M320 350L317 171H319Z" transform={`rotate(${i * 2} 320 350)`} fill={i % 3 === 0 ? "white" : "black"} opacity={i % 3 === 0 ? ".045" : ".032"} />)}</g>}
      {design.texture === "lacquer" && <><path d="M136 326Q303 190 490 312" fill="none" stroke="white" strokeOpacity=".055" strokeWidth="42" /><circle cx="320" cy="350" r="171" fill="none" stroke={metal.face} strokeOpacity=".12" strokeWidth=".7" /></>}
      {design.texture === "skeleton" && <g>
        {[{ x: 260, y: 287, r: 54 }, { x: 380, y: 440, r: 53 }, { x: 405, y: 276, r: 37 }].map(({ x, y, r }, index) => <g key={index}><circle cx={x} cy={y} r={r} fill="#060B10" stroke="#58636A" strokeWidth="3" /><circle cx={x} cy={y} r={r - 10} fill="none" stroke="#687079" strokeOpacity=".5" strokeWidth="3" strokeDasharray="2.5 5" /><circle cx={x} cy={y} r={r - 22} fill="none" stroke={metal.mid} strokeWidth="3" />{[0, 60, 120].map((angle) => <path key={angle} d={`M${x - r + 10} ${y}H${x + r - 10}`} transform={`rotate(${angle} ${x} ${y})`} stroke="#4E5C62" strokeWidth="3" />)}<circle cx={x} cy={y} r="7" fill="#0E1114" stroke="#B37B64" strokeWidth="3" /></g>)}
        <path d="M180 280L252 214L297 276L358 256L446 236L473 282L381 312L420 397L458 461L421 499L339 424L279 461L222 487L181 453L250 371Z" fill="#1B2329" fillOpacity=".78" stroke="#65717B" strokeWidth="3" />
        <path d="M187 281L251 223L293 282L358 264L443 244M452 460L420 489L339 415L275 453" fill="none" stroke={metal.light} strokeOpacity=".25" strokeWidth="1" />
        {[[252, 240], [433, 264], [213, 448], [421, 469]].map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="5" fill={fill("metal")} /><path d={`M${x - 2.5} ${y}h5`} stroke="#11171C" strokeWidth="1.4" /></g>)}
      </g>}
      {regulator && <><path d="M177 320Q233 179 363 192Q224 229 249 356Q264 448 405 495Q249 518 191 424Z" fill={fill("metal")} opacity=".24" /><path d="M195 313Q223 242 275 217M262 441Q311 481 375 490" fill="none" stroke={metal.light} strokeOpacity=".5" strokeWidth="1.2" /></>}
    </g>

    <circle cx="320" cy="350" r="173" fill="none" stroke={lume ? "#122521" : isLight ? "#394853" : "#071316"} strokeWidth="9" />
    <circle cx="320" cy="350" r="177" fill="none" stroke={lume ? "#143128" : metal.face} strokeOpacity=".5" strokeWidth=".65" />
    {[...Array(60)].map((_, i) => <path key={i} d={`M320 180v${i % 5 === 0 ? 7 : 3.4}`} transform={`rotate(${i * 6} 320 350)`} stroke={i % 5 === 0 && chrono ? design.accentColor : ink} strokeOpacity={i % 5 === 0 ? ".85" : ".48"} strokeWidth={i % 5 === 0 ? "1.8" : ".75"} />)}
    {gmt && <g>{[...Array(12)].map((_, i) => {
      const a = i * Math.PI / 6;
      return <text key={i} x={320 + Math.sin(a) * 157} y={350 - Math.cos(a) * 157 + 3} textAnchor="middle" fontSize="8" fontWeight="600" fill={i < 6 ? ink : design.accentColor}>{String(i * 2 || 24).padStart(2, "0")}</text>;
    })}<circle cx="320" cy="350" r="146" fill="none" stroke={ink} strokeOpacity=".16" strokeWidth=".5" /></g>}

    <g filter={lume ? fill("glow") : undefined}>
      {[...Array(12)].map((_, i) => {
        if (design.complication === "date" && i === (design.family === "pelagic" ? 6 : 3)) return null;
        if (chrono && i === 6) return null;
        const angle = i * 30;
        const a = angle * Math.PI / 180;
        if (design.markers === "roman" || design.markers === "arabic") return <text key={i} x={320 + Math.sin(a) * (markerRadius - 1)} y={350 - Math.cos(a) * (markerRadius - 1) + 5} fill={ink} textAnchor="middle" fontFamily={design.markers === "roman" ? "Georgia, serif" : "inherit"} fontSize={design.markers === "roman" ? "16" : "19"} fontWeight={design.markers === "arabic" ? "600" : "400"} letterSpacing={design.markers === "roman" ? "1" : "-1"}>{design.markers === "roman" ? roman[i] : (i || 12)}</text>;
        if (design.markers === "minimal") return <g key={i} transform={`rotate(${angle} 320 350)`}><circle cx="320" cy={350 - markerRadius} r={i % 3 === 0 ? 2.7 : 1.4} fill={ink} /><path d={`M320 ${350 - markerRadius - 10}v5`} stroke={ink} strokeWidth=".6" /></g>;
        return <g key={i} transform={`rotate(${angle} 320 350)`}>
          <rect x={i === 0 ? 311 : 315} y={350 - markerRadius - 9} width={i === 0 ? 18 : 10} height="27" rx=".7" fill="#040B0F" transform="translate(1.8 2)" opacity=".65" />
          <path d={`M${i === 0 ? 311 : 315} ${350 - markerRadius - 9}h${i === 0 ? 18 : 10}l-1 27h-${i === 0 ? 16 : 8}Z`} fill={lume ? "#174132" : fill("hand")} stroke={lume ? design.accentColor : metal.light} strokeWidth=".6" />
          <rect x={i === 0 ? 314 : 317.7} y={350 - markerRadius - 6} width={i === 0 ? 4 : 4.6} height="20" fill={lume ? design.accentColor : "#C4D6C8"} />
          {i === 0 && <rect x="322" y={350 - markerRadius - 6} width="4" height="20" fill={lume ? design.accentColor : "#C4D6C8"} />}
        </g>;
      })}
    </g>

    {chrono && <>{subdial(239, 350, 43, 60, "60")}{subdial(401, 350, 43, 30, "30")}{subdial(320, 438, 43, 12, "12")}</>}
    {regulator && <>{subdial(320, 276, 48, 12, "12")}{subdial(320, 443, 37, 60, "60")}</>}
    {smallSeconds && subdial(320, 443, 35, 60, "60")}

    {!regulator && <g textAnchor="middle" fill={ink}>
      <path d={chrono ? "M307 235L314 244L320 233L326 244L333 235" : "M307 266L314 275L320 264L326 275L333 266"} fill="none" stroke={ink} strokeWidth="1.4" />
      <text x="321" y={chrono ? 263 : 296} fontSize={design.family === "vesper" ? "15" : "14"} fontWeight="500" letterSpacing="4.5">WATCHME</text>
      {!chrono && <text x="320" y="314" fontSize="6.5" letterSpacing="2.5" fill={mutedInk}>PRIVATE ATELIER</text>}
      {!chrono && !smallSeconds && <text x="320" y="413" fontSize="10" letterSpacing="3" fill={mutedInk}>{design.family.toUpperCase()}</text>}
      {!chrono && !smallSeconds && design.complication !== "weather" && <text x="320" y="431" fontSize="6" letterSpacing="1.6" fill={mutedInk}>{gmt ? "TWO PLACES. ONE MOMENT." : "YOUR TIME. YOUR RULES."}</text>}
      {chrono && <text x="320" y="502" fontSize="7" letterSpacing="2.4" fill={design.accentColor}>{design.family.toUpperCase()} · CHRONOGRAPH</text>}
    </g>}
    {regulator && <g fill={ink} textAnchor="middle"><text x="411" y="338" fontSize="9" letterSpacing="2">WATCHME</text><text x="411" y="356" fontSize="6" letterSpacing="2" fill={mutedInk}>REGULATOR</text><text x="224" y="347" fontSize="8" letterSpacing="1.5" fill={mutedInk}>{design.family.toUpperCase()}</text><text x="224" y="363" fontSize="6" letterSpacing="1.5" fill={mutedInk}>H / M / S</text></g>}
    {design.complication === "date" && (() => {
      const x = design.family === "pelagic" ? 298 : 426;
      const y = design.family === "pelagic" ? 468 : 337;
      return <g><rect x={x - 2} y={y - 2} width="48" height="29" rx="1" fill={fill("bezel")} /><rect x={x} y={y} width="44" height="25" fill={isLight ? "#192731" : "#CAD6D0"} stroke="#050E11" strokeWidth="2" /><path d={`M${x + 2} ${y + 2}H${x + 42}`} stroke="#000" strokeOpacity=".4" strokeWidth="2" /><text ref={dateRef} x={x + 22} y={y + 18} textAnchor="middle" fill={isLight ? "#E0E7E6" : "#102119"} fontSize="17" fontFamily="Arial, sans-serif" fontWeight="600">—</text></g>;
    })()}
    {design.complication === "weather" && <g textAnchor="middle">
      {weather && weather.code <= 1 ? <g fill="none" stroke={ink} strokeWidth="1.1"><circle cx="295" cy="444" r="6" />{[0, 45, 90, 135].map((angle) => <path key={angle} d="M295 432v3M295 453v3" transform={`rotate(${angle} 295 444)`} />)}</g> : <path d="M292 451a7 7 0 1 1 7-9a5 5 0 1 1 2 9Z" fill="none" stroke={ink} strokeWidth="1.1" />}
      <text x="330" y="454" fill={ink} fontSize="21" fontWeight="300">{weather ? `${Math.round(weather.temperature)}°` : "—"}</text><text x="320" y="471" fill={mutedInk} fontSize="6.5" letterSpacing="1.5">{weather ? weather.description.toUpperCase().slice(0, 24) : "WEATHER UNAVAILABLE"}</text>
    </g>}
    <text x="320" y="511" fill={mutedInk} textAnchor="middle" fontSize="5" letterSpacing="1.4" opacity=".75">{chrono ? "" : "WATCHME • DESIGNED FOR YOU"}</text>

    {(chrono || regulator || smallSeconds) && <g fill={design.accentColor}>
      <g ref={subSecondRef}><path d={chrono ? "M239 319V359" : regulator ? "M320 415V452" : "M320 417V452"} stroke={design.accentColor} strokeWidth="1.6" /><circle cx={chrono ? "239" : "320"} cy={chrono ? "350" : "443"} r="3" /></g>
      {chrono && <g ref={subMinuteRef}><path d="M401 319V359" stroke={design.accentColor} strokeWidth="1.8" /><circle cx="401" cy="350" r="3" /></g>}
      {(chrono || regulator) && <g ref={subHourRef}><path d={chrono ? "M320 408V447" : "M320 243L324 254L322 285H318L316 254Z"} fill={regulator ? fill("hand") : "none"} stroke={design.accentColor} strokeWidth={chrono ? "1.8" : ".6"} /><circle cx="320" cy={chrono ? "438" : "276"} r="3.5" fill={metal.light} /></g>}
    </g>}
    {gmt && <g ref={gmtRef} filter={fill("hand-shadow")}><path d="M320 359V225" stroke={design.accentColor} strokeWidth="3" /><path d="M320 210L310 230H330Z" fill={design.accentColor} stroke="#172A39" strokeWidth=".8" /><circle cx="320" cy="350" r="7" fill={design.accentColor} /></g>}
    <g filter={lume ? fill("glow") : fill("hand-shadow")}>
      {!regulator && <g ref={hourRef}><Hand kind={design.hands} length={97} width={design.hands === "baton" ? 15 : 12} metal={fill("hand")} lume={lume} accent={design.accentColor} /></g>}
      <g ref={minuteRef}><Hand kind={design.hands} length={139} width={design.hands === "baton" ? 11 : 9} metal={fill("hand")} lume={lume} accent={design.accentColor} /></g>
    </g>
    {!regulator && !smallSeconds && <g ref={secondRef}>
      <path d="M320 193V385" stroke="#000" strokeOpacity=".45" strokeWidth="2.5" transform="translate(1 2)" />
      <path d="M320 193V388" stroke={design.accentColor} strokeWidth="1.35" />
      <path d="M318.5 192L320 184L321.5 192Z" fill={design.accentColor} />
      <circle cx="320" cy="378" r="5.5" fill="none" stroke={design.accentColor} strokeWidth="1.6" />
    </g>}
    <circle cx="320" cy="350" r="8" fill={fill("bezel")} stroke="#0C1418" strokeWidth="1" />
    <circle cx="320" cy="350" r="3.6" fill={lume ? design.accentColor : metal.light} />
    <circle cx="319" cy="349" r="1.2" fill="white" fillOpacity=".85" />
    <circle cx="320" cy="350" r="178" fill={fill("crystal")} opacity={lume ? ".15" : "1"} pointerEvents="none" />
    <path d="M181 241A177 177 0 0 1 416 200" fill="none" stroke="white" strokeOpacity={lume ? ".05" : ".26"} strokeWidth="1.2" />
    <path d="M207 486A177 177 0 0 0 468 448" fill="none" stroke={design.accentColor} strokeOpacity=".14" strokeWidth=".7" />
  </svg>;
}

export default WatchFace;
