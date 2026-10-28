import { describe, expect, it } from 'vitest'
import { handle, readEnv, type Env } from './sync'

/** In-memory stand-in for Upstash's REST /pipeline endpoint (GET, INCR, EXPIRE, HSET, HDEL, HGETALL). */
function fakeUpstash() {
  const hashes = new Map<string, Map<string, string>>()
  const strings = new Map<string, number>()
  const calls: string[][] = []
  const fetchFn = (async (_url: string, init: { body: string }) => {
    const cmds = JSON.parse(init.body) as string[][]
    const result = cmds.map(([c, k, ...rest]) => {
      calls.push([c, k])
      if (c === 'GET') return { result: strings.has(k) ? String(strings.get(k)) : null }
      if (c === 'INCR') return { result: strings.set(k, (strings.get(k) ?? 0) + 1).get(k) }
      if (c === 'EXPIRE') return { result: 1 }
      if (c === 'HSET') {
        const h = hashes.get(k) ?? hashes.set(k, new Map()).get(k)!
        for (let i = 0; i < rest.length; i += 2) h.set(rest[i], rest[i + 1])
        return { result: rest.length / 2 }
      }
      if (c === 'HDEL') return { result: hashes.get(k)?.delete(rest[0]) ? 1 : 0 }
      if (c === 'HGETALL') return { result: [...(hashes.get(k) ?? new Map())].flat() }
      return { error: `ERR unknown command ${c}` }
    })
    return { ok: true, status: 200, json: async () => result }
  }) as unknown as typeof fetch
  return { fetchFn, hashes, strings, calls }
}

const env: Env = { password: 'correct horse battery', url: 'https://r.example', token: 't' }
const call = (f: typeof fetch, body: unknown, pw: string | undefined = env.password, e = env, ip = '1.1.1.1', method = 'POST') =>
  handle({ method, authorization: pw ? `Bearer ${pw}` : undefined, ip, body }, e, f)

describe('sync api', () => {
  it('reads Vercel and Upstash env names', () => {
    expect(readEnv({ APP_PASSWORD: 'p', KV_REST_API_URL: 'https://a/', KV_REST_API_TOKEN: 't' })).toEqual({ password: 'p', url: 'https://a', token: 't' })
    expect(readEnv({ UPSTASH_REDIS_REST_URL: 'https://b', UPSTASH_REDIS_REST_TOKEN: 'u' })).toMatchObject({ url: 'https://b', token: 'u' })
  })

  it('status probe: not configured, partially configured, ready', async () => {
    const { fetchFn } = fakeUpstash()
    expect((await call(fetchFn, null, '', {}, '1', 'GET')).body).toMatchObject({ sync: false, ready: false })
    const partial = (await call(fetchFn, null, '', { url: 'x', token: 'y' }, '1', 'GET')).body as { sync: boolean; ready: boolean; missing: string[] }
    expect(partial).toMatchObject({ sync: true, ready: false })
    expect(partial.missing).toEqual(['APP_PASSWORD'])
    expect((await call(fetchFn, null, '', env, '1', 'GET')).body).toMatchObject({ sync: true, ready: true, missing: [] })
  })

  it('refuses writes until fully configured', async () => {
    const r = await call(fakeUpstash().fetchFn, { op: 'load' }, 'x', { url: 'x', token: 'y' })
    expect(r.status).toBe(503)
    expect(JSON.stringify(r.body)).toContain('APP_PASSWORD')
  })

  it('rejects a wrong or missing password and touches no data', async () => {
    const u = fakeUpstash()
    expect((await call(u.fetchFn, { op: 'load' }, 'nope')).status).toBe(401)
    expect((await call(u.fetchFn, { op: 'load' }, '')).status).toBe(401)
    expect(u.calls.some((c) => c[0] === 'HGETALL')).toBe(false)
  })

  it('logs in, writes, loads and deletes records', async () => {
    const u = fakeUpstash()
    expect((await call(u.fetchFn, { op: 'login' })).status).toBe(200)
    const w = { id: 'w1', name: 'Squat day' }
    const a = { id: 'a1', kind: 'Run' }
    const r = await call(u.fetchFn, { op: 'write', changes: [{ kind: 'workouts', id: 'w1', item: w }, { kind: 'activities', id: 'a1', item: a }] })
    expect(r.body).toEqual({ ok: true, applied: 2 })
    expect((await call(u.fetchFn, { op: 'load' })).body).toEqual({ workouts: [w], templates: [], activities: [a] })
    await call(u.fetchFn, { op: 'write', changes: [{ kind: 'workouts', id: 'w1', item: null }] })
    expect(((await call(u.fetchFn, { op: 'load' })).body as { workouts: unknown[] }).workouts).toEqual([])
  })

  it('validates changes', async () => {
    const u = fakeUpstash()
    for (const changes of [[{ kind: 'users', id: 'x', item: null }], [{ kind: 'workouts', id: 'x', item: { id: 'other' } }], [{ kind: 'workouts', id: '', item: null }], 'nope']) {
      expect((await call(u.fetchFn, { op: 'write', changes })).status).toBe(400)
    }
    expect((await call(u.fetchFn, { op: 'write', changes: Array.from({ length: 501 }, (_, i) => ({ kind: 'workouts', id: `w${i}`, item: null })) })).status).toBe(400)
    expect((await call(u.fetchFn, { op: 'bogus' })).status).toBe(400)
  })

  it('locks out an address after repeated wrong passwords, even for the right one', async () => {
    const u = fakeUpstash()
    for (let i = 0; i < 10; i++) expect((await call(u.fetchFn, { op: 'load' }, 'bad', env, '9.9.9.9')).status).toBe(401)
    expect((await call(u.fetchFn, { op: 'load' }, env.password, env, '9.9.9.9')).status).toBe(429)
    expect((await call(u.fetchFn, { op: 'load' }, env.password, env, '8.8.8.8')).status).toBe(200) // other addresses unaffected
  })

  it('reports storage failures as 502', async () => {
    const down = (async () => ({ ok: false, status: 500, json: async () => [] })) as unknown as typeof fetch
    expect((await call(down, { op: 'load' })).status).toBe(502)
  })
})
