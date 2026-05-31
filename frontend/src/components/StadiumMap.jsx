import { useState } from 'react'

const STATUS_COLOR = { available:'#10b981', booked:'#44403c', locked:'#f59e0b', selected:'#f59e0b' }
const W=700, H=580, CX=W/2, CY=H/2, PITCH_RX=110, PITCH_RY=72
const RING_START=140, RING_GAP=17, AO=-Math.PI/2

function seatPos(ri, si, n) {
  const r  = RING_START + ri * RING_GAP
  const rx = r * 1.35, ry = r
  const a  = AO + (si / n) * 2 * Math.PI
  return { x: CX + rx * Math.cos(a), y: CY + ry * Math.sin(a) }
}

export default function StadiumMap({ seatMap, selectedSeats=[], onSeatToggle, readOnly=false }) {
  const [tooltip, setTooltip] = useState(null)
  if (!seatMap) return <div className="text-ink-500 text-sm text-center py-8">Loading…</div>

  const rows = Object.entries(seatMap.rows||{}).sort(([a],[b])=>a.localeCompare(b))
  const isSel = id => selectedSeats.includes(id)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl mx-auto select-none" style={{maxHeight:520}}>
        {/* Pitch glow */}
        <ellipse cx={CX} cy={CY} rx={PITCH_RX+10} ry={PITCH_RY+10} fill="#052e16" opacity="0.6"/>
        {/* Pitch */}
        <ellipse cx={CX} cy={CY} rx={PITCH_RX} ry={PITCH_RY} fill="#15803d"/>
        {/* Markings */}
        <ellipse cx={CX} cy={CY} rx={30} ry={21} fill="none" stroke="#166534" strokeWidth="1.5"/>
        <circle  cx={CX} cy={CY} r={2.5} fill="#166534"/>
        <line x1={CX-PITCH_RX} y1={CY} x2={CX+PITCH_RX} y2={CY} stroke="#166534" strokeWidth="1.5"/>
        <rect x={CX-30} y={CY-PITCH_RY} width={60} height={24} fill="none" stroke="#166534" strokeWidth="1.5"/>
        <rect x={CX-30} y={CY+PITCH_RY-24} width={60} height={24} fill="none" stroke="#166534" strokeWidth="1.5"/>
        <text x={CX} y={CY-PITCH_RY-10} textAnchor="middle" fill="#4ade80" fontSize="10" fontFamily="monospace" opacity="0.5">PITCH / FIELD</text>

        {/* Seats */}
        {rows.map(([rowLabel, seats], ri) => seats.map((seat, si) => {
          const { x, y } = seatPos(ri, si, seats.length)
          const sel  = isSel(seat.id)
          const fill = sel ? STATUS_COLOR.selected
            : seat.status==='booked' ? STATUS_COLOR.booked
            : seat.status==='locked' ? STATUS_COLOR.locked
            : STATUS_COLOR.available
          const isVIP = rowLabel==='A'||rowLabel==='B'
          return (
            <circle key={seat.id} cx={x} cy={y} r={4.5} fill={fill}
              opacity={seat.status==='booked'?0.4:1}
              stroke={sel?'#fcd34d':isVIP?'#f59e0b55':'none'}
              strokeWidth={sel?1.5:isVIP?1:0}
              style={{ cursor: readOnly||(seat.status!=='available'&&!sel)?'default':'pointer', transition:'fill .15s' }}
              onClick={() => { if(readOnly) return; if(seat.status!=='available'&&!sel) return; onSeatToggle?.(seat) }}
              onMouseEnter={e => setTooltip({x:e.clientX,y:e.clientY,label:`Row ${rowLabel} · Seat ${seat.seat_number}`,section:seat.section,status:seat.status})}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        }))}

        {/* Row labels every 2 rows at left */}
        {rows.filter((_,i)=>i%2===0).map(([lbl],i)=>{
          const rx=(RING_START+i*2*RING_GAP)*1.35+RING_GAP
          return <text key={lbl} x={CX-rx-4} y={CY+4} textAnchor="middle" fill="#78716c" fontSize="9" fontFamily="monospace">{lbl}</text>
        })}

        {/* Stand labels */}
        {[{l:'NORTH STAND',x:CX,y:20},{l:'SOUTH STAND',x:CX,y:H-8},{l:'EAST',x:W-14,y:CY},{l:'WEST',x:16,y:CY}].map(s=>(
          <text key={s.l} x={s.x} y={s.y} textAnchor="middle" fill="#57534e" fontSize="9" fontFamily="monospace" letterSpacing="1.5">{s.l}</text>
        ))}
      </svg>

      {tooltip && (
        <div className="fixed z-50 bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl"
          style={{left:tooltip.x+12,top:tooltip.y-40}}>
          <p className="font-semibold text-ink-100">{tooltip.label}</p>
          <p className="text-ink-400">{tooltip.section} · {tooltip.status}</p>
        </div>
      )}

      <div className="flex items-center gap-4 justify-center pt-3 text-xs text-ink-400 flex-wrap">
        {[['#10b981','Available'],['#f59e0b','Selected / Locked'],['#44403c','Booked']].map(([c,l])=>(
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{background:c}}/>{l}
          </span>
        ))}
      </div>
    </div>
  )
}
