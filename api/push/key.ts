import { productionDeps } from '../_lib/deps.js'
import { createPushHandlers } from '../_lib/handlers.js'

export function GET(): Promise<Response> {
  return createPushHandlers(productionDeps()).key()
}
