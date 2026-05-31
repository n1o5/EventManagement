import { useState, useEffect } from 'react'
import { adminAPI } from '../api/client'
import { useUIStore } from '../store/useStore'
import { TrendingUp, Users, Ticket, Zap, Globe, BarChart2, Building2, ChevronDown, ChevronUp } from 'lucide-react'

function BarChart({ data, valueKey='revenue', color='#a855f7' }) {
  if (!data?.length) return <p className="text-ink-600 text-sm text-center py-6">No data yet</p>
  const slice=data.slice(-20), vals=slice.map(d=>d[valueKey]??0), max=Math.max(...vals,1)
  return (
    <div className="flex items-end gap-px h-28 w-full">
      {vals.map((v,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div className="w-full rounded-t-sm hover:opacity-70" style={{height:`${Math.max((v/max)*100,v>0?3:0)}%`,background:color}}/>
          {v>0&&<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink-700 text-ink-100 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">₹{v.toLocaleString()}</div>}
        </div>
      ))}
    </div>
  )
}

function UserChart({ data }) {
  if (!data?.length) return null
  const slice=data.slice(-20), vals=slice.map(d=>d.users??0), max=Math.max(...vals,1)
  return (
    <div className="flex items-end gap-px h-20 w-full">
      {vals.map((v,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div className="w-full rounded-t-sm hover:opacity-70" style={{height:`${Math.max((v/max)*100,v>0?4:0)}%`,background:'#10b981'}}/>
          {v>0&&<div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink-700 text-ink-100 text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10">{v}</div>}
        </div>
      ))}
    </div>
  )
}

function OrgRow({ org, onExpand, expanded, detail, loadingDetail }) {
  const fillColor=org.fill_pct>80?'text-red-400':org.fill_pct>50?'text-amber-400':'text-emerald-400'
  return (
    <>
      <tr className="border-b border-ink-800 hover:bg-ink-800/40 transition-colors cursor-pointer" onClick={()=>onExpand(org.id)}>
        <td className="px-4 py-3">
          <p className="text-ink-100 font-medium text-sm">{org.name}</p>
          <p className="text-ink-500 text-xs">{org.email}</p>
        </td>
        <td className="px-4 py-3 text-center"><span className="text-ink-200 text-sm">{org.event_count}</span><span className="text-ink-600 text-xs ml-1">({org.published} live)</span></td>
        <td className="px-4 py-3 text-center text-sm text-ink-200">{org.total_bookings}</td>
        <td className="px-4 py-3 text-center"><span className={`text-sm font-semibold ${fillColor}`}>{org.fill_pct}%</span></td>
        <td className="px-4 py-3 text-right"><span className="text-amber-400 font-bold text-sm">₹{org.total_revenue.toLocaleString()}</span></td>
        <td className="px-4 py-3 text-center">{expanded?<ChevronUp size={14} className="text-ink-400 mx-auto"/>:<ChevronDown size={14} className="text-ink-400 mx-auto"/>}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-ink-800 bg-ink-900/50">
          <td colSpan={6} className="px-4 py-4">
            {loadingDetail ? <div className="animate-pulse h-20 bg-ink-800 rounded-xl"/> : detail ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Top Events</p>
                {detail.events.slice(0,5).map(ev=>(
                  <div key={ev.id} className="flex items-center gap-3 text-xs">
                    <span className="text-ink-300 flex-1 line-clamp-1">{ev.title}</span>
                    <span className="text-ink-500 w-20 text-right">{ev.booked}/{ev.capacity} seats</span>
                    <div className="w-24 h-1.5 bg-ink-700 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full" style={{width:`${ev.fill_pct}%`,background:ev.fill_pct>80?'#ef4444':ev.fill_pct>50?'#f59e0b':'#10b981'}}/>
                    </div>
                    <span className="text-amber-400 font-semibold w-24 text-right">₹{ev.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminDashboard() {
  const [analytics, setAnalytics]     = useState(null)
  const [organizers, setOrganizers]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('overview')
  const [expandedOrg, setExpandedOrg] = useState(null)
  const [orgDetails, setOrgDetails]   = useState({})
  const [loadingOrg, setLoadingOrg]   = useState(null)
  const { showToast } = useUIStore()

  useEffect(() => {
    Promise.all([adminAPI.analytics(), adminAPI.organizers()])
      .then(([a,o])=>{ setAnalytics(a.data); setOrganizers(o.data) })
      .catch(()=>showToast('Failed to load admin analytics','error'))
      .finally(()=>setLoading(false))
  }, [])

  const handleExpand = async (id) => {
    if (expandedOrg===id) { setExpandedOrg(null); return }
    setExpandedOrg(id)
    if (orgDetails[id]) return
    setLoadingOrg(id)
    try { const r=await adminAPI.organizerDetail(id); setOrgDetails(p=>({...p,[id]:r.data})) }
    catch { showToast('Failed to load organizer detail','error') }
    finally { setLoadingOrg(null) }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="card p-5 h-32 animate-pulse bg-ink-800"/>)}</div>
    </div>
  )

  const s=analytics?.summary??{}, rev=analytics?.revenue_over_time??[], growth=analytics?.user_growth??[], cat=analytics?.category_breakdown??[], top=analytics?.top_events??[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center"><Globe size={20} className="text-purple-400"/></div>
        <div><h1 className="font-display text-3xl font-bold text-ink-50">Admin Panel</h1><p className="text-ink-400 text-sm mt-0.5">Platform-wide analytics — all organizers &amp; events</p></div>
      </div>

      <div className="flex gap-1 p-1 bg-ink-900 border border-ink-700 rounded-xl w-fit mb-8">
        {['overview','organizers','categories'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${tab===t?'bg-purple-500 text-white':'text-ink-400 hover:text-ink-200'}`}>{t}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {l:'Platform Revenue',  v:`₹${(s.total_revenue??0).toLocaleString()}`,   i:<TrendingUp size={18}/>, c:'text-amber-400'},
              {l:'Total Users',       v:(s.total_users??0).toLocaleString(),             i:<Users size={18}/>,     c:'text-emerald-400', sub:`${s.organizer_count??0} organizers`},
              {l:'Tickets Sold',      v:(s.seats_sold??0).toLocaleString(),              i:<Ticket size={18}/>,    c:'text-blue-400',    sub:`${s.avg_fill_pct??0}% avg fill`},
              {l:'Avg Fill Rate',     v:`${s.avg_fill_pct??0}%`,                       i:<Zap size={18}/>,       c:'text-purple-400',  sub:`${s.seats_sold??0} seats sold`},
            ].map(x=>(
              <div key={x.l} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-ink-800 ${x.c}`}>{x.i}</div>
                </div>
                <p className={`text-2xl font-bold ${x.c}`}>{x.v}</p>
                <p className="text-xs text-ink-500 mt-0.5">{x.l}</p>
                {x.sub && <p className="text-[10px] text-ink-600 mt-1">{x.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-display font-semibold text-ink-100">Platform Revenue — Last 60 Days</p>
                <span className="text-xs text-ink-500">₹{rev.reduce((s,d)=>s+d.revenue,0).toLocaleString()} total</span>
              </div>
              <BarChart data={rev} valueKey="revenue" color="#a855f7"/>
              <div className="flex justify-between text-[10px] text-ink-600 mt-1.5"><span>{rev[0]?.date}</span><span>{rev[rev.length-1]?.date}</span></div>
            </div>
            <div className="space-y-3">
              {[
                {l:'Total Events',     v:s.total_events??0,        sub:`${s.published_events??0} published`},
                {l:'Total Organizers', v:s.organizer_count??0,     sub:'Active on platform'},
                {l:'Total Bookings',   v:(s.total_bookings??0).toLocaleString(), sub:`Across all events`},
              ].map(x=>(
                <div key={x.l} className="card p-4 flex items-center justify-between">
                  <div><p className="text-ink-500 text-xs">{x.l}</p><p className="text-ink-600 text-[10px]">{x.sub}</p></div>
                  <p className="text-2xl font-bold text-ink-100">{x.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold text-ink-100">New User Signups — Last 30 Days</p>
              <span className="text-xs text-emerald-400 font-medium">+{growth.reduce((s,d)=>s+d.users,0)} users</span>
            </div>
            <UserChart data={growth}/>
          </div>

          {top.length>0 && (
            <div className="card p-5">
              <p className="font-display font-semibold text-ink-100 mb-4">Top Events by Revenue</p>
              <div className="space-y-3">
                {top.map((ev,i)=>{ const maxR=top[0].revenue||1; return (
                  <div key={ev.id} className="flex items-center gap-3">
                    <span className="text-ink-600 text-xs font-mono w-4">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink-200 text-sm font-medium line-clamp-1">{ev.title}</p>
                      {ev.category&&<p className="text-ink-600 text-xs">{ev.category}</p>}
                    </div>
                    <div className="w-32 h-2 bg-ink-700 rounded-full overflow-hidden flex-shrink-0">
                      <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{width:`${(ev.revenue/maxR)*100}%`}}/>
                    </div>
                    <span className="text-amber-400 font-bold text-sm w-28 text-right flex-shrink-0">₹{ev.revenue.toLocaleString()}</span>
                  </div>
                )})}
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='organizers' && (
        <div className="card overflow-hidden">
          {organizers.length===0 ? (
            <div className="p-10 text-center"><Building2 size={36} className="text-ink-700 mx-auto mb-3"/><p className="text-ink-500">No organizers yet</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-800/50">
                  {['Organizer','Events','Bookings','Fill Rate','Revenue',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizers.map(org=>(
                  <OrgRow key={org.id} org={org} onExpand={handleExpand}
                    expanded={expandedOrg===org.id} detail={orgDetails[org.id]} loadingDetail={loadingOrg===org.id}/>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab==='categories' && (
        <div className="space-y-5">
          {cat.length===0 ? (
            <div className="card p-10 text-center"><BarChart2 size={36} className="text-ink-700 mx-auto mb-3"/><p className="text-ink-500">No category data yet</p></div>
          ) : <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.map((c,i)=>{ const maxR=cat[0].revenue||1; return (
                <div key={c.category} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-ink-100">{c.category}</span>
                    {i===0&&<span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px]">Top</span>}
                  </div>
                  <p className="text-2xl font-bold text-amber-400 mb-1">₹{c.revenue.toLocaleString()}</p>
                  <p className="text-ink-500 text-xs mb-3">{c.bookings} bookings</p>
                  <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{width:`${(c.revenue/maxR)*100}%`}}/></div>
                </div>
              )})}
            </div>
            <div className="card p-6">
              <p className="font-display font-semibold text-ink-100 mb-5">Platform Revenue by Category</p>
              <div className="space-y-4">
                {cat.map(c=>{ const maxR=cat[0].revenue||1, pct=Math.round((c.revenue/maxR)*100); return (
                  <div key={c.category} className="flex items-center gap-4">
                    <span className="text-ink-300 text-sm w-24 flex-shrink-0 truncate">{c.category}</span>
                    <div className="flex-1 h-6 bg-ink-800 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-700 to-purple-400 rounded flex items-center pl-2 transition-all" style={{width:`${pct}%`}}>
                        {pct>20&&<span className="text-white text-[10px] font-bold whitespace-nowrap">₹{c.revenue.toLocaleString()}</span>}
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
