"use client";

import { memo, useEffect, useId, useRef } from "react";
import type { RefObject } from "react";
import type { WatchDesign } from "@/lib/types";
import { getAtmosphere } from "@/lib/unreal";
import { atmosphereParticleCount, LIQUID_POOLS, liquidDroplet, liquidGeometry, snowParticle, unrealSeed } from "@/lib/unreal-simulation";
import type { AtmosphereImpulse } from "@/lib/unreal-simulation";

interface UnrealDialProps {
  design: WatchDesign;
  live: boolean;
  illuminated: boolean;
  eclipse: boolean;
  fullDial: boolean;
  markerRadius: number;
  rootRef: RefObject<SVGSVGElement | null>;
}

/** Every paint server lives inside this group so a live layer is a portable SVG snapshot. */
export const UnrealDial = memo(function UnrealDial({ design, live, illuminated, eclipse, fullDial, markerRadius, rootRef }: UnrealDialProps) {
  const unique = useId().replace(/:/g, "");
  const id = (name: string) => `${unique}-unreal-${name}`;
  const fill = (name: string) => `url(#${id(name)})`;
  const layerRef = useRef<SVGGElement>(null);
  const texture = design.texture === "snow" ? "snow" : "liquid";
  const atmosphere = getAtmosphere(design);
  const { intensity, density, gravity, color, calm } = atmosphere;
  const count = atmosphereParticleCount(texture, density);
  const night = illuminated || eclipse;

  useEffect(() => {
    const layerNode = layerRef.current;
    const svgNode = rootRef.current;
    if (!layerNode || !svgNode || !live) return;
    const layer = layerNode;
    const svg = svgNode;
    const settings = { intensity, density, gravity, color, calm };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pools = [...layer.querySelectorAll<SVGGElement>("[data-liquid-pool]")].map(node => ({
      surfaces: [...node.querySelectorAll<SVGPathElement>("[data-liquid-surface]")],
      ridge: node.querySelector<SVGPathElement>("[data-liquid-ridge]"),
      crease: node.querySelector<SVGPathElement>("[data-liquid-crease]"),
    }));
    const particles = [...layer.querySelectorAll<SVGGElement>("[data-unreal-particle]")];
    const wake = layer.querySelector<SVGPathElement>("[data-unreal-wake]");
    let impulse: AtmosphereImpulse | null = null;
    let visible = true;
    let frame = 0;
    let lastPaint = -Infinity;
    let interactionCount = Number(layer.dataset.unrealInteractions || 0);
    let frozenTimestamp = 0;
    let drag: { id: number; startX: number; startY: number; lastX: number; lastY: number; active: boolean } | null = null;
    const canAnimate = () => !calm && !reduced.matches && intensity > 0;
    function paint(timestamp: number) {
      if (texture === "liquid") {
        pools.forEach((pool, index) => {
          const paths = liquidGeometry(LIQUID_POOLS[index], timestamp, settings, impulse);
          pool.surfaces.forEach(surface => surface.setAttribute("d", paths.body));
          pool.ridge?.setAttribute("d", paths.ridge);
          pool.crease?.setAttribute("d", paths.crease);
        });
        particles.forEach((particle, index) => {
          const point = liquidDroplet(index, timestamp, settings, impulse);
          particle.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
        });
      } else {
        particles.forEach((particle, index) => {
          const point = snowParticle(index, timestamp, settings, impulse);
          particle.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${point.angle.toFixed(2)})`);
        });
      }
      if (wake && impulse) {
        const decay = Math.exp(-Math.max(0, timestamp - impulse.at) / 1400);
        const { x, y, dx, dy } = impulse;
        wake.setAttribute("d", `M${x - dx * 1.6} ${y - dy * .4}Q${x - dx * .6} ${y - 18 - dy * .6} ${x} ${y}T${x + dx * 1.2} ${y + dy * .8}`);
        wake.setAttribute("opacity", String(decay * .55));
      }
      // A timestamp, rather than a frame counter, also identifies the exact exported state.
      layer.setAttribute("data-unreal-frame", String(timestamp));
      frozenTimestamp = timestamp;
    }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function tick(timestamp: number) {
      if (timestamp - lastPaint >= 1000 / 30) { paint(Date.now()); lastPaint = timestamp; }
      frame = requestAnimationFrame(tick);
    }
    function start() {
      stop();
      layer.setAttribute("data-unreal-motion", !visible || document.hidden ? "suspended" : !canAnimate() ? "still" : "live");
      if (!visible || document.hidden || !canAnimate()) return;
      paint(Date.now());
      frame = requestAnimationFrame(tick);
    }
    function interact(x: number, y: number, dx: number, dy: number) {
      if (!visible || document.hidden) return;
      const timestamp = canAnimate() ? Date.now() : frozenTimestamp;
      impulse = { x, y, dx: Math.max(-70, Math.min(70, dx)), dy: Math.max(-50, Math.min(50, dy)), at: timestamp };
      interactionCount += 1;
      layer.setAttribute("data-unreal-interactions", String(interactionCount));
      paint(timestamp);
    }
    function coordinates(event: PointerEvent) {
      const matrix = svg!.getScreenCTM();
      if (!matrix) return null;
      return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    }
    function isControl(target: EventTarget | null) { return target instanceof Element && Boolean(target.closest('button, [role="button"], input, select, textarea, a')); }
    function down(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || isControl(event.target)) return;
      const point = coordinates(event);
      if (!point || Math.hypot(point.x - 320, point.y - 350) > 178) return;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: point.x, lastY: point.y, active: false };
    }
    function move(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = Math.abs(event.clientX - drag.startX), dy = Math.abs(event.clientY - drag.startY);
      if (!drag.active) {
        // Let vertical touch gestures remain ordinary page scrolling.
        if (dy > 8 && dy > dx * 1.1) { drag = null; return; }
        if (dx <= 8 || dx <= dy * 1.1) return;
        drag.active = true;
        svg!.setPointerCapture(event.pointerId);
        svg!.focus({ preventScroll: true });
      }
      const point = coordinates(event);
      if (!point) return;
      event.preventDefault();
      event.stopPropagation();
      interact(point.x, point.y, (point.x - drag.lastX) * 2.4, (point.y - drag.lastY) * 2.4);
      drag.lastX = point.x;
      drag.lastY = point.y;
    }
    function up(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      if (svg!.hasPointerCapture(event.pointerId)) svg!.releasePointerCapture(event.pointerId);
      drag = null;
    }
    function key(event: KeyboardEvent) {
      if (event.target !== svg || isControl(event.target)) return;
      const vectors: Record<string, [number, number]> = { ArrowRight: [40, 0], ArrowLeft: [-40, 0], ArrowUp: [12, -35], ArrowDown: [-12, 35], " ": [interactionCount % 2 ? -55 : 55, 22] };
      const vector = vectors[event.key];
      if (!vector) return;
      event.preventDefault();
      event.stopPropagation();
      interact(320, 350, ...vector);
    }
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); }) : null;
    observer?.observe(svg);
    document.addEventListener("visibilitychange", start);
    reduced.addEventListener("change", start);
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move, { passive: false });
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);
    svg.addEventListener("keydown", key);
    start();
    return () => {
      stop(); observer?.disconnect();
      document.removeEventListener("visibilitychange", start); reduced.removeEventListener("change", start);
      svg.removeEventListener("pointerdown", down); svg.removeEventListener("pointermove", move); svg.removeEventListener("pointerup", up); svg.removeEventListener("pointercancel", up); svg.removeEventListener("keydown", key);
    };
  }, [live, texture, intensity, density, gravity, color, calm, rootRef]);

  return <g ref={layerRef} data-unreal-layer={texture} data-unreal-frame="0" data-unreal-interactions="0" data-unreal-motion="still" opacity={fullDial ? .11 : eclipse ? .28 : illuminated ? .43 : 1} pointerEvents="none">
    <defs>
      <clipPath id={id("boundary")}><circle cx="320" cy="350" r="178" /></clipPath>
      <radialGradient id={id("depth")} cx=".43" cy=".3" r=".85"><stop stopColor={texture === "snow" ? "#19394B" : "#162B38"}/><stop offset=".6" stopColor={texture === "snow" ? "#0C202D" : "#06121B"}/><stop offset="1" stopColor="#02070D"/></radialGradient>
      <linearGradient id={id("chrome")} x1=".13" y1="0" x2=".74" y2="1"><stop stopColor="#F2FDFF"/><stop offset=".09" stopColor={color}/><stop offset=".21" stopColor="#78929F"/><stop offset=".29" stopColor="#152E40"/><stop offset=".39" stopColor="#051019"/><stop offset=".44" stopColor="#152E40"/><stop offset=".485" stopColor="#E3F5FB"/><stop offset=".515" stopColor="#FFFFFF"/><stop offset=".555" stopColor="#8EA9B7"/><stop offset=".7" stopColor="#2D4A60"/><stop offset=".83" stopColor="#06101C"/><stop offset=".93" stopColor={color}/><stop offset="1" stopColor="#D8F4FC"/></linearGradient>
      <linearGradient id={id("rim")} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#FFFFFF"/><stop offset=".37" stopColor={color}/><stop offset=".55" stopColor="#284B63"/><stop offset=".8" stopColor="#CBECF7"/><stop offset="1" stopColor="#3D687C"/></linearGradient>
      <linearGradient id={id("glint")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFFFFF" stopOpacity=".96"/><stop offset=".48" stopColor="#FFFFFF" stopOpacity=".68"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient>
      <radialGradient id={id("drop")} cx=".32" cy=".2" r=".78"><stop stopColor="#FFFFFF"/><stop offset=".12" stopColor="#E8FAFF"/><stop offset=".28" stopColor={color}/><stop offset=".47" stopColor="#264659"/><stop offset=".7" stopColor="#071522"/><stop offset=".87" stopColor="#7395AA"/><stop offset="1" stopColor="#E4F8FF"/></radialGradient>
      <radialGradient id={id("quiet")}><stop stopColor="#03101B" stopOpacity=".8"/><stop offset=".67" stopColor="#03101B" stopOpacity=".36"/><stop offset="1" stopColor="#03101B" stopOpacity="0"/></radialGradient>
      <linearGradient id={id("snowbank")} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#F2FCFF"/><stop offset=".12" stopColor="#CAE9F3"/><stop offset=".38" stopColor={color}/><stop offset=".65" stopColor="#446A82"/><stop offset="1" stopColor="#102C40"/></linearGradient>
      <linearGradient id={id("ice")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F8FDFF"/><stop offset=".25" stopColor="#AFD9EB"/><stop offset=".5" stopColor="#5E8DAA" stopOpacity=".55"/><stop offset=".52" stopColor="#E5F7FF"/><stop offset=".7" stopColor={color} stopOpacity=".6"/><stop offset="1" stopColor="#46758E" stopOpacity=".15"/></linearGradient>
      <radialGradient id={id("flake")}><stop stopColor="#FFFFFF"/><stop offset=".28" stopColor="#ECF9FF" stopOpacity=".95"/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient>
      <filter id={id("soft")} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="1.7"/></filter>
      <filter id={id("pool-shadow")} x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="1.5" dy="6" stdDeviation="3" floodColor="#00040B" floodOpacity=".8"/></filter>
    </defs>
    <g clipPath={fill("boundary")}>
      <circle cx="320" cy="350" r="178" fill={fill("depth")}/>
      {texture === "liquid" ? <>
        <g fill="none" stroke={color} strokeOpacity=".07" strokeWidth=".6">{Array.from({ length: 9 }, (_, index) => <ellipse key={index} cx="321" cy="364" rx={83 + index * 13} ry={64 + index * 15} transform={`rotate(-25 320 350)`}/>)}</g>
        {LIQUID_POOLS.map((pool, index) => {
          const paths = liquidGeometry(pool, 0, atmosphere);
          return <g key={index} data-liquid-pool={index} filter={fill("pool-shadow")}>
            <path data-liquid-surface="true" d={paths.body} fill={fill("chrome")} stroke={fill("rim")} strokeWidth="1.3"/>
            <path data-liquid-surface="true" d={paths.body} fill={color} fillOpacity={night ? ".17" : ".08"}/>
            <path data-liquid-ridge="true" d={paths.ridge} fill="none" stroke={fill("glint")} strokeWidth="2.2" strokeLinecap="round"/>
            <path data-liquid-crease="true" d={paths.crease} fill="none" stroke="#030E19" strokeOpacity=".75" strokeWidth="2.4" strokeLinecap="round"/>
          </g>;
        })}
        {Array.from({ length: count }, (_, index) => {
          const point = liquidDroplet(index, 0, atmosphere);
          return <g key={index} data-unreal-particle={index} transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`}>
            <ellipse cy={point.radius * .56} rx={point.radius * 1.03} ry={point.radius * .86} fill="#000712" opacity=".7"/>
            <circle r={point.radius} fill={fill("drop")} stroke={color} strokeOpacity=".45" strokeWidth=".5"/>
            <ellipse cx={-point.radius * .22} cy={-point.radius * .38} rx={point.radius * .32} ry={point.radius * .12} fill="#FFF" opacity=".9" transform="rotate(-28)"/>
          </g>;
        })}
      </> : <>
        <path d="M126 409Q166 388 191 409T265 447Q301 455 341 444T423 432Q474 416 512 382V543H124Z" fill="#5B91AA" fillOpacity=".075"/>
        <path d="M129 455Q162 414 188 442Q204 430 221 466Q243 459 263 481Q294 472 320 490Q362 469 396 479Q423 456 442 462Q470 420 507 413L524 546H123Z" fill={fill("ice")} fillOpacity=".26"/>
        <path d="M134 479Q148 468 162 469Q167 453 181 461Q197 450 206 475Q217 467 229 486Q244 479 255 494Q278 488 291 501Q309 487 323 503Q343 491 358 503Q375 482 391 494Q408 477 425 482Q445 456 458 464Q472 439 488 451Q508 444 521 463V548H127Z" fill={fill("snowbank")} opacity={.4 + density / 170}/>
        <path d="M154 473Q165 458 180 463Q194 454 207 478M260 497Q278 491 290 503M371 498Q383 484 395 498M425 483Q446 461 457 467" fill="none" stroke="#F4FCFF" strokeWidth="2" strokeLinecap="round" opacity=".82"/>
        <path d="M181 467L193 482L184 496M192 482L207 486M437 476L431 492L443 511M431 492L418 498M320 508L326 519L318 529" fill="none" stroke="#E0F5FF" strokeOpacity=".29" strokeWidth=".7"/>
        {Array.from({ length: 29 }, (_, index) => {
          const angle = index * 360 / 29;
          const length = 5 + unrealSeed(index, 12) * 22;
          return <path key={index} d={`M316 169L320 ${172 + length}L325 169L321 165Z`} transform={`rotate(${angle} 320 350)`} fill={fill("ice")} opacity={.15 + density / 190} stroke="#DCF7FF" strokeOpacity=".4" strokeWidth=".4"/>;
        })}
        {design.markers !== "none" && Array.from({ length: 12 }, (_, index) => <g key={index} transform={`rotate(${index * 30} 320 350)`} opacity={.35 + density / 160}>
          <path d={`M310 ${340 - markerRadius}q3-4 7-2q5-7 10-2q5 0 6 5l-7 3l-7-1l-9 2Z`} fill={fill("snowbank")} stroke="#EAFBFF" strokeWidth=".45"/>
          <path d={`M310 ${341 - markerRadius}l2 11l4-10m11-2l3 8l2-10`} fill={fill("ice")}/>
        </g>)}
        {Array.from({ length: count }, (_, index) => {
          const point = snowParticle(index, 0, atmosphere);
          return <g key={index} data-unreal-particle={index} transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${point.angle.toFixed(2)})`} opacity={point.opacity}>
            {point.depth > .82 ? <><circle r={point.radius * 2.4} fill={fill("flake")} opacity=".42"/><path d={`M0 ${-point.radius}V${point.radius}M${-point.radius * .87} ${-point.radius * .5}L${point.radius * .87} ${point.radius * .5}M${-point.radius * .87} ${point.radius * .5}L${point.radius * .87} ${-point.radius * .5}`} fill="none" stroke="#F0FBFF" strokeWidth=".55" strokeLinecap="round"/></> : <circle r={point.radius} fill={point.depth < .3 ? color : "#EAF8FF"}/>}
          </g>;
        })}
        <path d="M138 291Q184 268 216 306M421 219Q449 251 477 262M187 409Q223 434 248 430" fill="none" stroke={color} strokeOpacity=".055" strokeWidth="12" filter={fill("soft")}/>
      </>}
      <ellipse cx="320" cy="333" rx="104" ry="131" fill={fill("quiet")}/>
      <path data-unreal-wake="true" d="M320 350" fill="none" stroke={color} strokeWidth={texture === "liquid" ? "1.3" : "2.2"} strokeLinecap="round" opacity="0"/>
      <circle cx="320" cy="350" r="176" fill="none" stroke={color} strokeOpacity=".2" strokeWidth="1"/>
    </g>
  </g>;
});
