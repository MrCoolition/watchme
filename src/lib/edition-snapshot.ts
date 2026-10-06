import { serializeWatchSvg } from "./edition-card";

/** Preserve the interacted atmosphere while retaining the full-watch export framing. */
export function captureEditionWatch(template: SVGSVGElement, liveWatch?: SVGSVGElement | null) {
  const clone = template.cloneNode(true) as SVGSVGElement;
  const source = liveWatch?.querySelector<SVGGElement>("[data-unreal-layer]");
  const target = clone.querySelector<SVGGElement>("[data-unreal-layer]");
  let environment: { texture: string; scene: string | null; frame: string | null; interactions: string | null } | undefined;
  if (source && target && source.dataset.unrealLayer === target.dataset.unrealLayer && source.dataset.whiteoutScene === target.dataset.whiteoutScene) {
    // All atmosphere definitions live in this group, so its original IDs stay self-contained.
    target.replaceWith(source.cloneNode(true));
    environment = {
      texture: source.dataset.unrealLayer!,
      scene: source.getAttribute("data-whiteout-scene"),
      frame: source.getAttribute("data-unreal-frame"),
      interactions: source.getAttribute("data-unreal-interactions"),
    };
  }
  return { watchSvg: serializeWatchSvg(clone), environment };
}
