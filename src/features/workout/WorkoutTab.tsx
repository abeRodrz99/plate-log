import { useState } from 'react'
import type { Template } from '../../domain/types'
import { useApp } from '../../state/AppState'
import { ActiveWorkout } from './ActiveWorkout'
import { TemplateEditor } from './TemplateEditor'
import { WorkoutHome } from './WorkoutHome'

export function WorkoutTab() {
  const { active } = useApp()
  // undefined = not editing, null = new template, Template = editing that one
  const [editing, setEditing] = useState<Template | null | undefined>(undefined)

  if (editing !== undefined) return <TemplateEditor template={editing} onDone={() => setEditing(undefined)} />
  if (active) return <ActiveWorkout />
  return <WorkoutHome onEdit={setEditing} />
}
