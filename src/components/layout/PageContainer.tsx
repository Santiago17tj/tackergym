import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function PageContainer({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto flex w-full max-w-lg flex-col gap-4 p-4', className)} {...props} />
}
