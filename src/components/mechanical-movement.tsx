import { memo, type ReactNode } from "react";

/** Static SVG geometry; WatchFace advances only these transform attributes. */
function Gear({ x, y, radius, teeth, period, reverse = false, phase = 0, fill, accent, spokes = 5 }: { x: number; y: number; radius: number; teeth: number; period: number; reverse?: boolean; phase?: number; fill: (name: string) => string; accent: string; spokes?: number }) {
  const points = Array.from({ length: teeth * 4 }, (_, index) => {
    const angle = index / (teeth * 4) * Math.PI * 2;
    const r = index % 4 === 1 || index % 4 === 2 ? radius : radius - 3;
    return `${x + Math.sin(angle) * r},${y - Math.cos(angle) * r}`;
  }).join(" ");
  return <g>
    <circle cx={x} cy={y} r={radius + 3} fill="#010405" stroke="#24363C" strokeWidth="1.3" />
    <g data-mechanical-gear="true" data-center-x={x} data-center-y={y} data-period={period} data-direction={reverse ? -1 : 1} data-phase={phase} transform={`rotate(${phase} ${x} ${y})`}>
      <polygon points={points} fill={fill("mechanical-gear")} stroke="#EBDBC1" strokeOpacity=".65" strokeWidth=".55" />
      <circle cx={x} cy={y} r={radius - 7} fill="#070E12" stroke="#B5A080" strokeWidth="1.4" />
      <circle cx={x} cy={y} r={radius - 11} fill="none" stroke="#758887" strokeOpacity=".35" strokeWidth=".6" />
      {Array.from({ length: spokes }, (_, index) => <g key={index} transform={`rotate(${index * 360 / spokes} ${x} ${y})`}><path d={`M${x - 4} ${y - 7}L${x - 7} ${y - radius + 10}Q${x} ${y - radius + 5} ${x + 7} ${y - radius + 10}L${x + 4} ${y - 7}Z`} fill={fill("mechanical-gear")} stroke="#E9DCC6" strokeOpacity=".45" strokeWidth=".6" /><path d={`M${x - 3} ${y - 11}L${x - 4} ${y - radius + 12}`} stroke="#FFF3DA" strokeOpacity=".5" strokeWidth=".7" /></g>)}
      <circle cx={x} cy={y} r="10" fill={fill("bezel")} stroke="#0A151B" strokeWidth="1.5" />
    </g>
    <circle cx={x} cy={y} r="5.5" fill="#371423" stroke="#DA798A" strokeWidth="1.2" />
    <circle cx={x} cy={y} r="2.3" fill={accent} fillOpacity=".85" />
    <circle cx={x - 1} cy={y - 1} r="1" fill="#FFF7F9" />
  </g>;
}

function Bridge({ children, fill }: { children: ReactNode; fill: (name: string) => string }) {
  return <g fill={fill("mechanical-bridge")} stroke="#77928F" strokeWidth="1.1">{children}</g>;
}

export const MechanicalMovement = memo(function MechanicalMovement({ fill, accent }: { fill: (name: string) => string; accent: string }) {
  const spiral = Array.from({ length: 125 }, (_, index) => {
    const angle = index / 124 * Math.PI * 10;
    const radius = 3 + index / 124 * 21;
    return `${index ? "L" : "M"}${415 + Math.cos(angle) * radius} ${444 + Math.sin(angle) * radius}`;
  }).join(" ");
  return <g data-mechanical-movement="true">
    <circle cx="320" cy="350" r="163" fill="#040B0E" stroke="#6C8382" strokeWidth="1.2" />
    {[0, 1, 2, 3, 4].map(index => <circle key={index} cx="320" cy="350" r={159 - index * 4} fill="none" stroke="#85A19A" strokeOpacity=".1" strokeWidth=".7" />)}
    <path d="M170 308L212 218L287 207L342 242L416 209L464 255L479 398L433 486L318 505L199 456Z" fill={fill("mechanical-plate")} stroke="#253F42" strokeWidth="2" />
    {Array.from({ length: 11 }, (_, index) => <path key={index} d={`M181 ${230 + index * 24}L468 ${279 + index * 24}`} stroke="#AFD0C7" strokeOpacity=".055" strokeWidth="8" />)}
    <Gear x={245} y={289} radius={49} teeth={30} period={48000} fill={fill} accent={accent} />
    <Gear x={327} y={265} radius={37} teeth={24} period={38400} reverse phase={7.5} fill={fill} accent={accent} spokes={4} />
    <Gear x={400} y={289} radius={38} teeth={24} period={38400} fill={fill} accent={accent} spokes={4} />
    <Gear x={225} y={432} radius={35} teeth={24} period={38400} reverse fill={fill} accent={accent} spokes={4} />
    <Gear x={267} y={405} radius={19} teeth={14} period={22400} fill={fill} accent={accent} spokes={3} />
    <circle cx="415" cy="444" r="37" fill="#020708" stroke="#BEA075" strokeWidth="2" />
    <circle cx="415" cy="444" r="32" fill="#10191B" stroke="#6F8280" strokeWidth=".6" />
    <g data-balance-wheel="true" transform="rotate(0 415 444)">
      <circle cx="415" cy="444" r="29" fill="none" stroke={fill("mechanical-gear")} strokeWidth="3.5" />
      {Array.from({ length: 12 }, (_, index) => <circle key={index} cx="415" cy="417" r="1.7" fill="#F1D4A3" transform={`rotate(${index * 30} 415 444)`} />)}
      <path d="M388 444H442M415 417V471" stroke="#AC9D81" strokeWidth="2" />
      <path d={spiral} fill="none" stroke="#84C2C7" strokeOpacity=".8" strokeWidth=".65" />
      <circle cx="415" cy="444" r="6" fill="#381825" stroke="#E895AA" strokeWidth="1" />
      <circle cx="414" cy="443" r="1.5" fill="#FFEDFA" />
    </g>
    <Bridge fill={fill}>
      <path d="M194 216L224 208L276 294L327 309L372 290L433 213L454 229L390 318L347 337L287 323L256 314Z" />
      <path d="M174 389L197 381L239 403L285 425L283 449L242 430L195 407L183 422Z" />
      <path d="M452 378L472 389L456 460L438 480L426 467L440 445Z" />
      <path d="M279 479L314 485L361 476L374 491L321 510L280 501Z" />
    </Bridge>
    <path d="M203 218L266 303L292 313L330 326L381 306L444 223M184 393L277 434M464 391L447 454" fill="none" stroke="#D7EBE1" strokeOpacity=".45" strokeWidth=".75" />
    <path d="M209 220L260 293M399 279L438 230M188 396L224 412M453 412L449 433" fill="none" stroke={accent} strokeOpacity=".65" strokeWidth="1.6" />
    {[[208, 222], [441, 230], [193, 398], [281, 434], [460, 396], [445, 461], [291, 493], [361, 488]].map(([x, y], index) => <g key={index}><circle cx={x} cy={y} r="5.8" fill="#071116" stroke="#A1B2B1" strokeWidth=".8" /><circle cx={x} cy={y} r="3.5" fill={fill("metal")} /><path d={`M${x - 2.4} ${y + 1}L${x + 2.4} ${y - 1}`} stroke="#071015" strokeWidth="1" /></g>)}
    <path d="M296 281H344L350 294H290Z" fill="#071013" stroke="#668780" strokeWidth=".7" />
    <text x="320" y="290.5" textAnchor="middle" fill="#BCD1C6" fontSize="7" letterSpacing="1.8">REACTOR</text>
  </g>;
});
