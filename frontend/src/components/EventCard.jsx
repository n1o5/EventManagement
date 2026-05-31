import { Link } from 'react-router-dom'
import { Calendar, MapPin, Ticket, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function EventCard({ event }) {
  const dateStr = format(new Date(event.event_date), 'MMM d, yyyy • h:mm a')
  const totalSeats = event.total_rows * event.seats_per_row
  const fillPercent = ((totalSeats - (event.available_seats ?? totalSeats)) / totalSeats) * 100

  return (
    <Link to={`/events/${event.id}`} className="card group hover:border-ink-500 transition-all duration-300 block">
      {/* Image / Placeholder */}
      <div className="relative h-44 bg-gradient-to-br from-ink-800 to-ink-700 overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar size={40} className="text-ink-600" />
          </div>
        )}
        {event.category && (
          <div className="absolute top-3 left-3">
            <span className="badge bg-ink-900/80 backdrop-blur text-ink-200 border border-ink-700 text-xs">
              {event.category}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="badge bg-amber-500/90 text-ink-950 font-semibold text-xs">
            ₹{event.ticket_price.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-ink-50 mb-2 line-clamp-1 group-hover:text-amber-400 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <Calendar size={12} className="text-amber-500/70 flex-shrink-0" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <MapPin size={12} className="text-amber-500/70 flex-shrink-0" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
        </div>

        {/* Availability bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
            <span className="flex items-center gap-1"><Ticket size={10} /> {event.available_seats ?? totalSeats} seats left</span>
            <span>{Math.round(fillPercent)}% full</span>
          </div>
          <div className="h-1 bg-ink-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${fillPercent > 80 ? 'bg-red-500' : fillPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-ink-800 flex items-center justify-between">
          <span className="text-xs text-ink-500">by {event.organizer?.name}</span>
          <span className="text-xs font-medium text-amber-400 group-hover:text-amber-300">
            View details →
          </span>
        </div>
      </div>
    </Link>
  )
}
