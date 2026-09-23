import { Smartphone, Timer } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AccentCard } from '@/components/settings/AccentCard'
import { ProfileCard, RemindersCard, ReplayWelcomeButton } from '@/components/settings/ProfileCard'
import { BackupCard } from '@/components/settings/BackupCard'
import { StorageCard } from '@/components/settings/StorageCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { SwitchRow } from '@/components/ui/switch'
import { APP_NAME } from '@/config/app'
import { REST_PRESETS, setSetting, type WeightUnit } from '@/db'
import { formatRest } from '@/lib/format'
import { useSettings } from '@/hooks/useDb'

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'lb', label: 'Libras (lb)' },
] as const satisfies readonly { value: WeightUnit; label: string }[]

const REST_OPTIONS = [...REST_PRESETS, 180].map((seconds) => ({ value: String(seconds), label: formatRest(seconds) }))

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
        {settings && <ProfileCard settings={settings} />}
        {settings && <RemindersCard settings={settings} />}
        <AccentCard value={settings?.accentColor ?? '#a3e635'} />

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-5 text-primary" /> Descanso
            </CardTitle>
            <CardDescription>
              Tiempo por defecto entre series. Cada ejercicio de una rutina puede tener el suyo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <SegmentedControl
              label="Descanso por defecto"
              value={String(settings?.defaultRestSeconds ?? 90)}
              options={REST_OPTIONS}
              onChange={(value) => setSetting('defaultRestSeconds', Number(value))}
            />
            <div className="divide-y">
              <SwitchRow
                label="Iniciar al completar una serie"
                description="El cronómetro arranca solo al marcar ✓"
                checked={settings?.autoStartRest ?? true}
                onChange={(v) => setSetting('autoStartRest', v)}
              />
              <SwitchRow
                label="Sonido al terminar"
                checked={settings?.restSound ?? true}
                onChange={(v) => setSetting('restSound', v)}
              />
              <SwitchRow
                label="Vibración al terminar"
                description="Solo Android: iOS no permite vibrar desde la web"
                checked={settings?.restVibration ?? true}
                onChange={(v) => setSetting('restVibration', v)}
              />
            </div>
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

        <ReplayWelcomeButton />

        <p className="text-center text-xs text-muted-foreground">
          {APP_NAME} v{__APP_VERSION__}
        </p>
      </PageContainer>
    </>
  )
}
