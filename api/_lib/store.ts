import { Redis } from '@upstash/redis'
import type { PushStore, SubscriptionRecord, VapidKeys } from './types.js'

const VAPID_KEY = 'push:vapid'
const SUBS_SET = 'push:subs'
const subKey = (id: string) => `push:sub:${id}`

/** Credenciales que crea la integración de Upstash en Vercel (acepta ambos nombres). */
export function redisConfigFromEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

export class RedisPushStore implements PushStore {
  constructor(private readonly redis: Redis) {}

  static fromEnv(): RedisPushStore | null {
    const config = redisConfigFromEnv()
    return config ? new RedisPushStore(new Redis(config)) : null
  }

  async getVapid() {
    return (await this.redis.get<VapidKeys>(VAPID_KEY)) ?? null
  }

  async setVapidIfAbsent(keys: VapidKeys) {
    await this.redis.set(VAPID_KEY, keys, { nx: true })
    return (await this.getVapid()) ?? keys
  }

  async saveSubscription(record: SubscriptionRecord) {
    await this.redis.set(subKey(record.id), record)
    await this.redis.sadd(SUBS_SET, record.id)
  }

  async getSubscription(id: string) {
    return (await this.redis.get<SubscriptionRecord>(subKey(id))) ?? null
  }

  async deleteSubscription(id: string) {
    await this.redis.del(subKey(id))
    await this.redis.srem(SUBS_SET, id)
  }

  async listSubscriptions() {
    const ids = await this.redis.smembers(SUBS_SET)
    if (ids.length === 0) return []
    const records = await this.redis.mget<(SubscriptionRecord | null)[]>(...ids.map(subKey))
    return records.filter((r): r is SubscriptionRecord => r !== null)
  }
}

/** Almacén en memoria para tests. */
export class MemoryPushStore implements PushStore {
  vapid: VapidKeys | null = null
  subs = new Map<string, SubscriptionRecord>()
  async getVapid() {
    return this.vapid
  }
  async setVapidIfAbsent(keys: VapidKeys) {
    this.vapid ??= keys
    return this.vapid
  }
  async saveSubscription(record: SubscriptionRecord) {
    this.subs.set(record.id, structuredClone(record))
  }
  async getSubscription(id: string) {
    return this.subs.get(id) ?? null
  }
  async deleteSubscription(id: string) {
    this.subs.delete(id)
  }
  async listSubscriptions() {
    return [...this.subs.values()].map((r) => structuredClone(r))
  }}
