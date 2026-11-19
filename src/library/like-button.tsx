import { HeartIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Track } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useLibrary } from '@/library/library-provider'

/** Corazón para guardar o quitar una canción de "Me gusta". */
export function LikeButton({
  track,
  size = 'icon-sm',
  className,
}: {
  track: Track
  size?: 'icon-sm' | 'icon' | 'icon-lg'
  className?: string
}) {
  const { isLiked, toggleLike } = useLibrary()
  const liked = isLiked(track)
  return (
    <Button
      variant="ghost"
      size={size}
      aria-pressed={liked}
      aria-label={liked ? `Quitar ${track.title} de Me gusta` : `Añadir ${track.title} a Me gusta`}
      onClick={e => {
        e.stopPropagation()
        toggleLike(track)
      }}
      onKeyDown={e => e.stopPropagation()}
      className={cn(liked ? 'text-primary hover:text-primary' : 'text-muted-foreground', className)}
    >
      <HeartIcon className={cn(liked && 'fill-current')} />
    </Button>
  )
}
