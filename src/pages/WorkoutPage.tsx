import { Dumbbell, Play } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

export function WorkoutPage() {
  return (
    <>
      <PageHeader title="Entrenar" subtitle="Elige una rutina y empieza" />
      <PageContainer>
        <EmptyState
          icon={Dumbbell}
          title="Sin entrenamiento activo"
          description="Aquí aparecerá el modo de entrenamiento en vivo con tus series y el temporizador de descanso."
        >
          <Button size="lg" className="mt-2 w-full" disabled>
            <Play /> Empezar entrenamiento
          </Button>
        </EmptyState>
      </PageContainer>
    </>
  )
}
