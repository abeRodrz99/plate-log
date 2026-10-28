import { useApp, type WorkoutSource } from '../state/AppState'
import { useNav } from '../state/Nav'

/** Start a workout from anywhere and land on the logging screen. */
export function useStart() {
  const { startWorkout, active } = useApp()
  const { go } = useNav()
  return (source?: WorkoutSource) => {
    if (!active) startWorkout(source)
    go('workout')
  }
}
