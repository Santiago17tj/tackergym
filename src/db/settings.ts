import { db } from './db'
import { DEFAULT_SETTINGS, type AppSettings, type SettingKey, type SettingRow } from './types'

/** Combina lo guardado con los valores por defecto (los ajustes no se precargan). */
export function resolveSettings(rows: SettingRow[]): AppSettings {
  const settings: AppSettings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) {
      ;(settings as Record<SettingKey, unknown>)[row.key] = row.value
    }
  }
  return settings
}

export async function getSettings(): Promise<AppSettings> {
  return resolveSettings(await db.settings.toArray())
}

export async function setSetting<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<void> {
  await db.settings.put({ key, value } as SettingRow)
}
