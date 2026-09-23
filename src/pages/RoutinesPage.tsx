import { ListChecks } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function RoutinesPage() {
  return (
    <>
      <PageHeader title="Rutinas" />
      <PageContainer>
        <EmptyState
          icon={ListChecks}
          title="Aún no hay rutinas"
          description="Crea rutinas como Push, Pull o Legs y añade tus ejercicios."
        />
      </PageContainer>
    </>
  )
}
