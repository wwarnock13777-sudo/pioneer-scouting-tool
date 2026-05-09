import React, { useState, useEffect, useRef } from 'react'
import './index.css'
import { supabase } from './supabase'

// ── helpers ──────────────────────────────────────────────────────────────────
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

// ── shared UI ────────────────────────────────────────────────────────────────
const s = {
  topbar: { background:'var(--g)', padding:'52px 16px 14px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:50 },
  topbarImg: { width:38, height:38, borderRadius:8, background:'#fff', padding:3, objectFit:'contain' },
  nav: { display:'flex', background:'#fff', borderBottom:'1px solid var(--bdr)', overflowX:'auto', WebkitOverflowScrolling:'touch', position:'sticky', top:80, zIndex:40 },
  nb: (active) => ({ flex:1, padding:'10px 4px 8px', fontSize:10, fontWeight:500, color: active ? 'var(--g)' : 'var(--mu)', background:'none', border:'none', borderBottom: active ? '2px solid var(--g)' : '2px solid transparent', whiteSpace:'nowrap', minWidth:52, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }),
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
  opt: (sel) => ({ background: sel ? 'var(--gl)' : '#f8f8f5', border: sel ? '1px solid var(--g)' : '1px solid var(--bdr)', borderRadius:10, padding:'12px 13px', fontSize:14, color:'var(--tx)', textAlign:'left', display:'flex', alignItems:'center', gap:9, width:'100%' }),
  ck: (sel) => ({ width:20, height:20, borderRadius:'50%', border: sel ? '1.5px solid var(--g)' : '1.5px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background: sel ? 'var(--g)' : 'transparent' }),
  btn: { width:'100%', background:'var(--g)', color:'#fff', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  btnOut: { width:'100%', background:'transparent', color:'var(--mu)', border:'1px solid var(--bdr)', borderRadius:12, padding:13, fontSize:14, marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:7 },
  btnSm: { background:'var(--g)', color:'#fff', border:'none', borderRadius:9, padding:'9px 14px', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 },
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

// ── OPT BUTTON ────────────────────────────────────────────────────────────────
function Opt({ label, selected, onClick }) {
  return (
    <button style={s.opt(selected)} onClick={onClick}>
      <span style={s.ck(selected)}>{selected && <CheckIcon />}</span>
      {label}
    </button>
  )
}

// ── FIELD SELECT ─────────────────────────────────────────────────────────────
function FieldSelect({ fields, value, onChange }) {
  return (
    <select style={s.fsel} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Select a field —</option>
      {fields.map(f => (
        <option key={f.id} value={f.id}>
          {f.op}{f.hybrid ? ` — ${f.hybrid}` : ''}{f.plant_date ? ` (${f.plant_date})` : ''}
        </option>
      ))}
    </select>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTRY TAB
// ══════════════════════════════════════════════════════════════════════════════
function EntryTab({ onSaved, showToast }) {
  const [form, setForm] = useState({ op:'', grower:'', rep:'', loc:'', zip:'', hybrid:'', plant_date:TODAY, pop:'', stand_e:'', pcond_notes:'', weed_pre:'', weed_post:'', stand_count:'', early_obs:'', fproduct:'', notes:'', tillage_other:'', ftiming_other:'' })
  const [sel, setSel] = useState({ tillage:'', pcond:'', emerge:'', fplanned:'', ftiming:'' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const pick = (g, v) => setSel(s => ({ ...s, [g]: s[g] === v ? '' : v }))

  const handleSave = async () => {
    if (!form.op.trim()) { showToast('Enter an operation name first'); return }
    setSaving(true)
    const tillage = sel.tillage === 'Other' ? (form.tillage_other || 'Other') : sel.tillage
    const ftiming = sel.ftiming === 'Other' ? (form.ftiming_other || 'Other') : sel.ftiming
    const row = { ...form, tillage, ftiming, pcond: sel.pcond, emerge: sel.emerge, fplanned: sel.fplanned, saved_at: new Date().toLocaleDateString() }
    delete row.tillage_other; delete row.ftiming_other

    const { data, error } = await supabase.from('fields').insert([row]).select().single()
    setSaving(false)
    if (error) { showToast('Save failed: ' + error.message); return }

    // email
    const sub = encodeURIComponent(`Pioneer Field Data — ${form.op} — ${form.plant_date}`)
    const body = encodeURIComponent(buildEmailBody(row))
    window.location.href = `mailto:wwarnock13777@gmail.com?subject=${sub}&body=${body}`

    showToast('Field saved! Opening email…')
    onSaved()
    setForm({ op:'', grower:'', rep:'', loc:'', zip:'', hybrid:'', plant_date:TODAY, pop:'', stand_e:'', pcond_notes:'', weed_pre:'', weed_post:'', stand_count:'', early_obs:'', fproduct:'', notes:'', tillage_other:'', ftiming_other:'' })
    setSel({ tillage:'', pcond:'', emerge:'', fplanned:'', ftiming:'' })
  }

  function buildEmailBody(d) {
    return [
      'PIONEER ROUND PRAIRIE HYBRID SHOWCASE', 'Field Data Report', '==============================', '',
      'OPERATION INFO', `Operation: ${d.op||'—'}`, `Grower: ${d.grower||'—'}`, `Rep: ${d.rep||'—'}`,
      `Location: ${d.loc||'—'}`, `Zip: ${d.zip||'—'}`, `Hybrid: ${d.hybrid||'—'}`, '',
      'PLANTING INFO', `Plant Date: ${d.plant_date||'—'}`, `Population: ${d.pop||'—'} seeds/ac`,
      `Stand Emerged: ${d.stand_e||'—'} plants/ac`, `Tillage: ${d.tillage||'—'}`,
      `Planting Conditions: ${d.pcond||'—'}`, `Notes: ${d.pcond_notes||'—'}`, '',
      'WEED CONTROL', `Pre-plant: ${d.weed_pre||'—'}`, `Post-plant: ${d.weed_post||'—'}`, '',
      'EMERGENCE', `Rating: ${d.emerge||'—'}`, `Stand Count: ${d.stand_count||'—'}`, `Early Obs: ${d.early_obs||'—'}`, '',
      'FUNGICIDE', `Planned: ${d.fplanned||'—'}`, `Timing: ${d.ftiming||'—'}`, `Product: ${d.fproduct||'—'}`, '',
      'NOTES', d.notes || '—'
    ].join('\n')
  }

  const OptGroup = ({ group, values, layout='col' }) => (
    <div style={layout === 'grid' ? s.opts2 : s.opts}>
      {values.map(v => <Opt key={v} label={v} selected={sel[group] === v} onClick={() => pick(group, v)} />)}
    </div>
  )

  return (
    <div style={s.view}>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Operation info</span></div>
        <div style={s.cb}>
          {[['op','Operation name','Farm / operation name'],['grower','Grower / contact','Name'],['rep','Representative','Rep name'],['loc','Field location','Township, section, county…'],['zip','Field zip code','5-digit zip'],['hybrid','Hybrid planted','Hybrid number']].map(([k,l,p]) => (
            <div key={k} style={s.fg}><label style={s.lbl}>{l}</label><input style={s.inp} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={p} inputMode={k==='zip'?'numeric':undefined} maxLength={k==='zip'?5:undefined} /></div>
          ))}
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
          <div style={s.fg}>
            <label style={s.lbl}>Tillage practice</label>
            <OptGroup group="tillage" values={['No-Till','Minimum Till','Conventional Till','Other']} />
            {sel.tillage === 'Other' && <input style={{...s.inp, marginTop:7}} value={form.tillage_other} onChange={e=>set('tillage_other',e.target.value)} placeholder="Describe tillage…" />}
          </div>
          <div style={s.fg}>
            <label style={s.lbl}>Planting conditions</label>
            <OptGroup group="pcond" values={['Excellent','Good','Fair','Poor']} layout="grid" />
          </div>
          <div style={s.fg}><label style={s.lbl}>Comments on planting conditions</label><textarea style={s.ta} rows="2" value={form.pcond_notes} onChange={e=>set('pcond_notes',e.target.value)} placeholder="Notes…" /></div>
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
          <div style={s.fg}><label style={s.lbl}>Emergence rating</label><OptGroup group="emerge" values={['Excellent','Good','Fair','Poor']} layout="grid" /></div>
          <div style={s.fg}><label style={s.lbl}>Stand count</label><input style={s.inp} type="number" value={form.stand_count} onChange={e=>set('stand_count',e.target.value)} placeholder="plants/ac" inputMode="numeric" /></div>
          <div style={s.fg}><label style={s.lbl}>Early season observations</label><textarea style={s.ta} rows="2" value={form.early_obs} onChange={e=>set('early_obs',e.target.value)} placeholder="Notes…" /></div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Fungicide plan</span></div>
        <div style={s.cb}>
          <div style={s.two}>
            <div style={s.fg}><label style={s.lbl}>Planned?</label><OptGroup group="fplanned" values={['Yes','No','Undecided']} /></div>
            <div style={s.fg}><label style={s.lbl}>Timing</label><OptGroup group="ftiming" values={['V-Timing','VT/R1','Brown Silk','Other']} /></div>
          </div>
          {sel.ftiming === 'Other' && <input style={s.inp} value={form.ftiming_other} onChange={e=>set('ftiming_other',e.target.value)} placeholder="Other timing…" />}
          <div style={s.fg}><label style={s.lbl}>Fungicide product / program</label><textarea style={s.ta} rows="2" value={form.fproduct} onChange={e=>set('fproduct',e.target.value)} placeholder="Product and rate…" /></div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><span style={{fontSize:13,fontWeight:600}}>General field notes</span></div>
        <div style={s.cb}><textarea style={s.ta} rows="3" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any additional observations…" /></div>
      </div>

      <button style={s.btn} onClick={handleSave} disabled={saving}>
        <svg viewBox="0 0 24 24" width="17" height="17" stroke="#fff" fill="none" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        {saving ? 'Saving…' : 'Save & email to wwarnock13777@gmail.com'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// GDU TAB
// ══════════════════════════════════════════════════════════════════════════════
function GduTab({ fields, showToast }) {
  const [fieldId, setFieldId] = useState('')
  const [log, setLog] = useState([])
  const [total, setTotal] = useState(0)
  const [hi, setHi] = useState(''); const [lo, setLo] = useState(''); const [date, setDate] = useState(TODAY)
  const [weather, setWeather] = useState(null)
  const field = fields.find(f => f.id === fieldId)

  useEffect(() => { if (fieldId) loadLog() }, [fieldId])

  async function loadLog() {
    const { data } = await supabase.from('gdu_log').select('*').eq('field_id', fieldId).order('log_date', { ascending: true })
    setLog(data || [])
    setTotal((data || []).reduce((s, e) => s + Number(e.gdu), 0))
  }

  async function addManual() {
    if (!hi || !lo || !date) { showToast('Enter high, low, and date'); return }
    const gdu = calcGdu(hi, lo)
    const { error } = await supabase.from('gdu_log').insert([{ field_id: fieldId, log_date: date, high_temp: Number(hi), low_temp: Number(lo), gdu }])
    if (error) { showToast('Save failed'); return }
    setHi(''); setLo(''); setDate(TODAY)
    loadLog(); showToast(`Added ${gdu} GDUs`)
  }

  async function addWeather() {
    if (!weather) return
    const { error } = await supabase.from('gdu_log').insert([{ field_id: fieldId, log_date: weather.date, high_temp: weather.hi, low_temp: weather.lo, gdu: weather.gdu }])
    if (error) { showToast('Save failed'); return }
    setWeather(null); loadLog(); showToast(`Added ${weather.gdu} GDUs`)
  }

  async function del(id) {
    await supabase.from('gdu_log').delete().eq('id', id)
    loadLog()
  }

  async function fetchWeather() {
    if (!field?.zip) { showToast('No zip on this field'); return }
    try {
      const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${field.zip},us&units=imperial&appid=bd5e378503939ddaee76f12ad7a97608`)
      const d = await r.json()
      if (!d.main) { showToast('Weather not found'); return }
      const hi = Math.round(d.main.temp_max), lo = Math.round(d.main.temp_min)
      setWeather({ date: TODAY, hi, lo, gdu: calcGdu(hi, lo) })
    } catch { showToast('Could not fetch weather') }
  }

  return (
    <div style={s.view}>
      <div style={s.info}>GDUs = ((High + Low) ÷ 2) – 50. High capped 86°F, low floored 50°F.</div>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />
      {!fieldId ? <div style={s.empty}>Select a field to track GDUs</div> : <>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:11 }}>
          <div style={s.stat}><div style={{fontSize:11,color:'var(--mu)',marginBottom:3}}>Total GDUs</div><div style={{fontSize:24,fontWeight:700}}>{total.toFixed(1)}<span style={{fontSize:13,color:'var(--mu)'}}> GDU</span></div></div>
          <div style={s.stat}><div style={{fontSize:11,color:'var(--mu)',marginBottom:3}}>Days logged</div><div style={{fontSize:24,fontWeight:700}}>{log.length}<span style={{fontSize:13,color:'var(--mu)'}}> days</span></div></div>
        </div>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Fetch today's weather</span></div>
          <div style={s.cb}>
            {field?.zip && <div style={s.info}>Zip: {field.zip}</div>}
            <button style={s.btn} onClick={fetchWeather}>Pull weather for field zip</button>
            {weather && <>
              <div style={{ background:'#f8f8f5', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 13px' }}>
                {[['Date',weather.date],['High',weather.hi+'°F'],['Low',weather.lo+'°F'],['GDUs today',weather.gdu+' GDU']].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:12,color:'var(--mu)'}}>{k}</span><span style={{fontSize:14,fontWeight:600,color:k==='GDUs today'?'var(--g)':undefined}}>{v}</span></div>
                ))}
              </div>
              <button style={s.btn} onClick={addWeather}>Add to GDU log</button>
            </>}
            <div style={{height:1,background:'var(--bdr)',margin:'4px 0'}} />
            <label style={s.lbl}>Or enter manually</label>
            <div style={s.two}>
              <div style={s.fg}><label style={s.lbl}>High (°F)</label><input style={s.inp} type="number" value={hi} onChange={e=>setHi(e.target.value)} placeholder="86" inputMode="numeric" /></div>
              <div style={s.fg}><label style={s.lbl}>Low (°F)</label><input style={s.inp} type="number" value={lo} onChange={e=>setLo(e.target.value)} placeholder="50" inputMode="numeric" /></div>
            </div>
            <div style={s.fg}><label style={s.lbl}>Date</label><input style={s.inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
            <button style={s.btn} onClick={addManual}>Add GDU entry</button>
          </div>
        </div>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div><span style={{fontSize:13,fontWeight:600}}>GDU log</span></div>
          <div style={{padding:'4px 14px'}}>
            {log.length === 0 ? <div style={{...s.empty,padding:20}}>No entries yet</div> : [...log].reverse().map(e=>(
              <div key={e.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--bdr)'}}>
                <div><div style={{fontSize:15,fontWeight:600}}>{e.gdu} GDU</div><div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{e.log_date} · {e.high_temp}°/{e.low_temp}°F</div></div>
                <button onClick={()=>del(e.id)} style={{background:'none',border:'none',color:'var(--hi)',padding:6}}><svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
              </div>
            ))}
          </div>
        </div>
      </>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// RAIN TAB
// ══════════════════════════════════════════════════════════════════════════════
function RainTab({ fields, showToast }) {
  const [fieldId, setFieldId] = useState('')
  const [log, setLog] = useState([])
  const [date, setDate] = useState(TODAY); const [amt, setAmt] = useState(''); const [note, setNote] = useState('')

  useEffect(() => { if (fieldId) loadLog() }, [fieldId])

  async function loadLog() {
    const { data } = await supabase.from('rain_log').select('*').eq('field_id', fieldId).order('log_date', { ascending: false })
    setLog(data || [])
  }
  const total = log.reduce((s, r) => s + Number(r.amount), 0)

  async function add() {
    if (!date || !amt) { showToast('Enter date and amount'); return }
    const { error } = await supabase.from('rain_log').insert([{ field_id: fieldId, log_date: date, amount: parseFloat(amt), note }])
    if (error) { showToast('Save failed'); return }
    setAmt(''); setNote(''); setDate(TODAY); loadLog(); showToast('Rain event logged')
  }

  async function del(id) { await supabase.from('rain_log').delete().eq('id', id); loadLog() }

  return (
    <div style={s.view}>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />
      {!fieldId ? <div style={s.empty}>Select a field to track rainfall</div> : <>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9, marginBottom:11 }}>
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
            {log.length === 0 ? <div style={{...s.empty,padding:20}}>No rain events logged</div> : log.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
                <div><div style={{fontSize:15,fontWeight:600}}>{parseFloat(r.amount).toFixed(2)} in</div><div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{r.log_date}{r.note ? ` · ${r.note}` : ''}</div></div>
                <button onClick={()=>del(r.id)} style={{background:'none',border:'none',color:'var(--hi)',padding:6}}><svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
              </div>
            ))}
          </div>
        </div>
      </>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS TAB
// ══════════════════════════════════════════════════════════════════════════════
function PhotosTab({ fields, showToast }) {
  const [fieldId, setFieldId] = useState('')
  const [photos, setPhotos] = useState([])
  const [preview, setPreview] = useState(null)
  const [note, setNote] = useState(''); const [date, setDate] = useState(TODAY)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => { if (fieldId) loadPhotos() }, [fieldId])

  async function loadPhotos() {
    const { data } = await supabase.from('photos').select('*').eq('field_id', fieldId).order('log_date', { ascending: false })
    setPhotos(data || [])
  }

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    compress(file, 1200, 0.7, data => setPreview(data))
  }

  async function save() {
    if (!preview) { showToast('Take or choose a photo first'); return }
    if (!fieldId) { showToast('Select a field first'); return }
    const { error } = await supabase.from('photos').insert([{ field_id: fieldId, log_date: date, note, src: preview }])
    if (error) { showToast('Save failed: ' + error.message); return }
    setPreview(null); setNote(''); setDate(TODAY); loadPhotos(); showToast('Photo saved!')
  }

  async function del(id) {
    if (!window.confirm('Delete this photo?')) return
    await supabase.from('photos').delete().eq('id', id); loadPhotos()
  }

  return (
    <div style={s.view}>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />
      {!fieldId ? <div style={s.empty}>Select a field to manage photos</div> : <>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Add photo</span></div>
          <div style={s.cb}>
            <label style={{ border:'2px dashed var(--bdr)', borderRadius:12, padding:24, textAlign:'center', cursor:'pointer', background:'#fafaf7', display:'block' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--mu)" fill="none" strokeWidth="1.5" style={{display:'block',margin:'0 auto 8px'}}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <p style={{fontSize:14,color:'var(--mu)'}}>Tap to take photo or choose from library</p>
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:'none'}} />
            </label>
            {preview && <img src={preview} alt="preview" style={{width:'100%',borderRadius:10,maxHeight:200,objectFit:'cover'}} />}
            <div style={s.fg}><label style={s.lbl}>Notes / observation</label><textarea style={s.ta} rows="2" value={note} onChange={e=>setNote(e.target.value)} placeholder="What are you seeing? Disease, weed, pest…" /></div>
            <div style={s.fg}><label style={s.lbl}>Date</label><input style={s.inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
            <button style={s.btn} onClick={save}>Save photo</button>
          </div>
        </div>
        <div style={s.card}>
          <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Photo log ({photos.length})</span></div>
          <div style={{padding:'13px 14px'}}>
            {photos.length === 0 ? <div style={{...s.empty,padding:16}}>No photos yet</div> : (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                {photos.map(p => (
                  <div key={p.id} style={{borderRadius:11,overflow:'hidden',border:'1px solid var(--bdr)',background:'var(--card)'}}>
                    <div style={{position:'relative'}}>
                      <img src={p.src} alt="field" style={{width:'100%',aspectRatio:'1',objectFit:'cover',display:'block',cursor:'pointer'}} onClick={()=>setLightbox(p)} />
                      <button onClick={()=>del(p.id)} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.55)',border:'none',borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
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
      {lightbox && (
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
// SCOUT TAB
// ══════════════════════════════════════════════════════════════════════════════
function ScoutTab({ fields, showToast }) {
  const [fieldId, setFieldId] = useState('')
  const [pins, setPins] = useState([])
  const [modal, setModal] = useState(false)
  const [pending, setPending] = useState(null)
  const [cat, setCat] = useState(''); const [notes, setNotes] = useState(''); const [pinPhoto, setPinPhoto] = useState(null)
  const mapRef = useRef(null); const mapObj = useRef(null); const markers = useRef([])

  useEffect(() => {
    if (!mapObj.current) {
      const L = window.L
      mapObj.current = L.map(mapRef.current, { zoomControl: true }).setView([41.5, -93.5], 12)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapObj.current)
      navigator.geolocation.getCurrentPosition(pos => {
        mapObj.current.setView([pos.coords.latitude, pos.coords.longitude], 15)
      }, () => {}, { enableHighAccuracy: true })
    }
  }, [])

  useEffect(() => { if (fieldId) loadPins() }, [fieldId])
  useEffect(() => { renderMarkers() }, [pins])

  async function loadPins() {
    const { data } = await supabase.from('scout_pins').select('*').eq('field_id', fieldId).order('log_date', { ascending: false })
    setPins(data || [])
  }

  function renderMarkers() {
    const L = window.L; if (!mapObj.current || !L) return
    markers.current.forEach(m => mapObj.current.removeLayer(m)); markers.current = []
    const emoji = { Disease:'🌿', Weed:'🌱', Pest:'🐛', Nutrient:'🌾', Water:'💧', Other:'📍' }
    pins.forEach(p => {
      const icon = L.divIcon({ html: `<div style="font-size:24px;line-height:1">${emoji[p.cat]||'📍'}</div>`, className: '', iconSize: [28, 28], iconAnchor: [14, 28] })
      const m = L.marker([p.lat, p.lng], { icon }).addTo(mapObj.current)
      const popHtml = `<div style="min-width:160px;padding:8px"><strong>${p.cat||'Pin'}</strong><br/><small>${p.log_date}</small><p style="margin-top:4px;font-size:13px">${p.notes||''}</p>${p.photo ? `<img src="${p.photo}" style="width:100%;border-radius:6px;margin-top:6px;max-height:100px;object-fit:cover">` : ''}</div>`
      m.bindPopup(popHtml, { maxWidth: 220 })
      markers.current.push(m)
    })
  }

  function dropPin() {
    if (!fieldId) { showToast('Select a field first'); return }
    navigator.geolocation.getCurrentPosition(pos => {
      setPending({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      mapObj.current.setView([pos.coords.latitude, pos.coords.longitude], 16)
      setModal(true); setCat(''); setNotes(''); setPinPhoto(null)
    }, () => showToast('Enable location access first'), { enableHighAccuracy: true, timeout: 10000 })
  }

  function handlePinPhoto(e) {
    const file = e.target.files[0]; if (!file) return
    compress(file, 800, 0.65, data => setPinPhoto(data))
  }

  async function savePin() {
    if (!notes && !cat) { showToast('Add a category or notes'); return }
    const { error } = await supabase.from('scout_pins').insert([{ field_id: fieldId, lat: pending.lat, lng: pending.lng, cat: cat || 'Other', notes, log_date: TODAY, photo: pinPhoto }])
    if (error) { showToast('Save failed'); return }
    setModal(false); loadPins(); showToast('Pin dropped!')
  }

  async function delPin(id) {
    if (!window.confirm('Delete this pin?')) return
    await supabase.from('scout_pins').delete().eq('id', id); loadPins()
  }

  const cats = ['Disease','Weed','Pest','Nutrient','Water','Other']
  const emoji = { Disease:'🌿', Weed:'🌱', Pest:'🐛', Nutrient:'🌾', Water:'💧', Other:'📍' }

  return (
    <div style={s.view}>
      <FieldSelect fields={fields} value={fieldId} onChange={setFieldId} />
      <div ref={mapRef} style={{ width:'100%', height:'50vh', borderRadius:14, overflow:'hidden', border:'1px solid var(--bdr)', marginBottom:12 }} />
      <button style={{ ...s.btn, marginBottom:12 }} onClick={dropPin}>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#fff" fill="none" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Drop pin at my location
      </button>
      <div style={s.card}>
        <div style={s.ch}><div style={s.ci}><svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--g)" fill="none" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></div><span style={{fontSize:13,fontWeight:600}}>Scout pins ({pins.length})</span></div>
        <div style={{padding:'4px 14px'}}>
          {pins.length === 0 ? <div style={{...s.empty,padding:20}}>No pins dropped yet</div> : pins.map(p => (
            <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bdr)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{emoji[p.cat]||'📍'} {p.cat||'Pin'}</div>
                <div style={{fontSize:12,color:'var(--mu)',marginTop:2}}>{p.log_date} · {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}</div>
                <div style={{fontSize:13,marginTop:3}}>{p.notes}</div>
              </div>
              <button onClick={()=>delPin(p.id)} style={{background:'none',border:'none',color:'var(--hi)',padding:6}}><svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:150, display:'flex', alignItems:'flex-end' }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 16px 36px', width:'100%', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ width:40, height:4, background:'var(--bdr)', borderRadius:2, margin:'0 auto 16px' }} />
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:14 }}>New scout pin</h3>
            <label style={s.lbl}>Category</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7, margin:'6px 0 14px' }}>
              {cats.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ border: cat===c ? '1px solid var(--g)' : '1px solid var(--bdr)', borderRadius:9, padding:'9px 6px', fontSize:12, fontWeight:500, background: cat===c ? 'var(--gl)' : '#f8f8f5', cursor:'pointer', textAlign:'center', color: cat===c ? 'var(--gd)' : undefined }}>
                  {emoji[c]} {c}
                </button>
              ))}
            </div>
            <div style={{...s.fg, marginBottom:11}}><label style={s.lbl}>Notes</label><textarea style={s.ta} rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Describe what you're seeing…" /></div>
            <div style={{...s.fg, marginBottom:11}}>
              <label style={s.lbl}>Photo (optional)</label>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', background:'#f8f8f5', border:'1px solid var(--bdr)', borderRadius:10, padding:'12px 13px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--mu)" fill="none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style={{fontSize:14,color:'var(--mu)'}}>Take or choose photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePinPhoto} style={{display:'none'}} />
              </label>
              {pinPhoto && <img src={pinPhoto} alt="preview" style={{width:'100%',height:120,objectFit:'cover',borderRadius:9,marginTop:4}} />}
            </div>
            <button style={{ ...s.btn, marginBottom:10 }} onClick={savePin}>Save pin</button>
            <button style={s.btnOut} onClick={() => setModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ══════════════════════════════════════════════════════════════════════════════
function HistoryTab({ fields, onDeleted, showToast }) {
  const [open, setOpen] = useState(null)
  const [stats, setStats] = useState({})

  useEffect(() => {
    fields.forEach(async f => {
      const [{ data: gdu }, { data: rain }, { data: photos }, { data: pins }] = await Promise.all([
        supabase.from('gdu_log').select('gdu').eq('field_id', f.id),
        supabase.from('rain_log').select('amount').eq('field_id', f.id),
        supabase.from('photos').select('id').eq('field_id', f.id),
        supabase.from('scout_pins').select('id').eq('field_id', f.id),
      ])
      setStats(s => ({ ...s, [f.id]: {
        gdu: (gdu||[]).reduce((a,r)=>a+Number(r.gdu),0),
        rain: (rain||[]).reduce((a,r)=>a+Number(r.amount),0),
        photos: (photos||[]).length,
        pins: (pins||[]).length,
      }}))
    })
  }, [fields])

  async function del(id) {
    if (!window.confirm('Delete this field and all its data? Cannot be undone.')) return
    await supabase.from('fields').delete().eq('id', id)
    onDeleted(); showToast('Field deleted')
  }

  async function resend(f) {
    const sub = encodeURIComponent(`Pioneer Field Data — ${f.op} — ${f.plant_date||f.saved_at}`)
    const body = encodeURIComponent(`Pioneer Field: ${f.op}\nHybrid: ${f.hybrid||'—'}\nLocation: ${f.loc||'—'}\nDate: ${f.plant_date||'—'}\nGDUs: ${stats[f.id]?.gdu?.toFixed(1)||0}\nRain: ${stats[f.id]?.rain?.toFixed(2)||0} in`)
    window.location.href = `mailto:wwarnock13777@gmail.com?subject=${sub}&body=${body}`
  }

  if (fields.length === 0) return <div style={{...s.view,...s.empty}}>No fields saved yet. Fill out the entry form to get started.</div>

  return (
    <div style={s.view}>
      {fields.map(f => {
        const st = stats[f.id] || {}
        const isOpen = open === f.id
        return (
          <div key={f.id} style={{ background:'var(--card)', border:'1px solid var(--bdr)', borderRadius:14, padding:'13px 14px', marginBottom:9, cursor:'pointer' }} onClick={() => setOpen(isOpen ? null : f.id)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div><div style={{fontSize:15,fontWeight:600}}>{f.op}</div><div style={{fontSize:12,color:'var(--mu)',marginTop:3}}>{f.hybrid||'—'} · {f.plant_date||'no date'}</div></div>
              <span style={s.badge('#f0f0ea','var(--mu)')}>{f.saved_at}</span>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
              <span style={s.badge('var(--gl)','var(--gd)')}>{(st.gdu||0).toFixed(1)} GDU</span>
              <span style={s.badge('#e6f1fb','#0c447c')}>{(st.rain||0).toFixed(2)} in</span>
              <span style={s.badge('#f5f0ff','#4a2d8f')}>{st.photos||0} photos</span>
              <span style={s.badge('#fff3e0','#7a4500')}>{st.pins||0} pins</span>
            </div>
            {isOpen && (
              <div style={{ marginTop:11, paddingTop:11, borderTop:'1px solid var(--bdr)' }} onClick={e=>e.stopPropagation()}>
                {[['Grower',f.grower],['Rep',f.rep],['Location',f.loc],['Zip',f.zip],['Plant date',f.plant_date],['Pop planted',f.pop?f.pop+' seeds/ac':'—'],['Stand emerged',f.stand_e?f.stand_e+' plants/ac':'—'],['Tillage',f.tillage],['Conditions',f.pcond],['Emergence',f.emerge],['Stand count',f.stand_count],['Fungicide',f.fplanned],['Timing',f.ftiming],['Product',f.fproduct],['Weed pre',f.weed_pre],['Weed post',f.weed_post],['Notes',f.notes]].map(([k,v])=>(
                  <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13,borderBottom:'1px solid #f0f0ea'}}>
                    <span style={{color:'var(--mu)'}}>{k}</span><span style={{fontWeight:500,textAlign:'right',maxWidth:'58%',wordBreak:'break-word'}}>{v||'—'}</span>
                  </div>
                ))}
                <button style={{...s.btn,marginTop:12}} onClick={()=>resend(f)}>
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="#fff" fill="none" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Re-send email
                </button>
                <button style={{...s.btnOut,color:'#c0392b',borderColor:'#f5c6c6'}} onClick={()=>del(f.id)}>
                  <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  Delete field
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('entry')
  const [fields, setFields] = useState([])
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  useEffect(() => { loadFields() }, [])

  async function loadFields() {
    const { data } = await supabase.from('fields').select('*').order('created_at', { ascending: false })
    setFields(data || [])
  }

  function showToast(msg) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  const tabs = [
    { id:'entry', label:'Entry', icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
    { id:'gdu', label:'GDU', icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> },
    { id:'rain', label:'Rain', icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg> },
    { id:'photos', label:'Photos', icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { id:'scout', label:'Scout', icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
    { id:'history', label:'History', icon:<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  ]

  return (
    <>
      <div style={s.topbar}>
        <div style={{ width:38, height:38, borderRadius:8, background:'#fff', padding:3, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg viewBox="0 0 100 100" width="32" height="32"><ellipse cx="50" cy="50" rx="48" ry="48" fill="none" stroke="#2d7a2d" strokeWidth="4"/><path d="M50 15 C30 15 15 30 15 50 C15 70 30 85 50 85 C70 85 85 70 85 50 C85 30 70 15 50 15Z" fill="none"/><text x="50" y="58" textAnchor="middle" fontSize="28" fill="#2d7a2d" fontFamily="serif">🌱</text></svg>
        </div>
        <div><div style={{fontSize:16,fontWeight:600,color:'#fff'}}>Round Prairie Field Tracker</div><div style={{fontSize:12,color:'rgba(255,255,255,0.8)',marginTop:1}}>Pioneer® Hybrid Showcase</div></div>
      </div>

      <nav style={s.nav}>
        {tabs.map(t => (
          <button key={t.id} style={s.nb(tab===t.id)} onClick={() => setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </nav>

      {tab === 'entry'   && <EntryTab   onSaved={loadFields} showToast={showToast} />}
      {tab === 'gdu'     && <GduTab     fields={fields} showToast={showToast} />}
      {tab === 'rain'    && <RainTab    fields={fields} showToast={showToast} />}
      {tab === 'photos'  && <PhotosTab  fields={fields} showToast={showToast} />}
      {tab === 'scout'   && <ScoutTab   fields={fields} showToast={showToast} />}
      {tab === 'history' && <HistoryTab fields={fields} onDeleted={loadFields} showToast={showToast} />}

      <Toast msg={toast} />
    </>
  )
}
