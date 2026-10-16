# SoftMusic Web

Frontend de SoftMusic: Vite 8 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui, con TanStack Query y React Router.
La API vive en el repo hermano `../softmusic-api` (ver su `CLAUDE.md`).
El usuario trabaja en español: textos de la interfaz y comentarios en español.

## Comandos

- `npm run dev`: servidor en http://localhost:5173.
- `npm run build`: `tsc -b` + `vite build`; usarlo para comprobar tipos antes de desplegar.
- `npm run lint`: oxlint.
- No hay suite de tests.

## Configuración

- `VITE_API_URL` en `.env`: en local `http://localhost:3001` (la API usa el 3001 porque el 3000 está ocupado).
  En Vercel apunta a `https://softmusic-api.vercel.app`. Es pública dentro del bundle: nunca poner secretos en `VITE_*`.

## Estructura

- `src/lib/api.ts`: cliente de la API y tipos (`Track`, `StreamInfo`...). El token JWT se guarda en `localStorage`.
- `src/player/player-provider.tsx`: reproductor. Si una canción no trae `id` la resuelve con `api.resolve`; luego pide
  `api.streamUrl` y reproduce con `<audio>` o con el iframe de YouTube (`mode: 'youtube-iframe'`). Es independiente
  del proveedor: uno nuevo en la API no requiere cambios aquí.
- `src/pages/search-page.tsx`: combina `results` (reproducibles) y `catalogTracks` (catálogo Deezer).
- `src/auth/`: diálogo y contexto de sesión. `src/components/ui/`: componentes shadcn.

## Despliegue (Vercel, cuenta viking10881-crypto)

- Proyecto `softmusic-web` → https://softmusic-web.vercel.app, scope `diego-alexander-londono-s-projects`.
- `git push` a `main` despliega automáticamente. `vercel.json` reescribe todo a `index.html` (SPA).
- La sesión por defecto de la CLI es la cuenta **delasoft**; desplegar siempre con el token de viking:
  `vercel deploy --prod --yes --token "$(tr -d '[:space:]' < ~/.vercel-token-viking)" --scope diego-alexander-londono-s-projects`
- Si cambia el dominio de la web, añadirlo a `CORS_ORIGINS` en el proyecto `softmusic-api`.
