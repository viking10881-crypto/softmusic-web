import { cn } from '@/lib/utils'

/** Barras animadas que indican la canción que está sonando. Se congelan en pausa. */
export function Equalizer({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn('flex h-3.5 items-end gap-[2px] text-primary', className)} aria-hidden>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full bg-current', playing ? 'animate-eq' : 'h-1.5')}
          style={{ animationDelay: `${i * -0.25}s` }}
        />
      ))}
    </span>
  )
}
