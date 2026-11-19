import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/auth-provider'
import { api, ApiError, resolvePlayable, songKey, type Playlist, type Track } from '@/lib/api'
import { usePlayer, usePlayerActions } from '@/player/player-provider'

interface LibraryValue {
  liked: Track[]
  likesLoading: boolean
  isLiked(track: Track): boolean
  toggleLike(track: Track): void
  playlists: Playlist[]
  playlistsLoading: boolean
  createPlaylist(name: string): Promise<Playlist | null>
  renamePlaylist(id: number, name: string): Promise<void>
  deletePlaylist(id: number): Promise<void>
  addToPlaylist(playlist: Playlist, track: Track): Promise<void>
  removeFromPlaylist(playlistId: number, track: Track): Promise<void>
  /** Abre el diálogo para elegir a qué playlist añadir la canción. */
  pickPlaylistFor(track: Track): void
  pickerTrack: Track | null
  closePicker(): void
  startRadio(track: Track): void
}

const LibraryContext = createContext<LibraryValue | null>(null)

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Inténtalo de nuevo.')

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, setAuthOpen } = useAuth()
  const { current } = usePlayer()
  const { playQueue, replaceUpcoming } = usePlayerActions()
  const queryClient = useQueryClient()
  const [pickerTrack, setPickerTrack] = useState<Track | null>(null)

  const savedKey = useMemo(() => ['saved', user?.id], [user?.id])
  const playlistsKey = useMemo(() => ['playlists', user?.id], [user?.id])

  const likesQuery = useQuery({ queryKey: savedKey, queryFn: api.saved, enabled: !!user, staleTime: 5 * 60_000 })
  const playlistsQuery = useQuery({
    queryKey: playlistsKey,
    queryFn: api.playlists,
    enabled: !!user,
    staleTime: 5 * 60_000,
  })

  const liked = useMemo(() => (user ? likesQuery.data ?? [] : []), [user, likesQuery.data])
  const playlists = useMemo(() => (user ? playlistsQuery.data ?? [] : []), [user, playlistsQuery.data])

  // Una canción del catálogo (sin id) cuenta como guardada si coincide en título y artista.
  const likedIndex = useMemo(() => {
    const ids = new Set<string>()
    const keys = new Set<string>()
    for (const t of liked) {
      if (t.id) ids.add(t.id)
      keys.add(songKey(t))
    }
    return { ids, keys }
  }, [liked])

  const isLiked = useCallback(
    (track: Track) => (track.id != null && likedIndex.ids.has(track.id)) || likedIndex.keys.has(songKey(track)),
    [likedIndex],
  )

  /** Las acciones de biblioteca necesitan cuenta: si no hay sesión, abrimos el diálogo de acceso. */
  const requireUser = useCallback(
    (reason: string) => {
      if (user) return true
      toast(reason, { description: 'Inicia sesión o crea una cuenta gratis.' })
      setAuthOpen(true)
      return false
    },
    [user, setAuthOpen],
  )

  const toggleLike = useCallback(
    (track: Track) => {
      if (!requireUser('Inicia sesión para guardar canciones')) return
      const previous = queryClient.getQueryData<Track[]>(savedKey) ?? []
      const key = songKey(track)
      const existing = previous.find(t => (track.id && t.id === track.id) || songKey(t) === key)

      if (existing) {
        // Aún se está guardando (sin id): se podrá quitar en cuanto termine.
        if (!existing.id) return
        queryClient.setQueryData<Track[]>(savedKey, list => (list ?? []).filter(t => t !== existing))
        api.unsave(existing.id!).catch(error => {
          queryClient.setQueryData(savedKey, previous)
          toast.error('No pudimos quitarla de Me gusta', { description: errorMessage(error) })
        })
        return
      }

      // El corazón se rellena al instante; la canción se resuelve y se guarda en segundo plano.
      queryClient.setQueryData<Track[]>(savedKey, list => [track, ...(list ?? [])])
      toast.success('Añadida a Me gusta', { description: track.title })
      resolvePlayable(track)
        .then(async playable => {
          await api.save(playable)
          queryClient.setQueryData<Track[]>(savedKey, list => (list ?? []).map(t => (t === track ? playable : t)))
        })
        .catch(error => {
          queryClient.setQueryData<Track[]>(savedKey, list => (list ?? []).filter(t => t !== track))
          toast.error('No pudimos guardar la canción', { description: errorMessage(error) })
        })
    },
    [requireUser, queryClient, savedKey],
  )

  const refreshPlaylists = useCallback(
    (id?: number) => {
      void queryClient.invalidateQueries({ queryKey: playlistsKey })
      if (id != null) void queryClient.invalidateQueries({ queryKey: ['playlist', id] })
    },
    [queryClient, playlistsKey],
  )

  const createPlaylist = useCallback(
    async (name: string) => {
      if (!requireUser('Inicia sesión para crear playlists')) return null
      try {
        const playlist = await api.createPlaylist(name)
        refreshPlaylists()
        return playlist
      } catch (error) {
        toast.error('No pudimos crear la playlist', { description: errorMessage(error) })
        return null
      }
    },
    [requireUser, refreshPlaylists],
  )

  const renamePlaylist = useCallback(
    async (id: number, name: string) => {
      try {
        await api.renamePlaylist(id, name)
        refreshPlaylists(id)
      } catch (error) {
        toast.error('No pudimos renombrar la playlist', { description: errorMessage(error) })
      }
    },
    [refreshPlaylists],
  )

  const deletePlaylist = useCallback(
    async (id: number) => {
      try {
        await api.deletePlaylist(id)
        refreshPlaylists()
        queryClient.removeQueries({ queryKey: ['playlist', id] })
        toast.success('Playlist eliminada')
      } catch (error) {
        toast.error('No pudimos eliminar la playlist', { description: errorMessage(error) })
      }
    },
    [refreshPlaylists, queryClient],
  )

  const addToPlaylist = useCallback(
    async (playlist: Playlist, track: Track) => {
      try {
        await api.addToPlaylist(playlist.id, await resolvePlayable(track))
        refreshPlaylists(playlist.id)
        toast.success(`Añadida a ${playlist.name}`, { description: track.title })
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) toast(`Ya está en ${playlist.name}`)
        else toast.error('No pudimos añadirla a la playlist', { description: errorMessage(error) })
      }
    },
    [refreshPlaylists],
  )

  const removeFromPlaylist = useCallback(
    async (playlistId: number, track: Track) => {
      if (!track.id) return
      try {
        await api.removeFromPlaylist(playlistId, track.id)
        refreshPlaylists(playlistId)
      } catch (error) {
        toast.error('No pudimos quitarla de la playlist', { description: errorMessage(error) })
      }
    },
    [refreshPlaylists],
  )

  const pickPlaylistFor = useCallback(
    (track: Track) => {
      // Se abre tras cerrarse el menú que lo lanza; si no, Radix puede dejar la página sin responder a clics.
      if (requireUser('Inicia sesión para usar playlists')) window.setTimeout(() => setPickerTrack(track), 0)
    },
    [requireUser],
  )

  const startRadio = useCallback(
    (track: Track) => {
      if (!requireUser('Inicia sesión para escuchar la radio')) return
      const isCurrent = current != null && songKey(current) === songKey(track)
      const loading = toast.loading(`Preparando la radio de “${track.title}”…`)
      api
        .radio(track)
        .then(tracks => {
          const upcoming = tracks.filter(t => songKey(t) !== songKey(track))
          if (!upcoming.length) throw new Error('No encontramos canciones parecidas.')
          // Si ya suena la canción base, no la cortamos: solo cambiamos lo que viene después.
          if (isCurrent) replaceUpcoming(upcoming)
          else playQueue([track, ...upcoming], 0)
          toast.success(`Radio de “${track.title}”`, { id: loading, description: `${upcoming.length} canciones en cola` })
        })
        .catch(error => toast.error('No pudimos crear la radio', { id: loading, description: errorMessage(error) }))
    },
    [requireUser, current, playQueue, replaceUpcoming],
  )

  const value = useMemo<LibraryValue>(
    () => ({
      liked,
      likesLoading: !!user && likesQuery.isPending,
      isLiked,
      toggleLike,
      playlists,
      playlistsLoading: !!user && playlistsQuery.isPending,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      pickPlaylistFor,
      pickerTrack,
      closePicker: () => setPickerTrack(null),
      startRadio,
    }),
    [
      liked,
      user,
      likesQuery.isPending,
      isLiked,
      toggleLike,
      playlists,
      playlistsQuery.isPending,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      pickPlaylistFor,
      pickerTrack,
      startRadio,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary debe usarse dentro de <LibraryProvider>')
  return ctx
}
