import { Check, Pipette } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { setSetting } from '@/db'
import { ACCENT_PRESETS, ensureReadable, foregroundFor, isHexColor } from '@/lib/accent'
import { cn } from '@/lib/utils'

/** Elección del color de acento: muestras predefinidas + color libre. */
export function AccentCard({ value }: { value: string }) {
  const current = value.toLowerCase()
  const isCustom = !ACCENT_PRESETS.some((p) => p.hex === current)
  const choose = (hex: string) => {
    if (isHexColor(hex)) void setSetting('accentColor', hex.toLowerCase())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color</CardTitle>
        <CardDescription>El color de botones, progreso y récords. Solo cambia en este teléfono.</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Color de acento" className="grid grid-cols-5 gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const selected = preset.hex === current
            return (
              <button
                key={preset.hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={preset.name}
                onClick={() => choose(preset.hex)}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-md border-2 transition-transform active:scale-95',
                  selected ? 'border-foreground' : 'border-transparent',
                )}
              >
                <span
                  className="flex size-full items-center justify-center rounded-[3px]"
                  style={{ background: preset.hex, color: foregroundFor(preset.hex) }}
                >
                  {selected && <Check className="size-5" strokeWidth={3} />}
                </span>
              </button>
            )
          })}

          {/* Color libre: el input nativo abre el selector del sistema */}
          <label
            className={cn(
              'relative flex aspect-square cursor-pointer items-center justify-center rounded-md border-2 bg-secondary',
              isCustom ? 'border-foreground' : 'border-transparent',
            )}
          >
            <span className="sr-only">Otro color</span>
            {isCustom ? (
              <span
                className="flex size-full items-center justify-center rounded-[3px]"
                style={{ background: ensureReadable(current), color: foregroundFor(ensureReadable(current)) }}
              >
                <Pipette className="size-5" />
              </span>
            ) : (
              <Pipette className="size-5 text-muted-foreground" />
            )}
            <input
              type="color"
              value={current}
              onChange={(e) => choose(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        {isCustom && ensureReadable(current) !== current && (
          <p className="mt-3 text-xs text-muted-foreground">
            Ese color se ha aclarado un poco para que se lea bien sobre el fondo oscuro.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
