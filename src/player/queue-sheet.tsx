import { ListMusicIcon, XIcon } from 'lucide-react'

import { Artwork } from '@/components/artwork'
import { Equalizer } from '@/components/equalizer'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { trackKey } from '@/lib/api'
import { usePlayer, usePlayerActions } from '@/player/player-provider'
import { WithTip } from '@/player/player-controls'

export function QueueSheet() {
  const { queue, index, current, status } = usePlayer()
  const { jumpTo, removeFromQueue } = usePlayerActions()
  const upcoming = queue.slice(index + 1)

  return (
    <Sheet>
      <WithTip label="Cola de reproducción">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Cola de reproducción">
            <ListMusicIcon />
          </Button>
        </SheetTrigger>
      </WithTip>
      <SheetContent className="gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Cola de reproducción</SheetTitle>
          <SheetDescription>
            {upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'canción' : 'canciones'} a continuación` : 'Nada más en cola'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 p-4">
            {current ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Sonando ahora</h3>
                <div className="flex items-center gap-3 rounded-lg bg-accent/40 p-2">
                  <Artwork src={current.thumbnail} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{current.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
                  </div>
                  <Equalizer playing={status === 'playing'} className="mr-2" />
                </div>
              </section>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ListMusicIcon />
                  </EmptyMedia>
                  <EmptyTitle>Tu cola está vacía</EmptyTitle>
                  <EmptyDescription>Busca una canción y pulsa reproducir para empezar.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {upcoming.length > 0 && (
              <section className="flex flex-col gap-1">
                <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">A continuación</h3>
                {upcoming.map((track, offset) => {
                  const at = index + 1 + offset
                  return (
                    <div key={`${trackKey(track)}-${at}`} className="group flex items-center gap-1 rounded-lg hover:bg-accent/60">
                      <button
                        type="button"
                        onClick={() => jumpTo(at)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Artwork src={track.thumbnail} className="size-10" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{track.title}</span>
                          <span className="block truncate text-sm text-muted-foreground">{track.artist}</span>
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Quitar ${track.title} de la cola`}
                        onClick={() => removeFromQueue(at)}
                        className="mr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                      >
                        <XIcon />
                      </Button>
                    </div>
                  )
                })}
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
