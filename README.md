# SoftMusic Web

Frontend de SoftMusic: busca y escucha cualquier canción al instante.

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Query · React Router

## Desarrollo

```bash
cp .env.example .env      # apunta VITE_API_URL a tu backend (softmusic-api)
npm install
npm run dev               # http://localhost:5173
```

El backend debe permitir el origen `http://localhost:5173` (ya viene en su lista de CORS).

## Estructura

```
src/
  auth/         sesión (JWT) y diálogo de inicio de sesión / registro
  components/   armazón de la app, paleta ⌘K, filas de canción
    ui/         componentes de shadcn (código propio: se pueden editar)
  lib/          cliente de la API, utilidades, almacenamiento local
  pages/        Inicio y Buscar
  player/       motor de reproducción (audio + YouTube), barra, cola
```

Añadir componentes de shadcn: `npx shadcn@latest add <componente>`.

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl/⌘ K` o `/` | Buscar |
| `Espacio` | Reproducir / pausar |
| `⇧ →` / `⇧ ←` | Siguiente / anterior |
| `M` | Silenciar |

## Despliegue (Vercel)

1. Importa el repositorio en Vercel (detecta Vite automáticamente).
2. Variable de entorno: `VITE_API_URL=https://<tu-backend>`.
3. `vercel.json` ya redirige todas las rutas a `index.html` (SPA).

En el backend, configura `VERCEL_TEAM_SLUG` para aceptar las URLs de preview.
