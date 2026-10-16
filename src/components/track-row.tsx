import { ListPlusIcon, ListStartIcon, MoreHorizontalIcon, PlayIcon, UserSearchIcon, type LucideIcon } from 'lucide-react'
import type { ComponentType, KeyboardEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Artwork } from '@/components/artwork'
import { Equalizer } from '@/components/equalizer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trackKey, type Track } from '@/lib/api'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePlayer, usePlayerActions } from '@/player/player-provider'

interface TrackRowProps {
  track: Track
  position: number
  /** Lista completa: al tocar una fila se reproduce desde ahí y el resto queda en cola. */
  list: Track[]
  showAlbum?: boolean
}

export function TrackRow({ track, position, list, showAlbum = true }: TrackRowProps) {
  const { current, status } = usePlayer()
  const { playQueue, toggle } = usePlayerActions()
  const isCurrent = current != null && trackKey(current) === trackKey(track)
  const isPlaying = isCurrent && (status === 'playing' || status === 'loading')

  const play = () => (isCurrent ? toggle() : playQueue(list, position))
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      play()
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`${isPlaying ? 'Pausar' : 'Reproducir'} ${track.title} de ${track.artist}`}
          aria-current={isCurrent || undefined}
          onClick={play}
          onKeyDown={onKeyDown}
          className={cn(
            'group grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 outline-none transition-colors',
            'hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring',
            showAlbum && 'md:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_auto]',
            isCurrent && 'bg-accent/40',
          )}
        >
          <div className="flex size-8 items-center justify-center text-sm text-muted-foreground tabular-nums">
            <span className={cn('group-hover:hidden group-focus-visible:hidden', isCurrent && 'hidden')}>
              {position + 1}
            </span>
            {isCurrent && (
              <Equalizer playing={isPlaying} className="group-hover:hidden group-focus-visible:hidden" />
            )}
            <PlayIcon className="hidden size-4 fill-current text-foreground group-hover:block group-focus-visible:block" />
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <Artwork src={track.thumbnail} className="size-10" />
            <div className="min-w-0">
              <p className={cn('truncate text-sm font-medium', isCurrent && 'text-primary')}>{track.title}</p>
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                {track.explicit && (
                  <Badge variant="secondary" className="h-4 rounded-sm px-1 text-[10px]" aria-label="Explícito">
                    E
                  </Badge>
                )}
                <span className="truncate">{track.artist}</span>
              </p>
            </div>
          </div>

          {showAlbum && <p className="hidden truncate text-sm text-muted-foreground md:block">{track.album}</p>}

          <div className="flex items-center gap-1">
            <span className="w-10 text-right font-mono text-xs text-muted-foreground">
              {track.durationStr || formatTime(track.duration ?? 0)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Más opciones para ${track.title}`}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:aria-expanded:opacity-100"
                >
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" onClick={e => e.stopPropagation()}>
                <TrackActions track={track} Item={DropdownMenuItem} Separator={DropdownMenuSeparator} onPlay={play} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <TrackActions track={track} Item={ContextMenuItem} Separator={ContextMenuSeparator} onPlay={play} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

type MenuItem = ComponentType<{ onSelect?: (e: Event) => void; children: ReactNode }>

/** Mismas acciones para el clic derecho y para el botón "⋯" (accesible en táctil y teclado). */
function TrackActions({
  track,
  Item,
  Separator,
  onPlay,
}: {
  track: Track
  Item: MenuItem
  Separator: ComponentType
  onPlay: () => void
}) {
  const { playNext, addToQueue } = usePlayerActions()
  const navigate = useNavigate()

  const action = (Icon: LucideIcon, label: string, run: () => void) => (
    <Item onSelect={run}>
      <Icon />
      {label}
    </Item>
  )

  return (
    <>
      {action(PlayIcon, 'Reproducir', onPlay)}
      {action(ListStartIcon, 'Reproducir a continuación', () => {
        playNext(track)
        toast.success('Sonará a continuación', { description: track.title })
      })}
      {action(ListPlusIcon, 'Añadir a la cola', () => {
        addToQueue(track)
        toast.success('Añadida a la cola', { description: track.title })
      })}
      <Separator />
      {action(UserSearchIcon, `Ir a ${track.artist}`, () => navigate(`/buscar?q=${encodeURIComponent(track.artist)}`))}
    </>
  )
}
