import { HardDrive, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getStorageStatus, type StorageStatus } from '@/db/persist'
import { useDataCounts } from '@/hooks/useDb'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function StorageCard() {
  const counts = useDataCounts()
  const [storage, setStorage] = useState<StorageStatus | null>(null)

  useEffect(() => {
    getStorageStatus().then(setStorage)
  }, [counts])

  const stats = [
    { label: 'Rutinas', value: counts?.routines },
    { label: 'Ejercicios', value: counts?.exercises },
    { label: 'Entrenos', value: counts?.workouts },
    { label: 'Series', value: counts?.sets },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-5 text-primary" /> Tus datos
        </CardTitle>
        <CardDescription>Todo se guarda solo en este dispositivo. Nada sale a internet.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-4 gap-2 text-center">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse rounded-lg bg-secondary px-1 py-2">
              <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
              <dd className="tabular text-xl font-bold">{s.value ?? '–'}</dd>
            </div>
          ))}
        </dl>
        {storage && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            {storage.persisted ? (
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
            )}
            <span>
              {storage.persisted
                ? 'Almacenamiento persistente: el navegador no borrará tus datos automáticamente.'
                : 'El navegador podría liberar espacio borrando datos. Instala la app y exporta copias de seguridad.'}
              {storage.usageBytes !== null && ` Usado: ${formatBytes(storage.usageBytes)}.`}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
