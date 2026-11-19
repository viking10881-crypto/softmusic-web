import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import { isPodcast } from '@/lib/api'
import { usePlayer, usePlayerProgress } from '@/player/player-provider'

/** Por dónde va cada episodio. Vive en el navegador: no necesita cuenta y no mezcla podcasts con el historial de música. */
export interface EpisodeProgress {
  position: number
  duration: number
  finished: boolean
  updatedAt: number
}

const KEY = 'softmusic.podcast-progress'
const MAX_ENTRIES = 400
/** A menos de esto del final, el episodio cuenta como escuchado (créditos, anuncios finales). */
const FINISH_MARGIN = 30

const listeners = new Set<() => void>()
let cache: Record<string, EpisodeProgress> = read()

function read(): Record<string, EpisodeProgress> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function write(next: Record<string, EpisodeProgress>) {
  const ids = Object.keys(next)
  if (ids.length > MAX_ENTRIES) {
    ids.sort((a, b) => next[a].updatedAt - next[b].updatedAt)
    for (const id of ids.slice(0, ids.length - MAX_ENTRIES)) delete next[id]
  }
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
  listeners.forEach(l => l())
}

export const episodeProgress = {
  get: (id: string): EpisodeProgress | undefined => cache[id],

  save(id: string, position: number, duration: number) {
    const finished = duration > 0 && position >= Math.max(duration - FINISH_MARGIN, duration * 0.95)
    write({ ...cache, [id]: { position: Math.floor(position), duration: Math.floor(duration), finished, updatedAt: Date.now() } })
  },

  setFinished(id: string, finished: boolean, knownDuration = 0) {
    const duration = cache[id]?.duration || knownDuration
    write({ ...cache, [id]: { position: finished ? duration : 0, duration, finished, updatedAt: Date.now() } })
  },

  /** Segundo desde el que retomar el episodio, o 0 si se empieza de cero. */
  resumeAt(id: string) {
    const p = cache[id]
    return p && !p.finished && p.position > 10 ? p.position : 0
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useEpisodeProgress(id: string) {
  return useSyncExternalStore(
    subscribe,
    useCallback(() => cache[id], [id]),
  )
}

const SAVE_EVERY = 5

/** Guarda la posición del episodio que suena cada pocos segundos, al pausar y al cambiar de episodio. */
export function usePodcastProgressSaver() {
  const { current, status } = usePlayer()
  const { currentTime, duration } = usePlayerProgress()
  const lastSaved = useRef({ id: '', time: 0 })
  const id = isPodcast(current) ? current?.id : undefined

  useEffect(() => {
    if (!id || status === 'loading' || currentTime <= 0 || duration <= 0) return
    const last = lastSaved.current
    const moved = last.id !== id || Math.abs(currentTime - last.time) >= SAVE_EVERY
    if (moved || status !== 'playing') {
      episodeProgress.save(id, currentTime, duration)
      lastSaved.current = { id, time: currentTime }
    }
  }, [id, currentTime, duration, status])
}
