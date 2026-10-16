import { Music2Icon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Deezer sirve portadas de 1000 px; pedimos el tamaño que realmente se muestra (×2 para pantallas retina). */
function sized(src: string, px: number) {
  if (!/dzcdn\.net\/images\//.test(src)) return src
  const target = [56, 120, 250, 500, 1000].find(s => s >= px) ?? 1000
  return src.replace(/\/\d+x\d+-/, `/${target}x${target}-`)
}

export function Artwork({
  src,
  alt = '',
  size = 120,
  className,
}: {
  src?: string
  alt?: string
  /** Tamaño aproximado de la imagen en píxeles físicos. */
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-md bg-muted', className)}>
      {src && !failed ? (
        <img
          src={sized(src, size)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <Music2Icon className="size-1/3 min-h-4 min-w-4" aria-hidden />
        </div>
      )}
    </div>
  )
}
