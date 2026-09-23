import { BellOff, BellRing, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { disablePush, enablePush, getPushStatus, PushError, syncPushPlan, type PushPlan, type PushStatus } from '@/lib/push'
import { describePlan } from '@/lib/calendar'

const STATUS_TEXT: Record<PushStatus, string> = {
  on: 'Activado. Te llegará una notificación',
  off: 'Recibe una notificación los días de entreno, aunque la app esté cerrada.',
  denied: 'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador para esta app.',
  'needs-install':
    'En iPhone los avisos solo funcionan con la app instalada: Compartir → «Añadir a pantalla de inicio», y ábrela desde el icono.',
  unsupported: 'Este navegador no admite avisos. Usa la opción del calendario.',
}

/** Activa/desactiva el aviso push "hoy toca entrenar". */
export function PushToggle({ plan }: { plan: PushPlan }) {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void getPushStatus().then((s) => alive && setStatus(s))
    return () => {
      alive = false
    }
  }, [])

  // Si ya está activado y cambian días u hora, se actualiza el servidor (sin prisas).
  const planKey = `${plan.days.join(',')}|${plan.time}`
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (status !== 'on') return
    const id = setTimeout(() => void syncPushPlan(plan), 800)
    return () => clearTimeout(id)
    // plan se reconstruye en cada render; planKey resume su contenido.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, status])

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      if (status === 'on') {
        await disablePush()
        setStatus('off')
      } else {
        await enablePush(plan)
        setStatus('on')
      }
    } catch (e) {
      setError(e instanceof PushError ? e.message : 'No se pudo activar el aviso. Inténtalo de nuevo.')
      setStatus(await getPushStatus())
    } finally {
      setBusy(false)
    }
  }

  if (status === null) return null
  const canToggle = status === 'on' || status === 'off'
  const noDays = plan.days.length === 0

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-3">
        {status === 'on' ? (
          <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        ) : (
          <BellOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Aviso en el móvil</p>
          <p className="text-sm text-muted-foreground">
            {STATUS_TEXT[status]}
            {status === 'on' && ` (${noDays ? 'elige al menos un día' : describePlan(plan)}).`}
          </p>
        </div>
      </div>
      {canToggle && (
        <Button
          className="mt-3 w-full"
          variant={status === 'on' ? 'secondary' : 'default'}
          onClick={toggle}
          disabled={busy || (status === 'off' && noDays)}
        >
          {busy ? <Loader2 className="animate-spin" /> : status === 'on' ? <BellOff /> : <BellRing />}
          {status === 'on' ? 'Desactivar aviso' : 'Activar aviso'}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
