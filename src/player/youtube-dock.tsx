import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import { usePlayer, usePlayerActions } from '@/player/player-provider'

/**
 * Reproductor de YouTube visible. Las condiciones de YouTube exigen que el video
 * se vea (mínimo 200×200 px), así que se muestra flotando mientras suena una pista de YouTube.
 * El contenedor siempre está montado para no destruir el iframe entre canciones.
 */
export function YouTubeDock() {
  const { engine, current } = usePlayer()
  const { registerYouTubeHost } = usePlayerActions()
  const host = useRef<HTMLDivElement>(null)
  const active = engine === 'youtube' && current != null

  useEffect(() => {
    registerYouTubeHost(host.current)
    return () => registerYouTubeHost(null)
  }, [registerYouTubeHost])

  return (
    <div
      aria-hidden={!active}
      className={cn(
        'fixed right-4 bottom-24 z-40 overflow-hidden rounded-xl border bg-black shadow-2xl transition-all duration-300',
        'max-md:right-2 max-md:bottom-34 max-md:left-2',
        'md:w-[356px]',
        active ? 'translate-y-0 opacity-100' : 'pointer-events-none invisible translate-y-4 opacity-0',
      )}
    >
      <div ref={host} className="h-[200px] w-full" />
    </div>
  )
}
