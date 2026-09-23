import { productionDeps } from '../_lib/deps.js'
import { createPushHandlers } from '../_lib/handlers.js'

export function POST(request: Request): Promise<Response> {
  return createPushHandlers(productionDeps()).subscribe(request)
}

export function DELETE(request: Request): Promise<Response> {
  return createPushHandlers(productionDeps()).unsubscribe(request)
}
