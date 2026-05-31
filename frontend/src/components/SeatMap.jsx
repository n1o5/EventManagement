import StadiumMap from './StadiumMap'

const SPORT_CATS = ['sports','cricket','football','basketball','kabaddi','hockey']

export default function SeatMap({ seatMap, selectedSeats=[], onSeatToggle, maxSelect=10, readOnly=false, category }) {
  const isStadium = SPORT_CATS.some(c => (category||'').toLowerCase().includes(c))

  if (isStadium) {
    return <StadiumMap seatMap={seatMap} selectedSeats={selectedSeats} onSeatToggle={onSeatToggle} readOnly={readOnly}/>
  }

  if (!seatMap) return <div className="text-ink-400 text-sm text-center py-8">Loading seat map…</div>

  const rows    = Object.entries(seatMap.rows||{}).sort(([a],[b])=>a.localeCompare(b))
  const isSel   = id => selectedSeats.includes(id)
  const getCls  = seat => {
    if (isSel(seat.id))          return 'seat-selected'
    if (seat.status==='booked')  return 'seat-booked'
    if (seat.status==='locked')  return 'seat-locked'
    return 'seat-available'
  }
  const handleClick = seat => {
    if (readOnly) return
    if (seat.status!=='available' && !isSel(seat.id)) return
    if (!isSel(seat.id) && selectedSeats.length >= maxSelect) return
    onSeatToggle?.(seat)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center mb-6">
        <div className="bg-ink-700 border border-ink-600 rounded-lg px-12 py-2 text-xs text-ink-400 tracking-widest uppercase">Stage / Screen</div>
      </div>
      {rows.map(([rowLabel, seats]) => {
        const isVIP = rowLabel==='A'||rowLabel==='B'
        return (
          <div key={rowLabel} className="flex items-center gap-2">
            <span className={`w-5 text-xs font-mono text-right flex-shrink-0 ${isVIP?'text-amber-400':'text-ink-500'}`}>{rowLabel}</span>
            <div className="flex gap-1 flex-wrap">
              {seats.map(seat => (
                <button key={seat.id} onClick={()=>handleClick(seat)}
                  title={`Row ${seat.row_label}, Seat ${seat.seat_number} — ${seat.section} — ${seat.status}`}
                  className={`w-6 h-6 rounded text-[9px] font-mono transition-all duration-150 ${getCls(seat)} ${isVIP?'seat-vip':''}`}
                  disabled={readOnly||(seat.status!=='available'&&!isSel(seat.id))}>
                  {seat.seat_number}
                </button>
              ))}
            </div>
            <span className="w-5 text-xs font-mono text-ink-500">{rowLabel}</span>
          </div>
        )
      })}
      <div className="flex items-center gap-4 justify-center pt-4 text-xs text-ink-400 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"/>Available</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 border border-amber-400"/>Selected</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50"/>Locked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ink-700 border border-ink-600"/>Booked</span>
      </div>
    </div>
  )
}
