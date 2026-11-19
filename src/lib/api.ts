export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

/** Canción tal como la devuelve el backend. Las del catálogo (Deezer) llegan sin `id` reproducible. */
export interface Track {
  id?: string
  catalogId?: string
  title: string
  titleShort?: string
  artist: string
  album?: string
  thumbnail?: string
  duration?: number
  durationStr?: string
  explicit?: boolean
  source?: string
  playable?: boolean
  isPreview?: boolean
}

export interface Artist {
  id: string
  name: string
  thumbnail?: string
}

export interface Album {
  id: string
  title: string
  artist: string
  thumbnail?: string
}

export interface Suggestion {
  type: 'track' | 'artist' | 'album'
  value: string
  subtitle?: string
  thumbnail?: string
}

export interface SearchResponse {
  results: Track[]
  artists: Artist[]
  albums: Album[]
  catalogTracks: Track[]
  correction?: string | null
  interpretedQuery?: string
}

export type StreamInfo =
  | { mode: 'youtube-iframe'; videoId: string; source: 'youtube'; isPreview: false }
  | { mode: 'direct' | 'proxy' | 'range-proxy'; url: string; source: string; isPreview: boolean }

export interface User {
  id: number
  username: string
  email: string
}

export interface Podcast {
  id: string
  title: string
  author: string
  artwork: string
  genre?: string
  episodeCount?: number
  description?: string
}

/** Un episodio es una pista más (`source: 'podcast'`, id `pd_...`) con algunos datos propios. */
export interface Episode extends Track {
  id: string
  description?: string
  publishedAt?: string | null
  podcastId: string
}

export interface PodcastDetail extends Podcast {
  episodes: Episode[]
}

export const isPodcast = (track: Track | null | undefined) => track?.source === 'podcast'

export interface Playlist {
  id: number
  name: string
  cover?: string | null
  track_count?: number
  created_at?: string
}

/** Fila tal como la guardan las tablas `saved_tracks`/`playlist_tracks`: el id va en `track_id` o en `id`. */
interface StoredTrack {
  id?: string
  track_id?: string
  title?: string | null
  artist?: string | null
  album?: string | null
  thumbnail?: string | null
  duration?: number | null
  source?: string | null
}

function fromStored(row: StoredTrack): Track {
  return {
    id: row.id ?? row.track_id,
    title: row.title || 'Sin título',
    artist: row.artist || 'Artista desconocido',
    album: row.album ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    duration: row.duration ?? undefined,
    source: row.source ?? undefined,
  }
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const TOKEN_KEY = 'softmusic.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* almacenamiento bloqueado: la sesión dura solo esta pestaña */
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Algo salió mal. Inténtalo de nuevo.', res.status, data.code)
  return data as T
}

export const api = {
  search: (q: string, signal?: AbortSignal) =>
    request<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}&limit=30`, { signal }),

  suggest: (q: string, signal?: AbortSignal) =>
    request<{ suggestions: Suggestion[]; correction: string | null }>(
      `/api/search/suggest?q=${encodeURIComponent(q)}`,
      { signal },
    ),

  /** Convierte una canción del catálogo en una con fuente reproducible (YouTube, Audius o SoundCloud). */
  resolve: (track: Track) =>
    request<{ track: Track }>('/api/search/resolve', { method: 'POST', body: JSON.stringify(track) }),

  streamUrl: (trackId: string) => request<StreamInfo>(`/api/stream/url/${encodeURIComponent(trackId)}`),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (username: string, email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  /** Registra que una canción empezó a sonar; devuelve el id del evento para ir actualizándolo. */
  addHistory: (track: Track) =>
    request<{ historyId: number }>('/api/history', {
      method: 'POST',
      body: JSON.stringify({
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        thumbnail: track.thumbnail,
        source: track.source,
        duration: track.duration,
        context_type: 'web',
      }),
    }),

  /** `keepalive` permite que la petición termine aunque se esté cerrando la pestaña. */
  updateHistory: (historyId: number, data: { progress_ms: number; listened_ms: number; completed: boolean }) =>
    request<unknown>(`/api/history/${historyId}`, { method: 'PATCH', body: JSON.stringify(data), keepalive: true }),

  saved: () => request<{ tracks: StoredTrack[] }>('/api/saved').then(r => r.tracks.map(fromStored)),
  save: (track: Track) => request<unknown>('/api/saved', json('POST', track)),
  unsave: (trackId: string) => request<unknown>(`/api/saved/${encodeURIComponent(trackId)}`, { method: 'DELETE' }),

  /** Radio personalizada a partir de una canción: canciones parecidas, ya reproducibles. */
  radio: (track: Track) => {
    const params = new URLSearchParams({ seedArtist: track.artist, limit: '30' })
    if (track.id) params.set('seedTrackId', track.id)
    return request<{ tracks: Track[] }>(`/api/radio?${params}`).then(r => r.tracks)
  },

  playlists: () => request<{ playlists: Playlist[] }>('/api/playlists').then(r => r.playlists),
  createPlaylist: (name: string) =>
    request<{ playlist: Playlist }>('/api/playlists', json('POST', { name })).then(r => r.playlist),
  renamePlaylist: (id: number, name: string) =>
    request<{ playlist: Playlist }>(`/api/playlists/${id}`, json('PUT', { name })).then(r => r.playlist),
  deletePlaylist: (id: number) => request<unknown>(`/api/playlists/${id}`, { method: 'DELETE' }),
  playlistTracks: (id: number) =>
    request<{ playlist: Playlist; tracks: StoredTrack[] }>(`/api/playlists/${id}/tracks`).then(r => ({
      playlist: r.playlist,
      tracks: r.tracks.map(fromStored),
    })),
  addToPlaylist: (id: number, track: Track) =>
    request<unknown>(
      `/api/playlists/${id}/tracks`,
      json('POST', {
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        source: track.source,
        duration: track.duration,
      }),
    ),
  removeFromPlaylist: (id: number, trackId: string) =>
    request<unknown>(`/api/playlists/${id}/tracks/${encodeURIComponent(trackId)}`, { method: 'DELETE' }),

  podcastsTop: () => request<{ podcasts: Podcast[] }>('/api/podcasts/top?limit=24').then(r => r.podcasts),
  podcastsSearch: (q: string, signal?: AbortSignal) =>
    request<{ podcasts: Podcast[] }>(`/api/podcasts/search?q=${encodeURIComponent(q)}&limit=24`, { signal }).then(
      r => r.podcasts,
    ),
  podcast: (id: string) =>
    request<{ podcast: PodcastDetail }>(`/api/podcasts/${encodeURIComponent(id)}`).then(r => r.podcast),

  podcastSubscriptions: () =>
    request<{ podcasts: Podcast[] }>('/api/podcasts/subscriptions').then(r => r.podcasts),
  subscribe: (podcast: Podcast) =>
    request<unknown>(
      '/api/podcasts/subscriptions',
      json('POST', { id: podcast.id, title: podcast.title, author: podcast.author, artwork: podcast.artwork }),
    ),
  unsubscribe: (id: string) =>
    request<unknown>(`/api/podcasts/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  recommendations: () => request<{ recommendations: Track[]; basedOn: string[] }>('/api/recommendations?limit=20'),
}

/** Las URL de proxy del backend son relativas; las directas (Deezer) ya son absolutas. */
export function absoluteUrl(url: string) {
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

/**
 * Devuelve la canción con un `id` reproducible. Las del catálogo (Deezer) se resuelven contra una fuente
 * completa; si no hay ninguna, se usa la vista previa de 30 s de Deezer.
 */
export async function resolvePlayable(track: Track): Promise<Track> {
  if (track.id) return track
  try {
    const { track: resolved } = await api.resolve(track)
    // Conservamos la portada y metadatos del catálogo, que son más limpios que los de la fuente.
    return { ...resolved, ...track, id: resolved.id, source: resolved.source }
  } catch (error) {
    const noSource = error instanceof ApiError && error.code === 'SOURCE_NOT_FOUND'
    if (!noSource || !track.catalogId?.startsWith('dz_')) throw error
    return { ...track, id: track.catalogId }
  }
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Identifica la misma canción aunque venga de fuentes distintas (catálogo sin id frente a resuelta). */
export function songKey(track: Pick<Track, 'title' | 'artist'>) {
  return `${fold(track.artist)}|${fold(track.title)}`
}

export function trackKey(track: Track) {
  return track.id ?? track.catalogId ?? `${track.artist}::${track.title}`
}
