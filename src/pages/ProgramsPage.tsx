import { CalendarDays, Check, ChevronDown, Dumbbell, Home, Loader2, Plus, Signal, Warehouse } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { installProgram, PLACE_LABELS, PROGRAMS, type ProgramPlace, type ProgramTemplate } from '@/db'
import { toast } from '@/features/toast/store'
import { useExerciseMap, useRoutines } from '@/hooks/useDb'
import { formatRepRange } from '@/lib/format'

const PLACE_ICONS: Record<ProgramPlace, ReactNode> = {
  gym: <Warehouse className="size-3" aria-hidden />,
  dumbbells: <Dumbbell className="size-3" aria-hidden />,
  home: <Home className="size-3" aria-hidden />,
}

/** Catálogo de programas listos para añadir a "Mis rutinas". */
export function ProgramsPage() {
  const routines = useRoutines()
  const navigate = useNavigate()
  const [installing, setInstalling] = useState<string | null>(null)
  const names = new Set(routines?.map((r) => r.name))

  async function add(program: ProgramTemplate) {
    setInstalling(program.id)
    try {
      const created = await installProgram(program.id)
      toast.show(`Añadido «${program.name}»`, { description: `${created.length} rutinas nuevas en tu lista.` })
      navigate('/rutinas')
    } finally {
      setInstalling(null)
    }
  }

  return (
    <>
      <PageHeader title="Programas" subtitle="Planes listos para usar" backTo="/rutinas" />
      <PageContainer>
        <p className="text-sm text-muted-foreground">
          Cada programa añade sus rutinas a tu lista. Después puedes cambiar ejercicios, series o descansos a tu gusto.
        </p>
        {PROGRAMS.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            installed={program.routines.every((r) => names.has(r.name))}
            installing={installing === program.id}
            disabled={installing !== null}
            onAdd={() => add(program)}
          />
        ))}
      </PageContainer>
    </>
  )
}

function ProgramCard({
  program,
  installed,
  installing,
  disabled,
  onAdd,
}: {
  program: ProgramTemplate
  installed: boolean
  installing: boolean
  disabled: boolean
  onAdd: () => void
}) {
  const exerciseMap = useExerciseMap()
  return (
    <Card className="p-4">
      <h2 className="font-display text-3xl leading-tight font-bold">{program.name}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip>
          <Signal className="size-3" aria-hidden /> {program.level}
        </Chip>
        <Chip>
          <CalendarDays className="size-3" aria-hidden /> {program.daysPerWeek}
        </Chip>
        <Chip>
          {PLACE_ICONS[program.place]} {PLACE_LABELS[program.place]}
        </Chip>
      </div>
      <p className="mt-3 text-sm">{program.summary}</p>

      <details className="group mt-2">
        <summary className="flex h-10 cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted-foreground select-none">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          Ver {program.routines.length} rutinas
        </summary>
        <div className="flex flex-col gap-3 pb-2">
          {program.routines.map((routine) => (
            <div key={routine.name}>
              <p className="font-semibold">{routine.name}</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {routine.exercises.map(([id, sets, min, max]) => (
                  <li key={id} className="flex justify-between gap-3">
                    <span className="truncate text-muted-foreground">{exerciseMap?.get(id)?.name ?? id}</span>
                    <span className="tabular shrink-0 text-muted-foreground">
                      {sets} × {formatRepRange(min, max)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <Button className="mt-3 w-full" variant={installed ? 'secondary' : 'default'} onClick={onAdd} disabled={disabled}>
        {installing ? <Loader2 className="animate-spin" /> : installed ? <Check /> : <Plus />}
        {installed ? 'Ya lo tienes · añadir otra vez' : 'Añadir a mis rutinas'}
      </Button>
    </Card>
  )
}
