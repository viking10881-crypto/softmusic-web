import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, PlayIcon, SearchIcon, SearchXIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { MobileHeader } from '@/components/app-shell'
import { Artwork } from '@/components/artwork'
import { TrackRow } from '@/components/track-row'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Track } from '@/lib/api'
import { recentSearches } from '@/lib/local-store'
import { usePlayerActions } from '@/player/player-provider'

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Une resultados reproducibles y del catálogo sin duplicar la misma canción. */
function mergeTracks(...lists: Track[][]) {
  const seen = new Set<string>()
  const out: Track[] = []
  for (const t of lists.flat()) {
    const key = `${fold(t.artist)}|${fold(t.titleShort || t.title)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const [input, setInput] = useState(q)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza el campo si la URL cambia desde fuera (paleta ⌘K, enlaces de artista).
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setInput(q)
  }

  // Escribir actualiza la URL con un pequeño retraso: búsqueda en vivo sin una petición por tecla.
  useEffect(() => {
    const clean = input.trim()
    if (clean === q) return
    const id = window.setTimeout(() => setParams(clean ? { q: clean } : {}, { replace: true }), 350)
    return () => window.clearTimeout(id)
  }, [input, q, setParams])

  useEffect(() => {
    if (!q) inputRef.current?.focus()
  }, [q])

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['search', q.toLowerCase()],
    queryFn: ({ signal }) => api.search(q, signal),
    enabled: q.length > 0,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (data && q) recentSearches.push(q)
  }, [data, q])

  const tracks = useMemo(() => (data ? mergeTracks(data.results, data.catalogTracks).slice(0, 30) : []), [data])

  return (
    <div className="flex flex-col">
      <MobileHeader />
      <div className="sticky top-0 z-10 bg-background/85 px-4 py-4 backdrop-blur md:px-8">
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault()
            const clean = input.trim()
            if (clean) setParams({ q: clean })
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
              placeholder="Canciones, artistas o álbumes"
              aria-label="Buscar música"
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

      <div className="flex flex-col gap-10 px-4 pb-10 md:px-8" aria-busy={isFetching}>
        {!q ? (
          <Browse onPick={setInput} />
        ) : isPending ? (
          <ResultsSkeleton />
        ) : isError ? (
          <Alert variant="destructive" className="max-w-xl">
            <CircleAlertIcon />
            <AlertTitle>No pudimos completar la búsqueda</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        ) : tracks.length === 0 && !data.artists.length ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>Sin resultados para “{q}”</EmptyTitle>
              <EmptyDescription>Revisa la ortografía o prueba con el nombre del artista.</EmptyDescription>
            </EmptyHeader>
            {data.correction && (
              <EmptyContent>
                <Button variant="outline" onClick={() => setParams({ q: data.correction! })}>
                  Buscar “{data.correction}”
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <>
            {data.correction && fold(data.correction) !== fold(q) && (
              <p className="text-sm text-muted-foreground">
                ¿Quisiste decir{' '}
                <Link to={`/buscar?q=${encodeURIComponent(data.correction)}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {data.correction}
                </Link>
                ?
              </p>
            )}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {tracks[0] && <TopResult track={tracks[0]} list={tracks} />}
              <section aria-labelledby="songs-heading" className="flex min-w-0 flex-col gap-2">
                <h2 id="songs-heading" className="text-xl font-semibold tracking-tight">
                  Canciones
                </h2>
                <div className="flex flex-col">
                  {tracks.slice(0, 5).map((t, i) => (
                    <TrackRow key={`${t.catalogId ?? t.id}-${i}`} track={t} position={i} list={tracks} showAlbum={false} />
                  ))}
                </div>
              </section>
            </div>

            {data.artists.length > 0 && (
              <section aria-labelledby="artists-heading" className="flex flex-col gap-3">
                <h2 id="artists-heading" className="text-xl font-semibold tracking-tight">
                  Artistas
                </h2>
                <div className="-mx-2 flex snap-x gap-2 overflow-x-auto pb-2">
                  {data.artists.slice(0, 10).map(a => (
                    <Link
                      key={a.id}
                      to={`/buscar?q=${encodeURIComponent(a.name)}`}
                      className="group flex w-36 shrink-0 snap-start flex-col items-center gap-3 rounded-xl p-3 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Artwork src={a.thumbnail} size={250} alt="" className="size-28 rounded-full shadow-lg" />
                      <span className="w-full truncate text-center text-sm font-medium">{a.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {tracks.length > 5 && (
              <section aria-labelledby="more-heading" className="flex flex-col gap-2">
                <h2 id="more-heading" className="text-xl font-semibold tracking-tight">
                  Más canciones
                </h2>
                <div className="flex flex-col">
                  {tracks.slice(5).map((t, i) => (
                    <TrackRow key={`${t.catalogId ?? t.id}-${i + 5}`} track={t} position={i + 5} list={tracks} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TopResult({ track, list }: { track: Track; list: Track[] }) {
  const { playQueue } = usePlayerActions()
  return (
    <section aria-labelledby="top-heading" className="flex flex-col gap-2">
      <h2 id="top-heading" className="text-xl font-semibold tracking-tight">
        Mejor resultado
      </h2>
      <div className="group relative flex flex-col gap-4 rounded-xl bg-card p-5 transition-colors hover:bg-accent/50">
        <Artwork src={track.thumbnail} size={250} alt="" className="size-24 shadow-lg" />
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold tracking-tight">{track.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            Canción · <span className="text-foreground">{track.artist}</span>
          </p>
        </div>
        <Button
          size="icon-lg"
          aria-label={`Reproducir ${track.title}`}
          onClick={() => playQueue(list, 0)}
          className="absolute right-5 bottom-5 size-12 rounded-full shadow-xl transition-all md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100"
        >
          <PlayIcon className="size-5 translate-x-px fill-current" />
        </Button>
      </div>
    </section>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" role="status" aria-label="Cargando resultados">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-1.5">
            <Skeleton className="size-10" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MOODS = [
  { label: 'Reguetón', hue: 330 },
  { label: 'Salsa', hue: 25 },
  { label: 'Rock en español', hue: 0 },
  { label: 'Lo-fi', hue: 260 },
  { label: 'Vallenato', hue: 140 },
  { label: 'Pop latino', hue: 300 },
  { label: 'Electrónica', hue: 200 },
  { label: 'Baladas', hue: 45 },
]

function Browse({ onPick }: { onPick: (q: string) => void }) {
  return (
    <section aria-labelledby="browse-heading" className="flex flex-col gap-4">
      <h2 id="browse-heading" className="text-xl font-semibold tracking-tight">
        Explorar
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MOODS.map(({ label, hue }) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            style={{ backgroundColor: `oklch(0.42 0.11 ${hue})` }}
            className="flex aspect-[16/9] items-start rounded-xl p-4 text-left text-lg font-bold text-white outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
