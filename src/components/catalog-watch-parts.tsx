import { memo } from "react";
import type { WatchDesign } from "@/lib/types";

type Paint = (name: string) => string;
type MetalPaint = { light: string; mid: string; dark: string; deep: string; face: string };
const STRAP = "M230-20H410L425 198H215ZM215 502H425L410 740H230Z";
export const CATALOG_TEXTURES = ["motherofpearl", "malachite", "lapis", "marble", "linen", "honeycomb", "wave", "fume", "enamel", "sand"];
export const CATALOG_HANDS = ["leaf", "breguet", "syringe", "cathedral", "arrow", "lollipop", "snowflake", "mercedes"];
export const CATALOG_MARKERS = ["dots", "triangles", "diamonds", "explorer", "california", "breguet", "none"];

/** Every definition uses the owning watch's prefix, including exported standalone SVGs. */
export const CatalogDefs = memo(function CatalogDefs({ id, design }: { id: Paint; design: WatchDesign }) {
  return <>
    <linearGradient id={id("catalog-pearl")} x1=".15" y1="0" x2=".9" y2="1"><stop stopColor="#E5F2EE"/><stop offset=".24" stopColor="#DACDDE"/><stop offset=".47" stopColor="#F9F5DF"/><stop offset=".7" stopColor="#C7DCE5"/><stop offset="1" stopColor="#E8E8D7"/></linearGradient>
    <radialGradient id={id("catalog-fume")} cx=".46" cy=".42"><stop stopColor={design.dialColor}/><stop offset=".55" stopColor={design.dialColor}/><stop offset="1" stopColor="#020509"/></radialGradient>
    <radialGradient id={id("catalog-dome")} cx=".5" cy=".5"><stop offset=".74" stopColor="#FFFFFF" stopOpacity="0"/><stop offset=".94" stopColor="#A9D5EF" stopOpacity=".08"/><stop offset="1" stopColor="#FFFFFF" stopOpacity=".34"/></radialGradient>
    <linearGradient id={id("catalog-sapphire")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#DDF7FF" stopOpacity=".8"/><stop offset=".2" stopColor="#6D9BBF" stopOpacity=".12"/><stop offset=".5" stopColor="#D4F4FE" stopOpacity=".35"/><stop offset=".64" stopColor="#6D94B7" stopOpacity=".08"/><stop offset="1" stopColor="#D6F0FF" stopOpacity=".65"/></linearGradient>
    <pattern id={id("catalog-linen")} width="9" height="8" patternUnits="userSpaceOnUse"><path d="M1 0V8M5 0V8" stroke="#F2E9D3" strokeOpacity=".16" strokeWidth=".75"/><path d="M0 2H9M0 6H9" stroke="#03090D" strokeOpacity=".27" strokeWidth="1.1"/><path d="M1 2h4M5 6h4" stroke="#FBF5DF" strokeOpacity=".2" strokeWidth=".6"/></pattern>
    <pattern id={id("catalog-honeycomb")} width="24" height="41.57" patternUnits="userSpaceOnUse"><path d="M0 0L12 6.93V20.79L0 27.71L-12 20.79V6.93ZM24 0L36 6.93V20.79L24 27.71L12 20.79V6.93ZM12 20.79L24 27.71V41.57L12 48.5L0 41.57V27.71Z" fill="#000" fillOpacity=".13" stroke="#D7E7E3" strokeOpacity=".21" strokeWidth=".65"/><path d="M0 1L11 7.4V20" fill="none" stroke="#F4F6EA" strokeOpacity=".24" strokeWidth=".45"/></pattern>
    <pattern id={id("catalog-wave")} width="68" height="21" patternUnits="userSpaceOnUse"><path d="M-34 12Q-17-2 0 12T34 12T68 12T102 12" fill="none" stroke="#02080D" strokeOpacity=".5" strokeWidth="3.3"/><path d="M-34 10Q-17-4 0 10T34 10T68 10T102 10" fill="none" stroke="#E0F4F3" strokeOpacity=".32" strokeWidth=".8"/></pattern>
    <pattern id={id("catalog-sand")} width="31" height="29" patternUnits="userSpaceOnUse">{Array.from({length:22},(_,i)=><circle key={i} cx={i*17%31} cy={i*13%29} r={i%3===0?".9":".45"} fill={i%2?"#F4EEDD":"#020608"} opacity={i%2?".2":".3"}/>)}</pattern>
    <pattern id={id("catalog-hammered")} width="35" height="31" patternUnits="userSpaceOnUse">{[[6,8,7],[24,5,5],[18,23,8],[35,26,6]].map(([x,y,r],i)=><g key={i}><circle cx={x} cy={y} r={r} fill="#0B1013" fillOpacity=".1" stroke="#000" strokeOpacity=".2" strokeWidth=".8"/><path d={`M${x-r*.8} ${y}a${r} ${r} 0 0 1 ${r} ${-r}`} fill="none" stroke="#F5F3E5" strokeOpacity=".38" strokeWidth="1.1"/></g>)}</pattern>
    <pattern id={id("catalog-damascus")} width="120" height="86" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">{Array.from({length:16},(_,i)=><path key={i} d={`M-10 ${i*6}Q22 ${i*6-18} 50 ${i*6}T110 ${i*6}T170 ${i*6}`} fill="none" stroke={i%2?"#FFFFFF":"#01060A"} strokeOpacity={i%2?".19":".36"} strokeWidth={i%3===0?"2":"1"}/>)}</pattern>
    <pattern id={id("catalog-alligator")} width="69" height="48" patternUnits="userSpaceOnUse"><path d="M2 3Q17 0 32 3L31 22Q17 25 2 22ZM37 2L65 4L66 24L36 22ZM4 29L31 27L34 45L3 45ZM38 29L65 30L64 45L40 46Z" fill="#050708" fillOpacity=".22" stroke="#010405" strokeOpacity=".66" strokeWidth="2"/><path d="M5 5L29 5M40 5L62 7M8 31L28 30M41 32L62 33" stroke="#FFFFFF" strokeOpacity=".13" strokeWidth=".7"/></pattern>
    <pattern id={id("catalog-weave")} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1H8M0 5H8" stroke="#F6F1D7" strokeOpacity=".16"/><path d="M2 0V8M6 0V8" stroke="#010609" strokeOpacity=".5" strokeWidth="1.5"/></pattern>
    <pattern id={id("catalog-mesh")} width="16" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><path d="M-8 1L24 11M-8-4L24 6" stroke="#071014" strokeWidth="3.5"/><path d="M1 1q6-4 12 1q-3 8-11 6q-3-3-1-7Z" fill="none" stroke={`url(#${id("metal")})`} strokeWidth="2.3"/><path d="M3 1q5-2 8 1" fill="none" stroke="#E3EAE6" strokeOpacity=".6" strokeWidth=".7"/></pattern>
    <pattern id={id("catalog-braid")} width="34" height="24" patternUnits="userSpaceOnUse"><path d="M-17-12L17 12L51-12M-17 12L17 36L51 12" fill="none" stroke="#020609" strokeOpacity=".72" strokeWidth="11" strokeLinejoin="round"/><path d="M-17-14L17 10L51-14M-17 10L17 34L51 10" fill="none" stroke="#CFD9D3" strokeOpacity=".35" strokeWidth="7" strokeLinejoin="round"/><path d="M-17-16L17 8L51-16M-17 8L17 32L51 8" fill="none" stroke="#EEF1D9" strokeOpacity=".28" strokeWidth="1"/></pattern>
    <clipPath id={id("catalog-strap-clip")}><path d={STRAP}/></clipPath>
  </>;
});

export const CatalogDialTexture = memo(function CatalogDialTexture({ design, fill }: { design: WatchDesign; fill: Paint }) {
  const texture = design.texture;
  if (!CATALOG_TEXTURES.includes(texture)) return null;
  return <g data-part-texture={texture}>
    {texture === "motherofpearl" && <><circle cx="320" cy="350" r="178" fill={fill("catalog-pearl")}/>{Array.from({length:16},(_,i)=><path key={i} d={`M110 ${190+i*22}Q220 ${120+i*23} 326 ${198+i*21}T540 ${170+i*22}`} fill="none" stroke={i%3===0?"#FFFFFF":i%3===1?"#B6B7D7":"#93C9C8"} strokeOpacity={i%3===0?".4":".16"} strokeWidth={i%3===0?"7":"12"}/>)}</>}
    {texture === "malachite" && <><circle cx="320" cy="350" r="178" fill="#083D2C"/>{Array.from({length:42},(_,i)=><path key={i} d={`M105 ${150+i*10}Q198 ${220+i*6.5} 260 ${168+i*10}T420 ${177+i*9.5}T550 ${143+i*10}`} fill="none" stroke={i%4===0?"#76AC80":i%3===0?"#071C19":"#276B45"} strokeWidth={i%4===0?"2.2":"4.5"} opacity=".78"/>)}</>}
    {texture === "lapis" && <><circle cx="320" cy="350" r="178" fill="#112B66"/>{Array.from({length:120},(_,i)=><path key={i} d={`M${140+i*71%360} ${170+i*109%360}l${i%4+1} ${i%3-1}l-1 2Z`} fill={i%3===0?"#D6BF76":"#3562A2"} opacity={i%3===0?".75":".55"}/>)}<path d="M149 289Q248 230 294 291T456 241M184 433Q269 374 316 425T479 417" fill="none" stroke="#080F36" strokeOpacity=".35" strokeWidth="13"/></>}
    {texture === "marble" && <><circle cx="320" cy="350" r="178" fill="#E3E3DD"/>{[0,1,2,3,4].map(i=><g key={i} transform={`translate(${i*77-130} ${i*21-80})`}><path d="M180 122L222 184L214 214L274 274L256 293L304 360L295 394L366 467L388 520" fill="none" stroke="#73828B" strokeOpacity=".32" strokeWidth="3"/><path d="M222 184L191 251L207 276M274 274L316 256L340 281M304 360L345 351L388 400" fill="none" stroke="#83939B" strokeOpacity=".36" strokeWidth=".8"/><path d="M181 120L223 184L216 214L276 274L258 293L306 360L297 394L368 467" fill="none" stroke="#FBFBF1" strokeWidth="1.2"/></g>)}</>}
    {["linen","honeycomb","wave","sand"].includes(texture) && <circle cx="320" cy="350" r="178" fill={fill(`catalog-${texture}`)}/>}
    {texture === "fume" && <><circle cx="320" cy="350" r="178" fill={fill("catalog-fume")}/><circle cx="320" cy="350" r="178" fill="#03080D" fillOpacity=".28"/>{Array.from({length:90},(_,i)=><path key={i} d="M320 350L318 172" transform={`rotate(${i*4} 320 350)`} stroke="#E3ECE8" strokeOpacity=".05" strokeWidth=".65"/>)}</>}
    {texture === "enamel" && <><circle cx="320" cy="350" r="174" fill={design.dialColor}/><circle cx="320" cy="350" r="168" fill="none" stroke="#FFF9E7" strokeOpacity=".22" strokeWidth=".7"/><path d="M172 279Q290 188 435 248Q337 211 252 265Q205 292 172 279Z" fill="#FFFFFF" fillOpacity=".095"/></>}
  </g>;
});

export function CatalogHand({ kind, length, width, metal, luminous }: { kind: WatchDesign["hands"]; length: number; width: number; metal: string; luminous: string }) {
  const t = 350-length;
  const base = <path d={`M317 ${t+28}H323V369H317Z`} fill={metal} stroke="#091116" strokeWidth=".7"/>;
  return <g data-part-hand={kind}>
    {kind === "leaf" && <><path d={`M320 ${t}Q${320+width*2} ${t+length*.5} 324 349L323 369H317L316 349Q${320-width*2} ${t+length*.5} 320 ${t}Z`} fill={metal} stroke="#071015" strokeWidth=".8"/><path d={`M320 ${t+9}Q${320+width*.9} ${t+length*.45} 320 341Q${320-width*.9} ${t+length*.45} 320 ${t+9}Z`} fill={luminous}/><path d={`M320 ${t+2}V365`} stroke="#EEF1E9" strokeOpacity=".35" strokeWidth=".55"/></>}
    {kind === "breguet" && <>{base}<path d={`M320 ${t}L323 ${t+21}H317Z`} fill={metal}/><circle cx="320" cy={t+31} r="12" fill={metal} stroke="#101D27" strokeWidth=".8"/><circle cx="320" cy={t+31} r="7.3" fill="#122536" stroke={luminous} strokeWidth="1.1"/><path d={`M319 ${t+45}V338`} stroke={luminous} strokeWidth="1.5"/></>}
    {kind === "syringe" && <>{base}<path d={`M320 ${t}V${t+24}`} stroke={metal} strokeWidth="2"/><path d={`M${320-width/2} ${t+23}H${320+width/2}V339H${320-width/2}Z`} fill={metal} stroke="#071017" strokeWidth=".9"/><path d={`M${323-width/2} ${t+28}H${317+width/2}V333H${323-width/2}Z`} fill={luminous}/></>}
    {kind === "cathedral" && <><path d={`M320 ${t}L${320+width} ${t+29}L${320+width-2} ${t+length*.7}L324 345V369H316V345L${322-width} ${t+length*.7}L${320-width} ${t+29}Z`} fill={metal} stroke="#091017" strokeWidth=".8"/><path d={`M320 ${t+12}L${316+width} ${t+31}H${324-width}Z M${324-width} ${t+36}H318V${t+length*.67}H${326-width}Z M322 ${t+36}H${316+width}L${314+width} ${t+length*.67}H322Z M318 ${t+length*.72}H322V335H318Z`} fill={luminous}/></>}
    {kind === "arrow" && <>{base}<path d={`M320 ${t}L${320+width*1.45} ${t+30}H324V336H316V${t+30}H${320-width*1.45}Z`} fill={metal} stroke="#061019" strokeWidth=".9"/><path d={`M320 ${t+10}L${320+width*.78} ${t+25}H322V333H318V${t+25}H${320-width*.78}Z`} fill={luminous}/></>}
    {kind === "lollipop" && <>{base}<path d={`M320 ${t}V${t+10}`} stroke={metal} strokeWidth="2"/><circle cx="320" cy={t+22} r={width+2} fill={metal} stroke="#0C1820" strokeWidth=".8"/><circle cx="320" cy={t+22} r={width-2} fill={luminous}/><path d={`M320 ${t+38}V339`} stroke={luminous} strokeWidth="2"/></>}
    {kind === "snowflake" && <>{base}<path d={`M320 ${t}L324 ${t+14}V${t+24}L${320+width*1.4} ${t+37}L324 ${t+50}V335H316V${t+50}L${320-width*1.4} ${t+37}L316 ${t+24}V${t+14}Z`} fill={metal} stroke="#0B141C" strokeWidth=".8"/><path d={`M320 ${t+27}L${320+width*.95} ${t+37}L320 ${t+47}L${320-width*.95} ${t+37}Z M318 ${t+53}H322V333H318Z`} fill={luminous}/></>}
    {kind === "mercedes" && <>{base}<path d={`M320 ${t}L325 ${t+20}H315Z`} fill={metal}/><circle cx="320" cy={t+35} r="13" fill={metal} stroke="#0C1620" strokeWidth=".8"/><circle cx="320" cy={t+35} r="9" fill={luminous}/>{[0,120,240].map(a=><path key={a} d={`M320 ${t+35}V${t+26}`} transform={`rotate(${a} 320 ${t+35})`} stroke={metal} strokeWidth="2.2"/>)}<path d={`M320 ${t+51}V337`} stroke={luminous} strokeWidth="2.6"/></>}
  </g>;
}

export function CatalogMarker({ kind, index, radius, ink, metal, surface }: { kind: WatchDesign["markers"]; index: number; radius: number; ink: string; metal: string; surface: string }) {
  if (kind === "none") return null;
  const a=index*Math.PI/6, x=320+Math.sin(a)*radius, y=350-Math.cos(a)*radius;
  if (kind === "breguet") return <g data-part-marker={kind}><text x={x} y={y+6} textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="20" fill={ink}>{index||12}</text><circle cx={320+Math.sin(a)*(radius+15)} cy={350-Math.cos(a)*(radius+15)} r="1" fill={ink}/></g>;
  if (kind === "explorer" && index%3===0) return <text data-part-marker={kind} x={x} y={y+7} textAnchor="middle" fontSize="21" fontWeight="700" letterSpacing="-.8" fill={ink}>{index||12}</text>;
  if (kind === "california" && ![0,3,6,9].includes(index)) return <text data-part-marker={kind} x={x} y={y+5} textAnchor="middle" fontFamily={index<3||index>9?"Georgia, serif":"inherit"} fontSize="17" fill={ink}>{index<3||index>9?["XII","I","II","III","IV","V","VI","VII","VIII","IX","X","XI"][index]:index}</text>;
  return <g data-part-marker={kind} transform={`rotate(${index*30} 320 350)`}>
    {kind === "dots" && <><circle cx="320" cy={350-radius} r={index%3===0?"7.4":"5.6"} fill={metal} stroke="#10171B" strokeWidth=".8"/><circle cx="320" cy={350-radius} r={index%3===0?"4.8":"3.5"} fill={ink}/></>}
    {(kind === "triangles" || kind === "california" && index===0) && <><path d={`M311 ${340-radius}H329L320 ${364-radius}Z`} fill={metal} stroke="#071116" strokeWidth=".7"/><path d={`M315 ${343-radius}H325L320 ${357-radius}Z`} fill={ink}/></>}
    {kind === "diamonds" && <><path d={`M320 ${338-radius}L328 ${350-radius}L320 ${362-radius}L312 ${350-radius}Z`} fill="#ECFAFF" stroke={surface} strokeWidth="1.6"/><path d={`M320 ${338-radius}V${362-radius}L312 ${350-radius}Z`} fill="#95B3C9"/><path d={`M320 ${343-radius}L324 ${350-radius}L320 ${357-radius}L316 ${350-radius}Z`} fill="#FFFFFF"/></>}
    {(kind === "explorer" || kind === "california" && index!==0) && <><rect x="316" y={340-radius} width="8" height="23" rx="1" fill={metal}/><rect x="318" y={342-radius} width="4" height="19" fill={ink}/></>}
  </g>;
}

export const CatalogStrap = memo(function CatalogStrap({ design, fill, metal }: { design: WatchDesign; fill: Paint; metal: MetalPaint }) {
  const color=design.strapColor||"#273B40";
  if (design.strap === "bracelet") return <g data-part-bracelet={design.braceletStyle}>
    {Array.from({length:24},(_,i)=>{const y=i<12?i*18-24:540+(i-12)*18; const style=design.braceletStyle; const widths=style==="five-link"?[50,32,36,32,50]:Array.from({length:style==="engineer"?5:7},()=>200/(style==="engineer"?5:7)); return <g key={i}><rect x="217" y={y} width="206" height="18" rx="3" fill={metal.deep}/>{widths.map((w,j)=><rect key={j} x={220+widths.slice(0,j).reduce((sum,value)=>sum+value,0)+(style==="beads-of-rice"&&i%2?w*.22:0)} y={y+1} width={w-2.2} height="15.5" rx={style==="beads-of-rice"?"7":style==="engineer"?"1.3":"3.5"} fill={fill(j%2===0?"brushed":"metal")} stroke={metal.light} strokeOpacity=".42" strokeWidth=".65"/>)}<path d={`M220 ${y+2}H420`} stroke={metal.light} strokeOpacity=".24" strokeWidth=".6"/></g>;})}
    {design.strapColor && <path d={STRAP} fill={color} fillOpacity=".16"/>}
  </g>;
  return <g data-part-strap={design.strap} clipPath={fill("catalog-strap-clip")}>
    <path d={STRAP} fill={design.strap==="mesh"?fill("brushed"):color} stroke="#060B0E" strokeWidth="3"/>
    {design.strap==="mesh" ? <><path d={STRAP} fill={fill("catalog-mesh")}/>{design.strapColor&&<path d={STRAP} fill={color} fillOpacity=".3"/>}</> : <>
      <path d={STRAP} fill={fill(design.strap==="alligator"?"catalog-alligator":design.strap==="braided"?"catalog-braid":design.strap==="rally"?"leather-grain":"catalog-weave")}/>
      {design.strap==="nato"&&<><path d="M280-20H299V740H280ZM341-20H360V740H341Z" fill={design.accentColor} fillOpacity=".75"/><path d="M303-20H337V740H303Z" fill="#050B0F" fillOpacity=".8"/>{[31,655].map(y=><rect key={y} x="225" y={y} width="190" height="24" rx="5" fill="none" stroke={fill("metal")} strokeWidth="7"/>)}</>}
      {design.strap==="rally"&&Array.from({length:6},(_,i)=>[276,320,364].map(x=><g key={`${i}-${x}`}><circle cx={x} cy={i<3?28+i*49:587+(i-3)*49} r={x===320?"12":"8"} fill="#020508" stroke="#8E9589" strokeOpacity=".35" strokeWidth="1.4"/><path d={`M${x-5} ${i<3?19+i*49:578+(i-3)*49}h10`} stroke="#CFDBCC" strokeOpacity=".15"/></g>))}
      {design.strap!=="braided"&&<path d="M241-10L252 182M399-10L388 182M251 526L241 730M389 526L399 730" stroke={design.strap==="sailcloth"?design.accentColor:"#D8D7BC"} strokeOpacity=".62" strokeWidth="1.7" strokeDasharray="4 4"/>}
    </>}
  </g>;
});

export function CaseFinishLayer({ design, outline, fill, metal }: { design: WatchDesign; outline: string; fill: Paint; metal: MetalPaint }) {
  const finish=design.caseFinish;
  return <g data-part-case-finish={finish || "original"}>
    {design.metal==="carbon"&&<path d={outline} fill={fill("carbon")} opacity=".78"/>}
    {design.metal==="sapphire"&&<><path d={outline} fill={fill("catalog-sapphire")} stroke="#D1F1FF" strokeOpacity=".85" strokeWidth="1.2"/><path d={outline} fill="none" stroke="#9DCEE3" strokeOpacity=".45" strokeWidth="3" transform="translate(320 350) scale(.965) translate(-320 -350)"/><path d="M172 222L464 510M171 476L462 209" stroke="#C5EAFC" strokeOpacity=".13" strokeWidth="5" clipPath={fill("case-clip")}/></>}
    {finish==="polished"&&<path d={outline} fill={fill("metal")}/>}
    {finish==="brushed"&&<path d={outline} fill={fill("grain")}/>}
    {finish==="blasted"&&<><path d={outline} fill={metal.mid} fillOpacity=".55"/><path d={outline} fill={fill("catalog-sand")}/></>}
    {(finish==="hammered"||finish==="damascus")&&<path d={outline} fill={fill(`catalog-${finish}`)}/>}
  </g>;
}

export const CatalogBezel = memo(function CatalogBezel({ bezel, immersive, fill, metal }: { bezel: WatchDesign["bezel"]; immersive: boolean; fill: Paint; metal: MetalPaint }) {
  if (!["coined","scalloped","screws"].includes(bezel||"")) return null;
  const outer=immersive?190:211, inner=immersive?181:193;
  return <g data-part-bezel={bezel}><circle cx="320" cy="350" r={outer} fill={fill("bezel")} stroke={metal.light} strokeWidth=".7"/>
    {bezel==="coined"&&Array.from({length:120},(_,i)=><path key={i} d={`M320 ${350-outer}v${immersive?5:12}`} transform={`rotate(${i*3} 320 350)`} stroke={i%2?metal.deep:metal.light} strokeWidth={immersive?".8":"1.4"}/>)}
    {bezel==="scalloped"&&Array.from({length:24},(_,i)=><g key={i} transform={`rotate(${i*15} 320 350)`}><path d={`M${immersive?312:307} ${352-outer}Q320 ${350-outer+13} ${immersive?328:333} ${352-outer}`} fill="none" stroke={metal.deep} strokeWidth={immersive?"2":"4"}/><path d={`M${immersive?312:307} ${351-outer}Q320 ${348-outer+13} ${immersive?328:333} ${351-outer}`} fill="none" stroke={metal.light} strokeOpacity=".7" strokeWidth=".75"/></g>)}
    {bezel==="screws"&&Array.from({length:8},(_,i)=><g key={i} transform={`rotate(${i*45+22.5} 320 350)`}><circle cx="320" cy={350-(outer+inner)/2} r={immersive?"3.1":"5.7"} fill={metal.deep} stroke={metal.light} strokeWidth=".7"/><circle cx="320" cy={350-(outer+inner)/2} r={immersive?"2":"3.9"} fill={fill("metal")}/><path d={`M${immersive?318.5:317} ${350-(outer+inner)/2+1}l${immersive?3:6}-2`} stroke={metal.deep} strokeWidth="1.1"/></g>)}
    <circle cx="320" cy="350" r={inner} fill="none" stroke={metal.light} strokeWidth=".7"/>
  </g>;
});

export const ChapterRing = memo(function ChapterRing({ style, ink, accent, chrono }: { style: WatchDesign["chapterRing"]; ink: string; accent: string; chrono: boolean }) {
  if(style==="none")return <g data-part-chapter-ring="none"/>;
  return <g data-part-chapter-ring={style||"minute"}>
    {style==="railroad"&&<><circle cx="320" cy="350" r="170" fill="none" stroke={ink} strokeWidth=".6" strokeOpacity=".65"/><circle cx="320" cy="350" r="164" fill="none" stroke={ink} strokeWidth=".6" strokeOpacity=".65"/></>}
    {style==="tachymeter"?<>{[6,9,12,15,18,20,22.5,25,30,36,40,45,50,55,60].map(seconds=>{const a=seconds*Math.PI/30;return <g key={seconds}><text x={320+Math.sin(a)*167} y={350-Math.cos(a)*167+2} textAnchor="middle" fontSize="5.3" fill={ink}>{Math.round(3600/seconds)}</text><path d="M320 174v4" transform={`rotate(${seconds*6} 320 350)`} stroke={ink} strokeWidth=".6"/></g>;})}<title>Tachymeter scale</title></>:Array.from({length:60},(_,i)=>style==="dots"?<circle key={i} cx="320" cy="180" r={i%5===0?"1.65":".65"} transform={`rotate(${i*6} 320 350)`} fill={i%5===0&&chrono?accent:ink} opacity={i%5===0?".85":".48"}/>:<path key={i} d={style==="railroad"?"M320 180v6":`M320 180v${i%5===0?7:3.4}`} transform={`rotate(${i*6} 320 350)`} stroke={i%5===0&&chrono?accent:ink} strokeOpacity={i%5===0?".85":".48"} strokeWidth={i%5===0?"1.8":".75"}/>)}
  </g>;
});

export function CrystalTreatment({ style, fill }: { style: WatchDesign["crystalStyle"]; fill: Paint }) {
  return <g data-part-crystal={style||"clear"} pointerEvents="none">
    {style==="domed"&&<><circle cx="320" cy="350" r="178" fill={fill("catalog-dome")}/><path d="M163 289A167 167 0 0 1 342 184" fill="none" stroke="#FFFFFF" strokeOpacity=".29" strokeWidth="3.5"/><path d="M180 452A169 169 0 0 0 440 466" fill="none" stroke="#9FDFED" strokeOpacity=".19" strokeWidth="2"/></>}
    {style==="smoked"&&<circle cx="320" cy="350" r="178" fill="#0B1222" fillOpacity=".23"/>}
    {style==="faceted"&&Array.from({length:12},(_,i)=><path key={i} d="M320 172A178 178 0 0 1 409 196L397 217L320 197Z" transform={`rotate(${i*30} 320 350)`} fill={i%3===0?"#FFFFFF":i%3===1?"#AAD9E9":"#010D1B"} fillOpacity={i%3===0?".14":".08"} stroke="#D5F5FC" strokeOpacity=".13" strokeWidth=".6"/>)}
  </g>;
}
