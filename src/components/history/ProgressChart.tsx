import { useEffect, useMemo, useRef, useState } from 'react'
import { formatShortDate } from '@/lib/format'

export type ChartPoint = { x: number; y: number }

type ProgressChartProps = {
  points: ChartPoint[]
  /** Formato corto para el eje y la etiqueta final. */
  formatValue: (value: number) => string
  /** Formato del tooltip (con unidad); por defecto `formatValue`. */
  formatTooltip?: (value: number) => string
  /** Descripción para lectores de pantalla. */
  label: string
}

const HEIGHT = 200
const PAD = { top: 20, right: 16, bottom: 26, left: 44 }
/** Por encima de este nº de puntos solo se marca el último, para no saturar. */
const MAX_MARKERS = 16

/** Ticks "redondos" (1, 2, 2.5, 5 × 10ⁿ) que cubren [min, max]. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1)
    min -= pad
    max += pad
  }
  const rough = (max - min) / (count - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000)
  if (ticks.at(-1)! < max) ticks.push(ticks.at(-1)! + step)
  return ticks
}

/**
 * Línea de progreso de una sola serie (sin leyenda: el título la nombra).
 * Línea 2px, área al 10%, rejilla hairline, cruz + tooltip al tocar/pasar.
 */
export function ProgressChart({ points, formatValue, formatTooltip = formatValue, label }: ProgressChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const geometry = useMemo(() => {
    if (width === 0 || points.length === 0) return null
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const ticks = niceTicks(Math.min(...ys), Math.max(...ys))
    const yMin = ticks[0]
    const yMax = ticks.at(-1)!
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const plotW = width - PAD.left - PAD.right
    const plotH = HEIGHT - PAD.top - PAD.bottom
    const sx = (x: number) => PAD.left + (xMax === xMin ? plotW / 2 : ((x - xMin) / (xMax - xMin)) * plotW)
    const sy = (y: number) => PAD.top + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH
    const coords = points.map((p) => ({ cx: sx(p.x), cy: sy(p.y) }))
    const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx},${c.cy}`).join('')
    const baseline = PAD.top + plotH
    const area = `${line}L${coords.at(-1)!.cx},${baseline}L${coords[0].cx},${baseline}Z`
    return { ticks, sy, coords, line, area, baseline }
  }, [points, width])

  function pickNearest(clientX: number) {
    if (!geometry || !containerRef.current) return
    const x = clientX - containerRef.current.getBoundingClientRect().left
    let best = 0
    geometry.coords.forEach((c, i) => {
      if (Math.abs(c.cx - x) < Math.abs(geometry.coords[best].cx - x)) best = i
    })
    setActive(best)
  }

  const last = points.length - 1
  const shown = active ?? null
  const activeCoord = shown !== null ? geometry?.coords[shown] : undefined

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ height: HEIGHT }}>
      {geometry && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onPointerDown={(e) => pickNearest(e.clientX)}
          onPointerMove={(e) => pickNearest(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? last) - 1))
            if (e.key === 'ArrowRight') setActive((i) => Math.min(last, (i ?? -1) + 1))
            if (e.key === 'Escape') setActive(null)
          }}
        >
          {/* Rejilla y eje Y */}
          {geometry.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={geometry.sy(t)} y2={geometry.sy(t)} className="stroke-border" strokeWidth={1} />
              <text x={PAD.left - 8} y={geometry.sy(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatValue(t)}
              </text>
            </g>
          ))}

          {/* Eje X: primera y última fecha */}
          <text x={geometry.coords[0].cx} y={HEIGHT - 6} textAnchor={points.length > 1 ? 'start' : 'middle'} className="fill-muted-foreground text-[11px]">
            {formatShortDate(points[0].x)}
          </text>
          {points.length > 1 && (
            <text x={geometry.coords[last].cx} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {formatShortDate(points[last].x)}
            </text>
          )}

          <path d={geometry.area} className="fill-chart-1" fillOpacity={0.1} />
          <path d={geometry.line} fill="none" className="stroke-chart-1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {geometry.coords.map((c, i) =>
            points.length <= MAX_MARKERS || i === last ? (
              <circle key={i} cx={c.cx} cy={c.cy} r={4} className="fill-chart-1 stroke-card" strokeWidth={2} />
            ) : null,
          )}

          {/* Etiqueta directa solo en el último punto */}
          {shown === null && (
            <text x={geometry.coords[last].cx} y={geometry.coords[last].cy - 10} textAnchor="end" className="fill-foreground text-xs font-semibold tabular-nums">
              {formatValue(points[last].y)}
            </text>
          )}

          {activeCoord && (
            <g pointerEvents="none">
              <line x1={activeCoord.cx} x2={activeCoord.cx} y1={PAD.top} y2={geometry.baseline} className="stroke-muted-foreground" strokeWidth={1} />
              <circle cx={activeCoord.cx} cy={activeCoord.cy} r={6} className="fill-chart-1 stroke-card" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}

      {activeCoord && shown !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 rounded-md border bg-popover px-2 py-1 shadow-lg"
          style={{
            left: Math.min(Math.max(activeCoord.cx, 60), width - 60),
            transform: 'translateX(-50%)',
          }}
        >
          <p className="tabular text-sm font-bold whitespace-nowrap">{formatTooltip(points[shown].y)}</p>
          <p className="text-[11px] whitespace-nowrap text-muted-foreground">{formatShortDate(points[shown].x)}</p>
        </div>
      )}
    </div>
  )
}
