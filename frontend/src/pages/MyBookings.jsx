import { useState, useEffect } from 'react'
import { Ticket, Calendar, MapPin, X, ChevronDown, ChevronUp } from 'lucide-react'
import { bookingsAPI } from '../api/client'
import { useUIStore } from '../store/useStore'
import { CiMusicNote1 } from "react-icons/ci";
import { MdOutlineSportsCricket } from "react-icons/md";
import { CiLaptop } from "react-icons/ci";
import { FaRegFaceLaughBeam } from "react-icons/fa6";
import { FaPaintBrush } from "react-icons/fa";
import { MdOutlineTheaterComedy } from "react-icons/md";
import { IoFastFoodOutline } from "react-icons/io5";

const STATUS_BADGE = {
  confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending:   'bg-amber-500/20   text-amber-400   border-amber-500/30',
  cancelled: 'bg-ink-700        text-ink-400      border-ink-600',
}
const CAT_ICON = { Music:<CiMusicNote1 />, 
  Sports:<MdOutlineSportsCricket />, 
  Tech:<CiLaptop />,
  Comedy:<FaRegFaceLaughBeam />, 
  Art:<FaPaintBrush />, 
  Food:<IoFastFoodOutline />, 
  Theatre:<MdOutlineTheaterComedy /> }

function fmt(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function BookingCard({ bk, onCancel }) {
  const [open, setOpen] = useState(false)
  const icon = CAT_ICON[bk.event_category] || '🎟'

  return (
    <div className={`card overflow-hidden transition-all ${bk.status === 'cancelled' ? 'opacity-55' : ''}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Category icon */}
          <div className="w-12 h-12 rounded-xl bg-ink-800 flex items-center justify-center text-2xl flex-shrink-0">
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-display font-semibold text-ink-100 line-clamp-1">{bk.event_title || 'Event'}</p>
                {bk.event_date && (
                  <p className="text-ink-400 text-xs mt-0.5 flex items-center gap-1">
                    <Calendar size={10}/>{fmt(bk.event_date)}
                  </p>
                )}
                {bk.event_venue && (
                  <p className="text-ink-500 text-xs flex items-center gap-1">
                    <MapPin size={10}/>{bk.event_venue}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`badge border text-[10px] ${STATUS_BADGE[bk.status] || STATUS_BADGE.confirmed}`}>
                  {bk.status}
                </span>
                <span className="text-amber-400 font-bold">₹{(bk.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Collapsed seat preview */}
            {!open && bk.seats?.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {bk.seats.slice(0, 6).map(s => (
                  <span key={s.id} className="font-mono text-[10px] bg-ink-800 text-ink-300 px-1.5 py-0.5 rounded border border-ink-700">
                    {s.row_label}{s.seat_number}
                  </span>
                ))}
                {bk.seats.length > 6 && (
                  <span className="text-ink-500 text-[10px] px-1">+{bk.seats.length - 6} more</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-800">
          <div className="flex items-center gap-3 text-xs text-ink-600">
            <span className="font-mono">#{(bk.id || '').slice(0, 8).toUpperCase()}</span>
            {bk.created_at && (
              <span>
                Booked {new Date(bk.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            <span className="text-ink-500">📧 Ticket emailed</span>
          </div>
          <div className="flex items-center gap-2">
            {bk.status === 'confirmed' && (
              <button onClick={() => onCancel(bk.id)}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                <X size={11}/>Cancel
              </button>
            )}
            {bk.seats?.length > 0 && (
              <button onClick={() => setOpen(o => !o)}
                className="text-[11px] text-ink-400 hover:text-ink-200 flex items-center gap-1 transition-colors">
                {open ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                {open ? 'Less' : 'Details'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded seat grid */}
      {open && bk.seats?.length > 0 && (
        <div className="border-t border-ink-800 bg-ink-900/50 p-4">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
            Seats ({bk.seats.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bk.seats.map(s => (
              <div key={s.id} className="font-mono text-xs bg-ink-800 border border-ink-700 rounded-lg px-2.5 py-1.5 text-center">
                <p className="text-amber-400 font-bold">{s.row_label}{s.seat_number}</p>
                <p className="text-ink-500 text-[10px]">{s.section}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const { showToast } = useUIStore()

  useEffect(() => {
    // Backend returns newest-first
    bookingsAPI.list().then(r => setBookings(r.data)).finally(() => setLoading(false))
  }, [])

  const cancel = async (id) => {
    if (!confirm('Cancel this booking? Seats will be released.')) return
    try {
      await bookingsAPI.cancel(id)
      setBookings(b => b.map(bk => bk.id === id ? { ...bk, status: 'cancelled' } : bk))
      showToast('Booking cancelled', 'info')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cancellation failed', 'error')
    }
  }

  const displayed = bookings.filter(b => {
    if (filter === 'confirmed') return b.status === 'confirmed'
    if (filter === 'cancelled') return b.status === 'cancelled'
    return true
  })

  const confirmed  = bookings.filter(b => b.status === 'confirmed').length
  const totalSpent = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + (b.total_amount || 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">My Tickets</h1>
          <p className="text-ink-400 text-sm mt-1">
            {confirmed} active · ₹{totalSpent.toLocaleString()} spent
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-ink-900 border border-ink-700 rounded-xl w-fit mb-6">
        {[
          { k: 'all',       l: 'All' },
          { k: 'confirmed', l: 'Active' },
          { k: 'cancelled', l: 'Cancelled' },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${filter === f.k ? 'bg-amber-500 text-ink-950' : 'text-ink-400 hover:text-ink-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="w-12 h-12 bg-ink-800 rounded-xl"/>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-ink-800 rounded w-1/2"/>
                <div className="h-3 bg-ink-800 rounded w-1/3"/>
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <Ticket size={48} className="text-ink-700 mx-auto mb-4"/>
          <p className="text-ink-400 font-medium">
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </p>
          <p className="text-ink-600 text-sm mt-1">Browse events to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(bk => <BookingCard key={bk.id} bk={bk} onCancel={cancel}/>)}
        </div>
      )}
    </div>
  )
}
