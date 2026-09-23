import { LiveWorkout } from '@/components/workout/LiveWorkout'
import { StartWorkout } from '@/components/workout/StartWorkout'
import { useActiveWorkout, useSettings } from '@/hooks/useDb'

export function WorkoutPage() {
  const workout = useActiveWorkout()
  const settings = useSettings()

  // Cargando IndexedDB (unos milisegundos): no se pinta nada para evitar parpadeos.
  if (workout === undefined || settings === undefined) return null

  return workout ? <LiveWorkout workout={workout} settings={settings} /> : <StartWorkout settings={settings} />
}
