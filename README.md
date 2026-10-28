# Plate Log

A no-frills gym workout tracker: log sets from templates, review history, and watch per-lift
strength trends. No social features. Light and dark, with two layouts: a floating pill tab bar
and single column on phones, and a sidebar + dashboard with a right rail from 960px up.

Preloaded with a two-day runner strength plan (hinge + hamstrings, squat + single-leg).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # typecheck + production build into dist/
```

Stack: Vite, React 19, TypeScript (strict), Vitest. No UI or state library on purpose.

## Structure

```
src/
  domain/      pure logic and types, no React: e1RM, volume, PRs, formatting, exercise library, sample data
  storage/     Repository interface + localStorage and Supabase implementations (the only place data is read or written)
  state/       AppProvider (workouts, templates, active draft, toasts) and hash-based tab navigation
  features/    home/ (dashboard, consistency calendar), workout/ (plans, active session, editor), history/, progress/
  components/  shared UI: Sidebar (desktop), TabBar (phone), TemplateCard, BottomSheet, ExercisePicker, ...
  lib/         spring physics, haptics, two-tap confirm hook
  styles/      tokens.css (colors, type), app.css (components), layout.css (shell + responsive layouts)
```

## Home screen icon

The app icon is `public/icon.svg`. After editing it, run `python3 scripts/make-icons.py` (needs Playwright) to regenerate the PNGs used for iOS (`apple-touch-icon.png`) and the web manifest. On iPhone: Share, then Add to Home Screen.

## Sync across devices (Supabase)

With no configuration the app keeps everything on the device. To share one log between your phone and the web:

1. Create a free project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql` (three tables, each row locked to its owner by row level security).
3. Authentication > Users > Add user: your email and a password (tick auto-confirm). Then Authentication > Sign In / Providers: turn off "Allow new users to sign up" so only you can get in.
4. Project Settings > API: copy the Project URL and the `anon` public key. The anon key is meant to be public; the row level security policies are what protect your data.
5. Vercel > Project > Settings > Environment Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy. For local dev, copy `.env.example` to `.env.local`.
6. Open the app on each device and sign in. The first device that already has workouts offers to upload them.

Devices re-read your account whenever the app returns to the foreground. The in-progress workout draft stays on the device by design.

## Using a different database

Everything the UI knows about storage is the `Repository` interface in `src/storage/repository.ts`:

```ts
loadAll(): Promise<{ workouts: Workout[]; templates: Template[] }>
saveWorkout(w) / deleteWorkout(id) / saveTemplate(t) / deleteTemplate(id)
```

The Supabase version is `src/storage/supabaseRepository.ts`. For another backend (your own API, Firebase, ...) write a third implementation and pick it in `src/App.tsx`. Nothing else changes.
The in-progress workout draft stays on the device by design; it is written on every keystroke.

A relational shape that maps directly onto the types in `src/domain/types.ts`:

| table | columns |
| --- | --- |
| `workouts` | id, user_id, name, started_at, ended_at, duration_sec, notes, template_id, prs (json) |
| `workout_exercises` | id, workout_id, position, name, type (`wr` / `time` / `dist`) |
| `sets` | id, workout_exercise_id, position, weight, reps, done |
| `templates` | id, user_id, name, updated_at, exercises (json) |
| `activities` | id, user_id, kind, started_at, duration_min, distance, notes |

## Notes

- Activities (run, cycle, swim, ...) are a separate, minimal record (`Activity`): date, type, optional minutes and distance. They only feed the consistency calendar, heatmap and week streak. Templates, sets and programs are lifting-only.
- Units are labels only (`UNIT` in `src/domain/format.ts`, default `lb`). Switching does not convert stored numbers.
- Sample history (Progress or History tab) creates 15 clearly marked workouts and can be removed in two taps.
- Estimated 1RM uses the Epley formula. A lift's first session is a baseline, never a PR.
