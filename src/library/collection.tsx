import { HeartIcon, LogInIcon, PlayIcon, PlusIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router'

import { useAuth } from '@/auth/auth-provider'
import { TrackRow } from '@/components/track-row'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { trackKey, type Track } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useLibrary } from '@/library/library-provider'
import { countLabel, PlaylistCover, PlaylistNameDialog } from '@/library/playlist-dialogs'
import { Artwork } from '@/components/artwork'
import { useSubscriptions } from '@/podcasts/subscriptions'
import { usePlayerActions } from '@/player/player-provider'

/** Portada de "Me gusta". */
export function LikedCover({ className }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/30', className)}>
      <HeartIcon className="size-1/2 fill-current text-primary-foreground" aria-hidden />
    </span>
  )
}

/** Cabecera de una colección (Me gusta, playlist) con su botón de reproducir. */
export function CollectionHeader({
  kind,
  title,
  tracks,
  cover,
  actions,
}: {
  kind: string
  title: string
  tracks: Track[]
  cover: ReactNode
  actions?: ReactNode
}) {
  const { playQueue } = usePlayerActions()
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
      <div className="size-40 shrink-0 self-center overflow-hidden rounded-xl shadow-2xl sm:size-48 sm:self-auto [&>*]:size-full">
        {cover}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{kind}</p>
          <h1 className="text-3xl font-bold tracking-tight break-words md:text-5xl">{title}</h1>
          <p className="text-sm text-muted-foreground">{countLabel(tracks.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon-lg"
            aria-label={`Reproducir ${title}`}
            disabled={!tracks.length}
            onClick={() => playQueue(tracks, 0)}
            className="size-12 rounded-full shadow-lg"
          >
            <PlayIcon className="size-5 translate-x-px fill-current" />
          </Button>
          {actions}
        </div>
      </div>
    </header>
  )
}

export function TrackList({
  tracks,
  onRemove,
  removeLabel,
}: {
  tracks: Track[]
  onRemove?: (track: Track) => void
  removeLabel?: string
}) {
  return (
    <div className="flex flex-col">
      {tracks.map((t, i) => (
        <TrackRow
          key={`${trackKey(t)}-${i}`}
          track={t}
          position={i}
          list={tracks}
          onRemove={onRemove && (() => onRemove(t))}
          removeLabel={removeLabel}
        />
      ))}
    </div>
  )
}

export function TrackListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label={label}>
      <div className="flex items-end gap-5">
        <Skeleton className="size-40 rounded-xl sm:size-48" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-13" />
      ))}
    </div>
  )
}

/** Mensaje para las secciones que necesitan cuenta. */
export function SignInPrompt({ title, description }: { title: string; description: string }) {
  const { setAuthOpen } = useAuth()
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LogInIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => setAuthOpen(true)}>Iniciar sesión</Button>
      </EmptyContent>
    </Empty>
  )
}

/** Me gusta + playlists. Se usa en la barra lateral (compacta) y en la página Biblioteca. */
export function LibraryList({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const { liked, playlists, playlistsLoading, createPlaylist } = useLibrary()
  const { subscriptions } = useSubscriptions()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg p-1.5 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring',
      isActive && 'bg-sidebar-accent',
    )
  const coverClass = compact ? 'size-9' : 'size-14'

  return (
    <section aria-labelledby="library-heading" className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1.5">
        <h2
          id="library-heading"
          className={cn(compact ? 'text-sm font-semibold text-muted-foreground' : 'text-xl font-semibold tracking-tight')}
        >
          Tu biblioteca
        </h2>
        {user && (
          <Button variant="ghost" size={compact ? 'icon-sm' : 'sm'} aria-label="Nueva playlist" onClick={() => setCreating(true)}>
            <PlusIcon />
            {!compact && 'Nueva playlist'}
          </Button>
        )}
      </div>

      <div className="-mx-1.5 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1.5">
        <NavLink to="/me-gusta" className={itemClass}>
          <LikedCover className={coverClass} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">Me gusta</span>
            <span className="block truncate text-xs text-muted-foreground">
              {user ? `Lista · ${countLabel(liked.length)}` : 'Inicia sesión para guardar'}
            </span>
          </span>
        </NavLink>
        {playlistsLoading
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className={cn('my-1', compact ? 'h-9' : 'h-14')} />)
          : playlists.map(p => (
              <NavLink key={p.id} to={`/playlist/${p.id}`} className={itemClass}>
                <PlaylistCover playlist={p} className={coverClass} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">Playlist · {countLabel(p.track_count)}</span>
                </span>
              </NavLink>
            ))}
        {subscriptions.map(p => (
          <NavLink key={`pod-${p.id}`} to={`/podcast/${p.id}`} className={itemClass}>
            <Artwork src={p.artwork} className={coverClass} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{p.title}</span>
              <span className="block truncate text-xs text-muted-foreground">Podcast · {p.author}</span>
            </span>
          </NavLink>
        ))}
      </div>

      <PlaylistNameDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva playlist"
        submitLabel="Crear"
        onSubmit={async name => {
          const playlist = await createPlaylist(name)
          if (playlist) navigate(`/playlist/${playlist.id}`)
        }}
      />
    </section>
  )
}
