import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { uid } from '../domain/format'
import { STARTER_TEMPLATES, exercisePool } from '../domain/library'
import { computePRs } from '../domain/math'
import { buildSampleActivities, buildSampleHistory } from '../domain/sample'
import type { Activity, SetEntry, Template, TemplateExercise, Workout } from '../domain/types'
import { buzz } from '../lib/spring'
import { draftStore, type Repository, type Snapshot } from '../storage'

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
  activities: Activity[]
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
  saveActivity(a: Activity): void
  deleteActivity(id: string): void
  loadSample(): boolean
  removeSample(): void
  exercisePool: ReturnType<typeof exercisePool>
  /** Set when the first load failed (e.g. offline); `reload` retries. */
  loadError: string | null
  reload(): void
  /** Data found on this device that isn't in the account yet. */
  importable: { workouts: number; templates: number; activities: number } | null
  importLocal(): void
  dismissImport(): void
}

const IMPORT_DISMISSED = 'platelog.import.dismissed'
type ProviderImport = { workouts: number; templates: number; activities: number }

const Ctx = createContext<AppContext | null>(null)

export const blankSet = (): SetEntry => ({ w: null, r: null, done: false })

interface ProviderProps {
  children: ReactNode
  repo: Repository
  /** When the main repo is a cloud account, the on-device repo to offer uploading from. */
  importFrom?: Repository
}

export function AppProvider({ children, repo, importFrom }: ProviderProps) {
  const [ready, setReady] = useState(false)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [active, setActive] = useState<Workout | null>(() => draftStore.load<Workout>())
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [importable, setImportable] = useState<ProviderImport | null>(null)
  const localSnap = useRef<Snapshot | null>(null)
  const pending = useRef(0)
  const toastTimer = useRef<number | undefined>(undefined)

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200)
  }, [])

  const persist = useCallback(
    (p: Promise<unknown>) => {
      pending.current++
      p.catch((e: unknown) => toast(`Could not save. ${e instanceof Error ? e.message : 'Try again.'}`)).finally(() => {
        pending.current--
      })
    },
    [toast],
  )

  useEffect(() => {
    let cancelled = false
    repo
      .loadAll()
      .then(async (d) => {
        if (cancelled) return
        setWorkouts(d.workouts)
        setTemplates(d.templates)
        setActivities(d.activities)
        setLoadError(null)
        setReady(true)
        // First sign-in on a device that already holds data: offer to upload it.
        const empty = !d.workouts.length && !d.templates.length && !d.activities.length
        if (empty && importFrom && importFrom !== repo && localStorage.getItem(IMPORT_DISMISSED) !== '1') {
          const local = await importFrom.loadAll()
          if (!cancelled && (local.workouts.length || local.templates.length || local.activities.length)) {
            localSnap.current = local
            setImportable({ workouts: local.workouts.length, templates: local.templates.length, activities: local.activities.length })
          }
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load your data.')
      })
    return () => {
      cancelled = true
    }
  }, [repo, importFrom, reloadTick])

  // Keep phone and web in step: re-read the account whenever the app comes back into view.
  useEffect(() => {
    if (repo.kind !== 'remote') return
    const refresh = () => {
      if (document.visibilityState !== 'visible' || pending.current > 0) return
      repo
        .loadAll()
        .then((d) => {
          if (pending.current > 0) return // a save started meanwhile; its result is newer than this read
          setWorkouts(d.workouts)
          setTemplates(d.templates)
          setActivities(d.activities)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [repo])

  const importLocal = () => {
    const snap = localSnap.current
    if (!snap) return
    localSnap.current = null
    setImportable(null)
    setWorkouts((prev) => [...prev, ...snap.workouts])
    setTemplates((prev) => [...prev, ...snap.templates])
    setActivities((prev) => [...prev, ...snap.activities])
    toast('Uploading this device’s data to your account…')
    persist(
      (async () => {
        for (const w of snap.workouts) await repo.saveWorkout(w)
        for (const t of snap.templates) await repo.saveTemplate(t)
        for (const a of snap.activities) await repo.saveActivity(a)
        toast('Upload complete. Your phone and web now share this data.')
      })(),
    )
  }

  const dismissImport = () => {
    try {
      localStorage.setItem(IMPORT_DISMISSED, '1')
    } catch {
      /* ignore */
    }
    setImportable(null)
  }

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

  const saveActivity = (a: Activity) => {
    setActivities((prev) => (prev.some((x) => x.id === a.id) ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a]))
    persist(repo.saveActivity(a))
  }

  const deleteActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
    persist(repo.deleteActivity(id))
  }

  const loadSample = () => {
    if (workouts.some((w) => w.sample)) return false
    const list = buildSampleHistory()
    const acts = buildSampleActivities()
    setWorkouts((prev) => [...prev, ...list])
    setActivities((prev) => [...prev, ...acts])
    toast('Sample data added. Remove it anytime from History.')
    // One write at a time keeps remote backends happy.
    persist(
      (async () => {
        for (const w of list) await repo.saveWorkout(w)
        for (const a of acts) await repo.saveActivity(a)
      })(),
    )
    return true
  }

  const removeSample = () => {
    const ids = workouts.filter((w) => w.sample).map((w) => w.id)
    const actIds = activities.filter((a) => a.sample).map((a) => a.id)
    setWorkouts((prev) => prev.filter((w) => !w.sample))
    setActivities((prev) => prev.filter((a) => !a.sample))
    toast('Sample data removed.')
    persist(
      (async () => {
        for (const id of ids) await repo.deleteWorkout(id)
        for (const id of actIds) await repo.deleteActivity(id)
      })(),
    )
  }

  const pool = useMemo(() => exercisePool(workouts, templates), [workouts, templates])

  const value: AppContext = {
    ready,
    storageKind: repo.kind,
    workouts,
    templates,
    activities,
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
    saveActivity,
    deleteActivity,
    loadSample,
    removeSample,
    exercisePool: pool,
    loadError,
    reload: () => setReloadTick((n) => n + 1),
    importable,
    importLocal,
    dismissImport,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppContext {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}
