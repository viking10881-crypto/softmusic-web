import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon, BellRingIcon } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { api, type Podcast } from '@/lib/api'

/** Podcasts a los que está suscrito el usuario (vacío sin sesión). */
export function useSubscriptions() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['podcast-subscriptions', user?.id],
    queryFn: api.podcastSubscriptions,
    enabled: !!user,
    staleTime: 5 * 60_000,
  })
  return { subscriptions: user ? query.data ?? [] : [], loading: !!user && query.isPending }
}

export function SubscribeButton({ podcast }: { podcast: Podcast }) {
  const { user, setAuthOpen } = useAuth()
  const { subscriptions } = useSubscriptions()
  const queryClient = useQueryClient()
  const key = ['podcast-subscriptions', user?.id]
  const subscribed = subscriptions.some(p => p.id === podcast.id)

  function toggle() {
    if (!user) {
      toast('Inicia sesión para seguir podcasts', { description: 'Inicia sesión o crea una cuenta gratis.' })
      setAuthOpen(true)
      return
    }
    const previous = queryClient.getQueryData<Podcast[]>(key) ?? []
    const summary: Podcast = { id: podcast.id, title: podcast.title, author: podcast.author, artwork: podcast.artwork }
    queryClient.setQueryData<Podcast[]>(key, subscribed ? previous.filter(p => p.id !== podcast.id) : [summary, ...previous])
    const request = subscribed ? api.unsubscribe(podcast.id) : api.subscribe(summary)
    request.catch(error => {
      queryClient.setQueryData(key, previous)
      toast.error(subscribed ? 'No pudimos dejar de seguirlo' : 'No pudimos seguir el podcast', {
        description: error instanceof Error ? error.message : undefined,
      })
    })
  }

  return (
    <Button variant={subscribed ? 'secondary' : 'outline'} aria-pressed={subscribed} onClick={toggle} className="rounded-full">
      {subscribed ? <BellRingIcon /> : <BellIcon />}
      {subscribed ? 'Siguiendo' : 'Seguir'}
    </Button>
  )
}
