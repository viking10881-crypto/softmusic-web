import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { absoluteUrl, api, ApiError, type Track } from '@/lib/api'
import { loadYouTubeApi, YT_STATE, type YTPlayer } from '@/lib/youtube'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
export type RepeatMode = 'off' | 'all' | 'one'
type Engine = 'audio' | 'youtube' | null

interface PlayerState {
  queue: Track[]
  index: number
  current: Track | null
  status: PlayerStatus
  engine: Engine
  isPreview: boolean
  volume: number
  muted: boolean
  repeat: RepeatMode
}

interface PlayerActions {
  playQueue(tracks: Track[], startIndex?: number): void
  playNext(track: Track): void
  addToQueue(track: Track): void
  removeFromQueue(index: number): void
  jumpTo(index: number): void
  toggle(): void
  next(): void
  previous(): void
  seek(seconds: number): void
  setVolume(volume: number): void
  toggleMute(): void
  cycleRepeat(): void
  /** El dock de YouTube registra aquí el elemento donde se monta el iframe visible. */
  registerYouTubeHost(el: HTMLDivElement | null): void
}

interface Progress {
  currentTime: number
  duration: number
}

const StateContext = createContext<PlayerState | null>(null)
const ActionsContext = createContext<PlayerActions | null>(null)
// El progreso cambia varias veces por segundo: va en su propio contexto para no re-renderizar toda la app.
const ProgressContext = createContext<Progress>({ currentTime: 0, duration: 0 })

const VOLUME_KEY = 'softmusic.volume'

// Un único elemento de audio para toda la app (solo hay un reproductor).
const audio = new Audio()

function readVolume() {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.8
  } catch {
    return 0.8
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([])
  const [index, setIndex] = useState(-1)
  const [status, setStatus] = useState<PlayerStatus>('idle')
  const [engine, setEngine] = useState<Engine>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [volume, setVolumeState] = useState(readVolume)
  const [muted, setMuted] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>('off')
  const [progress, setProgress] = useState<Progress>({ currentTime: 0, duration: 0 })

  const ytHost = useRef<HTMLDivElement | null>(null)
  const ytPlayer = useRef<Promise<YTPlayer> | null>(null)
  const loadToken = useRef(0)

  // Referencia siempre actualizada para callbacks de eventos (ended, Media Session, YouTube).
  const live = useRef({ queue, index, repeat, engine, currentTime: 0, volume, muted })
  useLayoutEffect(() => {
    live.current = { queue, index, repeat, engine, currentTime: progress.currentTime, volume, muted }
  })

  const current = index >= 0 ? queue[index] ?? null : null

  const stopEngines = useCallback(() => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    ytPlayer.current?.then(p => p.stopVideo()).catch(() => {})
  }, [])

  const ensureYouTube = useCallback((onEvent: (state: number) => void, onError: () => void) => {
    if (ytPlayer.current) return ytPlayer.current
    ytPlayer.current = loadYouTubeApi().then(
      YT =>
        new Promise<YTPlayer>((resolve, reject) => {
          if (!ytHost.current) return reject(new Error('El reproductor de video no está disponible.'))
          const mount = document.createElement('div')
          ytHost.current.replaceChildren(mount)
          const player = new YT.Player(mount, {
            width: '100%',
            height: '100%',
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: () => {
                player.setVolume(live.current.muted ? 0 : live.current.volume * 100)
                resolve(player)
              },
              onStateChange: e => onEvent(e.data),
              onError: onError,
            },
          })
        }),
    )
    ytPlayer.current.catch(() => {
      ytPlayer.current = null
    })
    return ytPlayer.current
  }, [])

  // Declarados con ref para romper la dependencia circular load → ended → next → load.
  const handlers = useRef({ ended: () => {}, failed: (_t: Track, _e: unknown) => {} })

  const load = useCallback(
    async (list: Track[], at: number) => {
      const token = ++loadToken.current
      const track = list[at]
      if (!track) return
      stopEngines()
      setProgress({ currentTime: 0, duration: track.duration ?? 0 })
      setStatus('loading')

      try {
        let playable = track
        if (!track.id) {
          try {
            const { track: resolved } = await api.resolve(track)
            // Conservamos la portada y metadatos del catálogo, que son más limpios que los de la fuente.
            playable = { ...resolved, ...track, id: resolved.id, source: resolved.source }
          } catch (error) {
            // Sin fuente completa: mejor 30 s de vista previa de Deezer que silencio.
            const noSource = error instanceof ApiError && error.code === 'SOURCE_NOT_FOUND'
            if (!noSource || !track.catalogId?.startsWith('dz_')) throw error
            playable = { ...track, id: track.catalogId }
          }
          if (token !== loadToken.current) return
          setQueue(q => q.map((t, i) => (i === at && t === track ? playable : t)))
        }

        const info = await api.streamUrl(playable.id!)
        if (token !== loadToken.current) return
        setIsPreview(Boolean(info.isPreview))

        if (info.mode === 'youtube-iframe') {
          setEngine('youtube')
          const yt = await ensureYouTube(
            state => {
              if (state === YT_STATE.PLAYING) setStatus('playing')
              else if (state === YT_STATE.PAUSED) setStatus('paused')
              else if (state === YT_STATE.BUFFERING) setStatus('loading')
              else if (state === YT_STATE.ENDED) handlers.current.ended()
            },
            () => {
              const t = live.current.queue[live.current.index]
              if (t) handlers.current.failed(t, new Error('YouTube no permite reproducir este video aquí.'))
            },
          )
          if (token !== loadToken.current) return
          yt.loadVideoById(info.videoId)
        } else {
          setEngine('audio')
          audio.src = absoluteUrl(info.url)
          await audio.play()
        }
      } catch (error) {
        if (token !== loadToken.current) return
        handlers.current.failed(track, error)
      }
    },
    [ensureYouTube, stopEngines],
  )

  const playIndex = useCallback(
    (list: Track[], at: number) => {
      setQueue(list)
      setIndex(at)
      void load(list, at)
    },
    [load],
  )

  const next = useCallback(() => {
    const { queue: q, index: i, repeat: r } = live.current
    if (i < q.length - 1) playIndex(q, i + 1)
    else if (r === 'all' && q.length) playIndex(q, 0)
    else {
      stopEngines()
      setStatus('paused')
    }
  }, [playIndex, stopEngines])

  const seek = useCallback(
    (seconds: number) => {
      if (live.current.engine === 'youtube') ytPlayer.current?.then(p => p.seekTo(seconds, true))
      else if (Number.isFinite(audio.duration)) audio.currentTime = seconds
      setProgress(p => ({ ...p, currentTime: seconds }))
    },
    [],
  )

  useLayoutEffect(() => {
    handlers.current.ended = () => {
      const { queue: q, index: i, repeat: r } = live.current
      if (r === 'one') {
        seek(0)
        if (live.current.engine === 'youtube') ytPlayer.current?.then(p => p.playVideo())
        else void audio.play()
      } else if (i < q.length - 1 || r === 'all') next()
      else setStatus('paused')
    }

    handlers.current.failed = (track, error) => {
      setStatus('error')
      const message = error instanceof Error ? error.message : 'Error desconocido'
      const hasNext = live.current.index < live.current.queue.length - 1
      toast.error(`No pudimos reproducir “${track.title}”`, {
        description: message,
        action: hasNext ? { label: 'Siguiente', onClick: () => next() } : undefined,
      })
    }
  })

  // Eventos del elemento <audio>.
  useEffect(() => {
    const onTime = () => setProgress({ currentTime: audio.currentTime, duration: audio.duration || 0 })
    const onPlay = () => setStatus('playing')
    const onPause = () => setStatus(s => (s === 'loading' ? s : 'paused'))
    const onWaiting = () => setStatus('loading')
    const onEnded = () => handlers.current.ended()
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onTime)
    audio.addEventListener('playing', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onTime)
      audio.removeEventListener('playing', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  // YouTube no emite timeupdate: consultamos el tiempo mientras suena.
  useEffect(() => {
    if (engine !== 'youtube' || status !== 'playing') return
    const id = window.setInterval(() => {
      ytPlayer.current?.then(p => setProgress({ currentTime: p.getCurrentTime(), duration: p.getDuration() }))
    }, 500)
    return () => window.clearInterval(id)
  }, [engine, status])

  // Volumen sincronizado con ambos motores y recordado entre sesiones.
  useEffect(() => {
    audio.volume = volume
    audio.muted = muted
    ytPlayer.current?.then(p => p.setVolume(muted ? 0 : volume * 100)).catch(() => {})
    try {
      localStorage.setItem(VOLUME_KEY, String(volume))
    } catch {
      /* sin almacenamiento */
    }
  }, [volume, muted, engine])

  const toggle = useCallback(() => {
    const { queue: q, index: i, engine: e } = live.current
    if (status === 'idle' || status === 'error') {
      if (q[i]) void load(q, i)
      return
    }
    const playing = status === 'playing' || status === 'loading'
    if (e === 'youtube') ytPlayer.current?.then(p => (playing ? p.pauseVideo() : p.playVideo()))
    else if (playing) audio.pause()
    else void audio.play().catch(() => {})
  }, [load, status])

  const previous = useCallback(() => {
    const { queue: q, index: i, currentTime } = live.current
    if (currentTime > 3 || i <= 0) seek(0)
    else playIndex(q, i - 1)
  }, [playIndex, seek])

  // Controles del sistema operativo: pantalla de bloqueo, teclas multimedia, auriculares.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? '',
      artwork: current.thumbnail ? [{ src: current.thumbnail, sizes: '512x512' }] : [],
    })
    const set = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn)
      } catch {
        /* acción no soportada */
      }
    }
    set('play', toggle)
    set('pause', toggle)
    set('nexttrack', next)
    set('previoustrack', previous)
    set('seekto', d => d.seekTime != null && seek(d.seekTime))
  }, [current, toggle, next, previous, seek])

  useEffect(() => {
    document.title = current && status !== 'idle' ? `${current.title} · ${current.artist} — SoftMusic` : 'SoftMusic'
  }, [current, status])

  const actions = useMemo<PlayerActions>(
    () => ({
      playQueue: (tracks, startIndex = 0) => playIndex(tracks, startIndex),
      playNext: track => {
        const { queue: q, index: i } = live.current
        if (i < 0) return playIndex([track], 0)
        setQueue([...q.slice(0, i + 1), track, ...q.slice(i + 1)])
      },
      addToQueue: track => {
        const { queue: q, index: i } = live.current
        if (i < 0) return playIndex([track], 0)
        setQueue([...q, track])
      },
      removeFromQueue: at => {
        const { index: i } = live.current
        if (at === i) return
        setQueue(q => q.filter((_, idx) => idx !== at))
        if (at < i) setIndex(i - 1)
      },
      jumpTo: at => playIndex(live.current.queue, at),
      toggle,
      next,
      previous,
      seek,
      setVolume: v => {
        setVolumeState(Math.min(1, Math.max(0, v)))
        if (v > 0) setMuted(false)
      },
      toggleMute: () => setMuted(m => !m),
      cycleRepeat: () => setRepeat(r => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
      registerYouTubeHost: el => {
        ytHost.current = el
      },
    }),
    [playIndex, toggle, next, previous, seek],
  )

  const state = useMemo<PlayerState>(
    () => ({ queue, index, current, status, engine, isPreview, volume, muted, repeat }),
    [queue, index, current, status, engine, isPreview, volume, muted, repeat],
  )

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
      </StateContext.Provider>
    </ActionsContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('usePlayer debe usarse dentro de <PlayerProvider>')
  return ctx
}

export function usePlayerActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('usePlayerActions debe usarse dentro de <PlayerProvider>')
  return ctx
}

export function usePlayerProgress() {
  return useContext(ProgressContext)
}
