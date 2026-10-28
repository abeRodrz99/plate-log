import type { SupabaseClient } from '@supabase/supabase-js'
import type { Activity, Template, Workout } from '../domain/types'
import type { Repository, Snapshot } from './repository'

const PAGE = 1000

/**
 * Repository backed by Supabase Postgres. Every record is stored as JSON in `data`
 * (see supabase/schema.sql); row level security scopes rows to the signed-in user.
 */
export function createSupabaseRepository(client: SupabaseClient, userId: string): Repository {
  const all = async <T>(table: string): Promise<T[]> => {
    const out: T[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client
        .from(table)
        .select('data')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw new Error(error.message)
      out.push(...(data ?? []).map((r: { data: T }) => r.data))
      if (!data || data.length < PAGE) return out
    }
  }

  const upsert = async (table: string, row: Record<string, unknown>) => {
    const { error } = await client.from(table).upsert({ user_id: userId, ...row }, { onConflict: 'user_id,id' })
    if (error) throw new Error(error.message)
  }

  const remove = async (table: string, id: string) => {
    const { error } = await client.from(table).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  return {
    kind: 'remote',
    async loadAll(): Promise<Snapshot> {
      const [workouts, templates, activities] = await Promise.all([
        all<Workout>('workouts'),
        all<Template>('templates'),
        all<Activity>('activities'),
      ])
      return { workouts, templates, activities }
    },
    saveWorkout: (w) => upsert('workouts', { id: w.id, started_at: w.startedAt, data: w }),
    deleteWorkout: (id) => remove('workouts', id),
    saveTemplate: (t) => upsert('templates', { id: t.id, updated_at: t.updatedAt, data: t }),
    deleteTemplate: (id) => remove('templates', id),
    saveActivity: (a) => upsert('activities', { id: a.id, started_at: a.startedAt, data: a }),
    deleteActivity: (id) => remove('activities', id),
  }
}
