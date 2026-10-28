/**
 * Vercel serverless function: the only code that talks to Upstash Redis.
 * The browser never sees Redis credentials; it sends the sync password as a bearer token.
 *
 * Data: one Redis hash per kind (platelog:workouts, :templates, :activities), field = record id,
 * value = the record as JSON.
 *
 * Kept in one file on purpose: Vercel compiles each /api file on its own, and one file avoids
 * ESM import-extension surprises. `handle` is exported so tests can run it against a fake Redis.
 */

const KINDS = ['workouts', 'templates', 'activities'] as const
type Kind = (typeof KINDS)[number]

const MAX_CHANGES = 500
const MAX_FAILS = 10
const FAIL_WINDOW_SEC = 15 * 60

export interface Env {
  password?: string
  url?: string
  token?: string
}

/** Accepts both the names Vercel's Upstash integration adds (KV_REST_API_*) and Upstash's own. */
export function readEnv(e: Record<string, string | undefined>): Env {
  return {
    password: e.APP_PASSWORD,
    url: (e.KV_REST_API_URL ?? e.UPSTASH_REDIS_REST_URL)?.replace(/\/$/, ''),
    token: e.KV_REST_API_TOKEN ?? e.UPSTASH_REDIS_REST_TOKEN,
  }
}

export interface Input {
  method: string
  authorization?: string
  ip: string
  body: unknown
}
export interface Output {
  status: number
  body: unknown
}

type Cmd = string[]
type Fetch = typeof fetch

async function pipeline(env: Env, cmds: Cmd[], fetchFn: Fetch): Promise<unknown[]> {
  const res = await fetchFn(`${env.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  if (!res.ok) throw new Error(`Redis ${res.status}`)
  const out = (await res.json()) as { result?: unknown; error?: string }[]
  return out.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}

const enc = new TextEncoder()

/** Compare via SHA-256 digests with no early exit, so timing doesn't leak how much matched. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))])
  const x = new Uint8Array(da)
  const y = new Uint8Array(db)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

const hashToRecords = (raw: unknown): unknown[] => {
  const values: unknown[] = Array.isArray(raw) ? raw.filter((_, i) => i % 2 === 1) : raw && typeof raw === 'object' ? Object.values(raw) : []
  return values.map((v) => (typeof v === 'string' ? JSON.parse(v) : v))
}

interface Change {
  kind: Kind
  id: string
  item: { id: string } | null
}

function parseChanges(body: unknown): Change[] | string {
  const list = (body as { changes?: unknown })?.changes
  if (!Array.isArray(list)) return 'Expected a list of changes.'
  if (list.length > MAX_CHANGES) return `At most ${MAX_CHANGES} changes per request.`
  const out: Change[] = []
  for (const c of list as Record<string, unknown>[]) {
    const kind = c?.kind as Kind
    const id = c?.id
    const item = c?.item as { id?: unknown } | null | undefined
    if (!KINDS.includes(kind) || typeof id !== 'string' || !id || id.length > 100) return 'Invalid change.'
    if (item != null && (typeof item !== 'object' || item.id !== id)) return 'Invalid change.'
    out.push({ kind, id, item: item ? (item as { id: string }) : null })
  }
  return out
}

export async function handle(input: Input, env: Env, fetchFn: Fetch = fetch): Promise<Output> {
  const missing: string[] = []
  if (!env.password) missing.push('APP_PASSWORD')
  if (!env.url || !env.token) missing.push('Upstash Redis (KV_REST_API_URL, KV_REST_API_TOKEN)')

  // Status probe used by the app to decide between on-device mode and the sign-in screen.
  if (input.method === 'GET') {
    const touched = Boolean(env.password || env.url || env.token)
    return { status: 200, body: { sync: touched, ready: missing.length === 0, missing } }
  }
  if (input.method !== 'POST') return { status: 405, body: { error: 'Method not allowed.' } }
  if (missing.length) return { status: 503, body: { error: `Sync isn't set up on the server yet. Missing: ${missing.join('; ')}.` } }

  const supplied = /^Bearer (.+)$/.exec(input.authorization ?? '')?.[1] ?? ''
  const failKey = `platelog:fail:${input.ip}`

  try {
    const [count] = await pipeline(env, [['GET', failKey]], fetchFn)
    if (Number(count ?? 0) >= MAX_FAILS) return { status: 429, body: { error: 'Too many wrong passwords. Try again in 15 minutes.' } }

    if (!(await safeEqual(supplied, env.password as string))) {
      await pipeline(env, [['INCR', failKey], ['EXPIRE', failKey, String(FAIL_WINDOW_SEC)]], fetchFn)
      return { status: 401, body: { error: 'Wrong password.' } }
    }

    const op = (input.body as { op?: string } | null)?.op
    if (op === 'login') return { status: 200, body: { ok: true } }

    if (op === 'load') {
      const [w, t, a] = await pipeline(env, KINDS.map((k) => ['HGETALL', `platelog:${k}`]), fetchFn)
      return { status: 200, body: { workouts: hashToRecords(w), templates: hashToRecords(t), activities: hashToRecords(a) } }
    }

    if (op === 'write') {
      const changes = parseChanges(input.body)
      if (typeof changes === 'string') return { status: 400, body: { error: changes } }
      if (changes.length)
        await pipeline(
          env,
          changes.map((c) => (c.item ? ['HSET', `platelog:${c.kind}`, c.id, JSON.stringify(c.item)] : ['HDEL', `platelog:${c.kind}`, c.id])),
          fetchFn,
        )
      return { status: 200, body: { ok: true, applied: changes.length } }
    }

    return { status: 400, body: { error: 'Unknown operation.' } }
  } catch (e) {
    return { status: 502, body: { error: e instanceof Error ? e.message : 'Storage error.' } }
  }
}

/* ---- Vercel adapter (Node runtime): minimal structural types, no @vercel/node dependency ---- */
interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}
interface Res {
  status(code: number): Res
  setHeader(name: string, value: string): void
  json(body: unknown): void
}
declare const process: { env: Record<string, string | undefined> }

export default async function handler(req: Req, res: Res) {
  const h = (name: string) => {
    const v = req.headers[name]
    return Array.isArray(v) ? v[0] : v
  }
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = null
    }
  }
  const out = await handle(
    { method: req.method ?? 'GET', authorization: h('authorization'), ip: (h('x-forwarded-for') ?? 'unknown').split(',')[0].trim(), body },
    readEnv(process.env),
  )
  res.setHeader('Cache-Control', 'no-store')
  res.status(out.status).json(out.body)
}
