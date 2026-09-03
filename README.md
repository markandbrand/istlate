# IsItLate? — ¿Va a llegar tarde tu avión?

Demo de IsItLate?: metes tu número de vuelo y te contamos, de forma visual y humana, dónde
anda de verdad el avión que va a operar tu vuelo (su rotación anterior), no solo "retrasado
X minutos".

> **Modo demo.** Todavía no hay ninguna API de vuelos conectada: cualquier número de vuelo
> devuelve la misma rotación de ejemplo, rotulada con el código que escribas.

## Stack

- [React 19](https://react.dev)
- [Vite 8](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com) (vía `@tailwindcss/vite`, sin `tailwind.config.js`:
  la paleta y las tipografías viven en el bloque `@theme` de `src/index.css`)

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/ en local
```

Requiere Node 20.19+ o 22.12+ (ver `.nvmrc`).

## Estructura

```
index.html                  entrada de Vite (fuentes de Google + <div id="root">)
src/
  main.jsx                  monta React
  App.jsx                   estado de la búsqueda y composición de la página
  index.css                 tokens de diseño (@theme), keyframes y estilos base
  data/demoFlight.js        datos de ejemplo + lookupFlight()
  components/
    Sky.jsx                 nubes y avión decorativos animados
    SiteHeader.jsx          marca
    Hero.jsx                titular y buscador
    FlightResult.jsx        tarjeta de resultado
    Rotation.jsx            timeline de la rotación del avión
    Waitlist.jsx            formulario de lista de espera
    SiteFooter.jsx          pie
    PlaneIcon.jsx           icono de avión compartido
public/
  favicon.svg
  _redirects                fallback SPA para Cloudflare Pages
netlify.toml                build + fallback SPA para Netlify
```

## Cuando conectemos datos reales

Todo lo que hoy es ficticio está en `src/data/demoFlight.js`. `lookupFlight(code)` es el único
punto que hay que sustituir por una llamada real (idealmente a un backend propio, para no
exponer la API key del proveedor de vuelos en el cliente). Si devuelve un objeto con la misma
forma que `demoFlight`, la interfaz funciona sin más cambios.

Pendientes conocidos del modo demo:

- `lookupFlight()` ignora el código y devuelve siempre la misma rotación.
- El formulario de la lista de espera no envía el email a ningún sitio (`TODO` en
  `src/components/Waitlist.jsx`).

## Despliegue

Build command `npm run build`, directorio de publicación `dist`.

- **Netlify**: `netlify.toml` ya trae el comando, el `publish`, `NODE_VERSION=22` y el
  redirect SPA. Basta con conectar el repo.
- **Cloudflare Pages**: framework preset *Vite*, build `npm run build`, output `dist`. El
  fallback SPA lo cubre `public/_redirects`. Conviene fijar `NODE_VERSION=22` en las
  variables de entorno del proyecto.
