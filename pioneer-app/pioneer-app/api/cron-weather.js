const SUPABASE_URL = 'https://hdleibcspdwcuzogdlmu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbGVpYmNzcGR3Y3V6b2dkbG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODQ3MDUsImV4cCI6MjA5Mzg2MDcwNX0.KTMD1ElmNxpkhgymLOc0NK6xN10JCTQZ85bkzkxLTTs'
const OWM_KEY = 'bd5e378503939ddaee76f12ad7a97608'

function calcGdu(hi, lo) {
  hi = Math.min(Number(hi), 86)
  lo = Math.max(Number(lo), 50)
  return Math.max(0, Math.round(((hi + lo) / 2 - 50) * 10) / 10)
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      ...options.headers,
    },
  })
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export default async function handler(req, res) {
  const today = new Date().toISOString().split('T')[0]
  const fields = await sbFetch('/fields?select=id,op,zip')
  if (!fields || !fields.length) return res.status(200).json({ message: 'No fields' })

  const results = []
  for (const field of fields) {
    if (!field.zip || field.zip.length < 5) continue
    try {
      const existing = await sbFetch(`/gdu_log?field_id=eq.${field.id}&log_date=eq.${today}&select=id`)
      if (existing && existing.length > 0) {
        results.push({ field: field.op, status: 'already logged today' })
        continue
      }
      const w = await (await fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${field.zip},us&units=imperial&appid=${OWM_KEY}`)).json()
      if (!w.main) { results.push({ field: field.op, status: 'weather not found' }); continue }

      const hi = Math.round(w.main.temp_max)
      const lo = Math.round(w.main.temp_min)
      const gdu = calcGdu(hi, lo)
      const rainMm = w.rain ? (w.rain['1h'] || w.rain['3h'] || 0) : 0
      const rainIn = Math.round(rainMm / 25.4 * 100) / 100

      await sbFetch('/gdu_log', {
        method: 'POST',
        body: JSON.stringify({ field_id: field.id, log_date: today, high_temp: hi, low_temp: lo, gdu })
      })

      if (rainIn > 0) {
        const re = await sbFetch(`/rain_log?field_id=eq.${field.id}&log_date=eq.${today}&select=id`)
        if (!re || !re.length) {
          await sbFetch('/rain_log', {
            method: 'POST',
            body: JSON.stringify({ field_id: field.id, log_date: today, amount: rainIn, note: 'Auto-logged by weather cron' })
          })
        }
      }
      results.push({ field: field.op, status: 'logged', hi, lo, gdu, rain: rainIn > 0 ? rainIn + ' in' : 'none' })
    } catch (e) {
      results.push({ field: field.op, status: 'error', error: e.message })
    }
  }
  return res.status(200).json({ date: today, results })
}
