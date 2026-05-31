import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Ticket, Users, Share2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { eventsAPI } from '../api/client'
import { useAuthStore, useUIStore } from '../store/useStore'
import ReviewSection from '../components/ReviewSection'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { showToast } = useUIStore()
  const navigate = useNavigate()
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    eventsAPI.get(id).then((r) => setEvent(r.data)).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
  if (!event?.id) return;

  eventsAPI.reviews(event.id).then((r) => setReviews(r.data)).catch(console.error);}, [event?.id]);

  const submitReview = async (data) => {
  try {
    const res = await eventsAPI.createReview(
      event.id,
      data
    );

    setReviews((prev) => [
      res.data,
      ...prev,
    ]);

    showToast(
      "Review submitted successfully",
      "success"
    );
    } catch {
      showToast(
        "Failed to submit review",
        "error"
      );
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-6">
      <div className="h-64 bg-ink-800 rounded-2xl" />
      <div className="h-8 bg-ink-800 rounded w-1/2" />
      <div className="h-4 bg-ink-800 rounded w-1/3" />
    </div>
  )

  if (!event) return (
    <div className="text-center py-20 text-ink-400">Event not found</div>
  )
  const totalSeats = event.total_rows * event.seats_per_row
  const fillPercent = ((totalSeats - (event.available_seats ?? 0)) / totalSeats) * 100

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero image */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-ink-800 to-ink-700 rounded-2xl overflow-hidden mb-8">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar size={64} className="text-ink-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          {event.category && (
            <span className="badge bg-amber-500 text-ink-950 font-semibold text-xs mb-2 inline-block">
              {event.category}
            </span>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-50">{event.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main info */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Calendar size={15} />
                <span className="text-xs font-medium uppercase tracking-wide">Date & Time</span>
              </div>
              <p className="text-ink-100 font-medium text-sm">{format(new Date(event.event_date), 'EEEE, MMM d, yyyy')}</p>
              <p className="text-ink-400 text-xs">{format(new Date(event.event_date), 'h:mm a')}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <MapPin size={15} />
                <span className="text-xs font-medium uppercase tracking-wide">Venue</span>
              </div>
              <p className="text-ink-100 font-medium text-sm line-clamp-2">{event.venue}</p>
            </div>
          </div>

          {event.description && (
            <div>
              <h3 className="font-display text-lg font-semibold text-ink-50 mb-2">About this event</h3>
              <p className="text-ink-300 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-display text-lg font-semibold text-ink-50 mb-3">Seating</h3>
            <div className="card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-400">Total capacity</span>
                <span className="text-ink-100 font-medium">{totalSeats} seats</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-400">Available</span>
                <span className={`font-medium ${(event.available_seats ?? 0) < 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {event.available_seats ?? 0} seats
                </span>
              </div>
              <div>
                <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${fillPercent > 80 ? 'bg-red-500' : fillPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-ink-400"><span className="w-2 h-2 rounded-sm bg-amber-500/20 border border-amber-500/50" />VIP (Rows A–B)</span>
                <span className="flex items-center gap-1 text-ink-400"><span className="w-2 h-2 rounded-sm bg-emerald-500/20 border border-emerald-500/50" />General</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking sidebar */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-24">
            <div className="text-3xl font-bold text-amber-400 mb-1">₹{event.ticket_price.toLocaleString()}</div>
            <p className="text-ink-400 text-xs mb-4">per ticket</p>

            <div className="space-y-3">
              {user ? (
                <>
                  <Link to={`/events/${id}/book`} className="btn-primary w-full text-center block">
                    <Ticket size={15} className="inline mr-2" />
                    Book Tickets
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-ink-400 text-xs text-center mb-2">Sign in to book tickets</p>
                  <Link to="/login" className="btn-primary w-full text-center block">Sign in to book</Link>
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-ink-800 space-y-2 text-xs text-ink-400">
              <p> Secure checkout</p>
              <p> Instant confirmation</p>
              <div className="card p-4">
                <p className="text-xs text-ink-500 mb-1">Organised by</p>
                <p className="text-ink-200 font-medium text-sm">{event.organizer?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReviewSection reviews={reviews} onSubmit={submitReview}/>
    </div>
  )
}

