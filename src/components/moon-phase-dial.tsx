import { memo, type RefObject } from "react";

/** The projected terminator encloses the measured illuminated fraction of the disc. */
export function getMoonTerminatorPath(illumination: number, waxing: boolean): string {
  const fraction = Math.max(0, Math.min(1, illumination));
  const radius = 31;
  const top = 435 - radius;
  const bottom = 435 + radius;
  if (fraction < .000001) return "";
  if (fraction > .999999) return `M320 ${top}A${radius} ${radius} 0 1 1 320 ${bottom}A${radius} ${radius} 0 1 1 320 ${top}Z`;
  const limbSweep = waxing ? 1 : 0;
  const terminatorSweep = fraction >= .5 ? limbSweep : 1 - limbSweep;
  const terminatorRadius = Math.abs(2 * fraction - 1) * radius;
  const returnEdge = terminatorRadius < .000001 ? `L320 ${top}` : `A${terminatorRadius} ${radius} 0 0 ${terminatorSweep} 320 ${top}`;
  return `M320 ${top}A${radius} ${radius} 0 0 ${limbSweep} 320 ${bottom}${returnEdge}Z`;
}

const CRATERS = [
  { x: 329, y: 416, r: 3.8 }, { x: 310, y: 411, r: 2.8 }, { x: 300, y: 431, r: 2.3 },
  { x: 335, y: 439, r: 3.4 }, { x: 319, y: 446, r: 5.3 }, { x: 305, y: 452, r: 2.8 },
  { x: 330, y: 457, r: 2.9 }, { x: 341, y: 425, r: 1.6 }, { x: 310, y: 438, r: 1.7 },
  { x: 325, y: 429, r: 2.1 }, { x: 315, y: 423, r: 1.3 }, { x: 324, y: 460, r: 1.4 },
  { x: 298, y: 440, r: 1.5 }, { x: 337, y: 451, r: 1.7 }, { x: 307, y: 418, r: 1.2 },
];

interface MoonPhaseDialProps {
  id: (name: string) => string;
  fill: (name: string) => string;
  ink: string;
  mutedInk: string;
  lumeColor: string;
  illuminated: boolean;
  eclipse: boolean;
  discRef: RefObject<SVGGElement | null>;
  terminatorRef: RefObject<SVGPathElement | null>;
  nameRef: RefObject<SVGTextElement | null>;
  illuminationRef: RefObject<SVGTextElement | null>;
  descriptionRef: RefObject<SVGDescElement | null>;
}

/** Static relief is shared by the lit surface and faint earthshine; only the terminator changes. */
export const MoonPhaseDial = memo(function MoonPhaseDial({ id, fill, ink, mutedInk, lumeColor, illuminated, eclipse, discRef, terminatorRef, nameRef, illuminationRef, descriptionRef }: MoonPhaseDialProps) {
  return <g ref={discRef} data-complication="moonphase" data-moon-disc="true" data-moon-phase="" data-moon-illumination="" data-moon-name="" role="img" aria-label="Moon phase" aria-describedby={id("moon-description")}>
    <desc id={id("moon-description")} ref={descriptionRef}>Current lunar phase and illuminated percentage.</desc>
    <defs>
      <radialGradient id={id("lunar-light")} cx=".32" cy=".26" r=".82"><stop stopColor={illuminated ? lumeColor : "#F2F0E8"} /><stop offset=".45" stopColor={illuminated ? lumeColor : "#D6D5D0"} /><stop offset=".82" stopColor={illuminated ? "#779087" : "#91959C"} /><stop offset="1" stopColor="#4A5361" /></radialGradient>
      <radialGradient id={id("lunar-earthshine")} cx=".38" cy=".3" r=".9"><stop stopColor={eclipse ? "#0B1415" : "#1E2833"} /><stop offset="1" stopColor="#03070C" /></radialGradient>
      <radialGradient id={id("lunar-crater")} cx=".43" cy=".55"><stop stopColor="#374652" stopOpacity=".52" /><stop offset=".74" stopColor="#5A6973" stopOpacity=".22" /><stop offset=".88" stopColor="#FAF9EB" stopOpacity=".28" /><stop offset="1" stopColor="#0A1823" stopOpacity=".4" /></radialGradient>
      <clipPath id={id("lunar-disc-clip")}><circle cx="320" cy="435" r="31" /></clipPath>
      <clipPath id={id("lunar-lit-clip")}><path ref={terminatorRef} d="" /></clipPath>
      <g id={id("lunar-relief")}>
        <path d="M310 410Q315 413 312 420Q307 425 312 430Q308 436 302 431Q297 426 303 419Q301 413 310 410ZM324 412Q336 411 337 421Q343 426 337 432Q330 434 326 428Q319 428 320 420Z" fill="#3E4E58" fillOpacity=".3" />
        <path d="M317 433Q322 428 329 433Q335 438 328 444Q325 450 318 445Q312 442 317 433ZM302 437Q307 432 311 438L307 445Q301 445 302 437Z" fill="#2D414C" fillOpacity=".2" />
        {CRATERS.map(({ x, y, r }, index) => <g key={index}><circle cx={x} cy={y} r={r} fill={fill("lunar-crater")} /><path d={`M${x - r * .74} ${y - r * .25}A${r * .78} ${r * .78} 0 0 1 ${x + r * .28} ${y - r * .7}`} fill="none" stroke="#F4F4DF" strokeOpacity=".42" strokeWidth=".45" /></g>)}
        <path d="M319 441L317 431M322 445L331 440M318 449L313 457M322 448L330 454M315 445L306 444" stroke="#F9F7E9" strokeOpacity=".18" strokeWidth=".5" />
        {Array.from({ length: 28 }, (_, index) => <circle key={index} cx={294 + index * 17 % 51} cy={407 + index * 23 % 53} r={index % 3 === 0 ? ".65" : ".35"} fill={index % 2 === 0 ? "#F1F1D9" : "#253944"} opacity=".22" />)}
      </g>
    </defs>
    <circle cx="320" cy="435" r="37" fill={fill("bezel")} opacity={eclipse ? ".3" : "1"} />
    <circle cx="320" cy="435" r="34.5" fill="#02070B" stroke={ink} strokeOpacity=".24" strokeWidth=".6" />
    <circle cx="320" cy="435" r="31" fill={fill("lunar-earthshine")} stroke="#5A6879" strokeOpacity=".32" strokeWidth=".45" />
    <g clipPath={fill("lunar-disc-clip")}>
      <use href={`#${id("lunar-relief")}`} opacity={eclipse ? ".035" : ".2"} />
      <g clipPath={fill("lunar-lit-clip")}>
        <circle cx="320" cy="435" r="31" fill={fill("lunar-light")} />
        <use href={`#${id("lunar-relief")}`} />
      </g>
    </g>
    <text ref={nameRef} x="320" y="484" fill={ink} textAnchor="middle" fontSize="8" letterSpacing=".8">—</text>
    <text ref={illuminationRef} x="320" y="496" fill={mutedInk} textAnchor="middle" fontSize="6.7" letterSpacing=".85">—</text>
  </g>;
});
