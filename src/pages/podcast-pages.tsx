import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleIcon,
  ListPlusIcon,
  ListStartIcon,
  MicIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { MobileHeader } from '@/components/app-shell'
import { Artwork } from '@/components/artwork'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Episode, type Podcast } from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePlayer, usePlayerActions } from '@/player/player-provider'
import { episodeProgress, useEpisodeProgress } from '@/podcasts/progress'
import { SubscribeButton, useSubscriptions } from '@/podcasts/subscriptions'

/** "1 h 5 min", "42 min". */
export function formatLength(seconds: number) {
  if (!seconds) return ''
  const minutes = Math.max(1, Math.round(seconds / 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

function formatDate(iso?: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days < 1) return 'Hoy'
  if (days < 2) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return dateFormat.format(date)
}

export function PodcastCard({ podcast }: { podcast: Podcast }) {
  return (
    <Link
      to={`/podcast/${podcast.id}`}
      className="group flex min-w-0 flex-col gap-2 rounded-xl p-2 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Artwork src={podcast.artwork} size={500} alt="" className="aspect-square w-full rounded-lg shadow-md" />
      <span className="min-w-0">
        <span className="line-clamp-2 text-sm font-medium">{podcast.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{podcast.author}</span>
      </span>
    </Link>
  )
}

export function PodcastGrid({ podcasts }: { podcasts: Podcast[] }) {
  return (
    <div className="-mx-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {podcasts.map(p => (
        <PodcastCard key={p.id} podcast={p} />
      ))}
    </div>
  )
}

export function SubscriptionsSection() {
  const { subscriptions } = useSubscriptions()
  if (!subscriptions.length) return null
  return (
    <section aria-labelledby="subs-heading" className="flex flex-col gap-3">
      <h2 id="subs-heading" className="text-xl font-semibold tracking-tight">
        Tus podcasts
      </h2>
      <PodcastGrid podcasts={subscriptions} />
    </section>
  )
}

function GridSkeleton({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" role="status" aria-label={label}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function PodcastsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const [input, setInput] = useState(q)
  const inputRef = useRef<HTMLInputElement>(null)

  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setInput(q)
  }

  useEffect(() => {
    const clean = input.trim()
    if (clean === q) return
    const id = window.setTimeout(() => setParams(clean ? { q: clean } : {}, { replace: true }), 400)
    return () => window.clearTimeout(id)
  }, [input, q, setParams])

  const top = useQuery({ queryKey: ['podcasts', 'top'], queryFn: api.podcastsTop, staleTime: 60 * 60_000, enabled: !q })
  const search = useQuery({
    queryKey: ['podcasts', 'search', q.toLowerCase()],
    queryFn: ({ signal }) => api.podcastsSearch(q, signal),
    enabled: q.length > 0,
    staleTime: 10 * 60_000,
  })

  return (
    <div className="flex flex-col">
      <MobileHeader />
      <div className="sticky top-0 z-10 bg-background/85 px-4 py-4 backdrop-blur md:px-8">
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault()
            const clean = input.trim()
            setParams(clean ? { q: clean } : {})
          }}
        >
          <InputGroup className="h-11 max-w-xl rounded-full bg-input/30">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              ref={inputRef}
              type="search"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Busca podcasts por nombre o tema"
              aria-label="Buscar podcasts"
              enterKeyHint="search"
              className="text-base md:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {input && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Borrar búsqueda"
                  onClick={() => {
                    setInput('')
                    inputRef.current?.focus()
                  }}
                >
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </form>
      </div>

      <div className="flex flex-col gap-10 px-4 pb-10 md:px-8">
        {q ? (
          <section aria-labelledby="podcast-results" className="flex flex-col gap-3">
            <h2 id="podcast-results" className="text-xl font-semibold tracking-tight">
              Resultados para “{q}”
            </h2>
            {search.isPending ? (
              <GridSkeleton label="Buscando podcasts" />
            ) : search.isError ? (
              <LoadError title="No pudimos buscar podcasts" error={search.error} retry={() => search.refetch()} />
            ) : search.data.length ? (
              <PodcastGrid podcasts={search.data} />
            ) : (
              <Empty className="border py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>Sin podcasts para “{q}”</EmptyTitle>
                  <EmptyDescription>Prueba con el nombre del programa, del presentador o con un tema.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        ) : (
          <>
            <SubscriptionsSection />
            <section aria-labelledby="podcast-top" className="flex flex-col gap-3">
              <h2 id="podcast-top" className="text-xl font-semibold tracking-tight">
                Populares en Colombia
              </h2>
              {top.isPending ? (
                <GridSkeleton label="Cargando podcasts populares" />
              ) : top.isError ? (
                <LoadError title="No pudimos cargar los podcasts populares" error={top.error} retry={() => top.refetch()} />
              ) : (
                <PodcastGrid podcasts={top.data} />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function LoadError({ title, error, retry }: { title: string; error: Error; retry: () => void }) {
  return (
    <Alert variant="destructive" className="max-w-xl">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" onClick={retry}>
          Reintentar
        </Button>
      </AlertAction>
    </Alert>
  )
}

export function PodcastPage() {
  const id = useParams().id ?? ''
  const [expanded, setExpanded] = useState(false)
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['podcast', id],
    queryFn: () => api.podcast(id),
    staleTime: 15 * 60_000,
  })
  const { playQueue } = usePlayerActions()

  return (
    <div className="flex flex-col">
      <MobileHeader />
      <div className="flex flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
        {isPending ? (
          <div className="flex flex-col gap-6" role="status" aria-label="Cargando podcast">
            <div className="flex items-end gap-5">
              <Skeleton className="size-40 rounded-xl sm:size-48" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : isError ? (
          <LoadError title="No pudimos abrir este podcast" error={error} retry={() => refetch()} />
        ) : (
          <>
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <Artwork
                src={data.artwork}
                size={500}
                alt={`Portada de ${data.title}`}
                className="size-40 self-center rounded-xl shadow-2xl sm:size-48 sm:self-auto"
              />
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Podcast{data.genre ? ` · ${data.genre}` : ''}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight break-words md:text-5xl">{data.title}</h1>
                  <p className="text-sm text-muted-foreground">{data.author}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {data.episodes[0] && (
                    <Button onClick={() => playQueue([data.episodes[0]], 0)} className="rounded-full">
                      <PlayIcon className="fill-current" />
                      Último episodio
                    </Button>
                  )}
                  <SubscribeButton podcast={data} />
                </div>
              </div>
            </header>

            {data.description && (
              <div className="max-w-3xl">
                <p className={cn('text-sm whitespace-pre-line text-muted-foreground', !expanded && 'line-clamp-3')}>
                  {data.description}
                </p>
                {data.description.length > 220 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    className="mt-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {expanded ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            )}

            <section aria-labelledby="episodes-heading" className="flex flex-col gap-2">
              <h2 id="episodes-heading" className="text-xl font-semibold tracking-tight">
                Episodios
              </h2>
              {data.episodes.length ? (
                <ul className="flex flex-col divide-y">
                  {data.episodes.map(e => (
                    <EpisodeRow key={e.id} episode={e} />
                  ))}
                </ul>
              ) : (
                <Empty className="border py-16">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MicIcon />
                    </EmptyMedia>
                    <EmptyTitle>Sin episodios disponibles</EmptyTitle>
                    <EmptyDescription>Este podcast no publica episodios de audio en abierto.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function EpisodeRow({ episode }: { episode: Episode }) {
  const { current, status } = usePlayer()
  const { playQueue, toggle, playNext, addToQueue } = usePlayerActions()
  const progress = useEpisodeProgress(episode.id)
  const isCurrent = current?.id === episode.id
  const playing = isCurrent && (status === 'playing' || status === 'loading')
  const duration = progress?.duration || episode.duration || 0
  const started = progress && !progress.finished && progress.position > 10
  const remaining = started ? Math.max(0, duration - progress.position) : duration

  return (
    <li className="flex gap-4 py-4">
      <Artwork src={episode.thumbnail} alt="" className="hidden size-20 rounded-lg sm:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">{formatDate(episode.publishedAt)}</p>
        <h3 className={cn('line-clamp-2 font-semibold', isCurrent && 'text-primary')}>{episode.title}</h3>
        {episode.description && <p className="line-clamp-2 text-sm text-muted-foreground">{episode.description}</p>}
        <div className="mt-1 flex items-center gap-3">
          <Button
            size="icon"
            aria-label={`${playing ? 'Pausar' : started ? 'Continuar' : 'Reproducir'} ${episode.title}`}
            onClick={() => (isCurrent ? toggle() : playQueue([episode], 0))}
            className="shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/85"
          >
            {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="translate-x-px fill-current" />}
          </Button>
          {progress?.finished ? (
            <span className="flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle2Icon className="size-4" />
              Escuchado
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              {started && duration > 0 && (
                <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-foreground/15" aria-hidden>
                  <span className="block h-full bg-primary" style={{ width: `${(progress.position / duration) * 100}%` }} />
                </span>
              )}
              {remaining > 0 && (started ? `Quedan ${formatLength(remaining)}` : formatLength(remaining))}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Más opciones para ${episode.title}`} className="ml-auto">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem
                onSelect={() => {
                  playNext(episode)
                  toast.success('Sonará a continuación', { description: episode.title })
                }}
              >
                <ListStartIcon />
                Reproducir a continuación
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  addToQueue(episode)
                  toast.success('Añadido a la cola', { description: episode.title })
                }}
              >
                <ListPlusIcon />
                Añadir a la cola
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => episodeProgress.setFinished(episode.id, !progress?.finished, episode.duration)}>
                {progress?.finished ? <CircleIcon /> : <CheckCircle2Icon />}
                {progress?.finished ? 'Marcar como no escuchado' : 'Marcar como escuchado'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}
