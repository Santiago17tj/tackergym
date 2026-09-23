import { ArrowLeft, Check, Dumbbell, Home, Loader2, Warehouse } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AddressPicker } from '@/components/profile/AddressPicker'
import { ReminderPlanner } from '@/components/profile/ReminderPlanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { APP_NAME } from '@/config/app'
import {
  installProgram,
  PLACE_LABELS,
  recommendProgram,
  setSetting,
  type AddressForm,
  type AppSettings,
  type ProgramPlace,
} from '@/db'
import { toast } from '@/features/toast/store'
import { useScrollLock } from '@/hooks/useScrollLock'
import { byForm } from '@/lib/address'
import { cn } from '@/lib/utils'

/** Días por defecto según cuántos días por semana (0 = lunes). */
const DEFAULT_DAYS: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
}

const PLACE_ICONS: Record<ProgramPlace, ReactNode> = {
  gym: <Warehouse />,
  dumbbells: <Dumbbell />,
  home: <Home />,
}

const STEPS = 5

/**
 * Bienvenida de la primera vez: nombre, trato, plan recomendado y
 * recordatorios. Se puede saltar en cualquier momento y repetir desde Ajustes.
 */
export function Onboarding({ settings, existingRoutineNames }: { settings: AppSettings; existingRoutineNames: string[] }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(settings.displayName)
  const [form, setForm] = useState<AddressForm>(settings.addressForm)
  const [daysPerWeek, setDaysPerWeek] = useState(Math.min(6, Math.max(2, settings.trainingDays.length || 3)))
  const [place, setPlace] = useState<ProgramPlace>('gym')
  const [addProgram, setAddProgram] = useState(true)
  const [plan, setPlan] = useState({ days: settings.trainingDays, time: settings.reminderTime })
  const [saving, setSaving] = useState(false)
  useScrollLock(true)

  const program = recommendProgram(daysPerWeek, place)
  const alreadyHasProgram = program.routines.every((r) => existingRoutineNames.includes(r.name))
  const cleanName = name.trim()

  async function finish(skipped = false) {
    setSaving(true)
    try {
      await Promise.all([
        setSetting('displayName', cleanName.slice(0, 40)),
        setSetting('addressForm', form),
        setSetting('trainingDays', plan.days),
        setSetting('reminderTime', plan.time),
      ])
      if (!skipped && addProgram && !alreadyHasProgram) await installProgram(program.id, { position: 'start' })
      await setSetting('onboarded', true)
      if (!skipped) {
        toast.show(cleanName ? `Todo a punto, ${cleanName}` : 'Todo a punto', {
          description: addProgram && !alreadyHasProgram ? `Añadido el programa «${program.name}».` : undefined,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-background px-safe pt-safe pb-safe"
    >
      <div className="mx-auto flex min-h-full max-w-lg flex-col p-5">
        <div className="flex h-12 items-center justify-between">
          {step > 0 ? (
            <button type="button" onClick={back} aria-label="Atrás" className="-ml-2 flex size-11 items-center justify-center rounded-full active:bg-accent">
              <ArrowLeft className="size-6" />
            </button>
          ) : (
            <span />
          )}
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-label="Progreso de la bienvenida"
            aria-valuemin={1}
            aria-valuemax={STEPS}
            aria-valuenow={step + 1}
            aria-valuetext={`Paso ${step + 1} de ${STEPS}`}
          >
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={cn('h-1.5 w-6 rounded-full', i <= step ? 'bg-primary' : 'bg-secondary')} />
            ))}
          </div>
          <button type="button" onClick={() => finish(true)} className="h-11 px-2 text-sm text-muted-foreground active:text-foreground">
            Saltar
          </button>
        </div>

        <div className="flex flex-1 flex-col pt-6">
          {step === 0 && (
            <Step title={`Te damos la bienvenida a ${APP_NAME}`} id="onboarding-title">
              <p className="text-lg text-muted-foreground">
                Tu diario de gimnasio: apunta tus series, descansa con cronómetro y mira cómo progresas.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-base">
                <Bullet>Funciona sin internet, dentro del gimnasio.</Bullet>
                <Bullet>Tus datos se quedan en tu teléfono. Sin cuentas.</Bullet>
                <Bullet>Te propone siempre superar tu última marca.</Bullet>
              </ul>
              <p className="mt-6 text-muted-foreground">Son 4 preguntas rápidas para dejarla a tu medida.</p>
            </Step>
          )}

          {step === 1 && (
            <Step title="¿Cómo quieres que te llamemos?" id="onboarding-title">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && next()}
                placeholder="Tu nombre o apodo"
                maxLength={40}
                autoComplete="given-name"
                enterKeyHint="next"
                className="h-14 text-xl"
                aria-label="Nombre"
              />
              <p className="mt-2 text-sm text-muted-foreground">Opcional. Puedes cambiarlo cuando quieras en Ajustes.</p>
            </Step>
          )}

          {step === 2 && (
            <Step title={cleanName ? `${cleanName}, ¿cómo prefieres que te hablemos?` : '¿Cómo prefieres que te hablemos?'} id="onboarding-title">
              <AddressPicker value={form} onChange={setForm} />
            </Step>
          )}

          {step === 3 && (
            <Step title="¿Cómo vas a entrenar?" id="onboarding-title">
              <p className="font-semibold">Días por semana</p>
              <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Días por semana">
                {[2, 3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={daysPerWeek === d}
                    onClick={() => {
                      setDaysPerWeek(d)
                      setPlan((p) => ({ ...p, days: DEFAULT_DAYS[d] }))
                    }}
                    className={cn(
                      'h-14 rounded-lg font-display text-2xl font-bold',
                      daysPerWeek === d ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="mt-5 font-semibold">¿Dónde?</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Lugar de entreno">
                {(Object.keys(PLACE_LABELS) as ProgramPlace[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={place === p}
                    onClick={() => setPlace(p)}
                    className={cn(
                      'flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg px-2 text-center text-sm font-semibold [&_svg]:size-6',
                      place === p ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                    )}
                  >
                    {PLACE_ICONS[p]}
                    {PLACE_LABELS[p]}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-primary/50 p-4">
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">Te recomendamos</p>
                <p className="mt-1 font-display text-3xl font-bold">{program.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {program.level} · {program.daysPerWeek} · {program.routines.length} rutinas
                </p>
                <p className="mt-2 text-sm">{program.summary}</p>
                {alreadyHasProgram ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-success">
                    <Check className="size-4" /> Ya tienes estas rutinas.
                  </p>
                ) : (
                  <label className="mt-3 flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={addProgram}
                      onChange={(e) => setAddProgram(e.target.checked)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    Añadir sus rutinas a mi lista
                  </label>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Hay más programas en Rutinas → Programas.</p>
            </Step>
          )}

          {step === 4 && (
            <Step title="Recordatorios para no fallar" id="onboarding-title">
              <ReminderPlanner days={plan.days} time={plan.time} onChange={setPlan} />
            </Step>
          )}
        </div>

        <div className="sticky bottom-0 mt-6 bg-background pt-2 pb-2">
          {step < STEPS - 1 ? (
            <Button size="lg" className="h-14 w-full" onClick={next}>
              {step === 0 ? 'Empezar' : 'Siguiente'}
            </Button>
          ) : (
            <Button size="lg" className="h-14 w-full" onClick={() => finish()} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {byForm(form, { f: 'Estoy lista', m: 'Estoy listo', n: '¡A entrenar!' })}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <h1 id={id} className="mb-5 font-display text-4xl leading-tight font-bold">
        {title}
      </h1>
      {children}
    </section>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </li>
  )
}
