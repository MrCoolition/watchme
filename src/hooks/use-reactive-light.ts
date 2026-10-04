"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface LightPosition { x: number; y: number }
const RESTING_LIGHT: LightPosition = { x: -.3, y: -.45 };
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export function useReactiveLight(enabled: boolean) {
  const [position, setPosition] = useState<LightPosition>(RESTING_LIGHT);
  const drag = useRef<{ id: number; x: number; y: number; captured: boolean } | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<LightPosition>(RESTING_LIGHT);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const schedule = useCallback((next: LightPosition) => {
    pending.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => { frame.current = null; setPosition(pending.current); });
  }, []);
  const setFromPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    schedule({ x: clamp((event.clientX - bounds.left) / bounds.width * 2 - 1), y: clamp((event.clientY - bounds.top) / bounds.height * 2 - 1) });
  }, [schedule]);
  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button,[role='button'],a,input,select")) return;
    const captured = event.pointerType !== "touch";
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, captured };
    if (captured) { event.currentTarget.setPointerCapture(event.pointerId); setFromPointer(event); }
  }, [enabled, setFromPointer]);
  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!enabled || !current || current.id !== event.pointerId) return;
    if (!current.captured) {
      const dx = Math.abs(event.clientX - current.x); const dy = Math.abs(event.clientY - current.y);
      if (dy > 8 && dy > dx) { drag.current = null; return; }
      if (dx < 9 || dx < dy * 1.25) return;
      current.captured = true; event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault(); setFromPointer(event);
  }, [enabled, setFromPointer]);
  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  }, []);
  const reset = useCallback(() => schedule(RESTING_LIGHT), [schedule]);
  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const steps: Record<string, LightPosition> = { ArrowLeft: { x: -.15, y: 0 }, ArrowRight: { x: .15, y: 0 }, ArrowUp: { x: 0, y: -.15 }, ArrowDown: { x: 0, y: .15 } };
    if (event.key === "Home") { event.preventDefault(); reset(); return; }
    const step = steps[event.key]; if (!step) return;
    event.preventDefault(); schedule({ x: clamp(pending.current.x + step.x), y: clamp(pending.current.y + step.y) });
  }, [enabled, reset, schedule]);
  return { position: enabled ? position : RESTING_LIGHT, reset, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown } };
}
