import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Activity, Template, Workout } from '../domain/types'
import { createSupabaseRepository } from './supabaseRepository'

type Row = { user_id: string; id: string; data: unknown } & Record<string, unknown>

/** Just enough of the Supabase query builder for the repository's calls. */
function fakeClient(opts: { failOn?: string } = {}) {
  const tables = new Map<string, Row[]>()
  const rows = (t: string) => tables.get(t) ?? (tables.set(t, []), tables.get(t) as Row[])
  const client = {
    from(table: string) {
      const fail = opts.failOn === table ? { message: 'boom' } : null
      return {
        select: () => ({
          order: () => ({
            range: async (a: number, b: number) =>
              fail ? { data: null, error: fail } : { data: [...rows(table)].sort((x, y) => x.id.localeCompare(y.id)).slice(a, b + 1), error: null },
          }),
        }),
        upsert: async (row: Row, o: { onConflict: string }) => {
          expect(o.onConflict).toBe('user_id,id')
          if (fail) return { error: fail }
          const list = rows(table)
          const i = list.findIndex((r) => r.id === row.id && r.user_id === row.user_id)
          if (i < 0) list.push(row)
          else list[i] = row
          return { error: null }
        },
        delete: () => ({
          eq: async (_col: string, id: string) => {
            tables.set(table, rows(table).filter((r) => r.id !== id))
            return { error: fail }
          },
        }),
      }
    },
  }
  return { client: client as unknown as SupabaseClient, rows }
}

const w = (id: string): Workout => ({ id, name: id, startedAt: 5, notes: '', exercises: [] })
const t = (id: string): Template => ({ id, name: id, updatedAt: 6, exercises: [] })
const a = (id: string): Activity => ({ id, kind: 'Run', startedAt: 7, durationMin: 30, distance: 3, notes: '' })

describe('supabase repository', () => {
  it('round-trips workouts, templates and activities, tagging rows with the user', async () => {
    const { client, rows } = fakeClient()
    const repo = createSupabaseRepository(client, 'u1')
    await repo.saveWorkout(w('w1'))
    await repo.saveWorkout({ ...w('w1'), name: 'renamed' }) // upsert, not duplicate
    await repo.saveTemplate(t('t1'))
    await repo.saveActivity(a('a1'))
    expect(rows('workouts')).toHaveLength(1)
    expect(rows('workouts')[0]).toMatchObject({ user_id: 'u1', started_at: 5 })
    const snap = await repo.loadAll()
    expect(snap.workouts.map((x) => x.name)).toEqual(['renamed'])
    expect(snap.templates.map((x) => x.id)).toEqual(['t1'])
    expect(snap.activities.map((x) => x.id)).toEqual(['a1'])
    expect(repo.kind).toBe('remote')
  })

  it('deletes records', async () => {
    const { client } = fakeClient()
    const repo = createSupabaseRepository(client, 'u1')
    await repo.saveWorkout(w('w1'))
    await repo.saveActivity(a('a1'))
    await repo.deleteWorkout('w1')
    await repo.deleteActivity('a1')
    const snap = await repo.loadAll()
    expect(snap.workouts).toEqual([])
    expect(snap.activities).toEqual([])
  })

  it('reads every page, not just the first 1000 rows', async () => {
    const { client } = fakeClient()
    const repo = createSupabaseRepository(client, 'u1')
    for (let i = 0; i < 1203; i++) await repo.saveWorkout(w(`w${String(i).padStart(4, '0')}`))
    expect((await repo.loadAll()).workouts).toHaveLength(1203)
  })

  it('surfaces database errors so the UI can toast them', async () => {
    const { client } = fakeClient({ failOn: 'workouts' })
    const repo = createSupabaseRepository(client, 'u1')
    await expect(repo.saveWorkout(w('x'))).rejects.toThrow('boom')
    await expect(repo.loadAll()).rejects.toThrow('boom')
  })
})
