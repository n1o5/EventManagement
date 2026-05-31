import { useState, useEffect } from 'react'
import { Search, Calendar, Sparkles, LogIn, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { eventsAPI, recommendationsAPI } from '../api/client'
import { useAuthStore } from '../store/useStore'
import EventCard from '../components/EventCard'

const CATEGORIES = ['All', 'Music', 'Sports', 'Tech', 'Comedy', 'Art', 'Theatre', 'Food']

function RecommendationTag({ tag }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-medium">
      ✦ {tag}
    </span>
  )
}

function RecommendedCard({ event }) {
  const tags = event.recommendation_tags ?? []
  const dateStr = new Date(event.event_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
  return (
    <Link to={`/events/${event.id}`}
      className="card group hover:border-amber-500/40 transition-all duration-300 flex gap-4 p-4">
      <div className="w-20 h-20 rounded-lg bg-ink-800 flex-shrink-0 overflow-hidden">
        {event.image_url
          ? <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
          : <div className="w-full h-full flex items-center justify-center"><Calendar size={20} className="text-ink-600"/></div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-1.5 mb-1 flex-wrap">
          {tags.slice(0,2).map((t, i) => <RecommendationTag key={i} tag={t}/>)}
        </div>
        <p className="font-display font-semibold text-ink-100 text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">
          {event.title}
        </p>
        <p className="text-ink-500 text-xs mt-0.5 line-clamp-1">{event.venue}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-ink-400">{dateStr}</span>
          <span className="text-amber-400 font-semibold text-xs">₹{event.ticket_price?.toLocaleString()}</span>
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const [events, setEvents]         = useState([])
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading]       = useState(true)
  const [recLoading, setRecLoading] = useState(false)
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('All')
  const { user } = useAuthStore()

  useEffect(() => { fetchEvents() }, [search, category])

  useEffect(() => {
    if (!user) return
    setRecLoading(true)
    recommendationsAPI.get(6)
      .then(r => setRecommended(r.data))
      .catch(() => {})
      .finally(() => setRecLoading(false))
  }, [user])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (category !== 'All') params.category = category
      const res = await eventsAPI.list(params)
      setEvents(res.data)
    } catch { setEvents([]) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-ink-50 mb-4 leading-tight">
          Discover <span className="text-amber-400">Extraordinary</span><br className="hidden md:block"/>
          Events
        </h1>
        <p className="text-ink-400 text-lg max-w-xl mx-auto">
          Experience unforgettable moments at your fingertips.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"/>
          <input type="text" placeholder="Search events, venues…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-10"/>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1 max-w-2xl mx-auto">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
              ${category === cat ? 'bg-amber-500 text-ink-950' : 'bg-ink-800 text-ink-300 hover:bg-ink-700'}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Recommendations section */}
      {user && (recommended.length > 0 || recLoading) && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-amber-400"/>
            <h2 className="font-display text-xl font-semibold text-ink-100">Recommended for You</h2>
          </div>

          {recLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="card p-4 flex gap-4 animate-pulse">
                  <div className="w-20 h-20 bg-ink-800 rounded-lg flex-shrink-0"/>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-ink-800 rounded w-1/3"/>
                    <div className="h-4 bg-ink-800 rounded w-2/3"/>
                    <div className="h-3 bg-ink-800 rounded w-1/2"/>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommended.map(ev => <RecommendedCard key={ev.id} event={ev}/>)}
            </div>
          )}

          <div className="border-b border-ink-800 mt-8 mb-0"/>
        </section>
      )}

      {/* Sign-in nudge for guests */}
      {!user && (
        <div className="mb-10 card p-5 flex items-center justify-between gap-4 border-amber-500/20 bg-amber-500/5">
          <div>
            <p className="text-ink-100 font-medium text-sm flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400"/> Get personalised event recommendations
            </p>
            <p className="text-ink-500 text-xs mt-0.5">Sign in to see events tailored to your taste</p>
          </div>
          <Link to="/login" className="btn-primary text-sm flex items-center gap-1.5 flex-shrink-0">
            <LogIn size={14}/> Sign in
          </Link>
        </div>
      )}

      {/* All events */}
      <section>
        <h2 className="font-display text-xl font-semibold text-ink-100 mb-5">
          {search || category !== 'All' ? 'Search Results' : 'All Upcoming Events'}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-44 bg-ink-800"/>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-ink-800 rounded w-3/4"/>
                  <div className="h-3 bg-ink-800 rounded w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar size={48} className="text-ink-700 mx-auto mb-4"/>
            <p className="text-ink-400 text-lg">No events found</p>
            <p className="text-ink-600 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {events.map((event, i) => (
              <div key={event.id} className="animate-fade-up"
                style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}>
                <EventCard event={event}/>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
