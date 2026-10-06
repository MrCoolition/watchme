import type { WhiteoutScene as WhiteoutSceneKind } from "@/lib/types";
import { auroraCurtain, sceneComet, sceneLight, unrealSeed } from "@/lib/unreal-simulation";

interface SceneProps { scene: WhiteoutSceneKind; color: string; intensity: number; id: (name: string) => string; }

const PALETTES: Record<WhiteoutSceneKind, [string, string, string]> = {
  glacier: ["#09131F", "#23445B", "#AEDEEC"],
  forest: ["#061D22", "#1A484B", "#BDE6DF"],
  city: ["#150E2B", "#283357", "#C9CCF2"],
  christmas: ["#091923", "#243E4B", "#F9E2BB"],
  aurora: ["#071824", "#17474E", "#A5F5E0"],
  observatory: ["#101228", "#30375F", "#D6D2FC"],
};

function Fir({ x, y, height, snow, dark = false }: { x: number; y: number; height: number; snow: string; dark?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${height / 100})`}>
    <path d="M-2-7V-83H2V-7" stroke={dark ? "#142D30" : "#395A5C"} strokeWidth="2"/>
    <path d="M0-104L-13-77L-7-79L-23-53L-15-57L-33-25L-23-31L-40-4Q0-13 40-4L23-31L33-25L15-57L23-53L7-79L13-77Z" fill={dark ? "#0B272E" : "#163D42"}/>
    <path d="M0-103L-12-80L-6-82L0-88L6-80L12-78ZM-9-73L-22-55L-13-58L-3-64L5-59L19-54L9-70L1-73L-1-67ZM-17-47L-31-27L-20-30L-6-36L4-32L17-31L30-24L16-46L3-50L-3-41ZM-23-21L-37-6L-24-9L-11-16L1-10L13-13L37-4L22-21L10-23L2-18L-8-25L-13-21Z" fill={snow} opacity={dark ? .25 : .78}/>
    <path d="M0-93L-4-81M-8-63L-14-58M-9-35L-17-31M11-18L20-12" stroke="#F5FFFF" strokeOpacity={dark ? .08 : .65} strokeWidth="1.3" strokeLinecap="round"/>
  </g>;
}

function Cottage({ x, y, scale = 1, roof = "#7F4A42", festive = false, glow }: { x: number; y: number; scale?: number; roof?: string; festive?: boolean; glow: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cy="3" rx="43" ry="7" fill="#070D16" opacity=".45"/>
    <path d="M-31-7V-43L0-63L31-44V-7Z" fill="#3F3338" stroke="#8C8884" strokeWidth=".7"/>
    <path d="M1-59L31-43V-8H1Z" fill="#292E35"/>
    <path d="M-37-43L0-71L38-43L29-39L0-61L-29-38Z" fill={roof}/>
    <path d="M-37-43L0-73L38-43L32-42L20-48L15-47L0-61L-12-51L-19-47L-23-46L-28-39Z" fill="#DAEAF0"/>
    <path d="M-33-42L-32-34L-29-41M25-44L27-36L28-43" stroke="#D0E6EB" strokeWidth="1.5"/>
    <rect x="17" y="-65" width="6" height="13" fill="#786369"/><path d="M15-65H25" stroke="#F0F7EE" strokeWidth="3"/>
    <path d="M19-69Q9-77 20-83T18-100" fill="none" stroke="#D6E7E8" strokeOpacity=".17" strokeWidth="4"/>
    <ellipse cy="-19" rx="40" ry="27" fill={glow} opacity=".17" data-scene-light="true"/>
    <rect x="-23" y="-35" width="13" height="16" rx="1" fill="#FFC78A"/>
    <rect x="10" y="-35" width="12" height="16" rx="1" fill="#EAB075"/>
    <path d="M-16.5-35V-19M-23-27H-10M16-35V-19M10-27H22" stroke="#64443B" strokeWidth="1.2"/>
    <path d="M-5-7V-28Q0-34 5-28V-7" fill="#DE9964"/><path d="M-1-6L-12 11H15L4-6" fill="#EBC797" opacity=".18"/>
    <path d="M-33-6Q-12-10 1-6T34-7" fill="none" stroke="#E4EEF1" strokeWidth="4" strokeLinecap="round"/>
    {festive && <><path d="M-25-43Q0-32 25-43" fill="none" stroke="#496C51" strokeWidth="2"/>{Array.from({ length: 7 }, (_, i) => <circle key={i} cx={-24 + i * 8} cy={-41 + Math.sin(i / 6 * Math.PI) * 6} r="1.5" fill={i % 2 ? "#EF7A66" : "#FFE7A0"} data-scene-light="true"/>)}</>}
  </g>;
}

function Moon({ x, y, fill, glow, radius = 15 }: { x: number; y: number; fill: string; glow: string; radius?: number }) {
  return <g><circle cx={x} cy={y} r={radius * 4} fill={glow} opacity=".22"/><circle cx={x} cy={y} r={radius} fill={fill}/><circle cx={x - radius * .32} cy={y - radius * .22} r={radius * .2} fill="#527181" opacity=".16"/><circle cx={x + radius * .27} cy={y + radius * .34} r={radius * .27} fill="#527181" opacity=".12"/><path d={`M${x + radius * .4} ${y - radius * .7}Q${x + radius * 1.1} ${y} ${x + radius * .35} ${y + radius * .8}`} fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".6"/></g>;
}

/** All scene paint servers are descendants of the atmosphere layer, making snapshots portable. */
export function WhiteoutScene({ scene, color, intensity, id }: SceneProps) {
  const fill = (name: string) => `url(#${id(`scene-${name}`)})`;
  const sid = (name: string) => id(`scene-${name}`);
  const [sky, horizon, ice] = PALETTES[scene];
  const comet = sceneComet(0, intensity);
  const city = scene === "city", cosmic = scene === "observatory", festive = scene === "christmas";
  return <g data-whiteout-world={scene}>
    <defs>
      <linearGradient id={sid("sky")} x1="0" y1="0" x2=".15" y2="1"><stop stopColor={sky}/><stop offset=".67" stopColor={horizon}/><stop offset="1" stopColor={sky}/></linearGradient>
      <linearGradient id={sid("snow")} x1=".15" y1="0" x2=".7" y2="1"><stop stopColor={ice}/><stop offset=".23" stopColor="#779FAE"/><stop offset="1" stopColor="#17364B"/></linearGradient>
      <linearGradient id={sid("ridge")} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#EAF5F6"/><stop offset=".34" stopColor={color}/><stop offset="1" stopColor="#20354D"/></linearGradient>
      <radialGradient id={sid("moon-glow")}><stop stopColor={ice} stopOpacity=".6"/><stop offset=".22" stopColor={ice} stopOpacity=".2"/><stop offset="1" stopColor={ice} stopOpacity="0"/></radialGradient>
      <radialGradient id={sid("gold-glow")}><stop stopColor="#FFDA92" stopOpacity=".9"/><stop offset=".2" stopColor="#EEA656" stopOpacity=".35"/><stop offset="1" stopColor="#D58441" stopOpacity="0"/></radialGradient>
      <radialGradient id={sid("nebula")}><stop stopColor={color} stopOpacity=".35"/><stop offset=".4" stopColor="#8872BA" stopOpacity=".16"/><stop offset="1" stopColor="#826DD7" stopOpacity="0"/></radialGradient>
      <linearGradient id={sid("aurora")} x1="0" y1="1" x2=".1" y2="0"><stop stopColor="#9FFCE5" stopOpacity=".76"/><stop offset=".16" stopColor={color} stopOpacity=".48"/><stop offset=".52" stopColor="#6A81D8" stopOpacity=".14"/><stop offset="1" stopColor="#B595F7" stopOpacity="0"/></linearGradient>
      <linearGradient id={sid("city-haze")} x1="0" y1="1" x2="0" y2="0"><stop stopColor="#AE72D8" stopOpacity=".45"/><stop offset="1" stopColor="#AE72D8" stopOpacity="0"/></linearGradient>
      <linearGradient id={sid("city-glass")} x1="0" y1="0" x2="1" y2=".1"><stop stopColor="#18314C"/><stop offset=".46" stopColor="#16283F"/><stop offset=".48" stopColor="#405879"/><stop offset=".6" stopColor="#182A42"/><stop offset="1" stopColor="#0B192A"/></linearGradient>
      <linearGradient id={sid("reflection")} x1="0" y1="0" x2=".05" y2="1"><stop stopColor={color} stopOpacity=".26"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient>
      <linearGradient id={sid("dome")} x1="0" y1=".2" x2="1" y2=".8"><stop stopColor="#DBE6F0"/><stop offset=".17" stopColor="#91A8CB"/><stop offset=".47" stopColor="#334B6C"/><stop offset=".5" stopColor="#D4E3F4"/><stop offset=".58" stopColor="#647C9E"/><stop offset="1" stopColor="#172F49"/></linearGradient>
      <linearGradient id={sid("comet")} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFFFFF" stopOpacity="0"/><stop offset="1" stopColor="#DCD6FF" stopOpacity=".8"/></linearGradient>
    </defs>
    <circle cx="320" cy="350" r="178" fill={fill("sky")}/>
    {Array.from({ length: cosmic ? 65 : 34 }, (_, index) => {
      const x = 147 + unrealSeed(index, 40) * 345, y = 180 + unrealSeed(index, 41) * 190;
      const bright = index % 7 === 0;
      return <g key={index} data-scene-light={bright ? "true" : undefined} opacity={sceneLight(index, 0, intensity)}><circle cx={x} cy={y} r={bright ? .95 : .45} fill={index % 3 ? "#E9F4FA" : color}/>{bright && <path d={`M${x - 2.6} ${y}H${x + 2.6}M${x} ${y - 2.6}V${y + 2.6}`} stroke="#EAF8FF" strokeWidth=".4" strokeOpacity=".5"/>}</g>;
    })}
    {scene === "glacier" && <>
      <Moon x={404} y={242} fill="#DEEEF4" glow={fill("moon-glow")} radius={17}/>
      <path d="M132 409L175 340L208 367L256 301L316 397L359 365L390 389L445 312L503 416V541H125Z" fill="#294B61"/>
      <path d="M165 356L175 340L185 366L180 362L177 366L171 357M223 345L256 301L277 337L266 333L260 341L253 324L242 344L234 340M418 350L445 312L473 362L454 348L444 351L437 338Z" fill={fill("ridge")} opacity=".82"/>
      <path d="M142 454L203 404L224 433L280 386L353 453L401 414L496 456V546H134Z" fill="#172F45"/><path d="M245 417L280 386L306 412L289 407L279 401L263 421Z" fill="#AECCDB" opacity=".65"/>
      <path d="M187 548L239 469L228 448L272 409L267 449L306 484L316 553Z" fill={fill("ridge")} opacity=".7"/><path d="M239 469L278 489L267 449L272 409L287 448L313 482L316 553" fill="#537C96"/>
      <path d="M322 543L369 472L369 438L402 404L412 441L443 465L455 543Z" fill={fill("ridge")} opacity=".55"/><path d="M369 472L392 485L412 441L402 404L400 452L418 486L426 541" fill="#1B3A52" opacity=".6"/>
      <path d="M171 477Q229 494 268 478T362 496T487 474" fill="none" stroke="#CCF5FC" strokeOpacity=".22" strokeWidth="2"/>
    </>}
    {scene === "forest" && <>
      <Moon x={394} y={251} fill="#E3F0D7" glow={fill("moon-glow")} radius={17}/>
      <path d="M122 411Q193 331 266 374T393 364T519 412V548H122Z" fill="#1A3B46"/>
      {Array.from({ length: 12 }, (_, index) => <Fir key={index} x={140 + index * 34} y={421 + unrealSeed(index, 20) * 20} height={57 + unrealSeed(index, 21) * 47} snow={ice} dark/>)}
      <path d="M128 470Q176 438 231 454Q289 441 337 460Q383 425 432 441Q481 431 522 465V546H124Z" fill={fill("snow")}/>
      <path d="M360 442Q329 466 331 478T300 521" stroke="#E7E9DC" strokeOpacity=".6" strokeWidth="6" fill="none"/>
      <Cottage x={377} y={452} scale={.88} roof="#3E5653" glow={fill("gold-glow")}/>
      <Fir x={177} y={475} height={137} snow={ice}/><Fir x={219} y={480} height={92} snow={ice}/><Fir x={480} y={479} height={126} snow={ice}/><Fir x={442} y={481} height={61} snow={ice}/>
      <Fir x={246} y={511} height={63} snow={ice}/><Fir x={139} y={473} height={143} snow={ice}/>
      <path d="M140 499Q229 479 279 500T453 502Q486 488 511 499V552H129Z" fill="#446A7C"/><path d="M144 498Q223 480 279 500T457 501" fill="none" stroke="#D8EBEE" strokeOpacity=".72" strokeWidth="2"/>
      <g fill="#163440"><path d="M287 477l5-2l5 1l2 7l-2 8h-1l-1-9l-5-1l-1 8h-1l-1-10l-2-3Z"/><path d="M291 477l-1-7l3-3l2 2l-2 3l1 5M291 470l-3-4l1-4m0 4l-3-1" fill="none" stroke="#163440" strokeWidth="1.2"/></g>
    </>}
    {city && <>
      <Moon x={402} y={238} fill="#D6D7F0" glow={fill("moon-glow")} radius={13}/>
      <ellipse cx="332" cy="393" rx="185" ry="83" fill={fill("nebula")} opacity=".8"/>
      <path d="M125 421V362H149V331H170V353H187V317H207V348H224V386H240V326H257V360H277V344H293V377H310V338H326V360H343V330H362V367H385V319H401V350H419V322H440V352H459V327H477V377H513V440Z" fill="#26334E"/>
      <path d="M137 438V358H165V438M177 438V324H207V438M230 438V374H266V438M279 438V310H305V438M318 438V357H350V438M367 438V297H399V438M416 438V345H446V438M458 438V373H489V438" fill={fill("city-glass")} stroke="#7083AE" strokeWidth=".6"/>
      <path d="M182 324V316H201V324M283 310V302H301V310M372 298V284H394V298M383 284V262" fill="none" stroke="#84AAD2" strokeWidth="1.5"/>
      <path d="M137 358H165M177 324H207M230 374H266M279 310H305M318 357H350M367 297H399M416 345H446M458 373H489" stroke="#E0E6F3" strokeWidth="2"/>
      {[[141, 365, 3, 10], [182, 335, 3, 13], [235, 382, 4, 7], [283, 320, 3, 14], [322, 364, 3, 9], [372, 308, 3, 15], [421, 355, 3, 10], [464, 383, 3, 7]].map(([x, y, columns, rows], building) => <g key={building}>{Array.from({ length: columns * rows }, (_, window) => {
        const lit = unrealSeed(window, building + 60) > .38;
        return <rect key={window} x={x + window % columns * 6.5} y={y + Math.floor(window / columns) * 7.1} width="2.2" height="3.2" fill={lit ? window % 4 ? "#ECD3AC" : "#91E6F3" : "#0E233A"} opacity={lit ? .55 : .8}/>;
      })}</g>)}
      <path d="M207 333V425M399 307V420" stroke="#EE87DE" strokeOpacity=".8" strokeWidth="1.6"/><path d="M279 316V432M416 352V425" stroke={color} strokeWidth="1.6" strokeOpacity=".9"/>
      <path d="M155 388V404M151 393H159M155 414V421M470 396H482M470 400H482M470 404H482" stroke="#FAA2DE" strokeWidth="2"/>
      <rect x="126" y="402" width="396" height="37" fill={fill("city-haze")}/>
      <path d="M122 440Q257 421 320 435T517 435L529 556H114Z" fill="#132943"/>
      {[154, 192, 249, 291, 335, 384, 432, 476].map((x, index) => <g key={x}><path d={`M${x - 5} 442L${x - 13} 506H${x + 18}L${x + 7} 442Z`} fill={fill("reflection")}/>{Array.from({ length: 6 }, (_, line) => <path key={line} d={`M${x - 6 - line * 1.7} ${449 + line * 8}h${14 + line * 3}`} stroke={index % 2 ? "#DE9ABF" : color} strokeWidth="1.2" opacity={.23 - line * .025}/>)}</g>)}
      <path d="M130 457Q281 420 513 458M137 460Q283 423 510 461" fill="none" stroke="#DFE8F4" strokeWidth="1.5"/><path d="M140 463Q280 427 506 463" fill="none" stroke="#334B63" strokeWidth="4"/>
      {[180, 242, 399, 461].map(x => <g key={x}><path d={`M${x} 446V421q0-7 7-7`} fill="none" stroke="#819CB6" strokeWidth="1.2"/><circle cx={x + 7} cy="414" r="9" fill={fill("gold-glow")}/><circle cx={x + 7} cy="414" r="1.9" fill="#FFE0A0" data-scene-light="true"/></g>)}
      <path d="M128 516Q211 481 278 502T511 505V550H124Z" fill={fill("snow")}/>
    </>}
    {festive && <>
      <Moon x={399} y={238} fill="#F4E9D4" glow={fill("moon-glow")} radius={14}/>
      <path d="M126 420Q205 363 276 395T406 386T521 423V550H123Z" fill="#1F424B"/>
      {[155, 179, 207, 440, 466, 495].map((x, i) => <Fir key={x} x={x} y={426} height={65 + i % 3 * 17} snow={ice} dark/>)}
      <path d="M128 456Q238 423 320 443T519 448V550H123Z" fill={fill("snow")}/>
      <Cottage x={216} y={441} scale={.66} festive glow={fill("gold-glow")}/><Cottage x={411} y={444} scale={.8} roof="#5B4548" festive glow={fill("gold-glow")}/>
      <g transform="translate(320 469)"><ellipse cy="-12" rx="66" ry="73" fill={fill("gold-glow")} opacity=".38"/>
        <Fir x={0} y={0} height={142} snow="#D6E8DA"/>
        <path d="M0-112Q15-99-13-89T19-64T-22-38Q-13-21 31-18" fill="none" stroke="#DDBE72" strokeWidth="1.3"/>
        {Array.from({ length: 32 }, (_, index) => {
          const y = -117 + index * 3.35, width = (y + 148) * .26, x = Math.sin(index * .89) * width;
          return <g key={index} data-scene-light="true"><circle cx={x} cy={y} r="5" fill={fill("gold-glow")}/><circle cx={x} cy={y} r={index % 3 ? 1.4 : 2.1} fill={["#FFD797", "#FF696C", "#90ECCC", "#EAB975"][index % 4]}/></g>;
        })}
        <circle cy="-148" r="19" fill={fill("gold-glow")} data-scene-light="true"/><path d="M0-157L2.6-151L9-150L4-146L5.4-140L0-143L-5.4-140L-4-146L-9-150L-2.6-151Z" fill="#FFE4AA" stroke="#FFF4D4" strokeWidth=".5"/>
        <rect x="-24" y="-8" width="15" height="11" rx="1" fill="#B74E55"/><path d="M-18-8V3M-24-4H-9" stroke="#E8CD91" strokeWidth="1.4"/><rect x="13" y="-10" width="17" height="13" rx="1" fill="#43775B"/><path d="M20-10V3M13-6H30" stroke="#F3CB93" strokeWidth="1.4"/>
      </g>
      <path d="M149 389Q245 428 320 394Q418 425 492 387" fill="none" stroke="#788177" strokeWidth=".8"/>
      {Array.from({ length: 23 }, (_, i) => { const x = 153 + i * 15, y = i < 11 ? 392 + Math.sin(i / 11 * Math.PI) * 20 : 393 + Math.sin((i - 11) / 11 * Math.PI) * 18; return <g key={i} data-scene-light="true"><circle cx={x} cy={y} r="6" fill={fill("gold-glow")}/><circle cx={x} cy={y} r="1.4" fill={i % 3 ? "#FFDEA2" : "#E68480"}/></g>; })}
      <path d="M133 499Q218 464 280 487T509 484V555H123Z" fill={fill("snow")}/>
      <g transform="translate(386 481)"><circle cy="-9" r="10" fill="#DCECF1"/><circle cy="-24" r="7.5" fill="#E9F4F2"/><path d="M-8-28H9M-6-29V-36H6V-28" stroke="#3C4B56" strokeWidth="3"/><path d="M-6-19H7L9-11" stroke="#BD5C58" strokeWidth="3"/><circle cx="-2" cy="-25" r=".8" fill="#263B4C"/><path d="M1-23L8-21L1-20" fill="#E4A374"/></g>
      <path d="M206 496L222 501M205 500L221 505" stroke="#9B574C" strokeWidth="2"/><path d="M208 490L224 495M211 492V500M221 495V504" stroke="#C48C64" strokeWidth="1.2"/>
    </>}
    {scene === "aurora" && <>
      {[0, 1, 2].map(index => <path key={index} data-scene-aurora={index} d={auroraCurtain(index, 0, intensity)} fill={fill("aurora")} opacity={.9 - index * .2}/>)}
      {Array.from({ length: 25 }, (_, index) => <path key={index} d={`M${153 + index * 14} ${222 + Math.sin(index * .42) * 19}q${Math.sin(index) * 13} 40 ${Math.cos(index) * 13} ${38 + Math.sin(index * .41) * 19}`} stroke={color} strokeOpacity=".12" strokeWidth="1.2" fill="none"/>)}
      <path d="M127 425L191 329L228 378L279 315L325 381L369 337L408 387L450 319L516 433V540H123Z" fill="#24495D"/>
      <path d="M168 363L191 329L211 358L196 352L191 359L187 346L176 365M253 348L279 315L304 351L287 341L281 344L274 332L264 349M427 351L450 319L475 353L457 343L449 343L445 332Z" fill="#AFD8DC"/>
      <path d="M124 470L215 393L246 429L302 377L347 435L397 383L523 468V550H122Z" fill="#122F43"/>
      <path d="M194 412L215 393L236 421L219 416L213 409L205 420M280 400L302 377L324 408L308 401L300 391L288 408M374 410L397 383L429 416L404 405L397 395L389 414Z" fill={fill("ridge")}/>
      <path d="M132 472Q234 437 326 468T520 471V548H126Z" fill="#193C4C"/><path d="M161 478Q223 455 278 476T454 487M189 489Q246 472 285 490T428 501M237 504Q285 492 334 507" fill="none" stroke={color} strokeWidth="3" strokeOpacity=".16"/>
      <path d="M120 495Q182 474 219 501Q252 487 284 516L282 550H120M510 489Q458 477 427 513Q396 502 379 539H520Z" fill={fill("snow")}/>
      <g transform="translate(372 482)"><path d="M-2 0V-9L1-13L4-10L4 0M-1-7L-5-3M3-7L8-5" stroke="#C4D3D5" strokeWidth="1.5"/><circle cy="-14" r="2" fill="#D1D8D1"/></g>
    </>}
    {cosmic && <>
      <ellipse cx="389" cy="273" rx="112" ry="70" transform="rotate(-38 389 273)" fill={fill("nebula")} opacity=".85"/>
      <g fill="none" stroke={color} strokeWidth=".5" strokeOpacity=".18"><ellipse cx="324" cy="272" rx="114" ry="57" transform="rotate(-24 324 272)"/><ellipse cx="324" cy="272" rx="102" ry="43" transform="rotate(24 324 272)"/><circle cx="324" cy="272" r="78" strokeDasharray="1 5"/></g>
      <g transform="rotate(-27 403 263)"><ellipse cx="403" cy="263" rx="39" ry="9" fill="none" stroke="#BFB6F1" strokeWidth="3" strokeOpacity=".6"/><circle cx="403" cy="263" r="18" fill={fill("dome")}/><path d="M364 263A39 9 0 0 0 442 263" fill="none" stroke="#DDD1FB" strokeWidth="2.5" opacity=".83"/><path d="M366 266Q403 283 442 265" fill="none" stroke={color} strokeWidth=".6" opacity=".5"/></g>
      <g data-scene-comet="true" transform={`translate(${comet.x} ${comet.y})`} opacity={comet.opacity}><path d="M-64-22Q-19-6 0 0Q-14-9-64-22Z" fill={fill("comet")}/><circle r="1.7" fill="#FFF7F4"/></g>
      <path d="M162 292L202 256L238 277L268 231M202 256L209 315" fill="none" stroke="#BCB9E1" strokeOpacity=".26" strokeWidth=".7"/>{[[162, 292], [202, 256], [238, 277], [268, 231], [209, 315]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="1.3" fill="#E7E4F9"/><circle cx={x} cy={y} r="5" fill={fill("moon-glow")}/></g>)}
      <path d="M127 453L193 361L241 418L274 377L329 434L412 374L520 461V550H127Z" fill="#2C3D59"/><path d="M175 387L193 361L218 389L200 382L193 376L183 390M388 397L412 374L443 400L423 393L411 386L404 397Z" fill="#B8C7DC"/>
      <path d="M134 475Q224 426 304 443T518 466V550H130Z" fill={fill("snow")}/>
      <g transform="translate(367 446)"><ellipse cy="5" rx="77" ry="14" fill="#0E253C" opacity=".48"/><path d="M-49 0V-30Q0-44 49-30V0Q0 12-49 0Z" fill="#263B59" stroke="#7B91AD" strokeWidth="1"/>
        <path d="M-53-28A53 53 0 0 1 53-28Q0-11-53-28Z" fill={fill("dome")} stroke="#BDD6E8" strokeWidth="1"/>
        <path d="M-9-81Q-20-54-13-20L4-19Q-6-55 10-80" fill="#0A1D33"/><path d="M11-81Q-6-57 4-19" fill="none" stroke="#B0C5D8" strokeWidth="1.5"/>
        <path d="M-46-45Q0-32 45-43M-32-68Q-38-42-28-24M30-69Q39-42 29-24" fill="none" stroke="#B1C3D8" strokeOpacity=".45" strokeWidth=".65"/>
        <path d="M-50-28Q0-13 52-28M-48-23Q0-8 48-23" fill="none" stroke="#DCE9EE" strokeWidth="1.2"/>
        <g transform="translate(-5 -49) rotate(-31)"><path d="M-4 12V28M-2 21L-16 31M-2 21L12 31" stroke="#738FAB" strokeWidth="2"/><rect x="-5" y="-21" width="10" height="39" rx="2" fill="#9FAEC7" stroke="#DCE8F0" strokeWidth=".7"/><path d="M-7-20H7V-28H-7Z" fill="#182B47" stroke="#D5E5F1" strokeWidth="1"/><rect x="-3" y="-18" width="3" height="29" fill="#D8E5F0" opacity=".5"/></g>
        {[-36, -18, 18, 36].map(x => <rect key={x} x={x - 3} y="-13" width="6" height="7" rx="1" fill="#FFD49D" opacity=".8"/>)}<path d="M-5 5V-7H5V5" fill="#18283F"/>
      </g>
      <path d="M366 454Q336 474 346 487T314 524" fill="none" stroke="#D7DEF3" strokeOpacity=".48" strokeWidth="4"/>
      <path d="M119 511Q212 467 275 499T510 489V550H120Z" fill="#3B536F"/><path d="M130 508Q208 472 275 499T504 491" fill="none" stroke="#C1CEDF" strokeWidth="1.4"/>
      <g transform="translate(228 469)"><path d="M0-23L-5 0M0-23L9 0M0-23L1 2" stroke="#9AABC4" strokeWidth="1.3"/><path d="M-13-24L13-34L16-29L-11-19Z" fill="#C1CBDB" stroke="#60758F" strokeWidth=".7"/></g>
    </>}
    <circle cx="320" cy="350" r="177" fill="none" stroke={color} strokeOpacity=".1" strokeWidth="6"/>
  </g>;
}
