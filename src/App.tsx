import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { AuthProvider } from '@/auth/auth-provider'
import { AppShell } from '@/components/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { recentTracks } from '@/lib/local-store'
import { HomePage } from '@/pages/home-page'
import { SearchPage } from '@/pages/search-page'
import { PlayerProvider, usePlayer } from '@/player/player-provider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

/** Guarda en "Escuchado recientemente" cada canción que llega a sonar de verdad. */
function RecentTracker() {
  const { current, status } = usePlayer()
  useEffect(() => {
    if (current?.id && status === 'playing') recentTracks.push(current)
  }, [current, status])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PlayerProvider>
            <TooltipProvider delayDuration={400}>
              <RecentTracker />
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/buscar" element={<SearchPage />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </AppShell>
              <Toaster position="top-center" />
            </TooltipProvider>
          </PlayerProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
