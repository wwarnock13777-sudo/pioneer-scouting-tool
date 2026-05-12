import React, { useState, useEffect, useRef } from 'react'
import './index.css'
import { supabase } from './supabase'

function compress(file, maxW, q, cb) {
  const reader = new FileReader()
  reader.onload = ev => {
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      cb(canvas.toDataURL('image/jpeg', q))
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}
function calcGdu(hi, lo) {
  hi = Math.min(Number(hi), 86); lo = Math.max(Number(lo), 50)
  return Math.max(0, Math.round(((hi + lo) / 2 - 50) * 10) / 10)
}
const TODAY = new Date().toISOString().split('T')[0]

const s = {
  topbar: { background:'var(--g)', padding:'52px 16px 14px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:50 },
  nav: { display:'flex', background:'#fff', borderBottom:'1px solid var(--bdr)', overflowX:'auto', WebkitOverflowScrolling:'touch', position:'sticky', top:80, zIndex:40 },
  nb: (a) => ({ flex:1, padding:'10px 4px 8px', fontSize:10, fontWeight:500, color:a?'var(--g)':'var(--mu)', background:'none', border:'none', borderBottom:a?'2px solid var(--g)':'2px solid transparent', whiteSpace:'nowrap', minWidth:52, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }),
  view: { padding:'12px 12px 60px' },
  card: { background:'var(--card)', border:'1px solid var(--bdr)', borderRadius:14, marginBottom:12, overflow:'hidden' },
  ch: { padding:'11px 14px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:9 },
  ci: { width:30, height:30, borderRadius:8, background:'var(--gl)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  cb: { padding:'13px 14px', display:'flex', flexDirection:'column', gap:11 },
  fg: { display:'flex', flexDirection:'column', gap:5 },
  lbl: { fontSize:11, fontWeight:600, color:'var(--mu)', letterSpacing:'0.04em', textTransform:'uppercase' },
  inp: { width:'100%', background:'#f8f8f5', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 13px', fontSize:15, color:'var(--tx)', WebkitAppearance:'none' },
  ta: { width:'100%', background:'#f8f8f5', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 13px', fontSize:15, color:'var(--tx)', resize:'none', WebkitAppearance:'none' },
  two: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 },
  opts: { display:'flex', flexDirection:'column', gap:7 },
  opts2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 },
  opt: (sel) => ({ background:sel?'var(--gl)':'#f8f8f5', border:sel?'1px solid var(--g)':'1px solid var(--bdr)', borderRadius:10, padding:'12px 13px', fontSize:14, color:'var(--tx)', textAlign:'left', display:'flex', alignItems:'center', gap:9, width:'100%' }),
  ck: (sel) => ({ width:20, height:20, borderRadius:'50%', border:sel?'1.5px solid var(--g)':'1.5px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:sel?'var(--g)':'transparent' }),
  btn: { width:'100%', background:'var(--g)', color:'#fff', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' },
  btnOut: { width:'100%', background:'transparent', color:'var(--mu)', border:'1px solid var(--bdr)', borderRadius:12, padding:13, fontSize:14, marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:7, cursor:'pointer' },
  stat: { background:'var(--card)', border:'1px solid var(--bdr)', borderRadius:12, padding:'11px 13px' },
  info: { background:'var(--gl)', border:'1px solid rgba(45,122,45,0.25)', borderRadius:10, padding:'10px 12px', fontSize:13, color:'var(--gd)', marginBottom:10 },
  badge: (bg, color) => ({ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'4px 9px', borderRadius:20, background:bg, color }),
  fsel: { width:'100%', background:'#f8f8f5', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 13px', fontSize:15, color:'var(--tx)', WebkitAppearance:'none', appearance:'none', marginBottom:11 },
  empty: { textAlign:'center', padding:'32px 16px', color:'var(--hi)', fontSize:14 },
}

function CheckIcon() { return <svg viewBox="0 0 12 12" width="11" height="11" stroke="#fff" fill="none" strokeWidth="3"><polyline points="2,6 5,9 10,3"/></svg> }
function Toast({ msg }) {
  if (!msg) return null
  return <div style={{ position:'fixed', bottom:30, left:'50%', transform:'translateX(-50%)', background:'#1a1a1a', color:'#fff', padding:'10px 18px', borderRadius:12, fontSize:14, zIndex:9999, whiteSpace:'nowrap', maxWidth:'88%', textAlign:'center' }}>{msg}</div>
}
function Opt({ label, selected, onClick }) {
  return <button style={s.opt(selected)} onClick={onClick}><span style={s.ck(selected)}>{selected && <CheckIcon />}</span>{label}</button>
}
function FieldSelect({ fields, value, onChange }) {
  return (
    <select style={s.fsel} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Select a field —</option>
      {fields.map(f => <option key={f.id} value={f.id}>{f.op}{f.hybrid?` — ${f.hybrid}`:''}{f.plant_date?` (${f.plant_date})`:''}</option>)}
    </select>
  )
}
function DelBtn({ onClick }) {
  return <button onClick={onClick} style={{background:'none',border:'none',color:'var(--hi)',padding:6,cursor:'pointer'}}><svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function RainMiniLog({ fieldId }) {
  const [log, setLog] = useState([])
  useEffect(() => {
    supabase.from('rain_log').select('*').eq('field_id', fieldId).order('log_date', { ascending:false })
      .then(({ data }) => setLog(data||[]))
  }, [fieldId])
  if (!log.length) return <div style={{...s.empty,padding:12,fontSize:13}}>No rain logged yet</div>
  return (
    <div style={{padding:'4px 14px 8px'}}>
      {log.map(r => (
        <div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f5f5f0',fontSize:13}}>
          <span style={{color:'var(--mu)'}}>{r.log_date}{r.note?` · ${r.note}`:''}</span>
          <span style={{fontWeight:600}}>{parseFloat(r.amount).toFixed(2)}"</span>
        </div>
      ))}
    </div>
  )
}

function FieldDetail({ field, onBack, onDeleted, isAdmin, userOpName }) {
  const [stats, setStats] = useState({ rain:0, photos:[], pins:[] })
  const [lightbox, setLightbox] = useState(null)
  const emoji = { Disease:'🌿', Weed:'🌱', Pest:'🐛', Nutrient:'🌾', Water:'💧', Other:'📍' }

  useEffect(() => {
    async function load() {
      const [{ data:rain },{ data:photos },{ data:pins }] = await Promise.all([
        supabase.from('rain_log').select('amount').eq('field_id', field.id),
        supabase.from('photos').select('*').eq('field_id', field.id).order('log_date', { ascending:false }),
        supabase.from('scout_pins').select('*').eq('field_id', field.id).order('log_date', { ascending:false }),
      ])
      setStats({
        rain: (rain||[]).reduce((a,r)=>a+Number(r.amount),0),
        photos: photos||[],
        pins: pins||[],
      })
    }
    load()
  }, [field.id])

  return (
    <div style={s.view}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',color:'var(--g)',fontSize:14,fontWeight:600,cursor:'pointer',padding:0}}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          All fields
        </button>
        <button onClick={async()=>{
          if(!window.confirm('Delete this field and ALL its data? This cannot be undone.'))return
          await Promise.all([
            supabase.from('gdu_log').delete().eq('field_id',field.id),
            supabase.from('rain_log').delete().eq('field_id',field.id),
            supabase.from('photos').delete().eq('field_id',field.id),
            supabase.from('scout_pins').delete().eq('field_id',field.id),
            supabase.from('visit_notes').delete().eq('field_id',field.id),
          ])
          await supabase.from('fields').delete().eq('id',field.id)
          onBack()
          onDeleted()
        }} style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'1px solid #f5c6c6',borderRadius:8,padding:'6px 10px',color:'#c0392b',fontSize:13,fontWeight:500,cursor:'pointer'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          Delete field
        </button>
      </div>
      <div style={{background:'var(--g)',borderRadius:16,padding:16,marginBottom:12,color:'#fff'}}>
        <div style={{fontSize:20,fontWeight:700}}>{field.op}</div>
        <div style={{fontSize:13,opacity:0.85,marginTop:3}}>{field.hybrid||'—'} · {field.loc||'—'}</div>
        <div style={{fontSize:12,opacity:0.7,marginTop:2}}>Planted {field.plant_date||'—'} · Zip {field.zip||'—'}</div>
        {field.phone&&<a href={`tel:${field.phone}`} style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:8,background:'rgba(255,255,255,0.2)',borderRadius:20,padding:'5px 12px',color:'#fff',fontSize:13,fontWeight:600,textDecoration:'none'}}>
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#fff" fill="none" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.95-1.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call {field.phone}
        </a>}
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          {[`${stats.rain.toFixed(2)}" rain`,`${stats.photos.length} photos`,`${stats.pins.length} pins`].map(t=>(
            <span key={t} style={{background:'rgba(255,255,255,0.2)',borderRadius:20,padding:'4px 10px',fontSize:12,fontWeight:600}}>{t}</span>
          ))}
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Field details</span></div>
        <div style={{padding:'4px 14px 10px'}}>
          {[['Grower',field.grower],['Phone',field.phone],['Rep',field.rep],['Population',field.pop?field.pop+' seeds/ac':''],['Stand emerged',field.stand_e?field.stand_e+' plants/ac':''],['Tillage',field.tillage],['Planting cond.',field.pcond],['Emergence',field.emerge],['Stand count',field.stand_count],['Fungicide',field.fplanned],['Timing',field.ftiming],['Product',field.fproduct],['Weed pre',field.weed_pre],['Notes',field.notes]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:13,borderBottom:'1px solid #f5f5f0'}}>
              <span style={{color:'var(--mu)'}}>{k}</span><span style={{fontWeight:500,textAlign:'right',maxWidth:'60%'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Rainfall — {stats.rain.toFixed(2)}" season total</span></div>
        <RainMiniLog fieldId={field.id} />
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Photos — {stats.photos.length}</span></div>
        <div style={{padding:'13px 14px'}}>
          {!stats.photos.length ? <div style={{...s.empty,padding:12}}>No photos yet</div> : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
              {stats.photos.map(p => (
                <div key={p.id} style={{borderRadius:9,overflow:'hidden',aspectRatio:'1',border:'1px solid var(--bdr)',cursor:'pointer'}} onClick={()=>setLightbox(p)}>
                  <img src={p.src} alt="field" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Scout pins — {stats.pins.length}</span></div>
        {stats.pins.length > 0 && <MiniScoutMap pins={stats.pins} />}
        <div style={{padding:'4px 14px 8px'}}>
          {!stats.pins.length ? <div style={{...s.empty,padding:12}}>No pins dropped yet</div> : stats.pins.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:'1px solid #f5f5f0'}}>
              <span style={{fontSize:22,marginTop:2}}>{emoji[p.cat]||'📍'}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{p.cat||'Pin'} <span style={{color:'var(--mu)',fontWeight:400,fontSize:12}}>· {p.log_date}</span></div>
                {p.notes && <div style={{fontSize:13,marginTop:3}}>{p.notes}</div>}
                <div style={{fontSize:11,color:'var(--hi)',marginTop:3}}>{Number(p.lat).toFixed(5)}, {Number(p.lng).toFixed(5)}</div>
                <a href={`https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=d`} style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:6,background:'#007aff',color:'#fff',padding:'5px 10px',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none'}}>🗺 Directions</a>
                {p.photo && <img src={p.photo} alt="pin" style={{width:'100%',borderRadius:8,marginTop:6,maxHeight:130,objectFit:'cover'}} />}
              </div>
            </div>
          ))}
        </div>
      </div>
      {lightbox && (
        <div onClick={()=>setLightbox(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.93)',zIndex:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
          <button onClick={()=>setLightbox(null)} style={{position:'absolute',top:52,right:20,background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="#fff" fill="none" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={lightbox.src} alt="field" style={{maxWidth:'100%',maxHeight:'70vh',borderRadius:10,objectFit:'contain'}} />
          <div style={{color:'#fff',fontSize:14,marginTop:12,textAlign:'center',padding:'0 20px'}}>{lightbox.note}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:4}}>{lightbox.log_date}</div>
        </div>
      )}
    </div>
  )
}

function DashboardTab({ fields, onRefresh, isAdmin, userOpName }) {
  const [detail, setDetail] = useState(null)
  const [expandedFarms, setExpandedFarms] = useState({})

  if (detail) return <FieldDetail field={detail} onBack={()=>setDetail(null)} onDeleted={onRefresh} isAdmin={isAdmin} userOpName={userOpName} />

  if (!fields.length) return (
    <div style={s.view}>
      <div style={{...s.empty,paddingTop:60}}>
        <svg viewBox="0 0 24 24" width="48" height="48" stroke="var(--bdr)" fill="none" strokeWidth="1.5" style={{display:'block',margin:'0 auto 12px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <div style={{fontSize:16,fontWeight:600,color:'var(--mu)',marginBottom:8}}>No fields yet</div>
        <div style={{fontSize:14,color:'var(--hi)'}}>Go to Entry tab to add your first field</div>
      </div>
    </div>
  )

  // Group by farm name
  const farms = {}
  fields.forEach(f => {
    const farm = f.op || 'Unknown'
    if (!farms[farm]) farms[farm] = []
    farms[farm].push(f)
  })
  const sortedFarms = Object.keys(farms).sort()

  const toggleFarm = (farm) => setExpandedFarms(e => ({...e, [farm]: !e[farm]}))

  // If only one farm (customer view) expand it by default
  if (sortedFarms.length === 1 && expandedFarms[sortedFarms[0]] === undefined) {
    setTimeout(() => setExpandedFarms({[sortedFarms[0]]: true}), 0)
  }

  return (
    <div style={s.view}>
      <div style={{fontSize:11,fontWeight:600,color:'var(--mu)',letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:10}}>
        {isAdmin ? `${sortedFarms.length} farm${sortedFarms.length!==1?'s':''} · ${fields.length} fields` : 'Your fields'}
      </div>
      {sortedFarms.map(farm => (
        <div key={farm} style={{marginBottom:10}}>
          {/* Farm header */}
          <button onClick={()=>toggleFarm(farm)} style={{width:'100%',background:expandedFarms[farm]?'var(--g)':'var(--card)',border:'1px solid '+(expandedFarms[farm]?'var(--g)':'var(--bdr)'),borderRadius:expandedFarms[farm]?'12px 12px 0 0':'12px',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke={expandedFarms[farm]?'#fff':'var(--g)'} fill="none" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span style={{fontSize:14,fontWeight:700,color:expandedFarms[farm]?'#fff':'var(--tx)'}}>{farm}</span>
              <span style={{fontSize:12,color:expandedFarms[farm]?'rgba(255,255,255,0.75)':'var(--mu)'}}>{farms[farm].length} field{farms[farm].length!==1?'s':''}</span>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke={expandedFarms[farm]?'#fff':'var(--hi)'} fill="none" strokeWidth="2">
              {expandedFarms[farm] ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
            </svg>
          </button>
          {/* Fields under farm */}
          {expandedFarms[farm] && (
            <div style={{border:'1px solid var(--bdr)',borderTop:'none',borderRadius:'0 0 12px 12px',overflow:'hidden'}}>
              {farms[farm].map((f, i) => (
                <div key={f.id} onClick={()=>setDetail(f)} style={{background:'var(--card)',padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,cursor:'pointer',borderTop: i>0 ? '1px solid var(--bdr)' : 'none'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:'var(--tx)'}}>{f.field_name||f.hybrid||'—'}</div>
                    <div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{f.hybrid||''}{f.plant_date?' · '+f.plant_date:''}</div>
                  </div>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--hi)" fill="none" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// WEATHER BACKFILL — fetch historical data from plant date to today
// ══════════════════════════════════════════════════════════════════════════════
async function backfillWeather(fieldId, plantDate, zip, showToast) {
  const OWM_KEY = 'bd5e378503939ddaee76f12ad7a97608'
  const today = new Date()
  const start = new Date(plantDate)
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return // planted today or future, nothing to backfill

  // Get lat/lon from zip first (needed for historical API)
  let lat, lon
  try {
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/zip?zip=${zip},US&appid=${OWM_KEY}`)
    const geo = await geoRes.json()
    if (!geo.lat) { showToast('Could not get location for zip'); return }
    lat = geo.lat; lon = geo.lon
  } catch { showToast('Weather backfill failed — check zip code'); return }

  // Get already-logged dates so we don't duplicate
  const { data: existing } = await supabase.from('gdu_log').select('log_date').eq('field_id', fieldId)
  const loggedDates = new Set((existing||[]).map(r => r.log_date))

  let gduCount = 0, rainCount = 0, daysProcessed = 0
  const daysToFill = Math.min(diffDays, 60) // cap at 60 days back

  for (let i = 1; i <= daysToFill; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    if (d >= today) break

    const dateStr = d.toISOString().split('T')[0]
    if (loggedDates.has(dateStr)) continue

    const unixTs = Math.floor(d.getTime() / 1000)

    try {
      const r = await fetch(`https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${unixTs}&units=imperial&appid=${OWM_KEY}`)
      const data = await r.json()

      // Try data.data[0] (v3) or data.hourly (v2 fallback)
      const dayData = data.data?.[0] || null
      if (!dayData) continue

      // Get high/low from hourly if available
      let hi = dayData.temp, lo = dayData.temp
      if (data.data && data.data.length > 1) {
        const temps = data.data.map(h => h.temp)
        hi = Math.max(...temps)
        lo = Math.min(...temps)
      }

      hi = Math.round(hi); lo = Math.round(lo)
      const gdu = Math.max(0, Math.round((((Math.min(hi,86) + Math.max(lo,50)) / 2) - 50) * 10) / 10)
      const rainMm = dayData.rain || 0
      const rainIn = Math.round(rainMm / 25.4 * 100) / 100

      await supabase.from('gdu_log').insert([{ field_id:fieldId, log_date:dateStr, high_temp:hi, low_temp:lo, gdu }])
      gduCount++

      if (rainIn > 0) {
        await supabase.from('rain_log').insert([{ field_id:fieldId, log_date:dateStr, amount:rainIn, note:'Auto backfilled' }])
        rainCount++
      }
      daysProcessed++
    } catch(e) {
      continue // skip days that fail
    }
  }

  if (daysProcessed > 0) {
    showToast(`✓ Backfilled ${daysProcessed} days — ${gduCount} GDU entries, ${rainCount} rain events`)
  } else {
    showToast('Field saved! No historical data needed.')
  }
}

// ── Contact helpers ─────────────────────────────────────────────────────────
function getContacts(field) {
  try {
    // Try contacts JSON column first
    if (field.contacts) {
      const c = typeof field.contacts === 'string' ? JSON.parse(field.contacts) : field.contacts
      const valid = (Array.isArray(c) ? c : []).filter(x => x && x.phone && x.phone.trim())
      if (valid.length > 0) return valid
    }
    // Fall back to legacy phone field
    if (field.phone && field.phone.trim()) return [{name: field.grower||'', phone: field.phone.trim()}]
    return []
  } catch(e) {
    if (field.phone && field.phone.trim()) return [{name:'', phone:field.phone.trim()}]
    return []
  }
}

// ── Location picker map ─────────────────────────────────────────────────────
function LocMapPicker({ onPick, initLat, initLng }) {
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markerRef = useRef(null)

  useEffect(()=>{
    if(!mapRef.current) return
    const L = window.L
    if(mapObj.current){ mapObj.current.remove(); mapObj.current=null }
    const startLat = initLat || 41.5
    const startLng = initLng || -93.5
    mapObj.current = L.map(mapRef.current, { zoomControl:true }).setView([startLat, startLng], initLat ? 16 : 13)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(mapObj.current)

    if(!initLat){
      navigator.geolocation.getCurrentPosition(pos=>{
        if(mapObj.current) mapObj.current.setView([pos.coords.latitude, pos.coords.longitude], 16)
      },()=>{},{enableHighAccuracy:true})
    }

    if(initLat){
      const icon = L.divIcon({html:'<div style="font-size:28px;line-height:1">📍</div>',className:'',iconSize:[28,28],iconAnchor:[14,28]})
      markerRef.current = L.marker([initLat,initLng],{icon}).addTo(mapObj.current)
    }

    mapObj.current.on('click', function(e){
      const {lat,lng} = e.latlng
      if(markerRef.current) mapObj.current.removeLayer(markerRef.current)
      const icon = L.divIcon({html:'<div style="font-size:28px;line-height:1">📍</div>',className:'',iconSize:[28,28],iconAnchor:[14,28]})
      markerRef.current = L.marker([lat,lng],{icon}).addTo(mapObj.current)
      onPick(lat,lng)
    })

    setTimeout(()=>{ if(mapObj.current) mapObj.current.invalidateSize() }, 100)

    return ()=>{ if(mapObj.current){ mapObj.current.remove(); mapObj.current=null } }
  },[])

  return <div ref={mapRef} style={{flex:1,minHeight:200}} />
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTRY
// ══════════════════════════════════════════════════════════════════════════════
function EntryTab({ onSaved, showToast }) {
  const [form, setForm] = useState({ op:'', field_name:'', hybrid:'', zip:'', loc:'', loc_lat:null, loc_lng:null, plant_date:TODAY, pop:'', stand_e:'', pcond_notes:'', weed_pre:'', weed_post:'', stand_count:'', early_obs:'', fproduct:'', notes:'', tillage_other:'', ftiming_other:'', contacts:[{name:'',phone:''}] })
  const [showLocMap, setShowLocMap] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [sel, setSel] = useState({ tillage:'', pcond:'', emerge:'', fplanned:'', ftiming:'' })
  const [saving, setSaving] = useState(false)
  const [smsData, setSmsData] = useState(null) // {nums, msg} ready to send
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const pick = (g,v) => setSel(s=>({...s,[g]:s[g]===v?'':v}))
  const addContact = () => { if(form.contacts.length<5) set('contacts',[...form.contacts,{name:'',phone:''}]) }
  const removeContact = (i) => set('contacts',form.contacts.filter((_,idx)=>idx!==i))
  const updateContact = (i,key,val) => { const c=[...form.contacts]; c[i]={...c[i],[key]:val}; set('contacts',c) }

  const handleSave = async () => {
    if (!form.op.trim()) { showToast('Enter an operation name first'); return }
    setSaving(true)
    const tillage = sel.tillage==='Other'?(form.tillage_other||'Other'):sel.tillage
    const ftiming = sel.ftiming==='Other'?(form.ftiming_other||'Other'):sel.ftiming
    const row = {...form, tillage, ftiming, pcond:sel.pcond, emerge:sel.emerge, fplanned:sel.fplanned, saved_at:new Date().toLocaleDateString(),
      contacts: JSON.stringify(form.contacts.filter(c=>c.phone.trim())),
      grower: form.contacts[0]?.name || '',
      phone: form.contacts[0]?.phone || '',
    }
    delete row.tillage_other; delete row.ftiming_other
    const { data: newField, error } = await supabase.from('fields').insert([row]).select().single()
    setSaving(false)
    if (error) { showToast('Save failed: '+error.message); return }
    const sub = encodeURIComponent(` Field Data — ${form.op} — ${form.plant_date}`)
    const body = encodeURIComponent(` Field: ${form.op}\nHybrid: ${form.hybrid||'—'}\nLocation: ${form.loc||'—'}\nDate: ${form.plant_date}`)
    window.location.href = `mailto:wwarnock13777@gmail.com?subject=${sub}&body=${body}`
    showToast('Field saved! Backfilling weather data…'); onSaved()
    // Backfill historical weather if plant_date is in the past
    if (newField && form.plant_date && form.zip) {
      backfillWeather(newField.id, form.plant_date, form.zip, showToast)
    }
    setForm({ op:'', field_name:'', hybrid:'', zip:'', loc:'', loc_lat:null, loc_lng:null, plant_date:TODAY, pop:'', stand_e:'', pcond_notes:'', weed_pre:'', weed_post:'', stand_count:'', early_obs:'', fproduct:'', notes:'', tillage_other:'', ftiming_other:'', contacts:[{name:'',phone:''}] })
    setShowLocMap(false)
    setSel({ tillage:'', pcond:'', emerge:'', fplanned:'', ftiming:'' })
  }

  const OG = ({ group, values, layout='col' }) => (
    <div style={layout==='grid'?s.opts2:s.opts}>
      {values.map(v=><Opt key={v} label={v} selected={sel[group]===v} onClick={()=>pick(group,v)} />)}
    </div>
  )

  return (
    <div style={s.view}>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Operation info</span></div>
        <div style={s.cb}>
          <div style={s.fg}><label style={s.lbl}>Operation name</label><input style={s.inp} value={form.op} onChange={e=>set('op',e.target.value)} placeholder="Farm / operation name" /></div>
          <div style={s.fg}><label style={s.lbl}>Field name</label><input style={s.inp} value={form.field_name} onChange={e=>set('field_name',e.target.value)} placeholder="e.g. North 40, Home Farm, River Field" /></div>
          <div style={s.fg}><label style={s.lbl}>Hybrid planted</label><input style={s.inp} value={form.hybrid} onChange={e=>set('hybrid',e.target.value)} placeholder="Hybrid number" /></div>
          <div style={s.fg}><label style={s.lbl}>Field zip code</label><input style={s.inp} value={form.zip} onChange={e=>set('zip',e.target.value)} placeholder="5-digit zip" inputMode="numeric" maxLength={5} /></div>

          {/* Field location — drop pin on map */}
          <div style={s.fg}>
            <label style={s.lbl}>Field location</label>
            <button type="button" onClick={()=>setShowLocMap(true); setMapReady(false); setTimeout(()=>setMapReady(true), 150)} style={{...s.inp, textAlign:'left', cursor:'pointer', color: form.loc_lat ? 'var(--tx)' : 'var(--hi)', display:'flex', alignItems:'center', gap:8, background: form.loc_lat ? 'var(--gl)' : '#f8f8f5', border: form.loc_lat ? '1px solid var(--g)' : '1px solid var(--bdr)'}}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke={form.loc_lat?'var(--g)':'var(--hi)'} fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {form.loc_lat ? `📍 ${Number(form.loc_lat).toFixed(5)}, ${Number(form.loc_lng).toFixed(5)}` : 'Tap to drop pin on map'}
            </button>
            {form.loc_lat && <input style={{...s.inp,marginTop:6}} value={form.loc} onChange={e=>set('loc',e.target.value)} placeholder="Add description (optional)" />}
          </div>

          {/* Location picker modal */}
          {showLocMap && (
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:200,display:'flex',flexDirection:'column'}}>
              <div style={{background:'#fff',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:15,fontWeight:600}}>Drop pin on field</div>
                  <div style={{fontSize:12,color:'var(--mu)'}}>Tap the map to place your pin</div>
                </div>
                <button onClick={()=>{ setShowLocMap(false); setMapReady(false) }} style={{background:'var(--g)',color:'#fff',border:'none',borderRadius:8,padding:'8px 14px',fontWeight:600,cursor:'pointer',fontSize:14}}>Done</button>
              </div>
              {mapReady && <LocMapPicker
                onPick={(lat,lng)=>{ set('loc_lat',lat); set('loc_lng',lng) }}
                initLat={form.loc_lat} initLng={form.loc_lng}
              />}
            </div>
          )}

          {/* Up to 5 contacts */}
          <div style={s.fg}>
            <label style={s.lbl}>Contacts (up to 5)</label>
            {form.contacts.map((c,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:6,marginBottom:6,alignItems:'center'}}>
                <input style={s.inp} value={c.name} onChange={e=>updateContact(i,'name',e.target.value)} placeholder="Name" />
                <input style={s.inp} value={c.phone} onChange={e=>updateContact(i,'phone',e.target.value)} placeholder="Phone number" inputMode="tel" />
                {i>0&&<button onClick={()=>removeContact(i)} style={{background:'none',border:'1px solid #f5c6c6',borderRadius:8,color:'#c0392b',padding:'8px',cursor:'pointer',fontSize:16,lineHeight:1}}>×</button>}
              </div>
            ))}
            {form.contacts.length < 5 && (
              <button onClick={addContact} style={{...s.btnOut,marginTop:0,padding:'9px',fontSize:13}}>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add contact
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Planting information</span></div>
        <div style={s.cb}>
          <div style={s.fg}><label style={s.lbl}>Plant date</label><input style={s.inp} type="date" value={form.plant_date} onChange={e=>set('plant_date',e.target.value)} /></div>
          <div style={s.two}>
            <div style={s.fg}><label style={s.lbl}>Population planted</label><input style={s.inp} type="number" value={form.pop} onChange={e=>set('pop',e.target.value)} placeholder="seeds/ac" inputMode="numeric" /></div>
            <div style={s.fg}><label style={s.lbl}>Stand count emerged</label><input style={s.inp} type="number" value={form.stand_e} onChange={e=>set('stand_e',e.target.value)} placeholder="plants/ac" inputMode="numeric" /></div>
          </div>
          <div style={s.fg}><label style={s.lbl}>Tillage practice</label><OG group="tillage" values={['No-Till','Minimum Till','Conventional Till','Other']} />{sel.tillage==='Other'&&<input style={{...s.inp,marginTop:7}} value={form.tillage_other} onChange={e=>set('tillage_other',e.target.value)} placeholder="Describe tillage…" />}</div>
          <div style={s.fg}><label style={s.lbl}>Planting conditions</label><OG group="pcond" values={['Excellent','Good','Fair','Poor']} layout="grid" /></div>
          <div style={s.fg}><label style={s.lbl}>Comments</label><textarea style={s.ta} rows="2" value={form.pcond_notes} onChange={e=>set('pcond_notes',e.target.value)} placeholder="Notes…" /></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="6" r="4"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Weed control</span></div>
        <div style={s.cb}>
          <div style={s.fg}><label style={s.lbl}>Pre-plant weed control used</label><textarea style={s.ta} rows="2" value={form.weed_pre} onChange={e=>set('weed_pre',e.target.value)} placeholder="Products / program…" /></div>
          <div style={s.fg}><label style={s.lbl}>Post-plant / early season notes</label><textarea style={s.ta} rows="2" value={form.weed_post} onChange={e=>set('weed_post',e.target.value)} placeholder="Notes…" /></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Emergence &amp; stand evaluation</span></div>
        <div style={s.cb}>
          <div style={s.fg}><label style={s.lbl}>Emergence rating</label><OG group="emerge" values={['Excellent','Good','Fair','Poor']} layout="grid" /></div>
          <div style={s.fg}><label style={s.lbl}>Stand count</label><input style={s.inp} type="number" value={form.stand_count} onChange={e=>set('stand_count',e.target.value)} placeholder="plants/ac" inputMode="numeric" /></div>
          <div style={s.fg}><label style={s.lbl}>Early season observations</label><textarea style={s.ta} rows="2" value={form.early_obs} onChange={e=>set('early_obs',e.target.value)} placeholder="Notes…" /></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Fungicide plan</span></div>
        <div style={s.cb}>
          <div style={s.two}>
            <div style={s.fg}><label style={s.lbl}>Planned?</label><OG group="fplanned" values={['Yes','No','Undecided']} /></div>
            <div style={s.fg}><label style={s.lbl}>Timing</label><OG group="ftiming" values={['V-Timing','VT/R1','Brown Silk','Other']} /></div>
          </div>
          {sel.ftiming==='Other'&&<input style={s.inp} value={form.ftiming_other} onChange={e=>set('ftiming_other',e.target.value)} placeholder="Other timing…" />}
          <div style={s.fg}><label style={s.lbl}>Fungicide product / program</label><textarea style={s.ta} rows="2" value={form.fproduct} onChange={e=>set('fproduct',e.target.value)} placeholder="Product and rate…" /></div>
        </div>
      </div>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><span style={{fontSize:13,fontWeight:600}}>General field notes</span></div>
        <div style={s.cb}><textarea style={s.ta} rows="3" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any additional observations…" /></div>
      </div>
      <button style={s.btn} onClick={handleSave} disabled={saving}><svg viewBox="0 0 24 24" width="17" height="17" stroke="#fff" fill="none" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>{saving?'Saving…':'Save & email to wwarnock13777@gmail.com'}</button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RAIN
// ══════════════════════════════════════════════════════════════════════════════
function RainTab({ fields, showToast }) {
  const [fieldId,setFieldId]=useState('')
  const [log,setLog]=useState([])
  const [date,setDate]=useState(TODAY);const [amt,setAmt]=useState('');const [note,setNote]=useState('')
  useEffect(()=>{if(fieldId)load()},[fieldId])
  async function load(){const{data}=await supabase.from('rain_log').select('*').eq('field_id',fieldId).order('log_date',{ascending:false});setLog(data||[])}
  const total=log.reduce((s,r)=>s+Number(r.amount),0)
  async function add(){
    if(!date||!amt){showToast('Enter date and amount');return}
    await supabase.from('rain_log').insert([{field_id:fieldId,log_date:date,amount:parseFloat(amt),note}])
    setAmt('');setNote('');setDate(TODAY);load();showToast('Rain event logged')
  }
  return (
    <div style={s.view}>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />
      {!fieldId?<div style={s.empty}>Select a field to track rainfall</div>:<>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:11}}>
          <div style={s.stat}><div style={{fontSize:11,color:'var(--mu)',marginBottom:3}}>Season total</div><div style={{fontSize:24,fontWeight:700}}>{total.toFixed(2)}<span style={{fontSize:13,color:'var(--mu)'}}> in</span></div></div>
          <div style={s.stat}><div style={{fontSize:11,color:'var(--mu)',marginBottom:3}}>Events logged</div><div style={{fontSize:24,fontWeight:700}}>{log.length}<span style={{fontSize:13,color:'var(--mu)'}}> events</span></div></div>
        </div>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Log a rain event</span></div>
          <div style={s.cb}>
            <div style={s.fg}><label style={s.lbl}>Date</label><input style={s.inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
            <div style={s.fg}><label style={s.lbl}>Amount (inches)</label><input style={s.inp} type="number" step="0.01" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0.00" inputMode="decimal" /></div>
            <div style={s.fg}><label style={s.lbl}>Notes (optional)</label><input style={s.inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Heavy storm, light drizzle…" /></div>
            <button style={s.btn} onClick={add}>Add rain event</button>
          </div>
        </div>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Rain log</span></div>
          <div style={{padding:'4px 14px'}}>
            {!log.length?<div style={{...s.empty,padding:20}}>No rain events logged</div>:log.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
                <div><div style={{fontSize:15,fontWeight:600}}>{parseFloat(r.amount).toFixed(2)} in</div><div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{r.log_date}{r.note?` · ${r.note}`:''}</div></div>
                <DelBtn onClick={async()=>{await supabase.from('rain_log').delete().eq('id',r.id);load()}} />
              </div>
            ))}
          </div>
        </div>
      </>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS
// ══════════════════════════════════════════════════════════════════════════════
function PhotosTab({ fields, showToast }) {
  const [fieldId,setFieldId]=useState('')
  const [photos,setPhotos]=useState([])
  const [preview,setPreview]=useState(null)
  const [note,setNote]=useState('');const [date,setDate]=useState(TODAY)
  const [lightbox,setLightbox]=useState(null)
  useEffect(()=>{if(fieldId)load()},[fieldId])
  async function load(){const{data}=await supabase.from('photos').select('*').eq('field_id',fieldId).order('log_date',{ascending:false});setPhotos(data||[])}
  function handleFile(e){const file=e.target.files[0];if(!file)return;compress(file,1200,0.7,data=>setPreview(data))}
  const [saving,setSaving]=useState(false)
  async function save(){
    if(!preview){showToast('Take or choose a photo first');return}
    if(saving)return
    setSaving(true)
    const{error}=await supabase.from('photos').insert([{field_id:fieldId,log_date:date,note,src:preview}])
    setSaving(false)
    if(error){showToast('Save failed: '+error.message);return}
    setPreview(null);setNote('');setDate(TODAY);load();showToast('Photo saved!')
    // Auto-text all contacts
    const fdata=fields.find(f=>f.id===fieldId)
    if(fdata){
      const contacts = getContacts(fdata)
      const msg=encodeURIComponent(`Field update for ${fdata.op}${fdata.field_name?' — '+fdata.field_name:''}: New photo logged on ${date||TODAY}${note?' — '+note:''}. View in app: https://pioneer-scouting-tool.vercel.app`)
      if(contacts.length>0){
        const msg=encodeURIComponent(`Field update for ${fdata.op}${fdata.field_name?' — '+fdata.field_name:''}: New photo logged on ${date||TODAY}${note?' — '+note:''}. View in app: https://pioneer-scouting-tool.vercel.app`)
        window.location.href=`sms:7656693258?body=${msg}`
      }
    }
  }
  return (
    <div style={s.view}>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />
      {!fieldId?<div style={s.empty}>Select a field to manage photos</div>:<>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Add photo</span></div>
          <div style={s.cb}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
              <label style={{border:'2px dashed var(--bdr)',borderRadius:12,padding:18,textAlign:'center',cursor:'pointer',background:'#fafaf7',display:'block'}}>
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--mu)" fill="none" strokeWidth="1.5" style={{display:'block',margin:'0 auto 8px'}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p style={{fontSize:13,color:'var(--mu)',fontWeight:500}}>Take photo</p>
                <input type="file" accept="image/*" capture="environment" onChange={e=>{handleFile(e);e.target.value=''}} style={{display:'none'}} />
              </label>
              <label style={{border:'2px dashed var(--bdr)',borderRadius:12,padding:18,textAlign:'center',cursor:'pointer',background:'#fafaf7',display:'block'}}>
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="var(--mu)" fill="none" strokeWidth="1.5" style={{display:'block',margin:'0 auto 8px'}}><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="21 15 16 10 5 21"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M3 9h4l2-2h6l2 2h4"/></svg>
                <p style={{fontSize:13,color:'var(--mu)',fontWeight:500}}>Camera roll</p>
                <input type="file" accept="image/*" onChange={e=>{handleFile(e);e.target.value=''}} style={{display:'none'}} />
              </label>
            </div>
            {preview&&<img src={preview} alt="preview" style={{width:'100%',borderRadius:10,maxHeight:200,objectFit:'cover'}} />}
            <div style={s.fg}><label style={s.lbl}>Notes / observation</label><textarea style={s.ta} rows="2" value={note} onChange={e=>setNote(e.target.value)} placeholder="What are you seeing?" /></div>
            <div style={s.fg}><label style={s.lbl}>Date</label><input style={s.inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
            <button style={{...s.btn,opacity:saving?0.6:1}} onClick={save} disabled={saving}>{saving?'Saving…':'Save photo'}</button>
          </div>
        </div>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Photo log ({photos.length})</span></div>
          <div style={{padding:'13px 14px'}}>
            {!photos.length?<div style={{...s.empty,padding:16}}>No photos yet</div>:(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                {photos.map(p=>(
                  <div key={p.id} style={{borderRadius:11,overflow:'hidden',border:'1px solid var(--bdr)',background:'var(--card)'}}>
                    <div style={{position:'relative'}}>
                      <img src={p.src} alt="field" style={{width:'100%',aspectRatio:'1',objectFit:'cover',display:'block',cursor:'pointer'}} onClick={()=>setLightbox(p)} />
                      <button onClick={async()=>{if(!window.confirm('Delete?'))return;await supabase.from('photos').delete().eq('id',p.id);load()}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.55)',border:'none',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="#fff" fill="none" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    <div style={{padding:'7px 9px'}}><div style={{fontSize:11,color:'var(--mu)'}}>{p.log_date}</div><div style={{fontSize:12,color:'var(--tx)',marginTop:2,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.note||'No notes'}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
          <button onClick={()=>setLightbox(null)} style={{position:'absolute',top:52,right:20,background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="#fff" fill="none" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={lightbox.src} alt="field" style={{maxWidth:'100%',maxHeight:'70vh',borderRadius:10,objectFit:'contain'}} />
          <div style={{color:'#fff',fontSize:14,marginTop:12,textAlign:'center'}}>{lightbox.note}</div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:4}}>{lightbox.log_date}</div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SCOUT — satellite map, auto blue dot, shapefile, camera roll
// ══════════════════════════════════════════════════════════════════════════════
function ScoutTab({ fields, showToast }) {
  const [fieldId,setFieldId]=useState('')
  const [pins,setPins]=useState([])
  const [modal,setModal]=useState(false)
  const [pending,setPending]=useState(null)
  const [cat,setCat]=useState('');const [notes,setNotes]=useState('');const [pinPhoto,setPinPhoto]=useState(null)
  const [mapOpen,setMapOpen]=useState(true)
  const mapRef=useRef(null);const mapObj=useRef(null);const markers=useRef([])
  const locMarker=useRef(null);const pathLine=useRef(null)
  const pathPts=useRef([]);const watchId=useRef(null)

  useEffect(()=>{
    if(!mapObj.current){
      const L=window.L
      mapObj.current=L.map(mapRef.current,{zoomControl:true}).setView([41.5,-93.5],13)
      // SATELLITE TILE LAYER
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(mapObj.current)
    }
    startTracking()
    setTimeout(()=>{ if(mapObj.current) mapObj.current.invalidateSize() }, 200)
    return()=>{if(watchId.current)navigator.geolocation.clearWatch(watchId.current)}
  },[])

  useEffect(()=>{if(fieldId)loadPins()},[fieldId])
  useEffect(()=>{renderMarkers()},[pins])

  function startTracking(){
    try {
    const L=window.L
    if(!L){console.warn('Leaflet not loaded');return}
    if(watchId.current)navigator.geolocation.clearWatch(watchId.current)
    watchId.current=navigator.geolocation.watchPosition(pos=>{
      try {
      const{latitude:lat,longitude:lng}=pos.coords
      if(!locMarker.current){
        const dotIcon=L.divIcon({html:`<div style="width:18px;height:18px;background:#2979ff;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(41,121,255,0.8)"></div>`,className:'',iconSize:[18,18],iconAnchor:[9,9]})
        locMarker.current=L.marker([lat,lng],{icon:dotIcon,zIndexOffset:1000}).addTo(mapObj.current)
        mapObj.current.setView([lat,lng],16)
      } else {
        locMarker.current.setLatLng([lat,lng])
      }
      pathPts.current.push([lat,lng])
      if(pathLine.current)mapObj.current.removeLayer(pathLine.current)
      if(pathPts.current.length>1){
        pathLine.current=L.polyline(pathPts.current,{color:'#2979ff',weight:3,opacity:0.7}).addTo(mapObj.current)
      }
      checkZone(lat,lng)
      } catch(e){ console.error('tracking error:',e) }
    },()=>{},{enableHighAccuracy:true,maximumAge:2000,timeout:15000})
    } catch(e){ console.error('startTracking error:',e) }
  }

  function checkZone(lat,lng){
    if(!zones.length){setCurrentHybrid(null);return}
    const L=window.L
    const pt=L.latLng(lat,lng)
    for(let z of zones){
      if(z.layer&&z.layer.getBounds&&z.layer.getBounds().contains(pt)){
        setCurrentHybrid(z.hybrid);return
      }
    }
    setCurrentHybrid(null)
  }

  async function loadPins(){
    const{data}=await supabase.from('scout_pins').select('*').eq('field_id',fieldId).order('log_date',{ascending:false})
    setPins(data||[])
  }

  function renderMarkers(){
    const L=window.L;if(!mapObj.current||!L)return
    markers.current.forEach(m=>mapObj.current.removeLayer(m));markers.current=[]
    const em={Disease:'🌿',Weed:'🌱',Pest:'🐛',Nutrient:'🌾',Water:'💧',Other:'📍'}
    pins.forEach(p=>{
      const icon=L.divIcon({html:`<div style="font-size:24px;line-height:1">${em[p.cat]||'📍'}</div>`,className:'',iconSize:[28,28],iconAnchor:[14,28]})
      const m=L.marker([p.lat,p.lng],{icon}).addTo(mapObj.current)
      m.bindPopup(`<div style="min-width:180px;padding:8px"><strong>${p.cat||'Pin'}</strong><br/><small>${p.log_date}</small><p style="margin-top:4px;font-size:13px">${p.notes||''}</p>${p.photo?`<img src="${p.photo}" style="width:100%;border-radius:6px;margin-top:6px;max-height:100px;object-fit:cover">`:''}
<a href="https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=d" target="_blank" style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:#007aff;color:#fff;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">🗺 Directions</a></div>`,{maxWidth:220})
      markers.current.push(m)
    })
  }


  function dropPin(){
    if(!fieldId){showToast('Select a field first');return}
    navigator.geolocation.getCurrentPosition(pos=>{
      setPending({lat:pos.coords.latitude,lng:pos.coords.longitude})
      setCat('');setNotes('');setPinPhoto(null);setModal(true)
    },(err)=>{
      showToast('Enable location access in Settings → Safari → Location')
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0})
  }

  async function savePin(){
    if(!notes&&!cat){showToast('Add a category or notes');return}
    await supabase.from('scout_pins').insert([{field_id:fieldId,lat:pending.lat,lng:pending.lng,cat:cat||'Other',notes,log_date:TODAY,photo:pinPhoto}])
    setModal(false);loadPins();showToast('Pin dropped!')
    // Auto-text all contacts
    const fdata=fields.find(f=>f.id===fieldId)
    if(fdata){
      const contacts = getContacts(fdata)
      const catLabel=cat||'Other'
      const msg=encodeURIComponent(`Field update for ${fdata.op}${fdata.field_name?' — '+fdata.field_name:''}: New scout pin (${catLabel})${notes?' — '+notes:''}. View in app: https://pioneer-scouting-tool.vercel.app`)
      if(contacts.length>0){
        const msg=encodeURIComponent(`Field update for ${fdata.op}${fdata.field_name?' — '+fdata.field_name:''}: New scout pin (${cat||'Other'})${notes?' — '+notes:''}. View in app: https://pioneer-scouting-tool.vercel.app`)
        window.location.href=`sms:7656693258?body=${msg}`
      }
    }
  }

  const cats=['Disease','Weed','Pest','Nutrient','Water','Other']
  const em={Disease:'🌿',Weed:'🌱',Pest:'🐛',Nutrient:'🌾',Water:'💧',Other:'📍'}

  return (
    <div style={s.view}>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />



      <div style={{marginBottom:10}}>
        <button onClick={()=>{ setMapOpen(o=>{ const next=!o; if(next && mapObj.current) setTimeout(()=>mapObj.current.invalidateSize(),50); return next }) }} style={{width:'100%',background:'#fff',border:'1px solid var(--bdr)',borderRadius:mapOpen?'14px 14px 0 0':'14px',padding:'10px 14px',fontSize:13,fontWeight:600,color:'var(--tx)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,background:'#2979ff',borderRadius:'50%',display:'inline-block',boxShadow:'0 0 6px #2979ff'}}></span>Satellite map</span>
          <span style={{fontSize:12,color:'var(--mu)'}}>{mapOpen?'▲ Hide':'▼ Show'}</span>
        </button>
        <div style={{border:'1px solid var(--bdr)',borderTop:'none',borderRadius:'0 0 14px 14px',overflow:'hidden',height:mapOpen?'45vh':'0px',transition:'height 0.2s'}}>
          <div ref={mapRef} style={{width:'100%',height:'45vh'}} />
        </div>
      </div>


      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
        <button style={s.btn} onClick={dropPin}>
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="#fff" fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Drop pin
        </button>
        <button style={{...s.btn,background:'#607d8b'}} onClick={()=>{if(pathLine.current){mapObj.current.removeLayer(pathLine.current);pathLine.current=null}pathPts.current=[];showToast('Path cleared')}}>
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="#fff" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          Clear path
        </button>
      </div>

      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Scout pins ({pins.length})</span></div>
        <div style={{padding:'4px 14px'}}>
          {!pins.length?<div style={{...s.empty,padding:20}}>No pins dropped yet</div>:pins.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{em[p.cat]||'📍'} {p.cat||'Pin'}</div>
                <div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{p.log_date} · {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}</div>
                <div style={{fontSize:13,marginTop:3}}>{p.notes}</div>
                <a href={`https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=d`} style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:6,background:'#007aff',color:'#fff',padding:'5px 10px',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none'}}>🗺 Directions</a>
              </div>
              <DelBtn onClick={async()=>{if(!window.confirm('Delete?'))return;await supabase.from('scout_pins').delete().eq('id',p.id);loadPins()}} />
            </div>
          ))}
        </div>
      </div>

      {modal&&(
        <div style={{background:'var(--card)',border:'1px solid var(--g)',borderRadius:14,padding:'16px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{fontSize:16,fontWeight:600}}>New scout pin</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'var(--mu)'}}>✕</button>
            </div>
            {currentHybrid&&<div style={{fontSize:13,color:'#2979ff',fontWeight:500,marginBottom:12}}>📍 Dropping in: {currentHybrid}</div>}
            <label style={s.lbl}>Category</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,margin:'6px 0 14px'}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setCat(c)} style={{border:cat===c?'2px solid var(--g)':'1px solid var(--bdr)',borderRadius:12,padding:'14px 6px',fontSize:13,fontWeight:600,background:cat===c?'var(--gl)':'#f8f8f5',cursor:'pointer',textAlign:'center',color:cat===c?'var(--gd)':'var(--tx)',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <span style={{fontSize:22}}>{em[c]}</span>
                  <span>{c}</span>
                </button>
              ))}
            </div>
            <div style={{...s.fg,marginBottom:11}}><label style={s.lbl}>Notes</label><textarea style={s.ta} rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Describe what you're seeing…" /></div>
            <div style={{...s.fg,marginBottom:11}}>
              <label style={s.lbl}>Photo (optional)</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',background:'#f8f8f5',border:'1px solid var(--bdr)',borderRadius:10,padding:'12px 8px',textAlign:'center'}}>
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--mu)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{fontSize:12,color:'var(--mu)'}}>Take photo</span>
                  <input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files[0];if(!f)return;compress(f,800,0.65,d=>setPinPhoto(d))}} style={{display:'none'}} />
                </label>
                <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,cursor:'pointer',background:'#f8f8f5',border:'1px solid var(--bdr)',borderRadius:10,padding:'12px 8px',textAlign:'center'}}>
                  <svg viewBox="0 0 24 24" width="22" height="22" stroke="var(--mu)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="21 15 16 10 5 21"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M3 9h4l2-2h6l2 2h4"/></svg>
                  <span style={{fontSize:12,color:'var(--mu)'}}>Camera roll</span>
                  <input type="file" accept="image/*" onChange={e=>{const f=e.target.files[0];if(!f)return;compress(f,800,0.65,d=>setPinPhoto(d))}} style={{display:'none'}} />
                </label>
              </div>
              {pinPhoto&&<img src={pinPhoto} alt="preview" style={{width:'100%',height:120,objectFit:'cover',borderRadius:9,marginTop:8}} />}
            </div>
            <button style={{...s.btn,marginBottom:10}} onClick={savePin}>Save pin</button>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// VISIT NOTES TAB
// ══════════════════════════════════════════════════════════════════════════════
function VisitNotesTab({ fields, showToast }) {
  const [selectedFarm, setSelectedFarm] = useState('')
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(TODAY)
  const [notes, setNotes] = useState([])
  const [saving, setSaving] = useState(false)

  // Group fields by operation name
  const farms = [...new Set(fields.map(f => f.op))].sort()
  const farmFields = fields.filter(f => f.op === selectedFarm)
  const selectedField = fields.find(f => f.id === selectedFieldId)

  useEffect(() => { if (selectedFieldId) loadNotes() }, [selectedFieldId])
  useEffect(() => { setSelectedFieldId('') }, [selectedFarm])

  async function loadNotes() {
    const { data } = await supabase.from('visit_notes')
      .select('*').eq('field_id', selectedFieldId)
      .order('visit_date', { ascending: false })
    setNotes(data || [])
  }

  async function saveNote() {
    if (!note.trim()) { showToast('Enter some notes first'); return }
    if (!selectedFieldId) { showToast('Select a field first'); return }
    setSaving(true)
    const { error } = await supabase.from('visit_notes').insert([{
      field_id: selectedFieldId,
      visit_date: date,
      note: note.trim(),
      op: selectedField?.op || '',
    }])
    setSaving(false)
    if (error) { showToast('Save failed: ' + error.message); return }

    // Prepare text - must be triggered by direct user tap on iPhone
    if (selectedField) {
      const contacts = getContacts(selectedField)
      if(contacts.length > 0){
        const msg=encodeURIComponent(`Field visit note for ${selectedField.op}${selectedField.field_name?' — '+selectedField.field_name:''} on ${date}: ${savedNote} — View in app: https://pioneer-scouting-tool.vercel.app`)
        setSmsData(`sms:7656693258?body=${msg}`)
      }
    }
  }

  return (
    <div style={s.view}>
      {/* Farm selector */}
      <div style={s.fg}>
        <label style={s.lbl}>Farm / Operation</label>
        <select style={s.fsel} value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
          <option value="">— Select a farm —</option>
          {farms.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Field dropdown */}
      {selectedFarm && (
        <div style={{...s.fg, marginBottom:12}}>
          <label style={s.lbl}>Field</label>
          <select style={s.fsel} value={selectedFieldId} onChange={e => setSelectedFieldId(e.target.value)}>
            <option value="">— Select a field —</option>
            {farmFields.map(f => (
              <option key={f.id} value={f.id}>
                {f.hybrid || f.loc || f.plant_date || f.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedFieldId && (
        <>
          {/* Field info pill */}
          <div style={{ background:'var(--g)', borderRadius:10, padding:'10px 14px', marginBottom:12, color:'#fff', fontSize:13 }}>
            <span style={{fontWeight:600}}>{selectedField?.op}</span>
            {selectedField?.hybrid && <span style={{opacity:0.85}}> · {selectedField.hybrid}</span>}
            {selectedField?.loc && <span style={{opacity:0.7}}> · {selectedField.loc}</span>}
          </div>

          {/* Note entry */}
          <div style={s.card}>
            <div style={s.ch}>
              <div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
              <span style={{fontSize:13,fontWeight:600}}>New field visit note</span>
            </div>
            <div style={s.cb}>
              <div style={s.fg}><label style={s.lbl}>Visit date</label><input style={s.inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div style={s.fg}>
                <label style={s.lbl}>Notes</label>
                <textarea style={{...s.ta, minHeight:140}} rows="6" value={note} onChange={e => setNote(e.target.value)} placeholder="What did you see? Crop stage, issues, recommendations, next steps…" />
              </div>
              {(() => {
                const hasContacts = selectedField && getContacts(selectedField).length > 0
                const msgText = selectedField ? `Field visit note for ${selectedField.op}${selectedField.field_name?' — '+selectedField.field_name:''} on ${date}: ${note.trim()} — View in app: https://pioneer-scouting-tool.vercel.app` : ''
                const smsHref = hasContacts ? `sms:7656693258?body=${encodeURIComponent(msgText)}` : null
                return smsHref ? (
                  <a href={smsHref} onClick={()=>{ if(note.trim()) saveNote() }}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'var(--g)',color:'#fff',borderRadius:12,padding:15,fontSize:15,fontWeight:600,textDecoration:'none',opacity:saving?0.6:1}}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#fff" fill="none" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {saving ? 'Saving…' : 'Save & send note'}
                  </a>
                ) : (
                  <button style={s.btn} onClick={saveNote} disabled={saving}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#fff" fill="none" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    {saving ? 'Saving…' : 'Save note'}
                  </button>
                )
              })()}
              {selectedField && getContacts(selectedField).length > 0 && <div style={{fontSize:12,color:'var(--mu)',textAlign:'center',marginTop:-4}}>Opens Messages — tap Send to deliver</div>}
            </div>
          </div>

          {/* Past notes */}
          <div style={s.card}>
            <div style={s.ch}>
              <div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
              <span style={{fontSize:13,fontWeight:600}}>Past visit notes ({notes.length})</span>
            </div>
            <div style={{padding:'4px 14px 8px'}}>
              {!notes.length ? <div style={{...s.empty,padding:16}}>No visit notes yet</div> : notes.map(n => (
                <div key={n.id} style={{padding:'12px 0', borderBottom:'1px solid var(--bdr)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600,color:'var(--g)'}}>{n.visit_date}</span>
                    <button onClick={async()=>{ if(!window.confirm('Delete note?'))return; await supabase.from('visit_notes').delete().eq('id',n.id); loadNotes() }} style={{background:'none',border:'none',color:'var(--hi)',cursor:'pointer',padding:4}}>
                      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>
                  <div style={{fontSize:14,color:'var(--tx)',lineHeight:1.5,whiteSpace:'pre-wrap'}}>{n.note}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MINI SCOUT MAP — tap a pin to see it zoomed in on satellite map
// ══════════════════════════════════════════════════════════════════════════════
function MiniScoutMap({ pins }) {
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markerRefs = useRef([])
  const [activePin, setActivePin] = useState(null)
  const em = { Disease:'🌿', Weed:'🌱', Pest:'🐛', Nutrient:'🌾', Water:'💧', Other:'📍' }

  useEffect(() => {
    if (!pins.length) return
    const L = window.L
    if (!mapObj.current) {
      mapObj.current = L.map(mapRef.current, { zoomControl:false, dragging:true, scrollWheelZoom:false, tapTolerance:15 })
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:19 }).addTo(mapObj.current)
    }
    // Clear old markers
    markerRefs.current.forEach(m => mapObj.current.removeLayer(m))
    markerRefs.current = []

    // Add all pins as small dots
    pins.forEach(p => {
      const icon = L.divIcon({ html:`<div style="width:10px;height:10px;background:#fff;border:2px solid var(--g);border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`, className:'', iconSize:[10,10], iconAnchor:[5,5] })
      const m = L.marker([p.lat, p.lng], { icon }).addTo(mapObj.current)
      markerRefs.current.push(m)
    })

    // Start zoomed to show all pins
    if (pins.length === 1) {
      mapObj.current.setView([pins[0].lat, pins[0].lng], 17)
    } else {
      const group = L.featureGroup(markerRefs.current)
      mapObj.current.fitBounds(group.getBounds(), { padding:[30,30] })
    }
  }, [pins])

  // When a pin is selected, fly to it and show big marker
  useEffect(() => {
    if (!mapObj.current || !activePin) return
    const L = window.L
    mapObj.current.flyTo([activePin.lat, activePin.lng], 18, { duration:0.8 })
  }, [activePin])

  if (!pins.length) return <div style={{...s.empty,padding:12}}>No pins dropped yet</div>

  return (
    <div>
      <div ref={mapRef} style={{width:'100%',height:200}} />
      {/* Pin selector row */}
      <div style={{display:'flex',gap:6,overflowX:'auto',padding:'10px 14px',background:'#f8f8f5',borderTop:'1px solid var(--bdr)',WebkitOverflowScrolling:'touch'}}>
        {pins.map(p => (
          <button key={p.id} onClick={()=>setActivePin(activePin?.id===p.id?null:p)}
            style={{flexShrink:0,border:activePin?.id===p.id?'2px solid var(--g)':'1px solid var(--bdr)',borderRadius:20,padding:'5px 12px',background:activePin?.id===p.id?'var(--gl)':'#fff',cursor:'pointer',fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:5,color:activePin?.id===p.id?'var(--gd)':'var(--tx)'}}>
            <span>{em[p.cat]||'📍'}</span>
            <span>{p.cat||'Pin'}</span>
            <span style={{color:'var(--mu)',fontSize:11}}>{p.log_date}</span>
          </button>
        ))}
      </div>
      {/* Active pin detail */}
      {activePin && (
        <div style={{padding:'10px 14px',background:'var(--gl)',borderTop:'1px solid rgba(45,122,45,0.2)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--gd)',marginBottom:3}}>{em[activePin.cat]||'📍'} {activePin.cat} · {activePin.log_date}</div>
          {activePin.notes && <div style={{fontSize:13,color:'var(--tx)'}}>{activePin.notes}</div>}
          <div style={{fontSize:11,color:'var(--mu)',marginTop:4}}>{Number(activePin.lat).toFixed(5)}, {Number(activePin.lng).toFixed(5)}</div>
          <a href={`https://maps.apple.com/?daddr=${activePin.lat},${activePin.lng}&dirflg=d`} style={{display:'inline-flex',alignItems:'center',gap:5,marginTop:8,background:'#007aff',color:'#fff',padding:'6px 12px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none'}}>🗺 Get directions</a>
          {activePin.photo && <img src={activePin.photo} alt="pin" style={{width:'100%',borderRadius:8,marginTop:8,maxHeight:120,objectFit:'cover'}} />}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// YIELD TAB
// ══════════════════════════════════════════════════════════════════════════════
function YieldTab({ fields, showToast }) {
  const [selectedFarm, setSelectedFarm] = useState('')
  const [selectedFieldId, setSelectedFieldId] = useState('')
  const [yieldBuAc, setYieldBuAc] = useState('')
  const [harvestDate, setHarvestDate] = useState(TODAY)
  const [yieldNotes, setYieldNotes] = useState('')
  const [yields, setYields] = useState([])
  const [saving, setSaving] = useState(false)

  const farms = [...new Set(fields.map(f => f.op))].sort()
  const farmFields = fields.filter(f => f.op === selectedFarm)
  const selectedField = fields.find(f => f.id === selectedFieldId)

  useEffect(() => { setSelectedFieldId('') }, [selectedFarm])
  useEffect(() => { if (selectedFieldId) loadYields() }, [selectedFieldId])

  async function loadYields() {
    const { data } = await supabase.from('yield_log').select('*').eq('field_id', selectedFieldId).order('harvest_date', { ascending: false })
    setYields(data || [])
  }

  async function saveYield() {
    if (!yieldBuAc) { showToast('Enter yield bu/ac'); return }
    if (!selectedFieldId) { showToast('Select a field first'); return }
    setSaving(true)
    const { error } = await supabase.from('yield_log').insert([{
      field_id: selectedFieldId,
      harvest_date: harvestDate,
      yield_buac: parseFloat(yieldBuAc),
      notes: yieldNotes,
    }])
    setSaving(false)
    if (error) { showToast('Save failed: ' + error.message); return }
    setYieldBuAc(''); setYieldNotes(''); setHarvestDate(TODAY)
    loadYields(); showToast('Yield saved!')
  }

  return (
    <div style={s.view}>
      <div style={s.fg}>
        <label style={s.lbl}>Farm / Operation</label>
        <select style={s.fsel} value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
          <option value="">— Select a farm —</option>
          {farms.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {selectedFarm && (
        <div style={{...s.fg, marginBottom:12}}>
          <label style={s.lbl}>Field</label>
          <select style={s.fsel} value={selectedFieldId} onChange={e => setSelectedFieldId(e.target.value)}>
            <option value="">— Select a field —</option>
            {farmFields.map(f => <option key={f.id} value={f.id}>{f.field_name||f.hybrid||f.loc||f.id}</option>)}
          </select>
        </div>
      )}
      {selectedFieldId && (
        <>
          <div style={{ background:'var(--g)', borderRadius:10, padding:'10px 14px', marginBottom:12, color:'#fff', fontSize:13 }}>
            <span style={{fontWeight:600}}>{selectedField?.op}</span>
            {selectedField?.field_name && <span style={{opacity:0.85}}> · {selectedField.field_name}</span>}
            {selectedField?.hybrid && <span style={{opacity:0.7}}> · {selectedField.hybrid}</span>}
          </div>
          <div style={s.card}>
            <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Enter yield</span></div>
            <div style={s.cb}>
              <div style={s.fg}><label style={s.lbl}>Yield (bu/ac)</label><input style={s.inp} type="number" step="0.1" value={yieldBuAc} onChange={e=>setYieldBuAc(e.target.value)} placeholder="e.g. 215.5" inputMode="decimal" /></div>
              <div style={s.fg}><label style={s.lbl}>Harvest date</label><input style={s.inp} type="date" value={harvestDate} onChange={e=>setHarvestDate(e.target.value)} /></div>
              <div style={s.fg}><label style={s.lbl}>Notes (optional)</label><input style={s.inp} value={yieldNotes} onChange={e=>setYieldNotes(e.target.value)} placeholder="Conditions, moisture, etc." /></div>
              <button style={s.btn} onClick={saveYield} disabled={saving}>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#fff" fill="none" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
                {saving ? 'Saving…' : 'Save yield'}
              </button>
            </div>
          </div>
          {yields.length > 0 && (
            <div style={s.card}>
              <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Yield log</span></div>
              <div style={{padding:'4px 14px 8px'}}>
                {yields.map(y => (
                  <div key={y.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
                    <div>
                      <div style={{fontSize:18,fontWeight:700,color:'var(--g)'}}>{y.yield_buac} <span style={{fontSize:13,fontWeight:400,color:'var(--mu)'}}>bu/ac</span></div>
                      <div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{y.harvest_date}{y.notes?' · '+y.notes:''}</div>
                    </div>
                    <DelBtn onClick={async()=>{ if(!window.confirm('Delete?'))return; await supabase.from('yield_log').delete().eq('id',y.id); loadYields() }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS TAB (ADMIN ONLY)
// ══════════════════════════════════════════════════════════════════════════════
function ReportsTab({ fields, showToast }) {
  const [view, setView] = useState('overview') // overview | compare | hybrid
  const [allYields, setAllYields] = useState([])
  const [allRain, setAllRain] = useState([])
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [compareDataA, setCompareDataA] = useState(null)
  const [compareDataB, setCompareDataB] = useState(null)
  const [selectedHybrid, setSelectedHybrid] = useState('')
  const [anonymize, setAnonymize] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadAllData() }, [fields])

  async function loadAllData() {
    if (!fields.length) return
    setLoading(true)
    const ids = fields.map(f => f.id)
    const [{ data: yd }, { data: rd }] = await Promise.all([
      supabase.from('yield_log').select('*').in('field_id', ids),
      supabase.from('rain_log').select('*').in('field_id', ids),
    ])
    setAllYields(yd || [])
    setAllRain(rd || [])
    setLoading(false)
  }

  // Build field stats
  const fieldStats = fields.map((f, i) => {
    const fy = allYields.filter(y => y.field_id === f.id)
    const fr = allRain.filter(r => r.field_id === f.id)
    const avgYield = fy.length ? (fy.reduce((a,y)=>a+Number(y.yield_buac),0)/fy.length).toFixed(1) : null
    const totalRain = fr.reduce((a,r)=>a+Number(r.amount),0).toFixed(2)
    return { ...f, avgYield, totalRain: parseFloat(totalRain), yieldEntries: fy, rainEntries: fr, idx: i+1 }
  }).filter(f => f.avgYield !== null)

  const sorted = [...fieldStats].sort((a,b) => parseFloat(b.avgYield)-parseFloat(a.avgYield))
  const maxYield = sorted.length ? parseFloat(sorted[0].avgYield) : 1
  const maxRain = fieldStats.length ? Math.max(...fieldStats.map(f=>f.totalRain)) : 1

  // Hybrid comparison data
  const hybrids = [...new Set(fields.map(f=>f.hybrid).filter(Boolean))].sort()
  const hybridFields = fields.filter(f => f.hybrid === selectedHybrid)

  async function loadCompare(fid, setter) {
    if (!fid) { setter(null); return }
    const f = fields.find(x => x.id === fid)
    const [{ data: yd },{ data: rd },{ data: gd }] = await Promise.all([
      supabase.from('yield_log').select('*').eq('field_id', fid),
      supabase.from('rain_log').select('amount').eq('field_id', fid),
      supabase.from('gdu_log').select('gdu').eq('field_id', fid),
    ])
    setter({
      ...f,
      yield: yd?.length ? (yd.reduce((a,y)=>a+Number(y.yield_buac),0)/yd.length).toFixed(1) : '—',
      rain: rd?.reduce((a,r)=>a+Number(r.amount),0).toFixed(2) || '0.00',
      gdu: gd?.reduce((a,g)=>a+Number(g.gdu),0).toFixed(1) || '0',
    })
  }

  useEffect(() => { loadCompare(compareA, setCompareDataA) }, [compareA])
  useEffect(() => { loadCompare(compareB, setCompareDataB) }, [compareB])

  function printReport() {
    window.print()
  }

  const navBtns = [
    { id:'overview', label:'Overview' },
    { id:'compare', label:'Compare' },
    { id:'hybrid', label:'By Hybrid' },
  ]

  const farmLabel = (f) => anonymize ? `Field ${f.idx}` : f.op
  const fieldLabel = (f) => anonymize ? `Field ${f.idx}` : (f.field_name || f.hybrid || f.op)

  return (
    <div style={s.view}>
      {/* Sub nav */}
      <div style={{display:'flex',gap:6,marginBottom:14,overflowX:'auto'}}>
        {navBtns.map(b=>(
          <button key={b.id} onClick={()=>setView(b.id)} style={{flexShrink:0,padding:'8px 16px',borderRadius:20,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:view===b.id?'var(--g)':'#f0f0ea',color:view===b.id?'#fff':'var(--tx)'}}>{b.label}</button>
        ))}
        <button onClick={()=>setAnonymize(a=>!a)} style={{flexShrink:0,padding:'8px 16px',borderRadius:20,fontSize:13,fontWeight:600,border:'1px solid var(--bdr)',cursor:'pointer',background:anonymize?'#fff3e0':'#f0f0ea',color:anonymize?'#7a4500':'var(--mu)',marginLeft:'auto'}}>
          {anonymize ? '👤 Anonymized' : '👤 Anonymize'}
        </button>
        <button onClick={printReport} style={{flexShrink:0,padding:'8px 16px',borderRadius:20,fontSize:13,fontWeight:600,border:'1px solid var(--g)',cursor:'pointer',background:'var(--gl)',color:'var(--gd)',display:'flex',alignItems:'center',gap:5}}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print / PDF
        </button>
      </div>

      {loading && <div style={s.empty}>Loading data…</div>}

      {/* ── OVERVIEW ── */}
      {view === 'overview' && !loading && (
        <>
          {/* Yield chart */}
          <div style={s.card}>
            <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Yield — bu/ac (highest to lowest)</span></div>
            <div style={{padding:'13px 14px'}}>
              {sorted.length === 0 ? <div style={{...s.empty,padding:12}}>No yield data yet — add yields in the Yield tab</div> : sorted.map((f,i) => (
                <div key={f.id} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600}}>{i+1}. {fieldLabel(f)} {!anonymize&&f.op?<span style={{color:'var(--mu)',fontWeight:400}}>· {f.op}</span>:null}</span>
                    <span style={{fontSize:14,fontWeight:700,color:'var(--g)'}}>{f.avgYield} bu/ac</span>
                  </div>
                  <div style={{background:'#f0f0ea',borderRadius:6,height:10,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:6,background:`hsl(${120-i*15},60%,45%)`,width:`${(parseFloat(f.avgYield)/maxYield)*100}%`,transition:'width 0.5s'}} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rain chart */}
          <div style={s.card}>
            <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Season rainfall by field</span></div>
            <div style={{padding:'13px 14px'}}>
              {[...fieldStats].sort((a,b)=>b.totalRain-a.totalRain).map((f,i)=>(
                <div key={f.id} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600}}>{fieldLabel(f)} {!anonymize&&f.op?<span style={{color:'var(--mu)',fontWeight:400}}>· {f.op}</span>:null}</span>
                    <span style={{fontSize:14,fontWeight:700,color:'#0c447c'}}>{f.totalRain}"</span>
                  </div>
                  <div style={{background:'#f0f0ea',borderRadius:6,height:10,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:6,background:'#3498db',width:`${maxRain>0?(f.totalRain/maxRain)*100:0}%`,transition:'width 0.5s'}} />
                  </div>
                </div>
              ))}
              {!fieldStats.length && <div style={{...s.empty,padding:12}}>No rain data yet</div>}
            </div>
          </div>

          {/* Summary table */}
          <div style={s.card}>
            <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg></div><span style={{fontSize:13,fontWeight:600}}>All fields summary</span></div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:'#f8f8f5'}}>
                    {['Field','Hybrid','Tillage','Population','Rain"','Yield bu/ac'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',fontWeight:600,color:'var(--mu)',borderBottom:'1px solid var(--bdr)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f,i) => {
                    const fy = allYields.filter(y=>y.field_id===f.id)
                    const fr = allRain.filter(r=>r.field_id===f.id)
                    const avgY = fy.length ? (fy.reduce((a,y)=>a+Number(y.yield_buac),0)/fy.length).toFixed(1) : '—'
                    const totalR = fr.reduce((a,r)=>a+Number(r.amount),0).toFixed(2)
                    return (
                      <tr key={f.id} style={{borderBottom:'1px solid #f5f5f0'}}>
                        <td style={{padding:'8px 10px',fontWeight:600}}>{anonymize?`Field ${i+1}`:(f.field_name||f.op)}</td>
                        <td style={{padding:'8px 10px',color:'var(--mu)'}}>{f.hybrid||'—'}</td>
                        <td style={{padding:'8px 10px',color:'var(--mu)'}}>{f.tillage||'—'}</td>
                        <td style={{padding:'8px 10px',color:'var(--mu)'}}>{f.pop||'—'}</td>
                        <td style={{padding:'8px 10px',color:'#0c447c',fontWeight:600}}>{totalR}"</td>
                        <td style={{padding:'8px 10px',color:'var(--g)',fontWeight:700}}>{avgY}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── COMPARE ── */}
      {view === 'compare' && !loading && (
        <>
          <div style={s.two}>
            <div style={s.fg}>
              <label style={s.lbl}>Field A</label>
              <select style={{...s.fsel,marginBottom:0}} value={compareA} onChange={e=>setCompareA(e.target.value)}>
                <option value="">— Select —</option>
                {fields.map(f=><option key={f.id} value={f.id}>{f.op} · {f.field_name||f.hybrid||'field'}</option>)}
              </select>
            </div>
            <div style={s.fg}>
              <label style={s.lbl}>Field B</label>
              <select style={{...s.fsel,marginBottom:0}} value={compareB} onChange={e=>setCompareB(e.target.value)}>
                <option value="">— Select —</option>
                {fields.map(f=><option key={f.id} value={f.id}>{f.op} · {f.field_name||f.hybrid||'field'}</option>)}
              </select>
            </div>
          </div>

          {compareDataA && compareDataB && (
            <div style={{...s.card,marginTop:14}}>
              <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Side by side comparison</span></div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'#f8f8f5'}}>
                      <th style={{padding:'10px 12px',textAlign:'left',color:'var(--mu)',fontWeight:600,width:'35%'}}>Category</th>
                      <th style={{padding:'10px 12px',textAlign:'center',color:'var(--g)',fontWeight:700}}>{anonymize?'Field A':(compareDataA.field_name||compareDataA.op)}</th>
                      <th style={{padding:'10px 12px',textAlign:'center',color:'#0c447c',fontWeight:700}}>{anonymize?'Field B':(compareDataB.field_name||compareDataB.op)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Farm', compareDataA.op, compareDataB.op],
                      ['Hybrid', compareDataA.hybrid||'—', compareDataB.hybrid||'—'],
                      ['Plant Date', compareDataA.plant_date||'—', compareDataB.plant_date||'—'],
                      ['Population', compareDataA.pop?compareDataA.pop+' seeds/ac':'—', compareDataB.pop?compareDataB.pop+' seeds/ac':'—'],
                      ['Tillage', compareDataA.tillage||'—', compareDataB.tillage||'—'],
                      ['Planting Cond.', compareDataA.pcond||'—', compareDataB.pcond||'—'],
                      ['Emergence', compareDataA.emerge||'—', compareDataB.emerge||'—'],
                      ['Weed Pre-plant', compareDataA.weed_pre||'—', compareDataB.weed_pre||'—'],
                      ['Weed Post-plant', compareDataA.weed_post||'—', compareDataB.weed_post||'—'],
                      ['Fungicide', compareDataA.fplanned||'—', compareDataB.fplanned||'—'],
                      ['Fung. Timing', compareDataA.ftiming||'—', compareDataB.ftiming||'—'],
                      ['Fung. Product', compareDataA.fproduct||'—', compareDataB.fproduct||'—'],
                      ['Season Rain', compareDataA.rain+'"', compareDataB.rain+'"'],
                      ['GDUs', compareDataA.gdu, compareDataB.gdu],
                      ['Yield (avg)', compareDataA.yield+' bu/ac', compareDataB.yield+' bu/ac'],
                    ].map(([label, a, b]) => (
                      <tr key={label} style={{borderBottom:'1px solid #f5f5f0'}}>
                        <td style={{padding:'8px 12px',color:'var(--mu)',fontWeight:500}}>{label}</td>
                        <td style={{padding:'8px 12px',textAlign:'center',fontWeight: label==='Yield (avg)'?700:400, color: label==='Yield (avg)'?'var(--g)':label==='Season Rain'?'#0c447c':'var(--tx)'}}>{anonymize&&['Farm'].includes(label)?'—':a}</td>
                        <td style={{padding:'8px 12px',textAlign:'center',fontWeight: label==='Yield (avg)'?700:400, color: label==='Yield (avg)'?'#0c447c':label==='Season Rain'?'#0c447c':'var(--tx)'}}>{anonymize&&['Farm'].includes(label)?'—':b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(!compareDataA || !compareDataB) && <div style={{...s.empty,marginTop:20}}>Select two fields above to compare</div>}
        </>
      )}

      {/* ── BY HYBRID ── */}
      {view === 'hybrid' && !loading && (
        <>
          <div style={{...s.fg,marginBottom:12}}>
            <label style={s.lbl}>Select hybrid</label>
            <select style={s.fsel} value={selectedHybrid} onChange={e=>setSelectedHybrid(e.target.value)}>
              <option value="">— Select hybrid —</option>
              {hybrids.map(h=><option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          {selectedHybrid && (
            <div style={s.card}>
              <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Hybrid {selectedHybrid} — all fields</span></div>
              <div style={{padding:'13px 14px'}}>
                {hybridFields.length === 0 ? <div style={{...s.empty,padding:12}}>No fields with this hybrid</div> : hybridFields.map((f,i) => {
                  const fy = allYields.filter(y=>y.field_id===f.id)
                  const fr = allRain.filter(r=>r.field_id===f.id)
                  const avgY = fy.length?(fy.reduce((a,y)=>a+Number(y.yield_buac),0)/fy.length).toFixed(1):null
                  const totalR = fr.reduce((a,r)=>a+Number(r.amount),0).toFixed(2)
                  return (
                    <div key={f.id} style={{padding:'12px 0',borderBottom:'1px solid var(--bdr)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:600}}>{anonymize?`Grower ${i+1}`:(f.op)}</div>
                          <div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{anonymize?`Field ${i+1}`:(f.field_name||'—')} · {f.plant_date||'—'}</div>
                          <div style={{fontSize:12,color:'var(--mu)',marginTop:1}}>Pop: {f.pop||'—'} · Tillage: {f.tillage||'—'} · Rain: {totalR}"</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          {avgY ? <div style={{fontSize:20,fontWeight:700,color:'var(--g)'}}>{avgY}<span style={{fontSize:12,fontWeight:400,color:'var(--mu)'}}> bu/ac</span></div> : <div style={{fontSize:13,color:'var(--hi)'}}>No yield</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {hybridFields.some(f=>allYields.some(y=>y.field_id===f.id)) && (
                  <div style={{marginTop:12,padding:'10px 12px',background:'var(--gl)',borderRadius:10}}>
                    <div style={{fontSize:12,color:'var(--mu)',fontWeight:600,marginBottom:4}}>HYBRID AVERAGE</div>
                    <div style={{fontSize:22,fontWeight:700,color:'var(--g)'}}>
                      {(() => {
                        const allHY = hybridFields.flatMap(f=>allYields.filter(y=>y.field_id===f.id).map(y=>Number(y.yield_buac)))
                        return allHY.length ? (allHY.reduce((a,b)=>a+b,0)/allHY.length).toFixed(1)+' bu/ac avg across '+allHY.length+' field'+(allHY.length!==1?'s':'') : '—'
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {!selectedHybrid && <div style={s.empty}>Select a hybrid to see all fields planted with it</div>}
        </>
      )}

      <style>{`
        @media print {
          nav, button, a[href], .no-print { display: none !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const ADMIN_PIN = '0726'

function LoginScreen({ onLogin }) {
  const [step, setStep] = useState(1) // 1=op name, 2=PIN
  const [opName, setOpName] = useState('')
  const [pin, setPin] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleOpSubmit() {
    const val = opName.trim()
    if (!val) { setError('Enter your operation name'); return }
    setError('')
    if (val.toLowerCase() === 'admin') {
      setIsNew(false); setStep(2); return
    }
    setChecking(true)
    // Check if this operation exists in DB with a PIN set
    const { data, error: lookupErr } = await supabase.from('user_pins').select('pin').eq('op_name', val.toLowerCase()).maybeSingle()
    setChecking(false)
    if (data && data.pin) {
      setIsNew(false)
    } else {
      setIsNew(true) // new user — will create PIN
    }
    setStep(2)
  }

  async function handlePinSubmit() {
    setError('')
    // Admin login
    if (opName.trim().toLowerCase() === 'admin') {
      if (pin === ADMIN_PIN) {
        onLogin({ role: 'admin', opName: 'Admin' })
      } else {
        setError('Incorrect PIN'); setPin('')
      }
      return
    }

    if (isNew) {
      // Creating new PIN
      if (pin.length !== 4) { setError('PIN must be 4 digits'); return }
      if (pin !== confirmPin) { setError("PINs don't match"); setPin(''); setConfirmPin(''); return }
      const { error: dbErr } = await supabase.from('user_pins').insert([{ op_name: opName.trim().toLowerCase(), pin }])
      if (dbErr) { setError('Error saving PIN: ' + dbErr.message); return }
      onLogin({ role: 'customer', opName: opName.trim() })
    } else {
      // Existing PIN check
      const { data } = await supabase.from('user_pins').select('pin').eq('op_name', opName.trim().toLowerCase()).maybeSingle()
      if (data && data.pin === pin) {
        onLogin({ role: 'customer', opName: opName.trim() })
      } else {
        setError('Incorrect PIN'); setPin('')
      }
    }
  }

  const pinBoxStyle = (filled) => ({
    width:56, height:64, border: filled ? '2px solid var(--g)' : '2px solid var(--bdr)',
    borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:28, fontWeight:700, color:'var(--tx)', background: filled ? 'var(--gl)' : '#f8f8f5'
  })

  const numBtn = (n) => (
    <button key={n} onClick={() => {
      if (step === 2) {
        if (!isNew || confirmPin.length < 4 || pin.length < 4) {
          if (isNew && pin.length === 4) {
            if (confirmPin.length < 4) setConfirmPin(c => c.length < 4 ? c + n : c)
          } else {
            setPin(p => p.length < 4 ? p + n : p)
          }
        }
      }
    }} style={{ width:72, height:72, borderRadius:36, background:'#f8f8f5', border:'1px solid var(--bdr)', fontSize:22, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {n}
    </button>
  )

  const handleNum = (n) => {
    if (isNew && pin.length === 4) {
      setConfirmPin(c => c.length < 4 ? c + n : c)
    } else {
      setPin(p => p.length < 4 ? p + n : p)
    }
  }

  const handleBack = () => {
    if (isNew && pin.length === 4) {
      setConfirmPin(c => c.slice(0, -1))
    } else {
      setPin(p => p.slice(0, -1))
    }
  }

  const nums = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ marginBottom:32, textAlign:'center' }}>
        <div style={{ width:72, height:72, background:'var(--g)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <svg viewBox="0 0 100 100" width="48" height="48"><text x="50" y="70" textAnchor="middle" fontSize="62">🌱</text></svg>
        </div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--tx)' }}>W² Scouting Tool</div>
      </div>

      {step === 1 && (
        <div style={{ width:'100%', maxWidth:340 }}>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--tx)', marginBottom:6, textAlign:'center' }}>Enter your operation name</div>
          <div style={{ fontSize:13, color:'var(--mu)', marginBottom:20, textAlign:'center' }}>Enter your operation name to continue</div>
          <input
            style={{ ...s.inp, fontSize:17, padding:'14px', marginBottom:12, textAlign:'center' }}
            value={opName}
            onChange={e => setOpName(e.target.value)}
            placeholder="Operation name"
            onKeyDown={e => e.key === 'Enter' && handleOpSubmit()}
            autoFocus
          />
          {error && <div style={{ color:'#c0392b', fontSize:13, textAlign:'center', marginBottom:10 }}>{error}</div>}
          <button style={s.btn} onClick={handleOpSubmit} disabled={checking}>
            {checking ? 'Checking…' : 'Continue →'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ width:'100%', maxWidth:340, textAlign:'center' }}>
          <button onClick={() => { setStep(1); setPin(''); setConfirmPin(''); setError('') }} style={{ background:'none', border:'none', color:'var(--mu)', fontSize:13, cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:4, margin:'0 auto 16px' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style={{ fontSize:13, color:'var(--mu)', marginBottom:4 }}>{opName}</div>
          {isNew ? (
            <>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--tx)', marginBottom:4 }}>
                {pin.length < 4 ? 'Create your 4-digit PIN' : 'Confirm your PIN'}
              </div>
              <div style={{ fontSize:13, color:'var(--mu)', marginBottom:20 }}>
                {pin.length < 4 ? "You'll use this to log in next time" : 'Enter your PIN again to confirm'}
              </div>
            </>
          ) : (
            <div style={{ fontSize:16, fontWeight:600, color:'var(--tx)', marginBottom:20 }}>Enter your PIN</div>
          )}

          {/* PIN dots display */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={pinBoxStyle(isNew ? (pin.length < 4 ? i < pin.length : i < confirmPin.length) : i < pin.length)}>
                {isNew ? (pin.length < 4 ? (i < pin.length ? '●' : '') : (i < confirmPin.length ? '●' : '')) : (i < pin.length ? '●' : '')}
              </div>
            ))}
          </div>
          {isNew && pin.length === 4 && <div style={{ fontSize:11, color:'var(--g)', fontWeight:600, marginBottom:8, letterSpacing:'0.04em', textTransform:'uppercase' }}>Confirming PIN</div>}

          {error && <div style={{ color:'#c0392b', fontSize:13, marginBottom:12 }}>{error}</div>}

          {/* Number pad */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:260, margin:'16px auto 0' }}>
            {nums.map((n, i) => {
              if (n === '') return <div key={i} />
              if (n === '⌫') return (
                <button key={i} onClick={handleBack} style={{ width:72, height:72, borderRadius:36, background:'#f8f8f5', border:'1px solid var(--bdr)', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>⌫</button>
              )
              return (
                <button key={i} onClick={() => handleNum(n)} style={{ width:72, height:72, borderRadius:36, background:'#f8f8f5', border:'1px solid var(--bdr)', fontSize:22, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>{n}</button>
              )
            })}
          </div>

          {/* Submit when PIN complete */}
          {((isNew && pin.length === 4 && confirmPin.length === 4) || (!isNew && pin.length === 4)) && (
            <button style={{ ...s.btn, marginTop:20 }} onClick={handlePinSubmit}>
              {isNew ? 'Create PIN & Sign in' : 'Sign in'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,setTab]=useState('dashboard')
  const [fields,setFields]=useState([])
  const [toast,setToast]=useState('')
  const [user,setUser]=useState(null) // {role:'admin'|'customer', opName:'...'}
  const timer=useRef(null)

  useEffect(()=>{
    // Restore session from sessionStorage
    const saved = localStorage.getItem('pioneer_user')
    if (saved) {
      const u = JSON.parse(saved)
      setUser(u)
      loadFields(u)
    }
  },[])

  async function loadFields(u) {
    const activeUser = u || user
    if (!activeUser) return
    let query = supabase.from('fields').select('*').order('created_at',{ascending:false})
    if (activeUser.role === 'customer') {
      query = query.ilike('op', activeUser.opName)
    }
    const{data}=await query
    setFields(data||[])
  }

  function handleLogin(u) {
    setUser(u)
    localStorage.setItem('pioneer_user', JSON.stringify(u))
    loadFields(u)
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('pioneer_user')
    setFields([])
    setTab('dashboard')
  }

  function showToast(msg){
    setToast(msg);clearTimeout(timer.current)
    timer.current=setTimeout(()=>setToast(''),2800)
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />

  const isAdmin = user.role === 'admin'

  const tabs=[
    {id:'dashboard',label:'Fields',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>},
    ...(isAdmin ? [{id:'entry',label:'Entry',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>}] : []),
    {id:'rain',label:'Rain',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>},
    {id:'photos',label:'Photos',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>},
    {id:'scout',label:'Scout',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>},
    {id:'notes',label:'Notes',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>},
    ...(isAdmin ? [
      {id:'yield',label:'Yield',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
      {id:'reports',label:'Reports',icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>},
    ] : []),
  ]

  return (
    <>
      <div style={s.topbar}>
        <div style={{width:38,height:38,borderRadius:8,background:'#fff',padding:4,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg viewBox="0 0 100 100" width="30" height="30"><text x="50" y="70" textAnchor="middle" fontSize="62">🌱</text></svg>
        </div>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:600,color:'#fff'}}>W² Scouting Tool</div><div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:1}}>{isAdmin ? '🔑 Admin' : user.opName}</div></div>
        <button onClick={handleLogout} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,padding:'6px 10px',color:'#fff',fontSize:12,fontWeight:500,cursor:'pointer'}}>Sign out</button>
      </div>
      <nav style={s.nav}>
        {tabs.map(t=><button key={t.id} style={s.nb(tab===t.id)} onClick={()=>setTab(t.id)}>{t.icon}{t.label}</button>)}
      </nav>
      {tab==='dashboard'&&<DashboardTab fields={fields} showToast={showToast} onRefresh={()=>loadFields()} isAdmin={isAdmin} userOpName={user?.opName} />}
      {tab==='entry'    &&isAdmin&&<EntryTab onSaved={()=>loadFields()} showToast={showToast} />}
      {tab==='rain'     &&<RainTab fields={fields} showToast={showToast} />}
      {tab==='photos'   &&<PhotosTab fields={fields} showToast={showToast} />}
      {tab==='scout'    &&<ScoutTab fields={fields} showToast={showToast} />}
      {tab==='notes'    &&<VisitNotesTab fields={fields} showToast={showToast} />}
      {tab==='yield'    &&isAdmin&&<YieldTab fields={fields} showToast={showToast} />}
      {tab==='reports'  &&isAdmin&&<ReportsTab fields={fields} showToast={showToast} />}
      <Toast msg={toast} />
    </>
  )
}
