import { Download, Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import {
  BackupError,
  exportBackup,
  readBackupFile,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from '@/db/backup'
import { cn } from '@/lib/utils'

type Status = { kind: 'success' | 'error'; message: string } | null

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function BackupCard() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)

  async function handleExport() {
    setBusy(true)
    setStatus(null)
    try {
      const result = await exportBackup()
      if (result !== 'cancelled') setStatus({ kind: 'success', message: 'Copia de seguridad creada.' })
    } catch (error) {
      console.error(error)
      setStatus({ kind: 'error', message: 'No se pudo crear la copia de seguridad.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setStatus(null)
    try {
      setPending(await readBackupFile(file))
    } catch (error) {
      const message = error instanceof BackupError ? error.message : 'No se pudo leer el archivo.'
      setStatus({ kind: 'error', message })
    } finally {
      // Permite volver a elegir el mismo archivo.
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function confirmRestore() {
    if (!pending) return
    setBusy(true)
    try {
      await restoreBackup(pending)
      setStatus({ kind: 'success', message: 'Datos restaurados correctamente.' })
    } catch (error) {
      console.error(error)
      setStatus({ kind: 'error', message: 'La restauración falló. Tus datos actuales no se han modificado.' })
    } finally {
      setPending(null)
      setBusy(false)
    }
  }

  const summary = pending && summarizeBackup(pending)
  const exportedAt = pending?.exportedAt ? new Date(pending.exportedAt) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copia de seguridad</CardTitle>
        <CardDescription>
          Guarda un archivo .json con todos tus datos. Úsalo para cambiar de teléfono o si borras los datos del
          navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button onClick={handleExport} disabled={busy}>
          {busy && !pending ? <Loader2 className="animate-spin" /> : <Download />} Exportar datos
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          <Upload /> Restaurar desde archivo
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {status && (
          <p
            role={status.kind === 'error' ? 'alert' : 'status'}
            className={cn('text-sm', status.kind === 'error' ? 'text-destructive' : 'text-success')}
          >
            {status.message}
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!pending}
        title="¿Reemplazar todos tus datos?"
        confirmLabel="Restaurar"
        destructive
        busy={busy}
        onConfirm={confirmRestore}
        onCancel={() => setPending(null)}
      >
        <p>
          Se borrarán los datos actuales de este dispositivo y se sustituirán por los de la copia
          {exportedAt && !Number.isNaN(exportedAt.getTime()) ? ` del ${dateFormat.format(exportedAt)}` : ''}:
        </p>
        {summary && (
          <ul className="mt-2 list-inside list-disc">
            <li>{summary.routines} rutinas</li>
            <li>{summary.exercises} ejercicios</li>
            <li>
              {summary.workoutSessions} entrenamientos ({summary.sets} series)
            </li>
          </ul>
        )}
      </ConfirmDialog>
    </Card>
  )
}
