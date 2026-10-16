import { useCallback, useSyncExternalStore } from 'react'

import { trackKey, type Track } from '@/lib/api'

/** Lista pequeña persistida en localStorage y compartida entre componentes (recientes, búsquedas). */
function createListStore<T>(key: string, max: number, identity: (item: T) => string) {
  const listeners = new Set<() => void>()
  let cache: T[] = read()

  function read(): T[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function write(next: T[]) {
    cache = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* sin almacenamiento: queda solo en memoria */
    }
    listeners.forEach(l => l())
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get: () => cache,
    push(item: T) {
      const id = identity(item)
      write([item, ...cache.filter(i => identity(i) !== id)].slice(0, max))
    },
    remove(item: T) {
      const id = identity(item)
      write(cache.filter(i => identity(i) !== id))
    },
    clear: () => write([]),
  }
}

export const recentTracks = createListStore<Track>('softmusic.recent-tracks', 12, trackKey)
export const recentSearches = createListStore<string>('softmusic.recent-searches', 8, q => q.toLowerCase())

export function useStore<T>(store: { subscribe(l: () => void): () => void; get(): T }) {
  return useSyncExternalStore(
    useCallback(l => store.subscribe(l), [store]),
    store.get,
  )
}
