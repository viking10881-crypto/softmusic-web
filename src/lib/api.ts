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

  recommendations: () => request<{ recommendations: Track[]; basedOn: string[] }>('/api/recommendations?limit=20'),
}

/** Las URL de proxy del backend son relativas; las directas (Deezer) ya son absolutas. */
export function absoluteUrl(url: string) {
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

export function trackKey(track: Track) {
  return track.id ?? track.catalogId ?? `${track.artist}::${track.title}`
}
