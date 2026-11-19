import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, HeartIcon, ListMusicIcon, MoreHorizontalIcon, PencilIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useAuth } from '@/auth/auth-provider'
import { MobileHeader } from '@/components/app-shell'
import { Artwork } from '@/components/artwork'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { api } from '@/lib/api'
import {
  CollectionHeader,
  LibraryList,
  LikedCover,
  SignInPrompt,
  TrackList,
  TrackListSkeleton,
} from '@/library/collection'
import { useLibrary } from '@/library/library-provider'
import { PlaylistCover, PlaylistNameDialog } from '@/library/playlist-dialogs'

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <MobileHeader />
      <div className="flex flex-col gap-8 px-4 py-6 md:px-8 md:py-8">{children}</div>
    </div>
  )
}

function SearchCta() {
  return (
    <Button asChild variant="outline">
      <Link to="/buscar">
        <SearchIcon />
        Buscar canciones
      </Link>
    </Button>
  )
}

/** Biblioteca: pensada para móvil, donde no hay barra lateral. */
export function LibraryPage() {
  return (
    <Page>
      <LibraryList />
    </Page>
  )
}

export function LikedPage() {
  const { user, checking } = useAuth()
  const { liked, likesLoading } = useLibrary()

  if (!user && !checking)
    return (
      <Page>
        <SignInPrompt title="Guarda las canciones que te gustan" description="Inicia sesión para tener tus favoritas en todos tus dispositivos." />
      </Page>
    )
  if (checking || likesLoading)
    return (
      <Page>
        <TrackListSkeleton label="Cargando tus Me gusta" />
      </Page>
    )

  return (
    <Page>
      <CollectionHeader kind="Lista" title="Me gusta" tracks={liked} cover={<LikedCover />} />
      {liked.length ? (
        <TrackList tracks={liked} />
      ) : (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HeartIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes canciones guardadas</EmptyTitle>
            <EmptyDescription>Toca el corazón de cualquier canción para guardarla aquí.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SearchCta />
          </EmptyContent>
        </Empty>
      )}
    </Page>
  )
}

export function PlaylistPage() {
  const id = Number(useParams().id)
  const { user, checking } = useAuth()
  const { renamePlaylist, deletePlaylist, removeFromPlaylist } = useLibrary()
  const navigate = useNavigate()
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => api.playlistTracks(id),
    enabled: !!user && Number.isSafeInteger(id),
  })

  if (!user && !checking)
    return (
      <Page>
        <SignInPrompt title="Tus playlists te esperan" description="Inicia sesión para ver y editar tus playlists." />
      </Page>
    )
  if (isError)
    return (
      <Page>
        <Alert variant="destructive" className="max-w-xl">
          <CircleAlertIcon />
          <AlertTitle>No pudimos abrir la playlist</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </Page>
    )
  if (checking || isPending)
    return (
      <Page>
        <TrackListSkeleton label="Cargando playlist" />
      </Page>
    )

  const { playlist, tracks } = data
  const firstCover = tracks.find(t => t.thumbnail)?.thumbnail

  return (
    <Page>
      <CollectionHeader
        kind="Playlist"
        title={playlist.name}
        tracks={tracks}
        cover={firstCover ? <Artwork src={firstCover} size={500} alt="" /> : <PlaylistCover playlist={playlist} />}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label={`Opciones de ${playlist.name}`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <PencilIcon />
                Renombrar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2Icon />
                Eliminar playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {tracks.length ? (
        <TrackList tracks={tracks} onRemove={t => removeFromPlaylist(playlist.id, t)} removeLabel="Quitar de esta playlist" />
      ) : (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListMusicIcon />
            </EmptyMedia>
            <EmptyTitle>Esta playlist está vacía</EmptyTitle>
            <EmptyDescription>Busca canciones y añádelas desde su menú ⋯ → “Añadir a playlist…”.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SearchCta />
          </EmptyContent>
        </Empty>
      )}

      <PlaylistNameDialog
        key={playlist.name}
        open={renaming}
        onOpenChange={setRenaming}
        title="Renombrar playlist"
        initialName={playlist.name}
        submitLabel="Guardar"
        onSubmit={name => renamePlaylist(playlist.id, name)}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar “{playlist.name}”?</DialogTitle>
            <DialogDescription>La playlist desaparecerá de tu biblioteca. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setConfirmDelete(false)
                await deletePlaylist(playlist.id)
                navigate('/biblioteca', { replace: true })
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
