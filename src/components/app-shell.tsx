import { AudioLinesIcon, HouseIcon, LogOutIcon, SearchIcon, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'

import { AuthDialog } from '@/auth/auth-dialog'
import { useAuth } from '@/auth/auth-provider'
import { SearchCommand } from '@/components/search-command'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Skeleton } from '@/components/ui/skeleton'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PlayerBar } from '@/player/player-bar'
import { usePlayerActions } from '@/player/player-provider'
import { YouTubeDock } from '@/player/youtube-dock'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** Atajos globales: ⌘K / Ctrl+K / "/" buscar, Espacio play/pausa, ⇧←/⇧→ pista, M silencio. */
function useShortcuts(openSearch: () => void) {
  const { toggle, next, previous, toggleMute } = usePlayerActions()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openSearch()
        return
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      // Si el foco está en un control (botón, slider, fila), dejamos que maneje su propia tecla.
      const focused = (e.target as HTMLElement | null)?.closest('button, [role=button], [role=slider], [role=menuitem], a')
      if (e.key === '/') {
        e.preventDefault()
        openSearch()
      } else if (e.code === 'Space' && !focused) {
        e.preventDefault()
        toggle()
      } else if (e.shiftKey && e.key === 'ArrowRight') next()
      else if (e.shiftKey && e.key === 'ArrowLeft') previous()
      else if (e.key.toLowerCase() === 'm' && !focused) toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSearch, toggle, next, previous, toggleMute])
}

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Inicio', icon: HouseIcon },
  { to: '/buscar', label: 'Buscar', icon: SearchIcon },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  useShortcuts(() => setSearchOpen(true))

  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] bg-sidebar">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <div className="grid min-h-0 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-2 md:p-2 md:pb-0">
        <Sidebar onSearch={() => setSearchOpen(true)} />
        <main id="contenido" className="min-h-0 overflow-y-auto bg-background md:rounded-xl md:border">
          {children}
        </main>
      </div>
      <footer className="flex flex-col pb-[env(safe-area-inset-bottom)]">
        <PlayerBar />
        <MobileNav />
      </footer>
      <YouTubeDock />
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <AuthDialog />
    </div>
  )
}

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2 rounded-md px-2 py-1 text-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <AudioLinesIcon className="size-5" />
      </span>
      SoftMusic
    </NavLink>
  )
}

function Sidebar({ onSearch }: { onSearch: () => void }) {
  return (
    <aside className="hidden min-h-0 flex-col gap-6 rounded-xl border bg-sidebar p-3 md:flex">
      <Logo />
      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 items-center gap-2 rounded-lg border bg-input/30 px-3 text-sm text-muted-foreground transition-colors outline-none hover:bg-input/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SearchIcon className="size-4" />
        Buscar
        <KbdGroup className="ml-auto">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'bg-sidebar-accent text-foreground',
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <AccountMenu />
      </div>
    </aside>
  )
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, checking, logout, setAuthOpen } = useAuth()

  if (checking) return <Skeleton className={compact ? 'size-8 rounded-full' : 'h-11 w-full'} />

  if (!user) {
    return compact ? (
      <Button size="sm" onClick={() => setAuthOpen(true)}>
        Entrar
      </Button>
    ) : (
      <div className="flex flex-col gap-2 rounded-lg bg-sidebar-accent/60 p-3">
        <p className="text-sm font-medium">Tu música, a tu manera</p>
        <p className="text-xs text-muted-foreground">Inicia sesión para recibir recomendaciones personalizadas.</p>
        <Button size="sm" onClick={() => setAuthOpen(true)} className="mt-1">
          Iniciar sesión
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn(compact ? 'size-8 rounded-full p-0' : 'h-11 w-full justify-start gap-3 px-2')}>
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/20 text-xs text-primary">{initials(user.username)}</AvatarFallback>
          </Avatar>
          {!compact && <span className="truncate text-sm">{user.username}</span>}
          <span className="sr-only">Menú de cuenta</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'top'} className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span>{user.username}</span>
          <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOutIcon />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Encabezado móvil (logo + cuenta). Se usa dentro de cada página porque la barra lateral no existe en móvil. */
export function MobileHeader() {
  return (
    <div className="flex items-center justify-between px-4 pt-4 md:hidden">
      <Logo />
      <AccountMenu compact />
    </div>
  )
}

function MobileNav() {
  return (
    <nav aria-label="Principal" className="grid h-14 grid-cols-2 border-t bg-sidebar md:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground outline-none focus-visible:bg-accent',
              isActive && 'text-foreground',
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
