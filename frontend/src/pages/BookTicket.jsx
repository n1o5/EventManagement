import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Ticket, ArrowLeft } from 'lucide-react'
import { eventsAPI, bookingsAPI } from '../api/client'
import { useUIStore } from '../store/useStore'
import SeatMap from '../components/SeatMap'
import PaymentModal from '../components/PaymentModal'

export default function BookTicket() {
  const { id } = useParams()
  const [event, setEvent]           = useState(null)
  const [seatMap, setSeatMap]       = useState(null)
  const [selected, setSelected]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const { showToast } = useUIStore()
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([eventsAPI.get(id), eventsAPI.seatMap(id)])
      .then(([er, sr]) => { setEvent(er.data); setSeatMap(sr.data) })
      .finally(() => setLoading(false))
  }, [id])

  const toggleSeat = seat =>
    setSelected(p => p.includes(seat.id) ? p.filter(s => s !== seat.id) : [...p, seat.id])

  const handleProceed = () => {
    if (!selected.length) { showToast('Please select at least one seat', 'error'); return }
    setShowPayment(true)
  }

  const handlePaymentSuccess = async () => {
    setShowPayment(false)
    setSubmitting(true)
    try {
      await bookingsAPI.create({ event_id: id, seat_ids: selected })
      showToast('Booking confirmed! Ticket sent to your email', 'success')
      navigate('/my-bookings')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Booking failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 bg-ink-800 rounded w-1/3 mb-8"/>
      <div className="h-96 bg-ink-800 rounded-xl"/>
    </div>
  )

  const totalPrice = (event?.ticket_price || 0) * selected.length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-ink-400 hover:text-ink-200 text-sm mb-6 transition-colors">
        <ArrowLeft size={15}/>Back
      </button>

      <h1 className="font-display text-2xl font-bold text-ink-50 mb-1">{event?.title}</h1>
      <p className="text-ink-400 text-sm mb-8">Select your seats then proceed to payment</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat map */}
        <div className="lg:col-span-2 card p-6 overflow-x-auto">
          <SeatMap
            seatMap={seatMap}
            selectedSeats={selected}
            onSeatToggle={toggleSeat}
            category={event?.category}
          />
        </div>

        {/* Summary sidebar */}
        <div className="card p-5 h-fit sticky top-24 space-y-4">
          <h3 className="font-display font-semibold text-ink-50">Your Selection</h3>

          {selected.length === 0 ? (
            <p className="text-ink-500 text-sm">Click seats on the map to select them</p>
          ) : (
            <div className="space-y-2">
              <p className="text-ink-300 text-sm font-medium">
                {selected.length} seat{selected.length > 1 ? 's' : ''} selected
              </p>
              <div className="text-2xl font-bold text-amber-400">₹{totalPrice.toLocaleString()}</div>
              <p className="text-ink-500 text-xs">₹{event?.ticket_price?.toLocaleString()} × {selected.length}</p>

              {/* Selected seat labels */}
              <div className="flex flex-wrap gap-1 pt-1">
                {selected.map(sid => {
                  const seat = Object.values(seatMap?.rows || {}).flat().find(s => s.id === sid)
                  return seat ? (
                    <span key={sid} className="font-mono text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      {seat.row_label}{seat.seat_number}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleProceed}
            disabled={submitting || selected.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Ticket size={14}/>Proceed to Pay
          </button>

          <div className="space-y-1.5 text-xs text-ink-500 pt-1">
            <p>Secure checkout</p>
            <p>Instant confirmation</p>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={totalPrice}
        eventTitle={event?.title}
        seatCount={selected.length}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
