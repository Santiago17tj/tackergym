import { HardDrive, Smartphone } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
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
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="size-5 text-primary" /> Tus datos
            </CardTitle>
            <CardDescription>
              Todo se guarda solo en este dispositivo. Pronto podrás exportar e importar una copia de seguridad
              (.json).
            </CardDescription>
          </CardHeader>
        </Card>

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

        <p className="text-center text-xs text-muted-foreground">TackerGym v{__APP_VERSION__}</p>
      </PageContainer>
    </>
  )
}
