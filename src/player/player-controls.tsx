import {
  LoaderCircleIcon,
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePlayer, usePlayerActions, usePlayerProgress } from '@/player/player-provider'

export function WithTip({ label, shortcut, children }: { label: string; shortcut?: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

export function PlayPauseButton({ size = 'icon-lg', className }: { size?: 'icon' | 'icon-lg'; className?: string }) {
  const { status, current } = usePlayer()
  const { toggle } = usePlayerActions()
  const playing = status === 'playing'
  const loading = status === 'loading'
  const label = playing || loading ? 'Pausar' : 'Reproducir'
  return (
    <WithTip label={label} shortcut="Espacio">
      <Button
        size={size}
        aria-label={label}
        disabled={!current}
        onClick={toggle}
        className={cn('rounded-full bg-foreground text-background hover:bg-foreground/85', className)}
      >
        {loading ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : playing ? (
          <PauseIcon className="fill-current" />
        ) : (
          <PlayIcon className="translate-x-px fill-current" />
        )}
      </Button>
    </WithTip>
  )
}

export function TransportControls({ large = false }: { large?: boolean }) {
  const { current, repeat, queue, index } = usePlayer()
  const { previous, next, cycleRepeat } = usePlayerActions()
  const iconSize = large ? 'size-6' : undefined
  const repeatLabel = repeat === 'off' ? 'Repetir' : repeat === 'all' ? 'Repetir todo' : 'Repetir una'

  return (
    <div className={cn('flex items-center justify-center', large ? 'gap-6' : 'gap-2')}>
      <WithTip label={repeatLabel}>
        <Toggle
          size="sm"
          aria-label={repeatLabel}
          pressed={repeat !== 'off'}
          onPressedChange={cycleRepeat}
          className="text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-primary"
        >
          {repeat === 'one' ? <Repeat1Icon /> : <RepeatIcon />}
        </Toggle>
      </WithTip>
      <WithTip label="Anterior" shortcut="⇧ ←">
        <Button variant="ghost" size="icon" aria-label="Anterior" disabled={!current} onClick={previous}>
          <SkipBackIcon className={cn('fill-current', iconSize)} />
        </Button>
      </WithTip>
      <PlayPauseButton size={large ? 'icon-lg' : 'icon'} className={large ? 'size-16 [&_svg]:size-7!' : 'size-9'} />
      <WithTip label="Siguiente" shortcut="⇧ →">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Siguiente"
          disabled={!current || (index >= queue.length - 1 && repeat !== 'all')}
          onClick={next}
        >
          <SkipForwardIcon className={cn('fill-current', iconSize)} />
        </Button>
      </WithTip>
      {/* Hueco simétrico al botón de repetir para que el play quede centrado. */}
      <span className="w-8" aria-hidden />
    </div>
  )
}

export function SeekBar({ className }: { className?: string }) {
  const { current, engine } = usePlayer()
  const { seek } = usePlayerActions()
  const { currentTime, duration } = usePlayerProgress()
  // Mientras se arrastra mostramos el valor local; el salto real ocurre al soltar.
  const [dragging, setDragging] = useState<number | null>(null)
  const total = duration || current?.duration || 0
  const value = dragging ?? currentTime

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <span className="w-10 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{formatTime(value)}</span>
      <Slider
        aria-label="Progreso de la canción"
        min={0}
        max={Math.max(total, 1)}
        step={1}
        value={[Math.min(value, total)]}
        disabled={!current || !engine || total === 0}
        onValueChange={([v]) => setDragging(v)}
        onValueCommit={([v]) => {
          seek(v)
          setDragging(null)
        }}
        className="group/seek [&_[data-slot=slider-thumb]]:opacity-0 [&_[data-slot=slider-thumb]]:transition-opacity hover:[&_[data-slot=slider-thumb]]:opacity-100 focus-within:[&_[data-slot=slider-thumb]]:opacity-100"
      />
      <span className="w-10 font-mono text-[11px] text-muted-foreground tabular-nums">{formatTime(total)}</span>
    </div>
  )
}

export function VolumeControl() {
  const { volume, muted } = usePlayer()
  const { setVolume, toggleMute } = usePlayerActions()
  const effective = muted ? 0 : volume
  const Icon = effective === 0 ? VolumeXIcon : effective < 0.5 ? Volume1Icon : Volume2Icon
  const label = muted ? 'Activar sonido' : 'Silenciar'

  return (
    <div className="flex items-center gap-1">
      <WithTip label={label} shortcut="M">
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={toggleMute}>
          <Icon />
        </Button>
      </WithTip>
      <Slider
        aria-label="Volumen"
        min={0}
        max={100}
        step={1}
        value={[Math.round(effective * 100)]}
        onValueChange={([v]) => setVolume(v / 100)}
        className="w-24"
      />
    </div>
  )
}
