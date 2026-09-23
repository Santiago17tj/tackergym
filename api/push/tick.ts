import { productionDeps } from '../_lib/deps.js'
import { createPushHandlers } from '../_lib/handlers.js'

export function POST(request: Request): Promise<Response> {
  return createPushHandlers(productionDeps()).tick(request)
}
