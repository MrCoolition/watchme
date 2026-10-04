"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";
import type { WatchDesign, WeatherData } from "@/lib/types";
import { getClockParts, getDayNightState, getHandAngles } from "@/lib/time";
import { getComplications, hasComplication } from "@/lib/presets";
import { MechanicalMovement } from "@/components/mechanical-movement";
import { FlagshipDialArtwork } from "@/components/flagship-dials";
import { getMoonPhase } from "@/lib/moon";
import { getMoonTerminatorPath, MoonPhaseDial } from "@/components/moon-phase-dial";

export interface WatchFaceProps {
  design: WatchDesign;
  timezone?: string;
  secondaryTimezone?: string;
  lume?: boolean;
  live?: boolean;
  chronographElapsed?: number;
  chronographRunning?: boolean;
  onChronographToggle?: () => void;
  onChronographReset?: () => void;
  eclipse?: boolean;
  lightPosition?: { x: number; y: number };
  weather?: WeatherData | null;
  className?: string;
  framing?: "watch" | "face" | "dial";
}

const MATERIALS = {
  steel: { light: "#F1F3F1", mid: "#919B9D", dark: "#343C40", deep: "#171E21", face: "#D4DCDA" },
  titanium: { light: "#E1E6E7", mid: "#7F8D97", dark: "#3E4B55", deep: "#18232D", face: "#B5C1C8" },
  gold: { light: "#FFE6A3", mid: "#B69752", dark: "#675127", deep: "#302710", face: "#E8CB87" },
  rose: { light: "#FFE0CE", mid: "#BF907A", dark: "#754C3E", deep: "#36211F", face: "#EFC0A6" },
  graphite: { light: "#8F989B", mid: "#4A535B", dark: "#24292F", deep: "#101317", face: "#BEC6CA" },
  ceramic: { light: "#ADB3BD", mid: "#353A43", dark: "#10141B", deep: "#03060C", face: "#D7DDE6" },
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

export function WatchFace({ design, timezone, secondaryTimezone = "Europe/London", lume = false, live = true, chronographElapsed = 0, chronographRunning = false, onChronographToggle, onChronographReset, eclipse = false, lightPosition, weather, className, framing = "watch" }: WatchFaceProps) {
  const uniqueId = useId().replace(/:/g, "");
  const id = useCallback((name: string) => `${uniqueId}-${name}`, [uniqueId]);
  const fill = useCallback((name: string) => `url(#${id(name)})`, [id]);
  const rootRef = useRef<SVGSVGElement>(null);
  const hourRef = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);
  const gmtRef = useRef<SVGGElement>(null);
  const subHourRef = useRef<SVGGElement>(null);
  const subMinuteRef = useRef<SVGGElement>(null);
  const subSecondRef = useRef<SVGGElement>(null);
  const dateRef = useRef<SVGTextElement>(null);
  const dayNightDiscRef = useRef<SVGGElement>(null);
  const dayNightLabelRef = useRef<SVGTextElement>(null);
  const moonDiscRef = useRef<SVGGElement>(null);
  const moonTerminatorRef = useRef<SVGPathElement>(null);
  const moonNameRef = useRef<SVGTextElement>(null);
  const moonIlluminationRef = useRef<SVGTextElement>(null);
  const moonDescriptionRef = useRef<SVGDescElement>(null);
  const accessibleTimeRef = useRef<SVGDescElement>(null);
  const chronoRingRef = useRef<SVGCircleElement>(null);
  const elapsedRef = useRef(chronographElapsed);
  const complications = getComplications(design);
  const chrono = hasComplication(design, "chronograph");
  const regulator = hasComplication(design, "regulator");
  const dayNight = hasComplication(design, "daynight");
  const moonPhase = hasComplication(design, "moonphase");
  const gmt = hasComplication(design, "gmt");
  const date = hasComplication(design, "date");
  const hasWeather = hasComplication(design, "weather");
  const lowerFeature = dayNight || moonPhase || hasWeather;
  const smallSeconds = design.family === "vesper" && complications.length === 0;
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
    let moonMinute = -1;
    let lunarDescription = "";
    let primary = getClockParts(Date.now(), timezone);
    let secondary = getClockParts(Date.now(), secondaryTimezone);
    const gears = Array.from(node.querySelectorAll<SVGGElement>("[data-mechanical-gear], [data-flagship-rotor], [data-flagship-kinetic]")).map(gear => ({ node: gear, x: Number(gear.dataset.centerX), y: Number(gear.dataset.centerY), period: Number(gear.dataset.period), direction: Number(gear.dataset.direction), phase: Number(gear.dataset.phase) }));
    const balance = node.querySelector<SVGGElement>("[data-balance-wheel]");
    const rotate = (ref: { current: SVGGElement | null }, angle: number, x = 320, y = 350) => ref.current?.setAttribute("transform", `rotate(${angle} ${x} ${y})`);
    function update() {
      const now = Date.now();
      if (Math.floor(now / 1000) !== calendarSecond) {
        calendarSecond = Math.floor(now / 1000);
        primary = getClockParts(now, timezone);
        secondary = getClockParts(now, secondaryTimezone);
        if (dateRef.current) dateRef.current.textContent = String(primary.day).padStart(2, "0");
        if (dayNightDiscRef.current) {
          const phase = getDayNightState(primary);
          dayNightDiscRef.current.setAttribute("transform", `rotate(${phase.angle} 320 435)`);
          dayNightDiscRef.current.setAttribute("data-daynight-hour", String(phase.hour));
          dayNightDiscRef.current.setAttribute("data-daynight-state", phase.isDay ? "day" : "night");
          if (dayNightLabelRef.current) dayNightLabelRef.current.textContent = phase.isDay ? "DAY · 24H" : "NIGHT · 24H";
        }
        if (accessibleTimeRef.current) accessibleTimeRef.current.textContent = `${String(primary.hour).padStart(2, "0")}:${String(primary.minute).padStart(2, "0")}:${String(primary.second).padStart(2, "0")} ${timezone || "local time"}${lunarDescription ? `. ${lunarDescription}` : ""}`;
      }
      if (moonPhase && Math.floor(now / 60000) !== moonMinute) {
        moonMinute = Math.floor(now / 60000);
        const moon = getMoonPhase(now);
        const percent = Number((moon.illumination * 100).toFixed(1));
        lunarDescription = `${moon.name}, ${percent}% illuminated.`;
        moonDiscRef.current?.setAttribute("data-moon-phase", String(moon.phase));
        moonDiscRef.current?.setAttribute("data-moon-illumination", String(moon.illumination));
        moonDiscRef.current?.setAttribute("data-moon-name", moon.name);
        moonDiscRef.current?.setAttribute("aria-label", lunarDescription);
        moonTerminatorRef.current?.setAttribute("d", getMoonTerminatorPath(moon.illumination, moon.waxing));
        if (moonNameRef.current) moonNameRef.current.textContent = moon.name.toUpperCase();
        if (moonIlluminationRef.current) moonIlluminationRef.current.textContent = `${percent}% ILLUMINATED`;
        if (moonDescriptionRef.current) moonDescriptionRef.current.textContent = lunarDescription;
        if (accessibleTimeRef.current) accessibleTimeRef.current.textContent = `${String(primary.hour).padStart(2, "0")}:${String(primary.minute).padStart(2, "0")}:${String(primary.second).padStart(2, "0")} ${timezone || "local time"}. ${lunarDescription}`;
      }
      const millis = live && !reduced.matches && design.secondsMotion !== "tick" ? now % 1000 : 0;
      const angles = getHandAngles({ ...primary, millisecond: millis });
      rotate(hourRef, angles.hour);
      rotate(minuteRef, angles.minute);
      rotate(gmtRef, getHandAngles({ ...secondary, millisecond: millis }).gmt);
      const elapsedSeconds = design.secondsMotion === "tick" ? Math.floor(elapsedRef.current / 1000) : elapsedRef.current / 1000;
      rotate(secondRef, chrono ? elapsedSeconds % 60 * 6 : angles.second);
      if (chrono) {
        rotate(subSecondRef, angles.second, 239, 350);
        rotate(subMinuteRef, elapsedRef.current / 60000 % 30 * 12, 401, 350);
        rotate(subHourRef, elapsedRef.current / 3600000 % 12 * 30, 320, 438);
        chronoRingRef.current?.setAttribute("stroke-dashoffset", String(100 - elapsedRef.current / 1000 % 60 / 60 * 100));
      } else if (regulator) {
        rotate(subHourRef, angles.hour, 320, 276);
        rotate(subSecondRef, angles.second, 320, 443);
      } else {
        rotate(subSecondRef, angles.second, 320, 443);
      }
      if (live && !reduced.matches) {
        for (const gear of gears) gear.node.setAttribute("transform", `rotate(${now % gear.period / gear.period * 360 * gear.direction + gear.phase} ${gear.x} ${gear.y})`);
        balance?.setAttribute("transform", `rotate(${Math.sin(now / 1000 * Math.PI * 5) * 24} 415 444)`);
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
      if (live && !reduced.matches && (design.secondsMotion !== "tick" || gears.length > 0)) frame = requestAnimationFrame(tick);
      else timer = setTimeout(start, live ? Math.max(16, 1000 - Date.now() % 1000) : 30000);
    }
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); }, { rootMargin: "80px" }) : null;
    observer?.observe(node);
    document.addEventListener("visibilitychange", start);
    reduced.addEventListener("change", start);
    start();
    return () => { stop(); observer?.disconnect(); document.removeEventListener("visibilitychange", start); reduced.removeEventListener("change", start); };
  }, [timezone, secondaryTimezone, live, chrono, regulator, dayNight, moonPhase, gmt, date, lowerFeature, smallSeconds, design.family, design.secondsMotion, design.texture]);

  const metal = MATERIALS[design.metal];
  const lumeColor = design.lumeColor || design.accentColor;
  const bezel = design.bezel || "polished";
  const signature = design.signature ? Array.from(design.signature.trim()).slice(0, 14).join("") : undefined;
  const initials = design.initials ? Array.from(design.initials.trim().toUpperCase()).slice(0, 4).join("") : undefined;
  const engraved = Boolean(initials || signature);
  const engravingLength = Array.from(`${initials || ""}${initials && signature ? " · " : ""}${signature || ""}`).length;
  const illuminated = lume || eclipse;
  const mechanical = design.texture === "mechanical";
  const flagship = ["reactor", "phantom", "helios", "abyss", "prism", "nocturne"].includes(design.family);
  const flagshipTexture = ["turbine", "solar", "abyssal", "prismatic", "aventurine"].includes(design.texture);
  const lightX = Math.max(-1, Math.min(1, lightPosition?.x || 0));
  const lightY = Math.max(-1, Math.min(1, lightPosition?.y || 0));
  const isLight = design.texture === "prismatic" || (!flagshipTexture && parseInt(design.dialColor.slice(1, 3), 16) > 145 && parseInt(design.dialColor.slice(3, 5), 16) > 145);
  const ink = illuminated ? lumeColor : isLight ? "#26353E" : "#DCE4E3";
  const mutedInk = illuminated ? shade(lumeColor, 0.45) : isLight ? "#4D5D67" : "#A3B6B5";
  const datePosition = chrono ? "top" : design.family === "pelagic" && !lowerFeature && !regulator ? "bottom" : "right";
  const outline = casePath(design.caseShape);
  const markerRadius = gmt ? 135 : 148;
  const dialClip = fill("dial-clip");
  const roman = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  const dialOpacity = eclipse ? 0.06 : lume ? 0.16 : 1;
  const screwPositions = design.caseShape === "octagonal" ? [[225, 151], [415, 151], [518, 255], [518, 445], [415, 549], [225, 549], [122, 445], [122, 255]] : design.caseShape === "tonneau" ? [[189, 139], [451, 139], [506, 260], [506, 440], [451, 561], [189, 561], [134, 440], [134, 260]] : [];
  const subdial = (x: number, y: number, r: number, divisions: number, label: string) => <g key={label}>
    <circle cx={x} cy={y} r={r + 3} fill={fill("bezel")} stroke={chrono && chronographRunning ? design.accentColor : "none"} strokeWidth="1" />
    <circle cx={x} cy={y} r={r + 1} fill="#080E14" stroke={metal.dark} strokeWidth="1" />
    <circle cx={x} cy={y} r={r - 2} fill={eclipse ? "#010607" : fill("counter")} stroke={illuminated ? shade(lumeColor, 0.4) : "#70817E"} strokeWidth=".5" />
    {[...Array(5)].map((_, index) => <circle key={index} cx={x} cy={y} r={r - 8 - index * 4} fill="none" stroke={ink} strokeOpacity=".045" strokeWidth="1" />)}
    {[...Array(divisions)].map((_, index) => <path key={index} d={`M${x} ${y - r + 5}v${index % 5 === 0 ? 5 : 2.4}`} transform={`rotate(${index * 360 / divisions} ${x} ${y})`} stroke={ink} strokeOpacity={index % 5 === 0 ? 0.9 : 0.45} strokeWidth={index % 5 === 0 ? 1.2 : 0.6} />)}
    <text x={x} y={y - r + 18} textAnchor="middle" fill={mutedInk} fontSize="8" letterSpacing="1">{label}</text>
    <circle cx={x} cy={y} r="3.5" fill={metal.face} />
  </g>;

  return <svg ref={rootRef} viewBox={framing === "dial" ? "128 158 384 384" : framing === "face" ? "82 96 508 508" : "0 0 640 720"} data-framing={framing} data-flagship-family={flagship ? design.family : undefined} data-eclipse={eclipse} data-chronograph-running={chronographRunning} className={className} role={chrono && live && framing !== "dial" && (onChronographToggle || onChronographReset) ? "group" : "img"} aria-labelledby={`${id("title")} ${id("time")}`} style={{ overflow: "visible", width: "100%", height: "100%", maxHeight: "100%", display: "block", "--watch-accent": design.accentColor } as CSSProperties}>
    <title id={id("title")}>{`WATCHMÉ ${design.family} — ${design.metal} ${design.caseShape} watch`}</title>
    <desc id={id("time")} ref={accessibleTimeRef}>Live watch showing your selected time zone.</desc>
    <defs>
      <linearGradient id={id("metal")} x1="0" y1="0" x2=".9" y2="1" gradientUnits="objectBoundingBox"><stop stopColor={metal.light} /><stop offset=".12" stopColor={metal.mid} /><stop offset=".30" stopColor={metal.dark} /><stop offset=".45" stopColor={metal.light} /><stop offset=".51" stopColor={metal.mid} /><stop offset=".68" stopColor={metal.deep} /><stop offset=".86" stopColor={metal.mid} /><stop offset="1" stopColor={metal.light} /></linearGradient>
      <linearGradient id={id("brushed")} x1="0" y1="0" x2="1" y2=".05"><stop stopColor={metal.dark} /><stop offset=".16" stopColor={metal.mid} /><stop offset=".36" stopColor={metal.light} /><stop offset=".54" stopColor={metal.mid} /><stop offset=".77" stopColor={metal.dark} /><stop offset=".93" stopColor={metal.mid} /><stop offset="1" stopColor={metal.deep} /></linearGradient>
      <linearGradient id={id("bezel")} x1="0" y1="0" x2=".75" y2="1"><stop stopColor={metal.light} /><stop offset=".25" stopColor={metal.mid} /><stop offset=".48" stopColor={metal.deep} /><stop offset=".52" stopColor={metal.light} /><stop offset=".78" stopColor={metal.dark} /><stop offset="1" stopColor={metal.light} /></linearGradient>
      <linearGradient id={id("hand")}><stop stopColor={metal.light} /><stop offset=".46" stopColor={metal.face} /><stop offset=".51" stopColor={metal.dark} /><stop offset="1" stopColor={metal.mid} /></linearGradient>
      <linearGradient id={id("ceramic")} x1=".1" y1="0" x2=".8" y2="1"><stop stopColor="#8E97A9" /><stop offset=".09" stopColor="#2E3543" /><stop offset=".26" stopColor="#070A11" /><stop offset=".44" stopColor="#1A2130" /><stop offset=".49" stopColor="#667187" /><stop offset=".54" stopColor="#0D121E" /><stop offset=".85" stopColor="#03060B" /><stop offset="1" stopColor="#535F72" /></linearGradient>
      <linearGradient id={id("carbon-fiber")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D4DCE7" stopOpacity=".30" /><stop offset=".45" stopColor="#65717E" stopOpacity=".16" /><stop offset="1" stopColor="#03070D" stopOpacity=".9" /></linearGradient>
      <linearGradient id={id("mechanical-gear")} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#F1E0BD" /><stop offset=".32" stopColor="#9F8966" /><stop offset=".5" stopColor="#D2C4A8" /><stop offset=".73" stopColor="#5E5B4F" /><stop offset="1" stopColor="#D8C3A0" /></linearGradient>
      <linearGradient id={id("mechanical-bridge")} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#52676C" /><stop offset=".19" stopColor="#182B30" /><stop offset=".49" stopColor="#253B3E" /><stop offset=".52" stopColor="#728D88" /><stop offset=".57" stopColor="#13272B" /><stop offset="1" stopColor="#0A171B" /></linearGradient>
      <radialGradient id={id("mechanical-plate")}><stop stopColor="#203439" /><stop offset="1" stopColor="#060D12" /></radialGradient>
      <radialGradient id={id("directional-light")} data-reactive-reflection="true" cx={.36 + lightX * .28} cy={.22 + lightY * .24} r=".76"><stop stopColor="#E2F4FF" stopOpacity=".26" /><stop offset=".34" stopColor="#D1ECFF" stopOpacity=".065" /><stop offset=".74" stopColor="#D1ECFF" stopOpacity="0" /></radialGradient>
      <linearGradient id={id("rubber")}><stop stopColor="#070B0E" /><stop offset=".12" stopColor="#222B31" /><stop offset=".24" stopColor="#0D1217" /><stop offset=".70" stopColor="#161F25" /><stop offset=".90" stopColor="#252E34" /><stop offset="1" stopColor="#070B0E" /></linearGradient>
      <linearGradient id={id("leather")}><stop stopColor="#08090C" /><stop offset=".17" stopColor="#242024" /><stop offset=".50" stopColor="#131215" /><stop offset=".89" stopColor="#2A252A" /><stop offset="1" stopColor="#08090C" /></linearGradient>
      <radialGradient id={id("dial")} cx=".38" cy=".28" r=".82"><stop stopColor={shade(design.dialColor, 1.48)} /><stop offset=".47" stopColor={design.dialColor} /><stop offset="1" stopColor={shade(design.dialColor, isLight ? 0.67 : 0.27)} /></radialGradient>
      <radialGradient id={id("counter")}><stop stopColor={shade(design.dialColor, 0.8)} /><stop offset=".85" stopColor={shade(design.dialColor, 0.42)} /><stop offset="1" stopColor="#060B10" /></radialGradient>
      <linearGradient id={id("daynight-day")} x1="0" y1="0" x2="0" y2="1"><stop stopColor={illuminated ? "#152D29" : "#6D5341"} /><stop offset="1" stopColor={illuminated ? "#061615" : "#C29B67"} /></linearGradient>
      <linearGradient id={id("daynight-night")} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#080D22" /><stop offset="1" stopColor="#253551" /></linearGradient>
      <linearGradient id={id("crystal")} x1="0" y1="0" x2=".75" y2="1"><stop stopColor="white" stopOpacity=".11" /><stop offset=".32" stopColor="white" stopOpacity=".018" /><stop offset=".60" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" stopOpacity=".035" /></linearGradient>
      <radialGradient id={id("ambient")}><stop stopColor={design.accentColor} stopOpacity={lume ? ".12" : ".045"} /><stop offset="1" stopColor={design.accentColor} stopOpacity="0" /></radialGradient>
      <pattern id={id("grain")} width="2" height="3" patternUnits="userSpaceOnUse"><path d="M0 .5H2" stroke="white" strokeOpacity=".07" strokeWidth=".4" /><path d="M0 2H2" stroke="black" strokeOpacity=".11" strokeWidth=".4" /></pattern>
      <pattern id={id("grid")} width="13" height="13" patternUnits="userSpaceOnUse"><rect width="11.5" height="11.5" x=".75" y=".75" fill="#030B09" fillOpacity=".10" stroke="#010906" strokeOpacity=".45" strokeWidth="1" /><path d="M1 11.5V1H11.5" fill="none" stroke="#BDF3CF" strokeOpacity=".17" strokeWidth=".8" /><path d="M3 4H9M3 6H9M3 8H9" stroke="black" strokeOpacity=".14" strokeWidth=".5" /></pattern>
      <pattern id={id("horizontal")} width="24" height="10" patternUnits="userSpaceOnUse"><path d="M0 2H24" stroke="#C5E6FF" strokeOpacity=".15" strokeWidth="1.4" /><path d="M0 4H24" stroke="#020A14" strokeOpacity=".54" strokeWidth="2" /><path d="M0 7H24" stroke="#050A12" strokeOpacity=".20" /></pattern>
      <pattern id={id("carbon")} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="#050A12" fillOpacity=".44" /><path d="M0 0H12V24H0ZM12 0H24V12H12" fill={fill("carbon-fiber")} /><path d="M1 0V24M3 0V24M5 0V24M7 0V24M9 0V24M11 0V24M12 1H24M12 3H24M12 5H24M12 7H24M12 9H24M12 11H24" fill="none" stroke="#D5E2EE" strokeOpacity=".12" strokeWidth=".6" /><path d="M0 .5H12M12 12.5H24" stroke="#03060A" strokeOpacity=".8" strokeWidth="1" /></pattern>
      <pattern id={id("meteorite")} width="112" height="96" patternUnits="userSpaceOnUse" patternTransform="rotate(17)"><path d="M0 4L111 72L109 80L0 17ZM8 96L67 0H78L21 96ZM0 71L111 26V36L0 83" fill="#DCE8F0" fillOpacity=".09" stroke="#E6F0F8" strokeOpacity=".13" strokeWidth=".7" /><path d="M0 12L112 80M0 8L112 76M0 20L112 88M4 96L64 0M13 96L73 0M19 96L79 0M0 65L112 21M0 75L112 31M0 80L112 36" stroke="#000712" strokeOpacity=".36" strokeWidth="1.3" /><path d="M0 13L112 81M10 96L70 0M0 77L112 33" stroke="#EFF8FF" strokeOpacity=".26" strokeWidth=".6" /></pattern>
      <pattern id={id("leather-grain")} width="26" height="22" patternUnits="userSpaceOnUse"><path d="M0 0H25V20H0M0 9H25M12 0V9M7 9V20" fill="none" stroke="#060709" strokeOpacity=".65" strokeWidth="1" /><path d="M1 1H24M1 10H24" stroke="white" strokeOpacity=".035" /></pattern>
      <clipPath id={id("dial-clip")}><circle cx="320" cy="350" r="178" /></clipPath>
      <clipPath id={id("daynight-aperture")}><path d="M266 439Q269 406 320 405Q371 406 374 439Q320 454 266 439Z" /></clipPath>
      <clipPath id={id("daynight-disc-clip")}><circle cx="320" cy="435" r="51" /></clipPath>
      <clipPath id={id("case-clip")}><path d={outline} /></clipPath>
      <filter id={id("shadow")} x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#000" floodOpacity=".65" /></filter>
      <filter id={id("hand-shadow")} x="-70%" y="-30%" width="240%" height="180%"><feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#000" floodOpacity=".8" /></filter>
      <filter id={id("glow")} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="2.2" /><feComposite in="SourceGraphic" operator="over" /></filter>
    </defs>

    <ellipse cx="320" cy="354" rx="315" ry="335" fill={fill("ambient")} />
    {framing === "watch" && <g data-watch-part="strap" opacity={eclipse ? 0.07 : lume ? 0.27 : 1}>
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
    </g>}

    {framing !== "dial" && <g data-watch-part="case" filter={fill("shadow")} opacity={eclipse ? 0.12 : lume ? 0.38 : 1}>
      {framing === "watch" && <path data-watch-part="lugs" d="M208 175L214 115Q320 96 426 115L432 175M208 525L214 585Q320 604 426 585L432 525" fill={fill("brushed")} stroke={metal.dark} strokeWidth="2" />}
      {chrono && <g>
        <g role={live && onChronographToggle ? "button" : undefined} tabIndex={live && onChronographToggle ? 0 : undefined} aria-label={live && onChronographToggle ? "Chronograph pusher: start/pause" : undefined} aria-pressed={live && onChronographToggle ? chronographRunning : undefined} style={live && onChronographToggle ? { cursor: "pointer" } : undefined} onPointerDown={live && onChronographToggle ? event => { event.stopPropagation(); } : undefined} onClick={live && onChronographToggle ? event => { event.stopPropagation(); onChronographToggle(); } : undefined} onKeyDown={live && onChronographToggle ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onChronographToggle(); } } : undefined}>
          {live && onChronographToggle && <title>{chronographRunning ? "Pause chronograph" : "Start chronograph"}</title>}
          {live && onChronographToggle && <rect x="512" y="205" width="62" height="65" rx="12" fill="transparent" />}
          <path d="M516 230L549 220Q558 232 552 249L526 259Z" fill={fill("metal")} stroke={metal.deep} strokeWidth="2" /><path d="M547 224L553 241" stroke={chronographRunning ? lumeColor : design.accentColor} strokeWidth="4" />
        </g>
        <g role={live && onChronographReset ? "button" : undefined} tabIndex={live && onChronographReset ? 0 : undefined} aria-label={live && onChronographReset ? "Chronograph pusher: reset" : undefined} style={live && onChronographReset ? { cursor: "pointer" } : undefined} onPointerDown={live && onChronographReset ? event => { event.stopPropagation(); } : undefined} onClick={live && onChronographReset ? event => { event.stopPropagation(); onChronographReset(); } : undefined} onKeyDown={live && onChronographReset ? event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onChronographReset(); } } : undefined}>
          {live && onChronographReset && <title>Reset chronograph</title>}
          {live && onChronographReset && <rect x="512" y="435" width="62" height="62" rx="12" fill="transparent" />}
          <path d="M526 441L553 451Q559 468 549 480L516 470Z" fill={fill("metal")} stroke={metal.deep} strokeWidth="2" /><path d="M549 457L546 473" stroke={design.accentColor} strokeWidth="4" />
        </g>
      </g>}
      <path d="M531 329H554V371H531Z" fill={fill("metal")} stroke={metal.deep} strokeWidth="2" />
      <rect x="548" y="323" width="30" height="54" rx="7" fill={fill("brushed")} stroke={metal.deep} strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${552 + i * 4} 328V372`} stroke={i % 2 ? metal.light : metal.dark} strokeWidth="1.5" />)}
      <path d="M578 332Q590 350 578 368" fill={fill("metal")} stroke={metal.light} strokeWidth=".8" />
      <path d={outline} fill={fill("metal")} stroke="#060A0D" strokeWidth="3" />
      <path d={outline} fill="none" stroke={metal.light} strokeOpacity=".55" strokeWidth="1" transform="translate(320 350) scale(.982) translate(-320 -350)" />
      <path d={outline} fill={fill(design.metal === "ceramic" ? "ceramic" : "brushed")} stroke={metal.deep} strokeWidth="2" transform="translate(320 350) scale(.951) translate(-320 -350)" />
      {design.metal !== "ceramic" && <path d={outline} fill={fill("grain")} transform="translate(320 350) scale(.95) translate(-320 -350)" />}
      {lightPosition && <path d={outline} fill={fill("directional-light")} pointerEvents="none" transform="translate(320 350) scale(.95) translate(-320 -350)" />}
      {design.caseShape === "cushion" && <><path d="M102 284H129V416H102M538 284H511V416H538" fill={fill("metal")} stroke={metal.dark} strokeWidth="2" /><path d="M104 290V410M536 290V410" stroke={metal.light} strokeOpacity=".65" /></>}
      {design.caseShape === "tonneau" && <><path d="M165 190Q128 350 165 510M475 190Q512 350 475 510" fill="none" stroke="#080C11" strokeWidth="9" /><path d="M164 205Q134 350 164 495M476 205Q506 350 476 495" fill="none" stroke={design.accentColor} strokeOpacity=".4" strokeWidth="2" /></>}
      {design.family === "phantom" && design.caseShape === "tonneau" && <g clipPath={fill("case-clip")}>{[0, 1, 2, 3, 4].map(index => <g key={index}><path d={`M133 ${273 + index * 31}L151 ${266 + index * 31}v7L133 ${280 + index * 31}ZM507 ${273 + index * 31}L489 ${266 + index * 31}v7L507 ${280 + index * 31}Z`} fill={metal.deep} stroke={metal.mid} strokeWidth=".5" /><path d={`M134 ${274 + index * 31}L149 ${268 + index * 31}M506 ${274 + index * 31}L491 ${268 + index * 31}`} stroke={design.accentColor} strokeOpacity=".5" strokeWidth=".7" /></g>)}</g>}
      {design.family === "abyss" && design.caseShape === "cushion" && <g>{[0, 1, 2, 3, 4].map(index => <path key={index} d={`M107 ${308 + index * 20}H125M515 ${308 + index * 20}H533`} stroke={index === 2 ? design.accentColor : metal.deep} strokeWidth={index === 2 ? "2" : "2.8"} strokeLinecap="round" />)}</g>}
      {design.family === "prism" && design.caseShape === "octagonal" && <path d="M221 138H417L531 251V447L418 561H223L109 448V253Z" fill="none" stroke={design.accentColor} strokeOpacity=".4" strokeWidth="1.4" />}
      {(design.family === "helios" || design.family === "nocturne") && design.caseShape === "round" && <g>{Array.from({ length: 12 }, (_, index) => <path key={index} d={design.family === "helios" ? "M320 133V138" : "M320 133L321 136L324 137L321 138L320 141L319 138L316 137L319 136Z"} fill={metal.face} stroke={metal.light} strokeOpacity=".7" strokeWidth={design.family === "helios" ? "1.2" : ".3"} transform={`rotate(${index * 30 + (design.family === "nocturne" ? 15 : 0)} 320 350)`} />)}</g>}
      <circle cx="320" cy="350" r={design.caseShape === "round" && design.family === "vesper" ? "207" : "201"} fill={fill("bezel")} stroke={metal.deep} strokeWidth="2" />
      {bezel === "fluted" && <g data-bezel="fluted"><circle cx="320" cy="350" r="213" fill={fill("bezel")} stroke={metal.light} strokeWidth=".6" />{[...Array(80)].map((_, index) => <g key={index} transform={`rotate(${index * 4.5} 320 350)`}><path d="M315.8 137L320 138L320 157L316.4 157Z" fill={index % 3 === 0 ? metal.light : metal.mid} /><path d="M320 138L324.2 137L323.6 157H320Z" fill={metal.deep} /><path d="M320 138V157" stroke={metal.light} strokeOpacity=".7" strokeWidth=".65" /></g>)}<circle cx="320" cy="350" r="193" fill="none" stroke={metal.light} strokeWidth="1" /></g>}
      {bezel === "iced" && <g data-bezel="iced"><circle cx="320" cy="350" r="213" fill="#D3E4EF" stroke="#F2FDFF" strokeWidth=".8" /><circle cx="320" cy="350" r="204" fill="none" stroke="#162B43" strokeWidth="18" />{[...Array(60)].map((_, index) => <g key={index} transform={`rotate(${index * 6} 320 350)`}><path d="M310.8 139H329.2L328.3 157H311.7Z" fill="#EBF7FF" stroke="#5B748E" strokeWidth=".55" /><path d="M310.8 139L316 145H324L329.2 139Z" fill="#FFFFFF" /><path d="M310.8 139L316 145V152L311.7 157Z" fill={index % 4 === 0 ? "#F5FFFF" : "#7F9FBE"} /><path d="M329.2 139L324 145V152L328.3 157Z" fill={index % 3 === 0 ? "#527B9E" : "#B6D8EF"} /><path d="M311.7 157L316 152H324L328.3 157Z" fill="#DDEDF9" /><path d="M316 145H324V152H316Z" fill={index % 5 === 0 ? "#D0F0FF" : "#FFFFFF"} stroke="#C1D5E6" strokeWidth=".4" /><path d="M316 145L324 152" stroke="#EBFCFF" strokeWidth=".7" /><circle cx="309.7" cy="148" r="1.05" fill="#F3FCFF" /></g>)}{[18, 138, 264].map((angle) => <path key={angle} d="M320 135L321.5 145L330 147L321.5 149L320 159L318.5 149L310 147L318.5 145Z" transform={`rotate(${angle} 320 350)`} fill="#FFFFFF" opacity=".85" />)}<circle cx="320" cy="350" r="192.5" fill="none" stroke="#EDF8FF" strokeWidth="1.5" /></g>}
      {bezel === "ceramic" && <g data-bezel="ceramic"><circle cx="320" cy="350" r="211" fill={fill("ceramic")} stroke="#7E8B9C" strokeWidth=".8" /><circle cx="320" cy="350" r="207.5" fill="none" stroke="#ACBDDA" strokeOpacity=".23" strokeWidth=".6" />{[...Array(12)].map((_, index) => <g key={index} transform={`rotate(${index * 30} 320 350)`}>{index === 0 ? <path d="M316.5 144H323.5L320 152Z" fill={metal.face} /> : <path d="M320 143V151" stroke={metal.face} strokeWidth={index % 3 === 0 ? "2.2" : "1"} strokeOpacity=".9" />}</g>)}<circle cx="320" cy="350" r="193" fill="none" stroke="#0A101C" strokeWidth="2" /></g>}
      <circle cx="320" cy="350" r="192" fill="#091115" stroke={metal.light} strokeWidth="1.5" />
      <circle cx="320" cy="350" r="187" fill={fill("metal")} />
      <circle cx="320" cy="350" r="181" fill="#010608" stroke={metal.deep} strokeWidth="2" />
      {screwPositions.map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="6.3" fill={metal.deep} stroke={metal.light} strokeWidth=".7" /><circle cx={x} cy={y} r="4.1" fill={fill("metal")} /><path d={`M${x - 3} ${y + 1.5}L${x + 3} ${y - 1.5}`} stroke={metal.deep} strokeWidth="1.2" /></g>)}
    </g>}

    {framing === "dial" && <g data-watch-part="immersive-bezel" opacity={eclipse ? 0.12 : lume ? 0.38 : 1}>
      <circle cx="320" cy="350" r="190" fill={fill(bezel === "ceramic" || design.metal === "ceramic" ? "ceramic" : "bezel")} stroke={metal.light} strokeWidth=".65" />
      {bezel === "fluted" && [...Array(80)].map((_, index) => <g key={index} transform={`rotate(${index * 4.5} 320 350)`}><path d="M317 161L320 163L320 169H317Z" fill={metal.light} /><path d="M320 163L323 161V169H320Z" fill={metal.deep} /></g>)}
      {bezel === "iced" && [...Array(60)].map((_, index) => <g key={index} transform={`rotate(${index * 6} 320 350)`}><path d="M311 161H329L328.5 169H311.5Z" fill="#F5FCFF" stroke="#667E99" strokeWidth=".4" /><path d="M311 161L315 164V167L311.5 169Z" fill="#8FAAC7" /><path d="M329 161L325 164V167L328.5 169Z" fill={index % 3 === 0 ? "#7D9DBC" : "#BEDDEC"} /><path d="M315 164H325V167H315Z" fill="#FFFFFF" /><circle cx="310.1" cy="165" r=".65" fill="#FFFFFF" /></g>)}
      <circle cx="320" cy="350" r="180" fill="#03080D" stroke={metal.light} strokeOpacity=".8" strokeWidth=".65" />
    </g>}

    <circle cx="320" cy="350" r="178" fill={illuminated ? "#030B0C" : fill("dial")} />
    <g clipPath={dialClip} opacity={dialOpacity}>
      {(["grid", "horizontal", "carbon", "meteorite"] as string[]).includes(design.texture) && <circle cx="320" cy="350" r="178" fill={fill(design.texture)} />}
      {design.texture === "guilloche" && <g>{[...Array(48)].map((_, index) => <ellipse key={index} cx="320" cy="307" rx="53" ry="128" transform={`rotate(${index * 7.5} 320 350)`} fill="none" stroke={index % 2 === 0 ? "#EDF8EF" : "#010A0B"} strokeOpacity={index % 2 === 0 ? ".12" : ".25"} strokeWidth={index % 2 === 0 ? ".6" : ".9"} />)}{[...Array(18)].map((_, index) => <circle key={index} cx="320" cy="350" r={48 + index * 7} fill="none" stroke="#E5F3ED" strokeOpacity=".06" strokeWidth=".55" />)}</g>}
      {design.texture === "sunburst" && <g>{[...Array(180)].map((_, i) => <path key={i} d="M320 350L317 171H319Z" transform={`rotate(${i * 2} 320 350)`} fill={i % 3 === 0 ? "white" : "black"} opacity={i % 3 === 0 ? ".045" : ".032"} />)}</g>}
      {design.texture === "lacquer" && <><path d="M136 326Q303 190 490 312" fill="none" stroke="white" strokeOpacity=".055" strokeWidth="42" /><circle cx="320" cy="350" r="171" fill="none" stroke={metal.face} strokeOpacity=".12" strokeWidth=".7" /></>}
      {mechanical && <MechanicalMovement fill={fill} accent={design.accentColor} />}
      {flagshipTexture && <FlagshipDialArtwork design={design} illuminated={illuminated} eclipse={eclipse} id={id} fill={fill} />}
      {design.texture === "skeleton" && <g>
        {[{ x: 260, y: 287, r: 54 }, { x: 380, y: 440, r: 53 }, { x: 405, y: 276, r: 37 }].map(({ x, y, r }, index) => <g key={index}><circle cx={x} cy={y} r={r} fill="#060B10" stroke="#58636A" strokeWidth="3" /><circle cx={x} cy={y} r={r - 10} fill="none" stroke="#687079" strokeOpacity=".5" strokeWidth="3" strokeDasharray="2.5 5" /><circle cx={x} cy={y} r={r - 22} fill="none" stroke={metal.mid} strokeWidth="3" />{[0, 60, 120].map((angle) => <path key={angle} d={`M${x - r + 10} ${y}H${x + r - 10}`} transform={`rotate(${angle} ${x} ${y})`} stroke="#4E5C62" strokeWidth="3" />)}<circle cx={x} cy={y} r="7" fill="#0E1114" stroke="#B37B64" strokeWidth="3" /></g>)}
        <path d="M180 280L252 214L297 276L358 256L446 236L473 282L381 312L420 397L458 461L421 499L339 424L279 461L222 487L181 453L250 371Z" fill="#1B2329" fillOpacity=".78" stroke="#65717B" strokeWidth="3" />
        <path d="M187 281L251 223L293 282L358 264L443 244M452 460L420 489L339 415L275 453" fill="none" stroke={metal.light} strokeOpacity=".25" strokeWidth="1" />
        {[[252, 240], [433, 264], [213, 448], [421, 469]].map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="5" fill={fill("metal")} /><path d={`M${x - 2.5} ${y}h5`} stroke="#11171C" strokeWidth="1.4" /></g>)}
      </g>}
      {regulator && design.texture !== "solar" && <><path d="M177 320Q233 179 363 192Q224 229 249 356Q264 448 405 495Q249 518 191 424Z" fill={fill("metal")} opacity=".24" /><path d="M195 313Q223 242 275 217M262 441Q311 481 375 490" fill="none" stroke={metal.light} strokeOpacity=".5" strokeWidth="1.2" /></>}
    </g>

    <circle cx="320" cy="350" r="173" fill="none" stroke={illuminated ? "#122521" : isLight ? "#394853" : "#071316"} strokeWidth="9" />
    <circle cx="320" cy="350" r="177" fill="none" stroke={illuminated ? "#143128" : metal.face} strokeOpacity=".5" strokeWidth=".65" />
    {chrono && <g data-chrono-ring="true" opacity={chronographRunning ? 1 : .23}>
      <circle cx="320" cy="350" r="175" fill="none" stroke={design.accentColor} strokeOpacity=".15" strokeWidth="2.3" />
      <circle ref={chronoRingRef} cx="320" cy="350" r="175" pathLength="100" transform="rotate(-90 320 350)" fill="none" stroke={illuminated ? lumeColor : design.accentColor} strokeWidth={mechanical ? "2.4" : "1.7"} strokeLinecap="round" strokeDasharray="100 100" strokeDashoffset="100" filter={chronographRunning ? fill("glow") : undefined} />
    </g>}
    {[...Array(60)].map((_, i) => <path key={i} d={`M320 180v${i % 5 === 0 ? 7 : 3.4}`} transform={`rotate(${i * 6} 320 350)`} stroke={i % 5 === 0 && chrono ? design.accentColor : ink} strokeOpacity={i % 5 === 0 ? ".85" : ".48"} strokeWidth={i % 5 === 0 ? "1.8" : ".75"} />)}
    {gmt && <g data-complication="gmt">{[...Array(12)].map((_, i) => {
      if (i === 6 && engraved) return null;
      const a = i * Math.PI / 6;
      return <text key={i} x={320 + Math.sin(a) * 157} y={350 - Math.cos(a) * 157 + 3} textAnchor="middle" fontSize="8" fontWeight="600" fill={i < 6 ? ink : design.accentColor}>{String(i * 2 || 24).padStart(2, "0")}</text>;
    })}<circle cx="320" cy="350" r="146" fill="none" stroke={ink} strokeOpacity=".16" strokeWidth=".5" /></g>}

    <g filter={illuminated ? fill("glow") : undefined}>
      {[...Array(12)].map((_, i) => {
        if (date && i === (datePosition === "bottom" ? 6 : datePosition === "right" ? 3 : -1)) return null;
        if (chrono && i === 6) return null;
        if ((lowerFeature || regulator || smallSeconds || engraved) && i === 6) return null;
        if (gmt && chrono && (i === 3 || i === 9)) return null;
        if (gmt && regulator && (i === 0 || i === 3 || i === 9)) return null;
        if (regulator && date && i === 9) return null;
        const angle = i * 30;
        const a = angle * Math.PI / 180;
        if (design.markers === "roman" || design.markers === "arabic") return <text key={i} x={320 + Math.sin(a) * (markerRadius - 1)} y={350 - Math.cos(a) * (markerRadius - 1) + 5} fill={ink} textAnchor="middle" fontFamily={design.markers === "roman" ? "Georgia, serif" : "inherit"} fontSize={design.markers === "roman" ? "16" : "19"} fontWeight={design.markers === "arabic" ? "600" : "400"} letterSpacing={design.markers === "roman" ? "1" : "-1"}>{design.markers === "roman" ? roman[i] : (i || 12)}</text>;
        if (design.markers === "minimal") return <g key={i} transform={`rotate(${angle} 320 350)`}><circle cx="320" cy={350 - markerRadius} r={i % 3 === 0 ? 2.7 : 1.4} fill={ink} /><path d={`M320 ${350 - markerRadius - 10}v5`} stroke={ink} strokeWidth=".6" /></g>;
        return <g key={i} transform={`rotate(${angle} 320 350)`}>
          <rect x={i === 0 ? 311 : 315} y={350 - markerRadius - 9} width={i === 0 ? 18 : 10} height="27" rx=".7" fill="#040B0F" transform="translate(1.8 2)" opacity=".65" />
          <path d={`M${i === 0 ? 311 : 315} ${350 - markerRadius - 9}h${i === 0 ? 18 : 10}l-1 27h-${i === 0 ? 16 : 8}Z`} fill={illuminated ? shade(lumeColor, 0.18) : fill("hand")} stroke={illuminated ? lumeColor : metal.light} strokeWidth=".6" />
          <rect x={i === 0 ? 314 : 317.7} y={350 - markerRadius - 6} width={i === 0 ? 4 : 4.6} height="20" fill={illuminated ? lumeColor : "#C4D6C8"} />
          {i === 0 && <rect x="322" y={350 - markerRadius - 6} width="4" height="20" fill={illuminated ? lumeColor : "#C4D6C8"} />}
        </g>;
      })}
    </g>

    {chrono && <g data-complication="chronograph" data-chronograph-registers={lowerFeature ? "2" : "3"}>{subdial(239, 350, 43, 60, "60")}{subdial(401, 350, 43, 30, "30")}{!lowerFeature && subdial(320, 438, 43, 12, "12")}</g>}
    {regulator && <g data-complication="regulator">{subdial(320, 276, 48, 12, "12")}{subdial(320, 443, 37, 60, "60")}</g>}
    {smallSeconds && subdial(320, 443, 35, 60, "60")}

    {mechanical && chrono && <path d="M276 226H364L371 270H269Z" fill="#061013" fillOpacity=".87" stroke="#48615E" strokeWidth=".5" />}
    {!regulator && <g textAnchor="middle" fill={ink}>
      <path d={chrono ? "M307 235L314 244L320 233L326 244L333 235" : "M307 266L314 275L320 264L326 275L333 266"} fill="none" stroke={ink} strokeWidth="1.4" />
      <text x="321" y={chrono ? 263 : 296} fontSize={design.family === "vesper" ? "15" : "14"} fontWeight="500" letterSpacing="4.5">WATCHMÉ</text>
      {!chrono && <text x="320" y="314" fontSize="6.5" letterSpacing="2.5" fill={mutedInk}>PRIVATE ATELIER</text>}
      {!chrono && !smallSeconds && <text x="320" y={lowerFeature ? "394" : "413"} fontSize={lowerFeature ? "8" : "10"} letterSpacing={lowerFeature ? "2.5" : "3"} fill={mutedInk}>{design.family.toUpperCase()}</text>}
      {!chrono && !smallSeconds && !lowerFeature && <text x="320" y="431" fontSize="6" letterSpacing="1.6" fill={mutedInk}>{gmt ? "TWO PLACES. ONE MOMENT." : "YOUR TIME. YOUR RULES."}</text>}
      {chrono && !lowerFeature && <text x="320" y="495" fontSize="7" letterSpacing="2.4" fill={design.accentColor}>{`${design.family.toUpperCase()} · CHRONOGRAPH`}</text>}
    </g>}
    {regulator && design.texture === "solar" && <g opacity={illuminated ? ".8" : "1"}>
      <rect x={date ? "182" : "190"} y={date ? "325" : "333"} width={date ? "88" : "68"} height={date ? "49" : "37"} rx="3" fill="#081013" fillOpacity=".88" stroke={metal.dark} strokeWidth=".65" />
      {!date && <rect x="368" y="324" width="84" height="38" rx="3" fill="#081013" fillOpacity=".88" stroke={metal.dark} strokeWidth=".65" />}
      <path d={date ? "M185 326H267" : "M193 334H255M371 325H449"} stroke={metal.light} strokeOpacity=".18" strokeWidth=".6" />
    </g>}
    {regulator && <g fill={ink} textAnchor="middle"><text x={date ? "226" : "411"} y="338" fontSize="9" letterSpacing="2">WATCHMÉ</text><text x={date ? "226" : "411"} y={date ? "353" : "356"} fontSize="6" letterSpacing="2" fill={mutedInk}>REGULATOR</text><text x={date ? "226" : "224"} y={date ? "367" : "347"} fontSize={date ? "6" : "8"} letterSpacing="1.5" fill={mutedInk}>{design.family.toUpperCase()}</text>{!date && <text x="224" y="363" fontSize="6" letterSpacing="1.5" fill={mutedInk}>H / M / S</text>}</g>}
    {date && (() => {
      const x = datePosition === "right" ? gmt ? 418 : 426 : 298;
      const y = datePosition === "top" ? 285 : datePosition === "bottom" ? 468 : 337;
      return <g data-complication="date" data-date-position={datePosition}><rect x={x - 2} y={y - 2} width="48" height="29" rx="1" fill={fill("bezel")} /><rect x={x} y={y} width="44" height="25" fill={isLight ? "#192731" : "#CAD6D0"} stroke="#050E11" strokeWidth="2" /><path d={`M${x + 2} ${y + 2}H${x + 42}`} stroke="#000" strokeOpacity=".4" strokeWidth="2" /><text ref={dateRef} x={x + 22} y={y + 18} textAnchor="middle" fill={isLight ? "#E0E7E6" : "#102119"} fontSize="17" fontFamily="Arial, sans-serif" fontWeight="600">—</text></g>;
    })()}
    {hasWeather && <g data-complication="weather" textAnchor="middle">
      {weather && weather.code <= 1 ? <g fill="none" stroke={ink} strokeWidth="1.1"><circle cx="295" cy="444" r="6" />{[0, 45, 90, 135].map((angle) => <path key={angle} d="M295 432v3M295 453v3" transform={`rotate(${angle} 295 444)`} />)}</g> : <path d="M292 451a7 7 0 1 1 7-9a5 5 0 1 1 2 9Z" fill="none" stroke={ink} strokeWidth="1.1" />}
      <text x="330" y="454" fill={ink} fontSize="21" fontWeight="300">{weather ? `${Math.round(weather.temperature)}°` : "—"}</text><text x="320" y="471" fill={mutedInk} fontSize="6.5" letterSpacing="1.5">{weather ? weather.description.toUpperCase().slice(0, 24) : "WEATHER UNAVAILABLE"}</text>
    </g>}
    {dayNight && <g data-complication="daynight">
      <title>Local 24-hour day and night</title>
      <path d="M260 442Q262 399 320 398Q378 399 380 442Q320 462 260 442Z" fill={fill("bezel")} stroke={metal.deep} strokeWidth="1.2" />
      <path d="M264 440Q267 403 320 402Q373 403 376 440Q320 457 264 440Z" fill="#030811" stroke={metal.light} strokeWidth=".55" />
      <g clipPath={fill("daynight-aperture")}>
        <g ref={dayNightDiscRef} data-daynight-disc="true" data-daynight-hour="" data-daynight-state="" transform="rotate(0 320 435)">
          <g clipPath={fill("daynight-disc-clip")}>
            <circle cx="320" cy="435" r="51" fill={fill("daynight-night")} />
            <rect x="269" y="435" width="102" height="51" fill={fill("daynight-day")} />
            <path d="M276 435H364" stroke="#DABF8F" strokeOpacity=".35" strokeWidth=".8" />
            {[[290, 421], [303, 404], [337, 419], [350, 426], [333, 399]].map(([x, y], index) => <path key={index} d={`M${x} ${y - 2}v4M${x - 2} ${y}h4`} stroke={illuminated ? lumeColor : "#DEDFF5"} strokeOpacity={index % 2 ? ".6" : ".85"} strokeWidth=".65" />)}
            <path data-daynight-moon="true" d="M323 406A8 8 0 1 0 325 420A9 9 0 0 1 323 406Z" fill={illuminated ? lumeColor : "#E9E4F5"} stroke="#AEB7D2" strokeWidth=".35" />
            <g data-daynight-sun="true" fill={illuminated ? lumeColor : "#FFE0A3"} stroke={illuminated ? lumeColor : "#FFE0A3"}>
              <circle cx="320" cy="456" r="7" strokeWidth=".4" />
              {Array.from({ length: 8 }, (_, index) => <path key={index} d="M320 445V443" strokeWidth="1" strokeLinecap="round" transform={`rotate(${index * 45} 320 456)`} />)}
            </g>
          </g>
        </g>
      </g>
      <path d="M316 401H324L320 407Z" fill={metal.light} />
      <path d="M270 440Q320 454 370 440" fill="none" stroke={metal.light} strokeOpacity=".55" strokeWidth=".6" />
      <text ref={dayNightLabelRef} data-daynight-label="true" x="320" y="471" textAnchor="middle" fill={ink} fontSize="8" letterSpacing="2">24H</text>
    </g>}
    {moonPhase && <MoonPhaseDial id={id} fill={fill} ink={ink} mutedInk={mutedInk} isLight={isLight} lumeColor={lumeColor} illuminated={illuminated} eclipse={eclipse} discRef={moonDiscRef} terminatorRef={moonTerminatorRef} nameRef={moonNameRef} illuminationRef={moonIlluminationRef} descriptionRef={moonDescriptionRef} />}
    {engraved && <text data-watch-engraving="true" x="320" y="510" fill={ink} textAnchor="middle" fontSize={engravingLength > 16 ? "6.4" : "7.5"} letterSpacing=".85">{initials && <tspan>{initials}</tspan>}{initials && signature && <tspan> · </tspan>}{signature && <tspan>{signature}</tspan>}</text>}

    {(chrono || regulator || smallSeconds) && <g fill={design.accentColor}>
      <g ref={subSecondRef}><path d={chrono ? "M239 319V359" : regulator ? "M320 415V452" : "M320 417V452"} stroke={illuminated ? lumeColor : design.accentColor} strokeWidth="1.6" /><circle cx={chrono ? "239" : "320"} cy={chrono ? "350" : "443"} r="3" /></g>
      {chrono && <g ref={subMinuteRef} data-chronograph-hand="minutes"><path d="M401 319V359" stroke={illuminated ? lumeColor : design.accentColor} strokeWidth="1.8" /><circle cx="401" cy="350" r="3" /></g>}
      {(chrono && !lowerFeature || regulator) && <g ref={subHourRef} data-chronograph-hand={chrono ? "hours" : undefined}><path d={chrono ? "M320 408V447" : "M320 243L324 254L322 285H318L316 254Z"} fill={regulator ? fill("hand") : "none"} stroke={illuminated ? lumeColor : design.accentColor} strokeWidth={chrono ? "1.8" : ".6"} /><circle cx="320" cy={chrono ? "438" : "276"} r="3.5" fill={metal.light} /></g>}
    </g>}
    {gmt && <g ref={gmtRef} filter={fill("hand-shadow")}><path d="M320 359V225" stroke={design.accentColor} strokeWidth="3" /><path d="M320 210L310 230H330Z" fill={design.accentColor} stroke="#172A39" strokeWidth=".8" /><circle cx="320" cy="350" r="7" fill={design.accentColor} /></g>}
    <g filter={illuminated ? fill("glow") : fill("hand-shadow")}>
      {!regulator && <g ref={hourRef}><Hand kind={design.hands} length={97} width={design.hands === "baton" ? 15 : 12} metal={fill("hand")} lume={illuminated} accent={lumeColor} /></g>}
      <g ref={minuteRef}><Hand kind={design.hands} length={139} width={design.hands === "baton" ? 11 : 9} metal={fill("hand")} lume={illuminated} accent={lumeColor} /></g>
    </g>
    {!regulator && !smallSeconds && <g ref={secondRef} data-chronograph-hand={chrono ? "seconds" : undefined}>
      <path d="M320 193V385" stroke="#000" strokeOpacity=".45" strokeWidth="2.5" transform="translate(1 2)" />
      <path d="M320 193V388" stroke={design.accentColor} strokeWidth="1.35" />
      <path d="M318.5 192L320 184L321.5 192Z" fill={design.accentColor} />
      <circle cx="320" cy="378" r="5.5" fill="none" stroke={design.accentColor} strokeWidth="1.6" />
    </g>}
    <circle cx="320" cy="350" r="8" fill={fill("bezel")} stroke="#0C1418" strokeWidth="1" />
    <circle cx="320" cy="350" r="3.6" fill={illuminated ? lumeColor : metal.light} />
    <circle cx="319" cy="349" r="1.2" fill="white" fillOpacity=".85" />
    <circle cx="320" cy="350" r="178" fill={fill("crystal")} opacity={eclipse ? ".03" : lume ? ".15" : "1"} pointerEvents="none" />
    {lightPosition && <circle cx="320" cy="350" r="178" fill={fill("directional-light")} opacity={eclipse ? ".02" : lume ? ".12" : ".55"} pointerEvents="none" />}
    <path d="M181 241A177 177 0 0 1 416 200" fill="none" stroke="white" strokeOpacity={eclipse ? ".015" : lume ? ".05" : ".26"} strokeWidth="1.2" />
    <path d="M207 486A177 177 0 0 0 468 448" fill="none" stroke={design.accentColor} strokeOpacity=".14" strokeWidth=".7" />
  </svg>;
}

export default WatchFace;
