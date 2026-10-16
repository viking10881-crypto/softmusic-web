import { ChevronDownIcon, PauseIcon, PlayIcon, SkipForwardIcon } from 'lucide-react'
import { useState } from 'react'

import { Artwork } from '@/components/artwork'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { SeekBar, TransportControls, VolumeControl } from '@/player/player-controls'
import { usePlayer, usePlayerActions, usePlayerProgress } from '@/player/player-provider'
import { QueueSheet } from '@/player/queue-sheet'

function PreviewBadge() {
  return (
    <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary" title="Solo hay disponible un fragmento de 30 segundos">
      Vista previa
    </Badge>
  )
}

/** Barra de reproducción fija. Escritorio: tres zonas. Móvil: mini reproductor que abre la vista completa. */
export function PlayerBar() {
  const { current, isPreview } = usePlayer()
  const [expanded, setExpanded] = useState(false)

  if (!current) return null

  return (
    <>
      {/* Escritorio */}
      <div className="hidden h-20 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-4 border-t bg-sidebar px-4 md:grid">
        <div className="flex min-w-0 items-center gap-3">
          <Artwork src={current.thumbnail} alt="" className="size-14 shadow-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.title}</p>
            <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
              <span className="truncate">{current.artist}</span>
              {isPreview && <PreviewBadge />}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <TransportControls />
          <SeekBar className="max-w-xl" />
        </div>
        <div className="flex items-center justify-end gap-2">
          <QueueSheet />
          <VolumeControl />
        </div>
      </div>

      {/* Móvil */}
      <MiniPlayer onExpand={() => setExpanded(true)} />
      <Sheet open={expanded} onOpenChange={setExpanded}>
        <SheetContent side="bottom" showCloseButton={false} className="gap-0 border-0 data-[side=bottom]:h-dvh bg-gradient-to-b from-secondary to-background p-0 md:hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Cerrar reproductor">
                <ChevronDownIcon className="size-6" />
              </Button>
            </SheetClose>
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Reproduciendo</span>
            <QueueSheet />
          </div>
          <div className="flex flex-1 flex-col justify-center gap-8 px-6 pb-10">
            <Artwork src={current.thumbnail} size={1000} alt={`Portada de ${current.title}`} className="aspect-square w-full max-w-sm self-center rounded-xl shadow-2xl" />
            <div className="min-w-0">
              <SheetTitle className="truncate text-2xl font-semibold">{current.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 truncate text-base">
                <span className="truncate">{current.artist}</span>
                {isPreview && <PreviewBadge />}
              </SheetDescription>
            </div>
            <SeekBar />
            <TransportControls large />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const { current, status, queue, index } = usePlayer()
  const { toggle, next } = usePlayerActions()
  const { currentTime, duration } = usePlayerProgress()
  if (!current) return null
  const playing = status === 'playing' || status === 'loading'
  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className="relative mx-2 mb-1 overflow-hidden rounded-lg bg-secondary shadow-lg md:hidden">
      <div className="flex items-center gap-1 p-1.5">
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Abrir reproductor: ${current.title}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Artwork src={current.thumbnail} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{current.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{current.artist}</span>
          </span>
        </button>
        <Button variant="ghost" size="icon-lg" aria-label={playing ? 'Pausar' : 'Reproducir'} onClick={toggle}>
          {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="Siguiente" disabled={index >= queue.length - 1} onClick={next}>
          <SkipForwardIcon className="fill-current" />
        </Button>
      </div>
      <div className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground/15">
        <div className={cn('h-full rounded-full bg-primary transition-[width] duration-500 ease-linear')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
