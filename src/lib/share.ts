export type DeliverResult =
  | { status: 'shared' | 'downloaded' | 'cancelled' }
  /** Safari exige un gesto "reciente" para compartir: hay que volver a tocar. */
  | { status: 'needs-tap'; file: File }

function canShareFile(file: File): boolean {
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
  return isTouchDevice && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Entrega un archivo: hoja de compartir nativa en móviles ("Guardar en
 * Archivos", Calendario, Drive…) o descarga directa. Llamar dentro de un gesto.
 */
export async function shareOrDownloadFile(file: File): Promise<DeliverResult> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return { status: 'shared' }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return { status: 'cancelled' }
      if (error instanceof DOMException && error.name === 'NotAllowedError') return { status: 'needs-tap', file }
    }
  }
  downloadFile(file)
  return { status: 'downloaded' }
}

/** Enlace que abre WhatsApp con el texto listo para enviar (el usuario elige el chat). */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
