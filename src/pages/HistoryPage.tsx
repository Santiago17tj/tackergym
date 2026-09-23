import { History } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export function HistoryPage() {
  return (
    <>
      <PageHeader title="Historial" />
      <PageContainer>
        <EmptyState
          icon={History}
          title="Sin entrenamientos todavía"
          description="Tus entrenamientos finalizados, récords y volumen total aparecerán aquí."
        />
      </PageContainer>
    </>
  )
}
