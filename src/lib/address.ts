import type { AddressForm } from '@/db/types'

/**
 * Textos según el trato elegido. Para "neutro" se usan frases sin marca de
 * género (no "-e"), que se leen natural para cualquier persona.
 */
export function byForm(form: AddressForm | undefined, options: { f: string; m: string; n: string }): string {
  return options[form ?? 'n']
}

export const ADDRESS_OPTIONS: { value: AddressForm; label: string; example: string }[] = [
  { value: 'f', label: 'Femenino', example: '«Bienvenida», «lista»' },
  { value: 'm', label: 'Masculino', example: '«Bienvenido», «listo»' },
  { value: 'n', label: 'Neutro', example: '«Te damos la bienvenida»' },
]

/** "Hola, Ana" / "Hola" */
export function hello(name: string | undefined): string {
  const clean = name?.trim()
  return clean ? `Hola, ${clean}` : 'Hola'
}
