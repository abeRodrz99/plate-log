import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { uid } from '../domain/format'
import { STARTER_TEMPLATES, exercisePool } from '../domain/library'
import { computePRs } from '../domain/math'
import { buildSampleHistory } from '../domain/sample'
import type { SetEntry, Template, TemplateExercise, Workout } from '../domain/types'
import { buzz } from '../lib/spring'
import { createRepository, draftStore, type Repository } from '../storage'

export interface WorkoutSource {
  id?: string | null
  name: string
  exercises: TemplateExercise[]
}

interface AppContext {
  ready: boolean
  storageKind: Repository['kind']
  workouts: Workout[]
  templates: Template[]
  active: Workout | null
  toastMsg: string | null
  toast(msg: string): void
  startWorkout(source?: WorkoutSource): void
  updateActive(mutate: (draft: Workout) => void): void
  discardActive(): void
  finishActive(): Workout | null
  saveTemplate(t: Template): void
  deleteTemplate(id: string): void
  addStarter(index: number): void
  templateFromWorkout(w: Workout): void
  deleteWorkout(id: string): void
  loadSample(): boolean
  removeSample(): void
  exercisePool: ReturnType<typeof exercisePool>
}

const Ctx = createContext<AppContext | null>(null)

export const blankSet = (): SetEntry => ({ w: null, r: null, done: false })

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createRepository(), [])
  const [ready, setReady] = useState(false)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [active, setActive] = useState<Workout | null>(() => draftStore.load<Workout>())
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200)
  }, [])

  const persist = useCallback(
    (p: Promise<unknown>) => {
      p.catch((e: unknown) => toast(`Could not save. ${e instanceof Error ? e.message : 'Try again.'}`))
    },
    [toast],
  )

  useEffect(() => {
    let cancelled = false
    repo.loadAll().then((d) => {
      if (cancelled) return
      setWorkouts(d.workouts)
      setTemplates(d.templates)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [repo])

  // The draft is saved shortly after each edit so a refresh never loses a workout.
  useEffect(() => {
    const t = window.setTimeout(() => draftStore.save(active), 250)
    return () => window.clearTimeout(t)
  }, [active])

  const startWorkout: AppContext['startWorkout'] = (source) => {
    setActive({
      id: uid('w_'),
      name: source?.name ?? 'Workout',
      startedAt: Date.now(),
      notes: '',
      tid: source?.id ?? null,
      exercises: (source?.exercises ?? []).map((x) => ({
        id: uid('e_'),
        name: x.name,
        type: x.type,
        target: x.reps,
        tsets: x.sets,
        sets: Array.from({ length: x.sets }, blankSet),
      })),
    })
  }

  const updateActive: AppContext['updateActive'] = (mutate) =>
    setActive((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      mutate(next)
      return next
    })

  const discardActive = () => {
    setActive(null)
    draftStore.save(null)
  }

  const finishActive: AppContext['finishActive'] = () => {
    if (!active) return null
    const w = structuredClone(active)
    w.exercises = w.exercises
      .map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        sets: e.sets.filter((s) => (s.r ?? 0) > 0).map((s) => ({ w: s.w, r: s.r, done: true })),
      }))
      .filter((e) => e.sets.length > 0)
    if (!w.exercises.length) {
      toast('Log at least one set with reps first.')
      return null
    }
    w.endedAt = Date.now()
    w.durationSec = Math.round((w.endedAt - w.startedAt) / 1000)
    w.name = w.name.trim() || 'Workout'
    w.prs = computePRs(workouts, w)
    buzz(14)
    setWorkouts((prev) => [...prev, w])
    setActive(null)
    draftStore.save(null)
    toast(w.prs.length ? `${w.prs.length === 1 ? '1 new PR' : `${w.prs.length} new PRs`}. Workout saved.` : 'Workout saved.')
    persist(repo.saveWorkout(w))
    return w
  }

  const saveTemplate = (t: Template) => {
    setTemplates((prev) => {
      const i = prev.findIndex((x) => x.id === t.id)
      return i < 0 ? [...prev, t] : prev.map((x) => (x.id === t.id ? t : x))
    })
    persist(repo.saveTemplate(t))
  }

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    persist(repo.deleteTemplate(id))
  }

  const addStarter = (index: number) => {
    const s = STARTER_TEMPLATES[index]
    const pool = exercisePool(workouts, templates)
    saveTemplate({
      id: uid('t_'),
      name: s.name,
      updatedAt: Date.now(),
      exercises: s.exercises.map(([name, sets, reps]) => ({ name, type: pool.get(name) ?? 'wr', sets, reps })),
    })
  }

  const templateFromWorkout = (w: Workout) => {
    saveTemplate({
      id: uid('t_'),
      name: w.name,
      updatedAt: Date.now(),
      exercises: w.exercises.map((e) => ({ name: e.name, type: e.type, sets: e.sets.length, reps: '' })),
    })
    toast('Saved as a template on the Workout tab.')
  }

  const deleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    persist(repo.deleteWorkout(id))
  }

  const loadSample = () => {
    if (workouts.some((w) => w.sample)) return false
    const list = buildSampleHistory()
    setWorkouts((prev) => [...prev, ...list])
    toast(`Loaded ${list.length} sample workouts. Remove them anytime from History.`)
    // One write at a time keeps remote backends happy.
    persist(
      (async () => {
        for (const w of list) await repo.saveWorkout(w)
      })(),
    )
    return true
  }

  const removeSample = () => {
    const ids = workouts.filter((w) => w.sample).map((w) => w.id)
    setWorkouts((prev) => prev.filter((w) => !w.sample))
    toast('Sample data removed.')
    persist(
      (async () => {
        for (const id of ids) await repo.deleteWorkout(id)
      })(),
    )
  }

  const pool = useMemo(() => exercisePool(workouts, templates), [workouts, templates])

  const value: AppContext = {
    ready,
    storageKind: repo.kind,
    workouts,
    templates,
    active,
    toastMsg,
    toast,
    startWorkout,
    updateActive,
    discardActive,
    finishActive,
    saveTemplate,
    deleteTemplate,
    addStarter,
    templateFromWorkout,
    deleteWorkout,
    loadSample,
    removeSample,
    exercisePool: pool,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppContext {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}
