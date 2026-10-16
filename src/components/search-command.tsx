import { useQuery } from '@tanstack/react-query'
import { Disc3Icon, HistoryIcon, LoaderCircleIcon, Music2Icon, SearchIcon, UserRoundIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { Artwork } from '@/components/artwork'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { api, type Suggestion } from '@/lib/api'
import { recentSearches, useStore } from '@/lib/local-store'

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}

const TYPE_META: Record<Suggestion['type'], { label: string; icon: typeof Music2Icon }> = {
  track: { label: 'Canciones', icon: Music2Icon },
  artist: { label: 'Artistas', icon: UserRoundIcon },
  album: { label: 'Álbumes', icon: Disc3Icon },
}

/** Paleta de búsqueda global (⌘K / Ctrl+K / "/"): sugerencias en vivo y búsquedas recientes. */
export function SearchCommand({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const q = useDebounced(input.trim(), 180)
  const recents = useStore(recentSearches)

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', q.toLowerCase()],
    queryFn: ({ signal }) => api.suggest(q, signal),
    enabled: open && q.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: prev => prev,
  })

  const go = (query: string) => {
    const clean = query.trim()
    if (!clean) return
    recentSearches.push(clean)
    onOpenChange(false)
    setInput('')
    navigate(`/buscar?q=${encodeURIComponent(clean)}`)
  }

  const suggestions = q.length >= 2 ? (data?.suggestions ?? []) : []
  const groups = (['track', 'artist', 'album'] as const)
    .map(type => ({ type, items: suggestions.filter(s => s.type === type).slice(0, 4) }))
    .filter(g => g.items.length)

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar en SoftMusic"
      description="Busca canciones, artistas o álbumes"
      className="sm:max-w-xl"
    >
      {/* El backend ya ordena por relevancia: desactivamos el filtro local de cmdk. */}
      <Command shouldFilter={false}>
        <CommandInput
          value={input}
          onValueChange={setInput}
          placeholder="¿Qué quieres escuchar?"
        />
        <CommandList className="max-h-[min(60vh,420px)]">
          {/* Primer elemento = el que cmdk resalta por defecto, así Enter busca lo escrito. */}
          {input.trim().length >= 2 && (
            <CommandGroup>
              <CommandItem value={`__search:${input}`} onSelect={() => go(input)}>
                {isFetching ? <LoaderCircleIcon className="animate-spin" /> : <SearchIcon />}
                <span className="truncate">
                  Buscar “<span className="font-medium">{input.trim()}</span>”
                </span>
                <CommandShortcut>Enter ↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          {data?.correction && q.length >= 2 && (
            <CommandGroup heading="¿Quisiste decir?">
              <CommandItem value={`__fix:${data.correction}`} onSelect={() => go(data.correction!)}>
                <SearchIcon />
                {data.correction}
              </CommandItem>
            </CommandGroup>
          )}

          {groups.map(({ type, items }) => {
            const { label, icon: Icon } = TYPE_META[type]
            return (
              <CommandGroup key={type} heading={label}>
                {items.map(s => (
                  <CommandItem
                    key={`${type}-${s.value}-${s.subtitle}`}
                    value={`${type}:${s.value}:${s.subtitle ?? ''}`}
                    onSelect={() => go(type === 'artist' ? s.value : `${s.value} ${s.subtitle ?? ''}`)}
                  >
                    {s.thumbnail ? (
                      <Artwork src={s.thumbnail} size={64} className={type === 'artist' ? 'size-8 rounded-full' : 'size-8'} />
                    ) : (
                      <Icon />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{s.value}</span>
                      {s.subtitle && <span className="block truncate text-xs text-muted-foreground">{s.subtitle}</span>}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}

          {input.trim().length < 2 && recents.length > 0 && (
            <CommandGroup heading="Búsquedas recientes">
              {recents.map(r => (
                <CommandItem key={r} value={`__recent:${r}`} onSelect={() => go(r)} className="group/recent">
                  <HistoryIcon />
                  <span className="truncate">{r}</span>
                  <button
                    type="button"
                    aria-label={`Borrar “${r}” del historial`}
                    onClick={e => {
                      e.stopPropagation()
                      recentSearches.remove(r)
                    }}
                    className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 group-hover/recent:opacity-100 group-data-[selected=true]/recent:opacity-100 hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {input.trim().length < 2 && recents.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Escribe el nombre de una canción, un artista o un álbum.
            </p>
          )}

        </CommandList>
      </Command>
    </CommandDialog>
  )
}
