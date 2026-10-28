import { describe, expect, it, vi } from 'vitest'
import type { Activity, Workout } from '../domain/types'
import { createRemoteRepository } from './remoteRepository'
import { detectSync, login } from './session'

const w = (id: string): Workout => ({ id, name: id, startedAt: 1, notes: '', exercises: [] })
const a = (id: string): Activity => ({ id, kind: 'Run', startedAt: 2, durationMin: 30, distance: 3, notes: '' })
const res = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response

function setup(respond: (body: { op: string; changes?: unknown[] }) => Response | Promise<Response>) {
  const calls: { op: string; changes?: { kind: string; id: string; item: unknown }[]; auth: string }[] = []
  const fetchFn = vi.fn(async (_u: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string)
    calls.push({ ...body, auth: (init.headers as Record<string, string>).Authorization })
    return respond(body)
  }) as unknown as typeof fetch
  const onUnauthorized = vi.fn()
  const repo = createRemoteRepository({ getToken: () => 'pw', onUnauthorized, fetchFn })
  return { repo, calls, onUnauthorized }
}

describe('remote repository', () => {
  it('loads everything with the password as a bearer token', async () => {
    const { repo, calls } = setup(() => res(200, { workouts: [w('a')], templates: [], activities: [a('x')] }))
    const snap = await repo.loadAll()
    expect(snap.workouts[0].id).toBe('a')
    expect(snap.activities[0].id).toBe('x')
    expect(calls[0]).toMatchObject({ op: 'load', auth: 'Bearer pw' })
    expect(repo.kind).toBe('remote')
  })

  it('batches writes made together into one request, last write per record winning', async () => {
    const { repo, calls } = setup(() => res(200, { ok: true }))
    await Promise.all([repo.saveWorkout(w('1')), repo.saveWorkout(w('2')), repo.saveActivity(a('9')), repo.saveWorkout({ ...w('1'), name: 'edited' }), repo.deleteWorkout('2')])
    expect(calls).toHaveLength(1)
    const ch = calls[0].changes!
    expect(ch).toHaveLength(3)
    expect(ch.find((c) => c.id === '1')!.item).toMatchObject({ name: 'edited' })
    expect(ch.find((c) => c.id === '2')!.item).toBeNull()
  })

  it('splits very large batches', async () => {
    const { repo, calls } = setup(() => res(200, { ok: true }))
    await Promise.all(Array.from({ length: 900 }, (_, i) => repo.saveWorkout(w(`w${i}`))))
    expect(calls.map((c) => c.changes!.length)).toEqual([400, 400, 100])
  })

  it('rejects every waiting save when the server errors', async () => {
    const { repo } = setup(() => res(502, { error: 'Redis 500' }))
    const results = await Promise.allSettled([repo.saveWorkout(w('1')), repo.saveActivity(a('2'))])
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect((results[0] as PromiseRejectedResult).reason.message).toBe('Redis 500')
  })

  it('signs out on 401', async () => {
    const { repo, onUnauthorized } = setup(() => res(401, { error: 'Wrong password.' }))
    await expect(repo.loadAll()).rejects.toThrow('Signed out')
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('explains network failures', async () => {
    const repo = createRemoteRepository({ getToken: () => 'pw', onUnauthorized() {}, fetchFn: (async () => Promise.reject(new TypeError('x'))) as unknown as typeof fetch })
    await expect(repo.loadAll()).rejects.toThrow('offline')
  })
})

describe('sync detection and login', () => {
  const f = (r: Response | Error) => (async () => (r instanceof Error ? Promise.reject(r) : r)) as unknown as typeof fetch
  it('treats the dev server (HTML), 404 and network errors as on-device mode', async () => {
    const html = { ok: true, status: 200, json: async () => Promise.reject(new SyntaxError('not json')) } as unknown as Response
    expect((await detectSync(f(html))).available).toBe(false)
    expect((await detectSync(f(res(404, {})))).available).toBe(false)
    expect((await detectSync(f(new Error('offline')))).available).toBe(false)
  })
  it('reports configured, and partially configured, servers', async () => {
    expect(await detectSync(f(res(200, { sync: true, ready: true, missing: [] })))).toEqual({ available: true, ready: true, missing: [] })
    expect(await detectSync(f(res(200, { sync: true, ready: false, missing: ['APP_PASSWORD'] })))).toEqual({ available: true, ready: false, missing: ['APP_PASSWORD'] })
  })
  it('login returns null on success and the server message on failure', async () => {
    expect(await login('pw', f(res(200, { ok: true })))).toBeNull()
    expect(await login('bad', f(res(401, { error: 'Wrong password.' })))).toBe('Wrong password.')
    expect(await login('x', f(new Error('down')))).toContain('reach the server')
  })
})
