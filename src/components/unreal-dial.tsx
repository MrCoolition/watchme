"use client";

import { memo, useEffect, useId, useRef } from "react";
import type { RefObject } from "react";
import type { WatchDesign } from "@/lib/types";
import { getAtmosphere } from "@/lib/unreal";
import { atmosphereParticleCount, auroraCurtain, sceneComet, sceneLight, snowParticle, unrealSeed } from "@/lib/unreal-simulation";
import type { AtmosphereImpulse } from "@/lib/unreal-simulation";
import { WhiteoutScene } from "@/components/whiteout-scene";

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
  const atmosphere = getAtmosphere(design);
  const { intensity, density, gravity, color, calm, scene } = atmosphere;
  const count = atmosphereParticleCount(density);

  useEffect(() => {
    const layerNode = layerRef.current;
    const svgNode = rootRef.current;
    if (!layerNode || !svgNode || !live) return;
    const layer = layerNode;
    const svg = svgNode;
    const settings = { intensity, density, gravity, color, calm };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = [...layer.querySelectorAll<SVGGElement>("[data-unreal-particle]")];
    const auroras = [...layer.querySelectorAll<SVGPathElement>("[data-scene-aurora]")];
    const lights = [...layer.querySelectorAll<SVGElement>("[data-scene-light]")];
    const comet = layer.querySelector<SVGGElement>("[data-scene-comet]");
    const wake = layer.querySelector<SVGPathElement>("[data-unreal-wake]");
    let impulse: AtmosphereImpulse | null = null;
    let visible = true;
    let frame = 0;
    let lastPaint = -Infinity;
    let interactionCount = 0;
    let frozenTimestamp = Number(layer.dataset.unrealFrame || 0);
    let drag: { id: number; startX: number; startY: number; lastX: number; lastY: number; active: boolean } | null = null;
    const canAnimate = () => !calm && !reduced.matches && intensity > 0;
    function paint(timestamp: number) {
      particles.forEach((particle, index) => {
        const point = snowParticle(index, timestamp, settings, impulse);
        particle.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${point.angle.toFixed(2)})`);
      });
      auroras.forEach((curtain, index) => curtain.setAttribute("d", auroraCurtain(index, timestamp, intensity)));
      lights.forEach((light, index) => light.setAttribute("opacity", String(sceneLight(index, timestamp, intensity))));
      if (comet) {
        const point = sceneComet(timestamp, intensity);
        comet.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
        comet.setAttribute("opacity", String(point.opacity));
      }
      if (wake && !impulse) wake.setAttribute("opacity", "0");
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
    // A settings change starts a new interaction state at the same captured instant.
    layer.setAttribute("data-unreal-interactions", "0");
    paint(frozenTimestamp);
    start();
    return () => {
      stop(); observer?.disconnect();
      document.removeEventListener("visibilitychange", start); reduced.removeEventListener("change", start);
      svg.removeEventListener("pointerdown", down); svg.removeEventListener("pointermove", move); svg.removeEventListener("pointerup", up); svg.removeEventListener("pointercancel", up); svg.removeEventListener("keydown", key);
    };
  }, [live, intensity, density, gravity, color, calm, scene, rootRef]);

  return <g ref={layerRef} data-unreal-layer="snow" data-whiteout-scene={scene} data-unreal-frame="0" data-unreal-interactions="0" data-unreal-motion="still" opacity={fullDial ? .11 : eclipse ? .28 : illuminated ? .43 : 1} pointerEvents="none">
    <defs>
      <clipPath id={id("boundary")}><circle cx="320" cy="350" r="178" /></clipPath>
      <radialGradient id={id("quiet")}><stop stopColor="#03101B" stopOpacity=".36"/><stop offset=".6" stopColor="#03101B" stopOpacity=".14"/><stop offset="1" stopColor="#03101B" stopOpacity="0"/></radialGradient>
      <linearGradient id={id("snowbank")} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#F2FCFF"/><stop offset=".12" stopColor="#CAE9F3"/><stop offset=".38" stopColor={color}/><stop offset=".65" stopColor="#446A82"/><stop offset="1" stopColor="#102C40"/></linearGradient>
      <linearGradient id={id("ice")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F8FDFF"/><stop offset=".25" stopColor="#AFD9EB"/><stop offset=".5" stopColor="#5E8DAA" stopOpacity=".55"/><stop offset=".52" stopColor="#E5F7FF"/><stop offset=".7" stopColor={color} stopOpacity=".6"/><stop offset="1" stopColor="#46758E" stopOpacity=".15"/></linearGradient>
      <radialGradient id={id("flake")}><stop stopColor="#FFFFFF"/><stop offset=".28" stopColor="#ECF9FF" stopOpacity=".95"/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient>
    </defs>
    <g clipPath={fill("boundary")}>
      <WhiteoutScene scene={scene} color={color} intensity={intensity} id={id}/>
      {scene === "glacier" && <>
        <path d="M134 491Q152 473 177 483Q197 470 213 494Q244 486 268 508Q290 495 317 515Q342 501 367 514Q403 489 429 500Q459 472 480 478Q504 464 521 476V548H127Z" fill={fill("snowbank")} opacity={.3 + density / 200}/>
        <path d="M155 484Q177 473 187 484M266 510Q291 499 306 514M427 502Q448 482 468 485" fill="none" stroke="#F4FCFF" strokeWidth="1.5" strokeLinecap="round" opacity=".72"/>
      </>}
      {Array.from({ length: 29 }, (_, index) => {
        const angle = index * 360 / 29;
        const length = 3 + unrealSeed(index, 12) * 13;
        return <path key={index} d={`M317 169L320 ${172 + length}L323 169L321 165Z`} transform={`rotate(${angle} 320 350)`} fill={fill("ice")} opacity={.1 + density / 250} stroke="#DCF7FF" strokeOpacity=".4" strokeWidth=".4"/>;
      })}
      {design.markers !== "none" && Array.from({ length: 12 }, (_, index) => <g key={index} transform={`rotate(${index * 30} 320 350)`} opacity={.25 + density / 180}>
        <path d={`M311 ${340 - markerRadius}q3-3 7-2q4-5 9-2q4 0 5 4l-6 2l-7-1l-8 2Z`} fill={fill("snowbank")} stroke="#EAFBFF" strokeWidth=".45"/>
        <path d={`M311 ${341 - markerRadius}l2 7l3-7m11-2l3 6l2-8`} fill={fill("ice")}/>
      </g>)}
      {Array.from({ length: count }, (_, index) => {
        const point = snowParticle(index, 0, atmosphere);
        return <g key={index} data-unreal-particle={index} transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${point.angle.toFixed(2)})`} opacity={point.opacity}>
          {point.depth > .82 ? <><circle r={point.radius * 2.4} fill={fill("flake")} opacity=".42"/><path d={`M0 ${-point.radius}V${point.radius}M${-point.radius * .87} ${-point.radius * .5}L${point.radius * .87} ${point.radius * .5}M${-point.radius * .87} ${point.radius * .5}L${point.radius * .87} ${-point.radius * .5}`} fill="none" stroke="#F0FBFF" strokeWidth=".55" strokeLinecap="round"/></> : <circle r={point.radius} fill={point.depth < .3 ? color : "#EAF8FF"}/>}
        </g>;
      })}
      <ellipse cx="320" cy="331" rx="88" ry="110" fill={fill("quiet")}/>
      <path data-unreal-wake="true" d="M320 350" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0"/>
      <circle cx="320" cy="350" r="176" fill="none" stroke={color} strokeOpacity=".2" strokeWidth="1"/>
    </g>
  </g>;
});
