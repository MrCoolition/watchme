import { memo } from "react";
import type { WatchDesign } from "@/lib/types";

export interface FlagshipDialArtworkProps {
  design: WatchDesign;
  illuminated: boolean;
  eclipse?: boolean;
  id: (name: string) => string;
  fill: (name: string) => string;
}

const ANGLES = Array.from({ length: 12 }, (_, index) => index * 30);
const STAR_FIELD = Array.from({ length: 112 }, (_, index) => {
  const angle = index * 2.399963229728653;
  const radius = Math.sqrt((index + .5) / 112) * 172;
  return { x: 320 + Math.cos(angle) * radius, y: 350 + Math.sin(angle) * radius, size: index % 19 === 0 ? 1.35 : index % 5 === 0 ? .85 : .38, opacity: .27 + (index * 37 % 64) / 100 };
});

function contour(radius: number, phase: number): string {
  return Array.from({ length: 81 }, (_, index) => {
    const angle = index / 80 * Math.PI * 2;
    const rippled = radius + Math.sin(angle * 3 + phase) * 7 + Math.sin(angle * 5 - phase * .7) * 3.5;
    return `${index ? "L" : "M"}${(298 + Math.cos(angle) * rippled * 1.1).toFixed(2)} ${(366 + Math.sin(angle) * rippled * .87).toFixed(2)}`;
  }).join(" ") + "Z";
}

const CONTOURS = Array.from({ length: 19 }, (_, index) => contour(22 + index * 9, index * .12));
const PRISM_FACETS = [
  "142,177 250,207 184,260", "250,207 320,176 295,300", "250,207 295,300 184,260", "320,176 395,220 365,305", "320,176 365,305 295,300",
  "395,220 498,177 465,270", "395,220 465,270 365,305", "465,270 510,350 376,366", "465,270 376,366 365,305", "510,350 445,420 376,366",
  "510,350 498,527 445,420", "445,420 394,476 316,407", "445,420 316,407 376,366", "394,476 320,529 316,407", "320,529 246,465 316,407",
  "246,465 166,407 263,362", "246,465 263,362 316,407", "166,407 130,335 263,362", "130,335 184,260 263,362", "184,260 295,300 263,362",
  "295,300 365,305 320,350", "365,305 376,366 320,350", "376,366 316,407 320,350", "316,407 263,362 320,350", "263,362 295,300 320,350",
  "142,177 184,260 130,335", "130,335 166,407 142,527", "142,527 166,407 246,465", "142,527 246,465 320,529", "320,529 394,476 498,527", "394,476 445,420 498,527",
];

function TurbineDial({ design, illuminated, id, fill }: FlagshipDialArtworkProps) {
  const accent = illuminated ? design.lumeColor || design.accentColor : design.accentColor;
  return <g data-flagship-artwork="turbine">
    <defs>
      <radialGradient id={id("phantom-vault")}><stop stopColor={design.dialColor} /><stop offset=".4" stopColor="#181224" /><stop offset="1" stopColor="#03050B" /></radialGradient>
      <linearGradient id={id("phantom-blade")} x1="0" y1="0" x2="1" y2=".7"><stop stopColor="#D0C9DD" /><stop offset=".12" stopColor="#687084" /><stop offset=".33" stopColor="#161B2A" /><stop offset=".55" stopColor="#353346" /><stop offset=".58" stopColor="#9491A9" /><stop offset=".64" stopColor="#151625" /><stop offset="1" stopColor="#040712" /></linearGradient>
      <linearGradient id={id("phantom-edge")}><stop stopColor={accent} stopOpacity=".12" /><stop offset=".48" stopColor={accent} /><stop offset="1" stopColor="#F3E8FF" stopOpacity=".65" /></linearGradient>
    </defs>
    <circle cx="320" cy="350" r="178" fill={fill("phantom-vault")} />
    <circle cx="320" cy="350" r="157" fill="none" stroke={accent} strokeOpacity=".26" strokeWidth="7" />
    <circle cx="320" cy="350" r="166" fill="none" stroke="#8090A7" strokeOpacity=".32" strokeWidth=".6" />
    {ANGLES.map(angle => <g key={angle} transform={`rotate(${angle} 320 350)`}>
      <path d="M315 176H325L324 190H316Z" fill="#030710" stroke="#788493" strokeWidth=".55" />
      <path d="M319 180H321V187H319Z" fill={accent} opacity=".8" />
    </g>)}
    <g data-flagship-rotor="true" data-center-x="320" data-center-y="350" data-period="144000" data-direction="-1" data-phase="0" transform="rotate(0 320 350)">
      {ANGLES.map(angle => <g key={angle} transform={`rotate(${angle} 320 350)`}>
        <path d="M305 316C271 287 270 224 310 190L348 199C306 238 297 280 331 310L329 322Z" fill="#01040A" stroke="#05060A" strokeWidth="6" />
        <path d="M305 316C271 287 270 224 310 190L348 199C306 238 297 280 331 310L329 322Z" fill={fill("phantom-blade")} stroke="#798397" strokeWidth=".55" />
        <path d="M311 193C279 234 282 278 310 310" fill="none" stroke="#D9D5E8" strokeOpacity=".57" strokeWidth=".8" />
        <path d="M335 203C302 241 298 278 327 309" fill="none" stroke={fill("phantom-edge")} strokeWidth="2.5" />
        <path d="M316 211C294 241 294 272 309 294" fill="none" stroke="#BAC6E2" strokeOpacity=".19" strokeWidth=".65" />
      </g>)}
    </g>
    <circle cx="320" cy="350" r="44" fill="#080B13" stroke="#A2A7B8" strokeOpacity=".5" strokeWidth="1" />
    <circle cx="320" cy="350" r="39" fill="none" stroke={accent} strokeOpacity=".55" strokeWidth="1.2" strokeDasharray="20 4" />
    <circle cx="320" cy="350" r="32" fill={fill("dial")} stroke="#536273" strokeWidth=".65" />
    <path d="M185 283L201 259L231 254M409 254L439 259L455 283M196 410L215 461L257 478M383 478L425 461L444 410" fill="none" stroke="#04080D" strokeWidth="8" />
    <path d="M185 283L201 259L231 254M409 254L439 259L455 283M196 410L215 461L257 478M383 478L425 461L444 410" fill="none" stroke="#98A4B2" strokeOpacity=".65" strokeWidth="1.8" />
    <path d="M194 273L204 263L221 260M419 260L436 263L446 273M205 426L219 455M421 455L435 426" fill="none" stroke={accent} strokeWidth="2.2" />
    <path d="M279 278H361L371 319H269Z" fill="#0A0B13" fillOpacity=".87" stroke="#B4A1D0" strokeOpacity=".25" strokeWidth=".6" />
  </g>;
}

function SolarDial({ design, illuminated, id, fill }: FlagshipDialArtworkProps) {
  const accent = illuminated ? design.lumeColor || design.accentColor : design.accentColor;
  return <g data-flagship-artwork="solar">
    <defs>
      <radialGradient id={id("helios-depth")}><stop stopColor="#38200A" /><stop offset=".62" stopColor={design.dialColor} /><stop offset="1" stopColor="#070906" /></radialGradient>
      <linearGradient id={id("helios-petal")} x1="0" y1="0" x2=".85" y2=".1"><stop stopColor="#4C310F" /><stop offset=".22" stopColor="#AF8746" /><stop offset=".48" stopColor="#FFE7A5" /><stop offset=".5" stopColor="#E3BB71" /><stop offset=".65" stopColor="#82602F" /><stop offset="1" stopColor="#271906" /></linearGradient>
      <linearGradient id={id("helios-ridge")} x2=".2" y2="1"><stop stopColor="#FFF4CB" /><stop offset=".52" stopColor="#C7A55D" /><stop offset="1" stopColor="#67420B" /></linearGradient>
    </defs>
    <circle cx="320" cy="350" r="178" fill={fill("helios-depth")} />
    <circle cx="320" cy="350" r="163" fill="none" stroke="#C6AA6E" strokeOpacity=".55" strokeWidth="1.1" />
    {Array.from({ length: 36 }, (_, index) => <path key={index} d="M320 183V212" transform={`rotate(${index * 10} 320 350)`} stroke="#F2CF87" strokeOpacity=".21" strokeWidth=".65" />)}
    {ANGLES.map(angle => <g key={angle} transform={`rotate(${angle + 15} 320 350)`}>
      <path d="M316 326C289 304 284 247 302 196Q320 180 335 203C343 250 336 303 325 326Z" fill="#110C06" stroke="#050807" strokeWidth="5" />
      <path d="M316 326C289 304 284 247 302 196Q320 180 335 203C343 250 336 303 325 326Z" fill={fill("helios-petal")} stroke="#D7B97D" strokeOpacity=".72" strokeWidth=".6" />
      <path d="M310 198C300 241 303 290 320 320" fill="none" stroke="#FFF0C0" strokeOpacity=".57" strokeWidth=".65" />
      <path d="M320 197L320 318" stroke={fill("helios-ridge")} strokeWidth="1.3" />
      <path d="M327 209C333 247 326 288 324 306" fill="none" stroke="#3A2509" strokeOpacity=".9" strokeWidth="1.1" />
      <path d="M320 207V235" stroke={accent} strokeWidth="2.3" strokeLinecap="round" />
    </g>)}
    <circle cx="320" cy="350" r="39" fill="#19140D" stroke="#FFE3A1" strokeWidth="1" />
    <circle cx="320" cy="350" r="34" fill={fill("metal")} stroke="#473518" strokeWidth="1" />
    {Array.from({ length: 40 }, (_, index) => <path key={index} d="M320 318V325" transform={`rotate(${index * 9} 320 350)`} stroke="#201807" strokeOpacity=".65" strokeWidth=".8" />)}
    <circle cx="320" cy="350" r="22" fill="#15140E" stroke="#DEC088" strokeWidth=".8" />
    <path d="M169 330A152 152 0 0 1 205 253M435 253A152 152 0 0 1 471 330M200 442A153 153 0 0 0 263 492M377 492A153 153 0 0 0 440 442" fill="none" stroke="#FFDEA0" strokeOpacity=".68" strokeWidth="2.1" />
    <path d="M280 287Q320 295 360 287V319H280Z" fill="#15120B" fillOpacity=".8" />
  </g>;
}

function AbyssalDial({ design, illuminated, id, fill }: FlagshipDialArtworkProps) {
  const accent = illuminated ? design.lumeColor || design.accentColor : design.accentColor;
  return <g data-flagship-artwork="abyssal">
    <defs>
      <radialGradient id={id("abyss-depth")} cx=".42" cy=".54"><stop stopColor="#001012" /><stop offset=".45" stopColor={design.dialColor} /><stop offset=".82" stopColor="#09242C" /><stop offset="1" stopColor="#020C13" /></radialGradient>
      <linearGradient id={id("abyss-current")} x1="0" y1="1" x2="1" y2="0"><stop stopColor={accent} stopOpacity=".02" /><stop offset=".52" stopColor={accent} stopOpacity=".55" /><stop offset="1" stopColor="#E0FFFE" stopOpacity=".85" /></linearGradient>
    </defs>
    <circle cx="320" cy="350" r="178" fill={fill("abyss-depth")} />
    <g fill="none">
      {CONTOURS.map((path, index) => <path key={index} d={path} stroke={index % 4 === 0 ? fill("abyss-current") : accent} strokeOpacity={index % 4 === 0 ? .72 : .18} strokeWidth={index % 4 === 0 ? 1.05 : .55} />)}
      <ellipse cx="297" cy="366" rx="31" ry="23" stroke={accent} strokeOpacity=".13" strokeWidth="8" />
      <path d="M170 400C237 459 257 462 302 412S390 306 474 338M171 396C236 453 257 457 299 409S389 301 475 333" stroke="#B7FFFF" strokeOpacity=".12" strokeWidth=".75" />
      <circle cx="320" cy="350" r="124" stroke="#7AE9EF" strokeOpacity=".24" strokeWidth=".5" />
      <circle cx="320" cy="350" r="157" stroke="#122C36" strokeWidth="8" />
      <circle cx="320" cy="350" r="161" stroke="#A9E8ED" strokeOpacity=".25" strokeWidth=".6" />
      <path d="M207 238A159 159 0 0 1 303 192M337 192A159 159 0 0 1 433 238M163 335A159 159 0 0 0 198 452M442 452A159 159 0 0 0 477 335" stroke={accent} strokeOpacity=".72" strokeWidth="2.6" />
    </g>
    {Array.from({ length: 48 }, (_, index) => <path key={index} d="M320 196V201" transform={`rotate(${index * 7.5} 320 350)`} stroke={index % 4 === 0 ? "#C9FEFF" : accent} strokeOpacity={index % 4 === 0 ? .7 : .24} strokeWidth={index % 4 === 0 ? 1.5 : .7} />)}
    {[42, 138, 222, 318].map(angle => <g key={angle} transform={`rotate(${angle} 320 350)`}><path d="M313 184L320 192L327 184" fill="none" stroke="#C0FAFE" strokeOpacity=".75" strokeWidth="1" /><path d="M317 207L320 210L323 207" fill="none" stroke={accent} strokeOpacity=".4" strokeWidth=".8" /></g>)}
    <path d="M280 279H360V320H280Z" fill="#04141C" fillOpacity=".74" />
  </g>;
}

function PrismaticDial({ design, id, fill }: FlagshipDialArtworkProps) {
  const gradients = ["prism-frost", "prism-blue", "prism-violet", "prism-silver", "prism-dark"];
  return <g data-flagship-artwork="prismatic">
    <defs>
      <linearGradient id={id("prism-frost")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F7FFFF" /><stop offset=".57" stopColor="#B7D9E0" /><stop offset="1" stopColor="#7F9AB6" /></linearGradient>
      <linearGradient id={id("prism-blue")} x1="1" y1="0" x2="0" y2="1"><stop stopColor="#DCF4FA" /><stop offset=".37" stopColor="#88AABF" /><stop offset="1" stopColor="#536B8C" /></linearGradient>
      <linearGradient id={id("prism-violet")} x1="0" y1="0" x2=".4" y2="1"><stop stopColor="#E8DFF7" /><stop offset=".51" stopColor="#AAA7CD" /><stop offset="1" stopColor="#52687D" /></linearGradient>
      <linearGradient id={id("prism-silver")} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#7898AD" /><stop offset=".49" stopColor="#DFEAF0" /><stop offset=".51" stopColor="#B8D4DD" /><stop offset="1" stopColor="#F8FDFF" /></linearGradient>
      <linearGradient id={id("prism-dark")} x1="0" y1="0" x2="1" y2=".2"><stop stopColor="#466379" /><stop offset=".5" stopColor="#9DAFBE" /><stop offset="1" stopColor="#CFD4E4" /></linearGradient>
      <radialGradient id={id("prism-tint")}><stop stopColor={design.dialColor} stopOpacity=".06" /><stop offset="1" stopColor={design.dialColor} stopOpacity=".46" /></radialGradient>
    </defs>
    <circle cx="320" cy="350" r="178" fill={fill("dial")} />
    {PRISM_FACETS.map((points, index) => <polygon key={index} points={points} fill={fill(gradients[index * 3 % gradients.length])} stroke={index % 3 === 0 ? "#F3FFFF" : "#6E8598"} strokeOpacity=".52" strokeWidth=".55" />)}
    <circle cx="320" cy="350" r="178" fill={fill("prism-tint")} />
    <path d="M184 260L295 300L320 350L365 305L395 220M320 350L316 407L246 465M320 350L376 366L445 420" fill="none" stroke="#F7FFFF" strokeOpacity=".63" strokeWidth="1.2" />
    <path d="M187 261L292 300M399 223L367 302M247 462L313 408" stroke="#EDB5FF" strokeOpacity=".25" strokeWidth="1.4" />
    <path d="M142 335L264 360L319 348L465 270" fill="none" stroke={design.accentColor} strokeOpacity=".3" strokeWidth=".6" />
    <circle cx="320" cy="350" r="167" fill="none" stroke="#FCFFFF" strokeOpacity=".53" strokeWidth="1" />
    <circle cx="320" cy="350" r="164.5" fill="none" stroke="#233C55" strokeOpacity=".4" strokeWidth=".55" />
    <path d="M280 280H360L354 319H286Z" fill={design.dialColor} fillOpacity=".57" />
  </g>;
}

function AventurineDial({ design, illuminated, id, fill }: FlagshipDialArtworkProps) {
  const accent = illuminated ? design.lumeColor || design.accentColor : design.accentColor;
  return <g data-flagship-artwork="aventurine">
    <defs>
      <radialGradient id={id("nocturne-space")} cx=".33" cy=".24" r=".9"><stop stopColor={design.dialColor} /><stop offset=".38" stopColor="#121D3B" /><stop offset="1" stopColor="#020710" /></radialGradient>
      <radialGradient id={id("nocturne-nebula")}><stop stopColor={accent} stopOpacity=".13" /><stop offset=".44" stopColor="#7686C5" stopOpacity=".07" /><stop offset="1" stopColor="#17285C" stopOpacity="0" /></radialGradient>
      <mask id={id("nocturne-quiet")}><circle cx="320" cy="350" r="179" fill="white" /><rect x="277" y="281" width="86" height="39" rx="8" fill="#333" /><rect x="258" y="407" width="124" height="64" rx="7" fill="black" /><rect x="266" y="476" width="108" height="20" rx="5" fill="#333" /></mask>
    </defs>
    <circle cx="320" cy="350" r="178" fill={fill("nocturne-space")} />
    <g mask={fill("nocturne-quiet")}>
      <ellipse cx="337" cy="345" rx="64" ry="205" transform="rotate(39 337 345)" fill={fill("nocturne-nebula")} />
      <ellipse cx="340" cy="340" rx="32" ry="193" transform="rotate(39 340 340)" fill={fill("nocturne-nebula")} />
      {STAR_FIELD.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.size} fill={index % 7 === 0 ? "#EACCA7" : index % 3 === 0 ? accent : "#CBDDFF"} opacity={star.opacity} />)}
      {Array.from({ length: 52 }, (_, index) => {
        const y = 192 + index * 6.1;
        const x = 432 - index * 4.2 + Math.sin(index * 1.9) * 21;
        return <path key={index} d={`M${x} ${y}h${index % 3 ? .8 : 1.5}`} stroke={index % 2 ? "#F3D5B8" : "#CFD5FF"} strokeOpacity={.18 + index % 4 * .11} strokeWidth={index % 5 === 0 ? 1.2 : .55} />;
      })}
      <path d="M203 303L229 270L252 298L232 326L203 303M229 270L267 231M388 335L427 314L450 350L420 385L388 335M420 385L411 410" fill="none" stroke={accent} strokeOpacity=".25" strokeWidth=".7" />
      {[[203,303],[229,270],[252,298],[232,326],[267,231],[388,335],[427,314],[450,350],[420,385],[411,410]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r={index % 3 === 0 ? 1.6 : 1} fill="#F2E8E2" /><circle cx={x} cy={y} r="3.1" fill="none" stroke={accent} strokeOpacity=".14" strokeWidth=".7" /></g>)}
      {[[378,226],[194,382],[440,287],[250,454]].map(([x,y], index) => <g key={index}><path d={`M${x} ${y - 5}L${x + 1} ${y - 1}L${x + 5} ${y}L${x + 1} ${y + 1}L${x} ${y + 5}L${x - 1} ${y + 1}L${x - 5} ${y}L${x - 1} ${y - 1}Z`} fill="#F6E4D1" opacity=".85" /><circle cx={x} cy={y} r="1.25" fill="#FFFFFF" /></g>)}
      <path d="M182 402Q202 213 398 210M180 397Q222 252 429 270" fill="none" stroke="#C7A892" strokeOpacity=".16" strokeWidth=".65" />
    </g>
    <circle cx="320" cy="350" r="165" fill="none" stroke="#D3AF9D" strokeOpacity=".28" strokeWidth=".75" />
    <circle cx="320" cy="350" r="162.5" fill="none" stroke={accent} strokeOpacity=".16" strokeWidth=".45" strokeDasharray="1 4" />
  </g>;
}

/** Original dial architecture only: WatchFace owns all readable time, hands and complications. */
export const FlagshipDialArtwork = memo(function FlagshipDialArtwork(props: FlagshipDialArtworkProps) {
  if (props.design.texture === "turbine") return <TurbineDial {...props} />;
  if (props.design.texture === "solar") return <SolarDial {...props} />;
  if (props.design.texture === "abyssal") return <AbyssalDial {...props} />;
  if (props.design.texture === "prismatic") return <PrismaticDial {...props} />;
  if (props.design.texture === "aventurine") return <AventurineDial {...props} />;
  return null;
});
