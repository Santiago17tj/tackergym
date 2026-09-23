// IndexedDB en memoria para probar Dexie en Node.
import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { db } from '@/db/db'

// Cada test empieza con una base de datos recién creada (y por tanto con el seed).
beforeEach(async () => {
  await db.delete()
  await db.open()
})
