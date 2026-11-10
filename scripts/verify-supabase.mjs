#!/usr/bin/env node
/**
 * FOCUSFORGE Supabase readiness check.
 *
 * Reads .env (or the process environment), then verifies:
 *   1. the URL is a real Supabase project URL,
 *   2. the key is an anon key (never a service_role key),
 *   3. the Auth service answers,
 *   4. every table from the migration exists,
 *   5. anonymous reads are blocked by RLS (no rows leak).
 *
 * Secrets are never printed. Exit code 1 means something must be fixed.
 */
import { existsSync, readFileSync } from 'node:fs'

function loadEnv() {
  const env = {}
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (match && !line.trim().startsWith('#')) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...process.env }
}

const TABLES = [
  'profiles', 'user_preferences', 'subjects', 'units', 'topics', 'study_tasks',
  'timetable_entries', 'focus_sessions', 'session_interruptions', 'daily_goals',
  'exam_schedule', 'study_challenges', 'daily_challenge_progress', 'notifications',
  'achievements', 'user_achievements', 'distraction_logs', 'study_resources',
]

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
const key = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const errors = []

const say = (symbol, label, detail = '') => console.log(`${symbol} ${label}${detail ? ` — ${detail}` : ''}`)

if (!url || !key) {
  say('✗', 'Credentials missing', 'fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  errors.push(`URL does not look like https://<project-ref>.supabase.co (got ${url.replace(/\/\/.*@/, '//')})`)
} else {
  say('✓', 'Project URL', url)
}

function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

// Supabase now issues two key formats: legacy JWTs and the newer
// sb_publishable_ / sb_secret_ keys. Only publishable/anon keys may ship
// in a VITE_ variable.
if (key.startsWith('sb_secret_')) {
  errors.push('This is a secret key. Never put it in a VITE_ variable or the browser; use the publishable/anon key.')
} else if (key.startsWith('sb_publishable_')) {
  say('✓', 'Key type', 'publishable (safe for the browser)')
} else {
  const payload = decodeJwtPayload(key)
  if (!payload) {
    errors.push('The key is neither a publishable key nor an anon JWT. Copy the publishable (or anon public) key from Project Settings → API.')
  } else if (payload.role === 'service_role') {
    errors.push('This is a service_role key. Never put it in a VITE_ variable or the browser; use the anon key.')
  } else if (payload.role !== 'anon') {
    errors.push(`Expected an anon key, got role "${payload.role}".`)
  } else {
    say('✓', 'Key type', 'anon (safe for the browser)')
    if (payload.ref && !url.includes(payload.ref)) errors.push('The key belongs to a different project than the URL.')
  }
}

const headers = { apikey: key, Authorization: `Bearer ${key}` }

async function checkAuth() {
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers })
    if (res.ok) say('✓', 'Auth service', `HTTP ${res.status}`)
    else errors.push(`Auth health returned HTTP ${res.status}`)
  } catch (error) {
    errors.push(`Cannot reach the project: ${error.message}`)
  }
}

async function checkTables() {
  if (errors.length) return
  let missing = 0
  let leaked = 0
  for (const table of TABLES) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers })
      const body = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => null) : null
      if (res.status === 404 || body?.code === 'PGRST205') {
        missing += 1
        console.log(`✗ ${table} — table missing (run supabase/migrations/0001_init.sql)`)
      } else if (res.ok && Array.isArray(body) && body.length > 0) {
        leaked += 1
        console.log(`✗ ${table} — anonymous read returned rows (RLS is not protecting this table)`)
      }
    } catch (error) {
      missing += 1
      console.log(`✗ ${table} — request failed: ${error.message}`)
    }
  }
  if (!missing) say('✓', 'Schema', `all ${TABLES.length} tables present`)
  if (!leaked) say('✓', 'RLS', 'anonymous requests return no rows')
  if (missing) errors.push(`${missing} table(s) missing or unreachable`)
  if (leaked) errors.push(`${leaked} table(s) leak rows to anonymous users`)
}

await checkAuth()
await checkTables()

if (errors.length) {
  console.log('\nBlocking issues:')
  for (const error of errors) console.log(` - ${error}`)
  process.exitCode = 1
} else {
  console.log('\nSupabase is ready. Restart `npm run dev` and sign in with a real account.')
}
