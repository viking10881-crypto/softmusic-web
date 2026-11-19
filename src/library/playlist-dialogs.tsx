import { ListMusicIcon, LoaderCircleIcon, PlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Artwork } from '@/components/artwork'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useLibrary } from '@/library/library-provider'

/** Nombre de una playlist: sirve para crearla y para renombrarla. */
export function PlaylistNameDialog({
  open,
  onOpenChange,
  title,
  initialName = '',
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  initialName?: string
  submitLabel: string
  onSubmit(name: string): Promise<unknown>
}) {
  const [pending, setPending] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
    if (!name) return
    setPending(true)
    try {
      await onSubmit(name)
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">Escribe el nombre de la playlist.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="playlist-name">Nombre</Label>
            <Input
              id="playlist-name"
              name="name"
              defaultValue={initialName}
              placeholder="Mi playlist"
              maxLength={100}
              required
              autoFocus
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircleIcon className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Diálogo global para elegir a qué playlist va una canción (se abre con `pickPlaylistFor`). */
export function AddToPlaylistDialog() {
  const { pickerTrack, closePicker, playlists, playlistsLoading, addToPlaylist, createPlaylist } = useLibrary()
  const [creating, setCreating] = useState(false)
  const track = pickerTrack

  return (
    <>
      <Dialog open={track != null && !creating} onOpenChange={open => !open && closePicker()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Añadir a playlist</DialogTitle>
            <DialogDescription className="truncate">
              {track?.title} · {track?.artist}
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-2 flex max-h-80 flex-col overflow-y-auto">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-3 rounded-lg p-2 text-left text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-muted">
                <PlusIcon className="size-5" />
              </span>
              Nueva playlist
            </button>
            {playlistsLoading
              ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="m-2 h-10" />)
              : playlists.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (track) void addToPlaylist(p, track)
                      closePicker()
                    }}
                    className="flex items-center gap-3 rounded-lg p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PlaylistCover playlist={p} className="size-10" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{countLabel(p.track_count)}</span>
                    </span>
                  </button>
                ))}
          </div>
        </DialogContent>
      </Dialog>

      <PlaylistNameDialog
        open={creating}
        onOpenChange={open => {
          setCreating(open)
          if (!open) closePicker()
        }}
        title="Nueva playlist"
        submitLabel="Crear y añadir"
        onSubmit={async name => {
          const playlist = await createPlaylist(name)
          if (playlist && track) await addToPlaylist(playlist, track)
        }}
      />
    </>
  )
}

export function countLabel(count = 0) {
  return count === 1 ? '1 canción' : `${count} canciones`
}

export function PlaylistCover({ playlist, className }: { playlist: { cover?: string | null }; className?: string }) {
  return playlist.cover ? (
    <Artwork src={playlist.cover} className={className} />
  ) : (
    <span className={`flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/60 to-primary/20 ${className ?? ''}`}>
      <ListMusicIcon className="size-1/2 text-primary-foreground" aria-hidden />
    </span>
  )
}
