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
  App.jsx                   búsqueda, estados de carga y error, composición
  index.css                 tokens de diseño (@theme), keyframes y estilos base
  data/
    fixtures.js             un escenario de ejemplo por estado
    flightApi.js            lookupFlight(): único contacto con los datos
  lib/
    verdict.js              el cerebro: estado + rotación → respuesta humana
    adapter.js              respuesta de AeroDataBox → forma interna
    flightService.js        backend agnóstico de host (caché, rate limit, proveedor)
    tones.js                clases de Tailwind por tono de veredicto
  components/
    Sky.jsx                 nubes y avión decorativos animados
    SiteHeader.jsx          marca
    Hero.jsx                titular y buscador
    FlightResult.jsx        tarjeta de resultado, dirigida por el veredicto
    Rotation.jsx            timeline de la rotación del avión
    StatusCard.jsx          esqueleto de carga y tarjeta de error
    ScenarioSwitcher.jsx    selector de escenarios del modo demo
    Waitlist.jsx            formulario de lista de espera
    SiteFooter.jsx          pie
    PlaneIcon.jsx           icono de avión compartido
netlify/functions/flight.js función serverless (Netlify)
functions/api/flight.js     función serverless (Cloudflare Pages)
public/
  favicon.svg
  _redirects                fallback SPA para Cloudflare Pages
netlify.toml                build + fallback SPA para Netlify
```

## Cómo fluyen los datos

```
Navegador  →  /api/flight?code=FR1234  →  función serverless (guarda la key)
                                            ├→ proveedor: vuelo por número → matrícula
                                            └→ proveedor: tramos de esa matrícula hoy
                                          ←  JSON en la forma interna
                          deriveVerdict() →  tono, titular, explicación y consejo
```

Sin `AERODATABOX_KEY` configurada, la función devuelve datos de ejemplo y la web sigue
funcionando en modo demo. **Esto es lo que hace que se pueda desplegar hoy y conectar el
proveedor después sin tocar la interfaz.**

## Los estados

El veredicto (`src/lib/verdict.js`) traduce el estado crudo del proveedor y la rotación del
avión a una respuesta humana. Los estados de origen usan el enum `FlightStatus` de
AeroDataBox: `expected · checkIn · boarding · gateClosed · departed · enRoute · approaching ·
arrived · delayed · diverted · canceled · canceledUncertain · unknown`.

| Veredicto | Tono | Cuándo |
|---|---|---|
| `parked` | verde | El avión ya está aparcado en tu aeropuerto |
| `overnight` | verde | Ha dormido aquí: primer vuelo del día |
| `onTime` | verde | Viene de camino con margen de sobra |
| `risk` | ámbar | Retraso moderado o escala muy justa |
| `late` | coral | Retraso serio o varios tramos por delante |
| `diverted` | ámbar | El avión se ha desviado |
| `canceled` | rojo | Cancelado (incluye aviso sobre el reglamento 261/2004) |
| `canceledUncertain` | rojo | Cancelación sin confirmar |
| `unassigned` | azul | Todavía no hay avión asignado |
| `gone` | gris | El vuelo ya salió o ya aterrizó |

Regla de tono del producto: **el humor es inversamente proporcional a la gravedad**. Se bromea
cuando todo va bien, se es plano cuando va mal y se es útil de verdad en una cancelación.

### El panel de cada estado

Cada veredicto cierra con un panel de dos datos (`buildPanel()` en `src/lib/verdict.js`) que
responde a la pregunta concreta de quien está mirando esa pantalla. No es decoración: es el
dato que hace que la app se sienta la más fácil del mundo para enterarte de lo de tu avión.

| Estado | Panel | Responde a |
|---|---|---|
| `parked` | ☕ Mientras tanto | Cuánto lleva el avión esperándote |
| `overnight` | 🌙 Herencia del día anterior | Cuánto retraso hereda: ninguno |
| `onTime` | ⏱️ El margen que tiene | Minutos que necesita para dar la vuelta vs. los que tiene |
| `risk` | 👀 El número a vigilar | La hora exacta que decide si sales puntual |
| `late` | 🔮 Nuestra previsión | Lo que dice la aerolínea vs. lo que decimos nosotros |
| `diverted` | 🗺️ La vuelta que ha dado | Kilómetros de más y nueva salida |
| `unassigned` | 🕐 Cuándo volver a mirar | A qué hora se sabrá el avión |
| `canceledUncertain` | 📡 Cómo de fresco es esto | Hace cuánto lo comprobamos |
| `canceled` | ⚖️ Lo que te pueden deber | Compensación orientativa según distancia |
| `gone` | 🚪 Si vienes a recoger a alguien | A qué hora sale de verdad por la puerta |

El importe de `canceled` sale de los tramos por distancia del reglamento (CE) 261/2004
(250 € / 400 € / 600 €) y se etiqueta siempre como orientativo: no se cobra en circunstancias
extraordinarias ni con más de 14 días de aviso.

En modo demo hay un selector bajo el resultado para ver los diez escenarios, porque sin datos
reales no hay forma de provocar una cancelación o un desvío.

## Idiomas

La web es bilingüe: **español** y **inglés americano**, con interruptor en la cabecera. El
idioma inicial sale de lo que se eligió la última vez, si no del navegador, si no español.

```
src/i18n/
  format.js       formatos por idioma (hora 24 h vs 12 h AM/PM, km vs millas)
  es.js           todos los textos en español
  en.js           todos los textos en inglés americano
  index.jsx       proveedor de contexto, detección y persistencia
src/data/
  fixtures.es.js  escenarios españoles (Ryanair, Iberia, Vueling…)
  fixtures.en.js  escenarios estadounidenses (American, Delta, Southwest…)
```

`src/lib/verdict.js` decide **qué** estado aplica y calcula los números; el idioma decide
**cómo** se cuenta. Añadir un tercer idioma es escribir un archivo de textos y un set de
escenarios, sin tocar una sola regla de negocio.

### No es una traducción, es una adaptación

Tres decisiones que lo separan de traducir con un diccionario:

- **Formato de hora.** Un vuelo de las `20:30` se pinta `20:30` en español y `8:30 PM` en
  inglés. Los datos se guardan siempre en 24 h canónico y se convierten al pintar. Las
  distancias pasan de kilómetros a millas.
- **Los escenarios cambian de mercado.** La demo estadounidense no traduce Madrid–Barcelona:
  usa rutas de hub, aerolíneas locales y matrículas con N. Una demo llena de vuelos españoles
  suena a producto extranjero para el público al que le quieres vender.
- **El panel de cancelado dice cosas distintas porque la ley es distinta.** En Europa se
  apoya en el reglamento (CE) 261/2004 y da una compensación orientativa por distancia. En
  Estados Unidos **no existe equivalente**: desde 2024 la norma del DOT obliga a reembolso
  automático en efectivo por cualquier cancelación, sea cual sea el motivo, pero no hay pago
  por las molestias. Traducir el panel europeo habría sido prometer un dinero que no existe.

Las etiquetas de la rotación son estructuradas (`{ kind, time, delay… }`) y las pinta el
idioma, no el fixture. Cuando llegue el proveedor, el adaptador las construirá igual.

## Conectar el proveedor

### 1. Consigue la key gratis

1. Crea cuenta en [RapidAPI](https://rapidapi.com/aedbx-aedbx/api/aerodatabox/pricing)
   (alternativa sin tarjeta: [API.market](https://api.market/store/aedbx/aerodatabox)).
2. En la pestaña **Pricing** de AeroDataBox, suscríbete al plan **Basic ($0.00/mes)**.
3. Comprueba que el plan está **limitado por tope duro**, no con facturación por exceso: así
   un bug no puede generar cargos.
4. La key aparece en la pestaña **Endpoints**, en el campo `X-RapidAPI-Key` de los ejemplos
   de código.

### 2. Ponla en local

```bash
cp .env.example .env      # y pega la key en AERODATABOX_KEY
```

### 3. Comprueba que funciona, antes de tocar nada

```bash
npm run probe -- FR1234
```

La sonda (`scripts/probe.mjs`) prueba varias rutas candidatas, dice cuál responde, y sobre
todo responde **la pregunta que decide el producto: ¿viene rellena `aircraft.reg`?** Si la
hay, encadena la segunda llamada y lista los tramos del avión hoy. Guarda las respuestas
completas en `probe-*.json` para poder ajustar el adaptador contra datos reales.

Lánzala varias veces sobre el mismo vuelo, a T-8h, T-4h, T-2h y T-1h. El momento en que
aparece la matrícula es el que define con cuánta antelación funciona IsItLate?.

### 4. Pruébalo en la web, en local

```bash
npm run dev
```

`vite.config.js` monta `/api/flight` en desarrollo con el mismo `handleFlightRequest` que
usa la función serverless, así que lo que ves en local es exactamente lo que se despliega.
Sin key, sigue en modo demo.

### 5. Despliega

Pon **`AERODATABOX_KEY`** en el panel del host (Netlify: *Site settings → Environment
variables*; Cloudflare Pages: *Settings → Environment variables*), **sin prefijo `VITE_`**, y
vuelve a desplegar. La función deja de devolver datos de ejemplo sola.

### Lo que queda por confirmar

- ~~La ruta exacta de los endpoints.~~ **Verificada** en la consola de RapidAPI:
  `GET /flights/number/{numeroDeVuelo}/{fecha}` sobre `aerodatabox.p.rapidapi.com`, con los
  opcionales `withAircraftImage`, `withLocation`, `withFlightPlan` y `dateLocalRole`.
- ~~El anidamiento de los objetos de tiempo.~~ **Verificado**: llegan como
  `{ utc, local }` con el formato `"2026-01-02 16:10+01:00"`, y `hhmm()` los lee bien.
- **Qué devuelve exactamente un vuelo cancelado**, que es el estado peor cubierto por todos
  los proveedores.
- **Desde cuántas horas antes viene la identificación del avión.** Sigue siendo la pregunta
  que decide con cuánta antelación funciona el producto: hay que sondear un vuelo que aún no
  haya salido, no uno ya aterrizado.

### Lo que enseñó la primera respuesta real

Tres cosas que ninguna documentación decía y que habrían roto el producto en producción:

- **El estado llega en PascalCase** (`"Arrived"`), no en el camelCase de su esquema. Sin
  normalizar, el motor no reconocía ni un estado y todos los vuelos acababan en "todavía no
  sabemos qué avión te toca". Lo arregla `normalizeStatus()`.
- **`aircraft.reg` puede no venir, pero `aircraft.modeS` sí.** El Mode-S identifica al mismo
  avión y sirve igual para encadenar la rotación (`/flights/icao24/{modeS}`), así que la
  ausencia de matrícula ya no se confunde con "no hay avión asignado".
- **La distancia la da el propio API** (`greatCircleDistance.km`), así que el panel de
  compensación del 261/2004 deja de depender de un dato inventado.

Y un cuarto que solo aparece con datos reales: los paneles daban por hecho que existían
campos que hoy solo traen los fixtures. Ahora `PANEL_REQUIERE` comprueba antes de construir
y el panel se calla en vez de tumbar la tarjeta.

### Coste estimado

Una búsqueda de usuario son 2 llamadas a `getFlight` (una por número de vuelo, otra por
matrícula). `getFlight` es Tier 2 = 2 unidades, así que **≈ 4 unidades por búsqueda**.

| Plan | Unidades/mes | Búsquedas aprox. |
|---|---|---|
| Basic (gratis) | 600 | ~150 |
| De pago (desde ~5 $/mes) | según plan | — |

La caché de 90 segundos hace que varias personas preguntando por el mismo vuelo cuesten una
sola consulta, así que el número real será mayor. Confirma tiers y precios en su página, que
cambian.

## Pendientes conocidos

- El formulario de lista de espera no envía el email a ningún sitio (`TODO` en
  `src/components/Waitlist.jsx`). AeroDataBox tiene un *Flight Alert API* con webhooks que
  encajaría aquí para avisar de verdad cuando se asigne avión.
- `estimate` (nuestra previsión de salida) viene de los fixtures; falta calcularlo en el
  backend a partir de la rotación real.
- La caché y el rate limit viven en memoria por instancia. Cuando el tráfico lo justifique,
  Netlify Blobs o Cloudflare KV.

## Despliegue

Build command `npm run build`, directorio de publicación `dist`.

- **Netlify**: `netlify.toml` ya trae el comando, el `publish`, `NODE_VERSION=22` y el
  redirect SPA. Basta con conectar el repo.
- **Cloudflare Pages**: framework preset *Vite*, build `npm run build`, output `dist`. El
  fallback SPA lo cubre `public/_redirects`. Conviene fijar `NODE_VERSION=22` en las
  variables de entorno del proyecto.
