import { describe, expect, it } from 'vitest'
import type { Template, Workout } from '../domain/types'
import { createLocalRepository } from './localRepository'

function fakeStorage(fail = false) {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      if (fail) throw new Error('blocked')
      m.set(k, v)
    },
    removeItem: (k: string) => void m.delete(k),
  }
}

const w = (id: string): Workout => ({ id, name: id, startedAt: 1, notes: '', exercises: [] })
const t = (id: string): Template => ({ id, name: id, updatedAt: 1, exercises: [] })

describe('local repository activities', () => {
  it('saves, updates and deletes activities, and tolerates old data without them', async () => {
    const s = fakeStorage()
    s.setItem('platelog.v1', JSON.stringify({ workouts: [], templates: [] })) // saved before activities existed
    const repo = createLocalRepository(s)
    expect((await repo.loadAll()).activities).toEqual([])
    const a = { id: 'a1', kind: 'Run' as const, startedAt: 1, durationMin: 30, distance: 3, notes: '' }
    await repo.saveActivity(a)
    await repo.saveActivity({ ...a, distance: 4 })
    expect((await repo.loadAll()).activities).toEqual([{ ...a, distance: 4 }])
    await repo.deleteActivity('a1')
    expect((await repo.loadAll()).activities).toEqual([])
  })
})

describe('local repository', () => {
  it('round-trips workouts and templates', async () => {
    const s = fakeStorage()
    const repo = createLocalRepository(s)
    await repo.saveWorkout(w('a'))
    await repo.saveTemplate(t('x'))
    const again = await createLocalRepository(s).loadAll()
    expect(again.workouts.map((x) => x.id)).toEqual(['a'])
    expect(again.templates.map((x) => x.id)).toEqual(['x'])
    expect(repo.kind).toBe('device')
  })

  it('upserts by id and deletes', async () => {
    const repo = createLocalRepository(fakeStorage())
    await repo.saveWorkout(w('a'))
    await repo.saveWorkout({ ...w('a'), name: 'renamed' })
    expect((await repo.loadAll()).workouts).toHaveLength(1)
    expect((await repo.loadAll()).workouts[0].name).toBe('renamed')
    await repo.deleteWorkout('a')
    expect((await repo.loadAll()).workouts).toHaveLength(0)
  })

  it('falls back to memory when storage is blocked', async () => {
    const repo = createLocalRepository(fakeStorage(true))
    expect(repo.kind).toBe('memory')
    await repo.saveWorkout(w('a'))
    expect((await repo.loadAll()).workouts).toHaveLength(1)
  })

  it('survives corrupt stored data', async () => {
    const s = fakeStorage()
    s.setItem('platelog.v1', '{not json')
    const repo = createLocalRepository(s)
    expect((await repo.loadAll()).workouts).toEqual([])
  })
})
