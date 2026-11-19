import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import { useAuth } from '@/auth/auth-provider'
import { api, type Track } from '@/lib/api'
import { usePlayer, usePlayerProgress } from '@/player/player-provider'

/** Segundos de escucha real antes de registrar la reproducción: así los saltos rápidos no cuentan como gusto. */
const MIN_LISTENED = 10
/** Cada cuántos segundos de escucha se envía el progreso mientras suena. */
const SYNC_EVERY = 30
/** Entre dos lecturas de progreso solo cuenta un avance pequeño; uno mayor es un salto con la barra. */
const MAX_TICK = 2

interface Session {
  playId: number
  track: Track
  /** Segundos realmente escuchados (sin contar saltos hacia delante). */
  listened: number
  lastTime: number
  maxTime: number
  duration: number
  completed: boolean
  historyId: Promise<number | null> | null
  synced: { listened: number; progress: number; completed: boolean }
}

/**
 * Registra en la API lo que escucha el usuario con sesión iniciada: crea un evento de historial por
 * reproducción y lo actualiza con el tiempo escuchado y si se terminó. De esto se alimentan
 * las recomendaciones ("Hecho para ti") y la radio.
 */
export function usePlayHistory() {
  const { user } = useAuth()
  const { current, status, playId } = usePlayer()
  const { currentTime, duration } = usePlayerProgress()
  const queryClient = useQueryClient()
  const session = useRef<Session | null>(null)

  const sync = useCallback((s: Session) => {
    if (!s.historyId) return
    const listened = Math.round(s.listened)
    const progress = Math.round(s.maxTime)
    const { synced } = s
    if (listened <= synced.listened && progress <= synced.progress && s.completed === synced.completed) return
    s.synced = { listened, progress, completed: s.completed }
    void s.historyId.then(id => {
      if (id == null) return
      api
        .updateHistory(id, { listened_ms: listened * 1000, progress_ms: progress * 1000, completed: s.completed })
        .catch(() => {})
    })
  }, [])

  // Una sesión por reproducción. Al cambiar de canción se envía lo pendiente de la anterior.
  useEffect(() => {
    const prev = session.current
    const sameTrack = prev && prev.playId === playId && prev.track.id === current?.id
    if (sameTrack) return
    if (prev) sync(prev)
    session.current =
      user && current?.id
        ? {
            playId,
            track: current,
            listened: 0,
            lastTime: 0,
            maxTime: 0,
            duration: current.duration ?? 0,
            completed: false,
            historyId: null,
            synced: { listened: 0, progress: 0, completed: false },
          }
        : null
  }, [user, current, playId, sync])

  // Sumamos el tiempo escuchado a partir de las lecturas de progreso del reproductor.
  useEffect(() => {
    const s = session.current
    if (!s || s.playId !== playId) return
    const delta = currentTime - s.lastTime
    s.lastTime = currentTime
    if (status !== 'playing') return
    if (delta > 0 && delta <= MAX_TICK) s.listened += delta
    s.maxTime = Math.max(s.maxTime, currentTime)
    if (duration > 0) s.duration = duration

    if (!s.historyId && s.listened >= MIN_LISTENED) {
      s.historyId = api.addHistory(s.track).then(
        r => r.historyId,
        () => null,
      )
    }

    const finished = s.duration > 0 && currentTime >= s.duration * 0.9
    if (finished && !s.completed) {
      s.completed = true
      sync(s)
      // Una canción terminada pesa en las recomendaciones: las pedimos de nuevo la próxima vez que se muestren.
      void queryClient.invalidateQueries({ queryKey: ['recommendations'], refetchType: 'none' })
    } else if (s.listened - s.synced.listened >= SYNC_EVERY) {
      sync(s)
    }
  }, [currentTime, duration, status, playId, sync, queryClient])

  // Al pausar, enviamos lo escuchado hasta ahora.
  useEffect(() => {
    if (status === 'paused' && session.current) sync(session.current)
  }, [status, sync])

  // Al ocultar o cerrar la pestaña también (la petición usa keepalive).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && session.current) sync(session.current)
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [sync])
}
