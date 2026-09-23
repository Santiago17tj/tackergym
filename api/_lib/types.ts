export type PushKeys = { p256dh: string; auth: string }
export type PushSubscriptionJSON = { endpoint: string; keys: PushKeys }

/** Lo único que guarda el servidor por teléfono: ni nombre ni entrenamientos. */
export type SubscriptionRecord = {
  /** sha256 del endpoint (no se expone el endpoint en claves ni logs). */
  id: string
  subscription: PushSubscriptionJSON
  /** 0 = lunes … 6 = domingo */
  days: number[]
  /** "HH:MM" en la zona horaria del teléfono */
  time: string
  timeZone: string
  /** Último día (YYYY-MM-DD, hora local) en que se envió el aviso. */
  lastSentDate?: string
  createdAt: number
  updatedAt: number
}

export type VapidKeys = { publicKey: string; privateKey: string }

export interface PushStore {
  getVapid(): Promise<VapidKeys | null>
  /** Guarda las claves solo si no existían; devuelve las que quedan guardadas. */
  setVapidIfAbsent(keys: VapidKeys): Promise<VapidKeys>
  saveSubscription(record: SubscriptionRecord): Promise<void>
  getSubscription(id: string): Promise<SubscriptionRecord | null>
  deleteSubscription(id: string): Promise<void>
  listSubscriptions(): Promise<SubscriptionRecord[]>
}
