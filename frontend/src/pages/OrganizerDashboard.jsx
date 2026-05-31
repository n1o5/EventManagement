import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, TrendingUp, Users, Ticket, BarChart2, Eye, Trash2, ChevronRight, Layers } from 'lucide-react'
import { format } from 'date-fns'
import { eventsAPI, organizerAPI } from '../api/client'
import { useUIStore } from '../store/useStore'

function Sparkline({ data, color='#f59e0b', height=40 }) {
  if (!data?.length) return null
  const vals=data.map(d=>d.revenue??0), max=Math.max(...vals,1), w=200, h=height
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*w},${h-(v/max)*h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{height}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.1"/>
    </svg>
  )
}

function BarChart({ data, valueKey='revenue', color='#f59e0b' }) {
  if (!data?.length) return <p className="text-ink-600 text-sm text-center py-6">No data yet</p>
  const slice=data.slice(-14), vals=slice.map(d=>d[valueKey]??0), max=Math.max(...vals,1)
  return (
    <div className="flex items-end gap-0.5 h-24 w-full">
      {vals.map((v,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div className="w-full rounded-t-sm hover:opacity-80" style={{height:`${Math.max((v/max)*100,v>0?4:0)}%`,background:color}}/>
          {v>0 && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink-700 text-ink-100 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">₹{v.toLocaleString()}</div>}
        </div>
      ))}
    </div>
  )
}

function Donut({ segments }) {
  const total=segments.reduce((s,x)=>s+x.value,0)||1
  let offset=0; const r=40,cx=50,cy=50,stroke=28,circ=2*Math.PI*r
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      {segments.map((seg,i)=>{
        const pct=seg.value/total, dash=pct*circ
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset*circ}/>
        offset+=pct; return el
      })}
      <circle cx={cx} cy={cy} r={r-stroke/2+2} fill="none" stroke="#1c1917" strokeWidth={4}/>
    </svg>
  )
}

function FillBar({ pct }) {
  const c=pct>80?'#ef4444':pct>50?'#f59e0b':'#10b981'
  return (
    <div className="flex items-center gap-2 min-w-0 mt-1.5">
      <div className="flex-1 h-1.5 bg-ink-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:c}}/>
      </div>
      <span className="text-xs text-ink-400 flex-shrink-0 w-9 text-right">{pct}%</span>
    </div>
  )
}

export default function OrganizerDashboard() {
  const [analytics, setAnalytics]         = useState(null)
  const [events, setEvents]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [tab, setTab]                     = useState('overview')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventDetail, setEventDetail]     = useState(null)
  const { showToast } = useUIStore()

  useEffect(() => {
    Promise.all([organizerAPI.analytics(), organizerAPI.events()])
      .then(([a,e])=>{ setAnalytics(a.data); setEvents(e.data) })
      .catch(()=>showToast('Failed to load analytics','error'))
      .finally(()=>setLoading(false))
  }, [])

  const loadEventDetail = async (id) => {
    setSelectedEvent(id); setEventDetail(null)
    try { const r=await organizerAPI.eventDetail(id); setEventDetail(r.data) }
    catch { showToast('Failed to load event detail','error') }
  }

  const deleteEvent = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return
    try { await eventsAPI.delete(id); setEvents(e=>e.filter(ev=>ev.id!==id)); if(selectedEvent===id){setSelectedEvent(null);setEventDetail(null)}; showToast('Deleted','info') }
    catch { showToast('Delete failed','error') }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="card p-5 h-32 animate-pulse bg-ink-800"/>)}</div>
    </div>
  )

  const s=analytics?.summary??{}, rev=analytics?.revenue_over_time??[], cat=analytics?.category_breakdown??[], split=analytics?.booking_method_split??{solo:0}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><h1 className="font-display text-3xl font-bold text-ink-50">My Dashboard</h1><p className="text-ink-400 text-sm mt-1">Analytics for your events only</p></div>
        <Link to="/create-event" className="btn-primary flex items-center gap-2"><Plus size={16}/>New Event</Link>
      </div>

      <div className="flex gap-1 p-1 bg-ink-900 border border-ink-700 rounded-xl w-fit mb-8">
        {['overview','events','categories'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab===t?'bg-amber-500 text-ink-950':'text-ink-400 hover:text-ink-200'}`}>{t}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {l:'Total Revenue', v:`₹${(s.total_revenue??0).toLocaleString()}`, i:<TrendingUp size={18}/>, c:'text-amber-400', spark:rev},
              {l:'Tickets Sold',  v:(s.seats_sold??0).toLocaleString(),             i:<Ticket size={18}/>,    c:'text-emerald-400'},
              {l:'Total Bookings',v:(s.total_bookings??0).toLocaleString(),          i:<Users size={18}/>,     c:'text-blue-400'},
              {l:'Avg Fill Rate', v:`${s.avg_fill_pct??0}%`,                        i:<BarChart2 size={18}/>, c:'text-purple-400'},
            ].map(x=>(
              <div key={x.l} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div><p className="text-xs text-ink-500 uppercase tracking-wide font-medium mb-1">{x.l}</p><p className={`text-2xl font-bold ${x.c}`}>{x.v}</p></div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-ink-800 ${x.c}`}>{x.i}</div>
                </div>
                {x.spark && <Sparkline data={x.spark}/>}
              </div>
            ))}
          </div>

          <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display font-semibold text-ink-100">Revenue — Last 30 Days</p>
                <span className="text-xs text-ink-500">₹{rev.reduce((s,d)=>s+d.revenue,0).toLocaleString()} total</span>
              </div>
              <BarChart data={rev}/>
              <div className="flex justify-between text-[10px] text-ink-600 mt-1.5"><span>{rev[0]?.date}</span><span>{rev[rev.length-1]?.date}</span></div>
          </div>

          <div className="card p-5">
            <p className="font-display font-semibold text-ink-100 mb-4">Capacity Overview</p>
            <div className="grid grid-cols-3 gap-6 text-center">
              {[{l:'Total',v:(s.total_capacity??0).toLocaleString(),c:'text-ink-100'},{l:'Sold',v:(s.seats_sold??0).toLocaleString(),c:'text-amber-400'},{l:'Available',v:((s.total_capacity??0)-(s.seats_sold??0)).toLocaleString(),c:'text-emerald-400'}].map(x=>(
                <div key={x.l}><p className={`text-3xl font-bold ${x.c}`}>{x.v}</p><p className="text-ink-500 text-xs mt-1">{x.l}</p></div>
              ))}
            </div>
            <div className="mt-4 h-3 bg-ink-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{width:`${s.avg_fill_pct??0}%`}}/>
            </div>
            <p className="text-right text-xs text-ink-500 mt-1">{s.avg_fill_pct??0}% sold across your events</p>
          </div>
        </div>
      )}

      {tab==='events' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {events.length===0 ? (
              <div className="card p-10 text-center"><Calendar size={36} className="text-ink-700 mx-auto mb-3"/><p className="text-ink-400 text-sm">No events yet</p>
                <Link to="/create-event" className="btn-primary text-sm inline-flex mt-4 items-center gap-2"><Plus size={14}/>Create Event</Link>
              </div>
            ) : events.map(ev=>{
              const fill=ev.capacity?Math.round((ev.booked/ev.capacity)*100):0, sel=selectedEvent===ev.id
              return (
                <button key={ev.id} onClick={()=>loadEventDetail(ev.id)}
                  className={`w-full text-left card p-4 transition-all ${sel?'border-amber-500 bg-amber-500/5':'hover:border-ink-500'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm line-clamp-1 ${sel?'text-amber-400':'text-ink-100'}`}>{ev.title}</p>
                      <p className="text-ink-500 text-xs mt-0.5">{format(new Date(ev.event_date),'MMM d, yyyy')}</p>
                      <FillBar pct={fill}/>
                    </div>
                    <ChevronRight size={14} className={`flex-shrink-0 mt-1 ${sel?'text-amber-400':'text-ink-600'}`}/>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="lg:col-span-3">
            {!selectedEvent ? (
              <div className="card p-10 text-center h-full flex flex-col items-center justify-center">
                <BarChart2 size={36} className="text-ink-700 mb-3"/><p className="text-ink-500 text-sm">Select an event to see analytics</p>
              </div>
            ) : !eventDetail ? (
              <div className="card p-10 animate-pulse"><div className="h-6 bg-ink-800 rounded w-1/2 mb-4"/><div className="h-32 bg-ink-800 rounded"/></div>
            ) : (
              <div className="space-y-5">
                <div className="card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-display font-bold text-ink-50 text-lg line-clamp-2">{eventDetail.event.title}</h2>
                      <p className="text-ink-500 text-xs mt-1">{format(new Date(eventDetail.event.event_date),'EEEE, MMM d, yyyy')} · {eventDetail.event.venue}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link to={`/events/${selectedEvent}`} className="btn-ghost p-2"><Eye size={14}/></Link>
                      <button onClick={()=>deleteEvent(selectedEvent,eventDetail.event.title)} className="btn-ghost p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
                <div className="card p-5">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-4">Seat Breakdown</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[{l:'Booked',v:eventDetail.seats.booked,c:'text-amber-400'},{l:'Available',v:eventDetail.seats.available,c:'text-emerald-400'},{l:'VIP Fill',v:`${eventDetail.seats.vip.fill_pct}%`,c:'text-purple-400'},{l:'Gen Fill',v:`${eventDetail.seats.general.fill_pct}%`,c:'text-blue-400'}].map(x=>(
                      <div key={x.l} className="bg-ink-800 rounded-xl p-3"><p className={`text-xl font-bold ${x.c}`}>{x.v}</p><p className="text-ink-500 text-xs">{x.l}</p></div>
                    ))}
                  </div>
                  <div className="h-2 bg-ink-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${eventDetail.seats.fill_pct}%`}}/></div>
                  <p className="text-xs text-ink-500 mt-1 text-right">{eventDetail.seats.fill_pct}% sold</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Revenue (30 days)</p>
                    <span className="text-amber-400 font-bold">₹{eventDetail.revenue.total.toLocaleString()}</span>
                  </div>
                  <BarChart data={eventDetail.revenue.daily}/>
                </div>
                <div className="card p-5">
                  <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-4">Row Heatmap</p>
                  <div className="space-y-2">
                    {eventDetail.row_heatmap.slice(0,10).map(row=>(
                      <div key={row.row} className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-400 w-4">{row.row}</span>
                        <div className="flex-1 h-5 bg-ink-700 rounded overflow-hidden">
                          <div className="h-full rounded transition-all" style={{width:`${row.fill_pct}%`,background:row.fill_pct>80?'#ef4444':row.fill_pct>50?'#f59e0b':'#10b981'}}/>
                        </div>
                        <span className="text-xs text-ink-500 w-12 text-right">{row.booked}/{row.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
            
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='categories' && (
        <div className="space-y-5">
          {cat.length===0 ? (
            <div className="card p-10 text-center"><Layers size={36} className="text-ink-700 mx-auto mb-3"/><p className="text-ink-500">No category data yet</p></div>
          ) : <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.map((c,i)=>{ const maxR=cat[0].revenue||1; return (
                <div key={c.category} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-ink-100">{c.category}</span>
                    {i===0 && <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">Top</span>}
                  </div>
                  <p className="text-2xl font-bold text-amber-400 mb-1">₹{c.revenue.toLocaleString()}</p>
                  <p className="text-ink-500 text-xs mb-3">{c.bookings} bookings</p>
                  <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${(c.revenue/maxR)*100}%`}}/></div>
                </div>
              )})}
            </div>
            <div className="card p-6">
              <p className="font-display font-semibold text-ink-100 mb-5">Revenue by Category</p>
              <div className="space-y-4">
                {cat.map(c=>{ const maxR=cat[0].revenue||1, pct=Math.round((c.revenue/maxR)*100); return (
                  <div key={c.category} className="flex items-center gap-4">
                    <span className="text-ink-300 text-sm w-24 flex-shrink-0 truncate">{c.category}</span>
                    <div className="flex-1 h-6 bg-ink-800 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded flex items-center pl-2 transition-all" style={{width:`${pct}%`}}>
                        {pct>20 && <span className="text-ink-950 text-[10px] font-bold whitespace-nowrap">₹{c.revenue.toLocaleString()}</span>}
                      </div>
                    </div>
                    <span className="text-ink-500 text-xs w-8 text-right">{pct}%</span>
                  </div>
                )})}
              </div>
            </div>
          </>}
        </div>
      )}
    </div>
  )
}
