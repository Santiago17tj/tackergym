import { Smartphone } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackupCard } from '@/components/settings/BackupCard'
import { StorageCard } from '@/components/settings/StorageCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { APP_NAME } from '@/config/app'
import { setSetting, type WeightUnit } from '@/db'
import { useSettings } from '@/hooks/useDb'

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'lb', label: 'Libras (lb)' },
] as const satisfies readonly { value: WeightUnit; label: string }[]

export function SettingsPage() {
  const settings = useSettings()
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  return (
    <>
      <PageHeader title="Ajustes" />
      <PageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Unidad de peso</CardTitle>
            <CardDescription>
              Se aplica en toda la app. Tus registros se convierten automáticamente, no se pierde nada al cambiar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentedControl
              label="Unidad de peso"
              value={settings?.weightUnit ?? 'kg'}
              options={UNIT_OPTIONS}
              onChange={(unit) => setSetting('weightUnit', unit)}
            />
          </CardContent>
        </Card>

        <StorageCard />
        <BackupCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" /> Instalación
            </CardTitle>
            <CardDescription>
              {isStandalone
                ? 'La app está instalada y funciona sin conexión.'
                : 'iPhone: Compartir → "Añadir a pantalla de inicio". Android: menú ⋮ → "Instalar app".'}
            </CardDescription>
          </CardHeader>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          {APP_NAME} v{__APP_VERSION__}
        </p>
      </PageContainer>
    </>
  )
}
