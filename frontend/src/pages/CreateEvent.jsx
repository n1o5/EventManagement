import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, DollarSign, Image, Tag, Grid, ArrowLeft } from 'lucide-react'
import { eventsAPI } from '../api/client'
import { useUIStore } from '../store/useStore'

const CATEGORIES = ['Music', 'Sports', 'Tech', 'Comedy', 'Art', 'Theatre', 'Food', 'Other']

export default function CreateEvent() {
  const navigate = useNavigate()
  const { showToast } = useUIStore()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    event_date: '',
    ticket_price: '',
    total_rows: 10,
    seats_per_row: 20,
    category: '',
    image_url: '',
  })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        ticket_price: parseFloat(form.ticket_price),
        total_rows: parseInt(form.total_rows),
        seats_per_row: parseInt(form.seats_per_row),
        event_date: new Date(form.event_date).toISOString(),
      }
      const res = await eventsAPI.create(payload)
      showToast('Event created successfully! 🎉', 'success')
      navigate(`/events/${res.data.id}`)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create event', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalSeats = parseInt(form.total_rows || 0) * parseInt(form.seats_per_row || 0)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-ink-400 hover:text-ink-200 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <h1 className="font-display text-3xl font-bold text-ink-50 mb-2">Create an Event</h1>
      <p className="text-ink-400 text-sm mb-8">Fill in the details below. Seats will be generated automatically.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-ink-200 text-sm uppercase tracking-wide">Event Details</h2>

          <div>
            <label className="label">Event Title *</label>
            <input
              required value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Coldplay World Tour — Bengaluru"
              className="input"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={4} value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Tell attendees what to expect..."
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cover Image URL</label>
              <input
                type="url" value={form.image_url}
                onChange={(e) => set('image_url', e.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Venue & Date */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-ink-200 text-sm uppercase tracking-wide">Venue & Timing</h2>

          <div>
            <label className="label">
              <MapPin size={12} className="inline mr-1 text-amber-500" />
              Venue / Location *
            </label>
            <input
              required value={form.venue}
              onChange={(e) => set('venue', e.target.value)}
              placeholder="e.g. Chinnaswamy Stadium, Bengaluru"
              className="input"
            />
          </div>

          <div>
            <label className="label">
              <Calendar size={12} className="inline mr-1 text-amber-500" />
              Event Date & Time *
            </label>
            <input
              required type="datetime-local"
              value={form.event_date}
              onChange={(e) => set('event_date', e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Seating & Pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-semibold text-ink-200 text-sm uppercase tracking-wide">Seating & Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                <Grid size={12} className="inline mr-1 text-amber-500" />
                Number of Rows *
              </label>
              <input
                required type="number" min={1} max={26}
                value={form.total_rows}
                onChange={(e) => set('total_rows', e.target.value)}
                className="input"
              />
              <p className="text-xs text-ink-500 mt-1">Rows A–{String.fromCharCode(64 + parseInt(form.total_rows || 1))}</p>
            </div>
            <div>
              <label className="label">Seats per Row *</label>
              <input
                required type="number" min={1} max={100}
                value={form.seats_per_row}
                onChange={(e) => set('seats_per_row', e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="bg-ink-800 border border-ink-700 rounded-lg p-3 flex items-center justify-between text-sm">
            <span className="text-ink-400">Total capacity</span>
            <span className="font-bold text-amber-400">{totalSeats.toLocaleString()} seats</span>
          </div>

          <div>
            <label className="label">
              Ticket Price (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-sm">₹</span>
              <input
                required type="number" min={0} step="0.01"
                value={form.ticket_price}
                onChange={(e) => set('ticket_price', e.target.value)}
                placeholder="0.00"
                className="input pl-8"
              />
            </div>
            <p className="text-xs text-ink-500 mt-1">Rows A–B are automatically marked as VIP</p>
          </div>
        </div>

        {/* Preview */}
        {form.title && (
          <div className="card p-4 border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-2">Preview</p>
            <p className="font-display text-lg font-semibold text-ink-100">{form.title}</p>
            {form.venue && <p className="text-ink-400 text-xs mt-1"> {form.venue}</p>}
            {form.event_date && <p className="text-ink-400 text-xs"> {new Date(form.event_date).toLocaleString()}</p>}
            {form.ticket_price && <p className="text-amber-400 text-sm font-semibold mt-1">₹{parseFloat(form.ticket_price).toLocaleString()} per ticket</p>}
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? 'Creating event...' : 'Create Event & Generate Seats'}
        </button>
      </form>
    </div>
  )
}
