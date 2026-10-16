import { useQuery } from '@tanstack/react-query'
import { PlayIcon, SearchIcon, SparklesIcon } from 'lucide-react'
import { Link } from 'react-router'

import { useAuth } from '@/auth/auth-provider'
import { MobileHeader } from '@/components/app-shell'
import { Artwork } from '@/components/artwork'
import { TrackRow } from '@/components/track-row'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, trackKey, type Track } from '@/lib/api'
import { recentTracks, useStore } from '@/lib/local-store'
import { usePlayerActions } from '@/player/player-provider'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function HomePage() {
  const { user } = useAuth()
  const recents = useStore(recentTracks)

  return (
    <div className="flex flex-col">
      <MobileHeader />
      <div className="flex flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting()}
            {user ? `, ${user.username}` : ''}
          </h1>
          <p className="text-muted-foreground">¿Qué te apetece escuchar hoy?</p>
        </header>

        {recents.length > 0 && <RecentGrid tracks={recents} />}

        {user ? <ForYou /> : <Welcome />}
      </div>
    </div>
  )
}

/** Accesos rápidos estilo "tarjeta horizontal": lo último que escuchaste, a un toque. */
function RecentGrid({ tracks }: { tracks: Track[] }) {
  const { playQueue } = usePlayerActions()
  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
      <h2 id="recent-heading" className="text-xl font-semibold tracking-tight">
        Escuchado recientemente
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tracks.slice(0, 6).map((t, i) => (
          <button
            key={trackKey(t)}
            type="button"
            onClick={() => playQueue(tracks, i)}
            className="group flex items-center gap-3 overflow-hidden rounded-lg bg-card pr-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Artwork src={t.thumbnail} alt="" className="size-14 rounded-none" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{t.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <PlayIcon className="size-4 translate-x-px fill-current" />
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ForYou() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['recommendations'],
    queryFn: api.recommendations,
    staleTime: 10 * 60_000,
  })

  if (isError) return null
  const tracks = data?.recommendations ?? []

  return (
    <section aria-labelledby="foryou-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="foryou-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <SparklesIcon className="size-5 text-primary" />
          Hecho para ti
        </h2>
        {data?.basedOn?.length ? (
          <p className="text-sm text-muted-foreground">Basado en {data.basedOn.slice(0, 3).join(', ')}</p>
        ) : null}
      </div>
      {isPending ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Cargando recomendaciones">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-13" />
          ))}
        </div>
      ) : tracks.length ? (
        <div className="flex flex-col">
          {tracks.map((t, i) => (
            <TrackRow key={trackKey(t)} track={t} position={i} list={tracks} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Escucha algunas canciones y aquí aparecerán recomendaciones para ti.</p>
      )}
    </section>
  )
}

function Welcome() {
  const { setAuthOpen } = useAuth()
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/25 blur-3xl"
      />
      <div className="relative flex max-w-lg flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Toda la música, sin esfuerzo.</h2>
        <p className="text-muted-foreground">
          Busca cualquier canción y empieza a escucharla al instante. Crea una cuenta para recibir recomendaciones que
          aprenden de tus gustos.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" asChild>
            <Link to="/buscar">
              <SearchIcon />
              Empezar a buscar
            </Link>
          </Button>
          <Button size="lg" variant="outline" onClick={() => setAuthOpen(true)}>
            Crear cuenta
          </Button>
        </div>
      </div>
    </section>
  )
}
