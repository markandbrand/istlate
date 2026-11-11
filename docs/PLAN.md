# IsItLate — brief completo para Claude Code (actualizado 11/11/2026)

Pega esto al empezar la sesión de Claude Code en el repo de IsItLate. Resume el proyecto, las decisiones tomadas y lo que toca hacer.

## ⚠️ IMPORTANTE: el proyecto ya está hecho; esto es una actualización
- El proyecto ya existe y funciona. Este brief recoge **las ideas y decisiones nuevas** que hemos hablado para **añadirlas**.
- **No rehagas ni cambies lo que ya está hecho** (diseño, componentes, estilos, datos, configuración, API ya elegida, etc.). Lo que ya funciona se respeta tal cual.
- Si algo de este brief **ya está hecho** en el repo, sáltalo. Si algo del brief **choca** con lo que ya hay (por ejemplo, una decisión distinta sobre la API, el hosting o el dominio), **manda lo que hay en el repo**: avísame de la diferencia y no lo cambies.
- Si para añadir algo hiciera falta tocar un archivo existente, hazlo lo mínimo imprescindible, sin cambiar lo que ya hace, y explícame qué has tocado y por qué. Ante la duda, pregúntame antes.

---

## 1. Qué es
Web gratuita en la que metes tu número de vuelo (ej. FR1234) y ves, de forma visual y en lenguaje humano:
- dónde está ahora el avión que operará tu vuelo (matrícula, vuelo que hace ahora, rotación del día: Dublín → Mallorca → Valencia → tu vuelo);
- una estimación propia de retraso;
- qué significa todo eso **para ti**.

Flightradar24 y FlightAware enseñan datos; nosotros explicamos qué significan.
**Tono de marca:** cercano y humano, como un amigo que sabe de aviones. Todo en español.

## 2. Posicionamiento (decidido)
- **Competidor de referencia: Flighty.** Ya tiene "Where's My Plane?" y predicción de retrasos, pero es solo iOS, en inglés, de pago (~48 $/año) y está pensado para viajeros frecuentes.
- **Nuestro usuario:**
  1. el que vuela 2-3 veces al año con low cost (Ryanair, Vueling, easyJet…);
  2. **el que va a recoger** a alguien al aeropuerto (pareja, padres, amigos).
- Web, sin instalar nada, gratis, en español. Emoción que vende: **tranquilidad**.
- Inspirarse en las funciones de Flighty, **nunca copiar su diseño, su nombre ni sus textos**.

## 3. Función estrella del lanzamiento: modo "Voy a recoger"
**Flujo:**
1. El usuario mete el vuelo y pulsa **"Voy a recoger a alguien"**.
2. Dos preguntas:
   - ¿Cuánto tardas en llegar al aeropuerto? (lo escribe el usuario, ej. "25 min"; así no pagamos la API de Google Maps).
   - ¿Trae maleta facturada o solo de mano?
3. Respuesta grande: **"Sal de casa a las 18:40"**, con la explicación debajo: "El avión ha despegado de Londres con 15 min de retraso. Aterriza sobre las 19:05 y saldrá por la puerta de llegadas hacia las 19:20."
4. Si cambia algo: "Ojo, su avión va con 30 min más de retraso: sal a las 19:10".
5. Avisos en el momento justo: "Ha aterrizado", "Está saliendo", "Ya en la puerta de llegadas, terminal 1".

**Cálculo:**
hora de salida de casa = aterrizaje real (de la API) + rodaje (~10 min) + salida (solo de mano ~10-15 min; facturada ~25-35 min) − trayecto del usuario.
Las medias por aeropuerto van en un archivo de configuración y se afinan con el tiempo.

**Mensajes para la portada y el primer vídeo:** "¿Vas a recoger a alguien al aeropuerto? Te decimos a qué hora salir de casa."

## 4. Resto de funciones (por prioridad)
1. **Respuesta en una frase con semáforo:** "Sí, probablemente sale 40 min tarde".
2. **"¿Dónde está mi avión?":** rotación del día explicada (ya hecho en la demo con datos de ejemplo).
3. **"Comparte tu vuelo":** enlace bonito para WhatsApp, con buena vista previa (Open Graph). Es el motor de crecimiento: el que vuela lo comparte con 2-3 personas que no conocían IsItLate.
4. **Avisos** (ha despegado / ha aterrizado / está en la cinta / cambio de avión / cancelación). Empezar por la vía más barata: un bot de Telegram o notificaciones web. Posible premium más adelante (~2,99 €/viaje).
5. **Aviso de reclamación:** si llega con más de 3 h de retraso o se cancela → "Podrías tener derecho a hasta 600 €" (nunca prometerlo). También se le enseña al que espera, para que se lo pase al pasajero.
6. **Toque friki:** matrícula y edad del avión; en diciembre, "tu año en vuelos" para compartir.
7. **SEO:** una página útil por vuelo (/vuelo/FR1234), por aerolínea, por aeropuerto y por avión, más contenido del tipo "¿Qué hacer si tu vuelo se retrasa?". Nada de páginas vacías.

## 5. Datos: el cuello de botella
Necesitamos un proveedor que dé la **matrícula del avión asignado y su rotación** (vuelos anteriores y siguientes), la hora estimada y real de aterrizaje, y que **permita uso comercial con afiliados y anuncios**.

| Proveedor | Coste aproximado |
|---|---|
| AeroDataBox | Freemium, desde ~5 $/mes hasta ~150 $/mes. El más barato para validar. |
| AirLabs | ~19-99 $/mes, con capa gratuita limitada. |
| FlightAware AeroAPI | Pago por consulta, mínimo ~100 $/mes. Más serio y más caro. |
| Flightradar24 API | Sin tarifas públicas claras; uso comercial bajo contacto. |

**Tarea:** probar con casos reales (empezando por el plan gratuito) cuál da matrícula y rotación de verdad, y calcular el **coste por búsqueda**. Tiene que ser bastante menor que los ~0,13-0,25 € que ingresa cada búsqueda.

**Diseño para controlar el coste:** caché agresiva por vuelo (muchas personas consultan el mismo vuelo), consultar la API solo cuando alguien busca, y límites por usuario.

## 6. Monetización (afiliación primero)
- **Plataforma:** Travelpayouts (gratis; una sola cuenta para muchas marcas de viajes). AirHelp paga ahí el 15 % de su comisión por reclamación ganada, con cookie de 45 días (~70 € de media por reclamación aprobada). Más adelante, otras redes (Awin, Impact, CJ) o programas directos.
- **Cada enlace en su momento:**

| Qué pasa | Qué se enseña |
|---|---|
| Retraso de más de 3 h o cancelación | Reclamación (AirHelp) |
| Cancelación | Hotel, tren o bus alternativo |
| Modo "Voy a recoger" | Parking del aeropuerto, taxi o traslado |
| Antes de volar | eSIM, seguro de viaje |

- **Anuncios (AdSense):** solo en las páginas de contenido SEO, **nunca en la pantalla del vuelo**. Dan unas 20 veces menos que la afiliación.
- **Más adelante:** premium de avisos y panel B2B (traslados, rent-a-car, hoteles, anfitriones de pisos turísticos).
- **Estimación:** ~0,13-0,25 € por búsqueda, de los que las reclamaciones son ~70 %. Escenario realista en 2027: ~24.500 €; "como un pepino": ~45.000 €.

## 7. Legal
- Aviso legal, privacidad y cookies con los **datos personales de Fer** (no de Mark and Brand Media SL). Tienen que coincidir con la cuenta de Travelpayouts.
- Banner de consentimiento de cookies que cubra afiliados y anuncios.
- Línea de transparencia: "Algunos enlaces son de afiliado: si reclamas, nos llevamos una pequeña comisión sin coste para ti".
- Reclamaciones siempre como "podrías tener derecho", nunca como promesa.
- Revisar la licencia del proveedor de datos.

## 8. Propiedad (IsItLate es personal de Fer, no de la empresa)
- **Transferir el repositorio** de github.com/markandbrand/istlate a la cuenta personal de GitHub de Fer (y, si se quiere, renombrarlo a "isitlate").
- Dominio, hosting, API y afiliados a su nombre, con su email personal y pagados por él.
- Se trabaja fuera del horario de la SL.

## 9. Infraestructura y presupuesto
- **Stack actual:** React + Vite + Tailwind, con los datos de ejemplo separados en src/data/ para enchufar la API.
- **Hosting:** Cloudflare Pages (gratis, despliegue automático desde GitHub).
- **Dominio:** isitlate.com está ocupado (renovado hasta agosto de 2027). Comprobar isitlate.app, .io, .co o getisitlate.com. Se compra a principios de diciembre (~8-12 €/año).
- **Presupuesto:** casi cero. No gastar nada hasta el cobro de final de noviembre. Usar planes gratuitos mientras se pueda.
- **Diseño actual de la demo:** tema claro (cielo, nubes animadas, avioncito), azul cielo + coral, tipografías Baloo 2 / Inter / IBM Plex Mono.

## 10. Pensar en el futuro (piezas reutilizables)
IsItLate es la primera de varias herramientas independientes con la misma filosofía ("algo confuso o que da nervios, explicado como lo haría un amigo"). La siguiente será **"¿Llega tarde mi tren?"** (Renfe, Ouigo, Iryo), y con 2-3 funcionando se juntarán bajo una marca paraguas.
Por eso, programar de forma que **el diseño, los avisos, el sistema de afiliados y las páginas SEO se puedan reutilizar**. Sin complicarlo de más: IsItLate va primero y a tope.

## 11. Calendario
| Cuándo | Qué |
|---|---|
| Noviembre (gratis) | Transferir el repo · probar APIs con el plan gratuito · conectar los datos reales · modo "Voy a recoger" · compartir por WhatsApp · textos legales · 3-4 páginas de contenido |
| Principios de diciembre | Comprar el dominio · publicar en Cloudflare Pages · registro en Travelpayouts y activar programas |
| Mediados de diciembre | **Lanzamiento** |
| Enero-febrero | Afiliación integrada · avisos · páginas SEO por vuelo |
| Antes de Semana Santa (finales de marzo de 2027) | Todo afinado: primera prueba de verdad |
| Julio-agosto | Temporada alta, con las páginas ya indexadas en Google |

## 12. Cómo trabajar con Fer
- No sabe programar: explicarle cada paso en lenguaje sencillo y decirle exactamente qué tiene que hacer él (clics, cuentas, pagos).
- Ir paso a paso y dejar cosas funcionando en cada sesión.
- Una sesión, un proyecto: en esta sesión solo IsItLate.

## Primera tarea de esta sesión
1. **Revisar el repo** y compararlo con este brief. Dame una lista sencilla con tres columnas: **ya hecho / falta por añadir / choca con lo que hay**.
2. **Guardar este brief** en el repo como archivo nuevo (por ejemplo docs/PLAN.md), para que cualquier sesión futura tenga todo el contexto.
3. **Añadir lo que falta, por este orden**, sin tocar lo que ya funciona:
   1. Modo "Voy a recoger" (con el archivo de configuración de tiempos por aeropuerto).
   2. "Comparte tu vuelo" por WhatsApp con buena vista previa.
   3. Respuesta en una frase con semáforo.
   4. Aviso de reclamación ("podrías tener derecho") y los huecos para los enlaces de afiliado de cada momento (los enlaces reales se ponen cuando me aprueben en Travelpayouts).
   5. Textos legales a mi nombre, banner de cookies y la línea de transparencia de afiliados.
   6. Estructura de las páginas SEO (/vuelo/, /aerolinea/, /aeropuerto/) y 3-4 páginas de contenido.
   7. Lo demás (avisos, toque friki), solo preparado para más adelante.
4. Después de cada bloque, **explícame en lenguaje sencillo qué has añadido** y si tengo que hacer algo yo.
5. Si aún no está hecho: explícame cómo **transferir el repositorio** a mi cuenta personal de GitHub (los pasos los hago yo).

---

# Contraste con el repo — sesión del 11/11/2026

Esta sección NO forma parte del brief original. La añade Claude al guardarlo,
para que una sesión futura no dé por buena una función que ya medimos que no
se puede hacer. El brief de arriba queda tal cual lo escribió Fer.

## 🔴 Choque grave: la matrícula y la rotación previas al vuelo

Los apartados §1 y §4.2 dan por hecho que podemos enseñar **qué avión operará
tu vuelo y dónde está ahora**. Está medido con vuelos reales y **no se puede**:

- AeroDataBox no publica `reg` ni `modeS` de un vuelo hasta que ha aterrizado.
  Cuatro mediciones (T−2,5 h, embarque cerrado, en ruta y aterrizado) lo
  confirman. Detalle en el README, sección de hallazgos.
- Siete días del IB1082 dieron **seis aviones distintos**, así que tampoco hay
  patrón que aprender.
- No es un límite del proveedor: es cómo opera la aerolínea. Ningún proveedor
  lo arregla, porque el dato no existe aún.

**El sustituto salió de los mismos datos y es mejor:** el proveedor publica su
propia predicción de llegada (`arrival.predictedTime`) y **no coincide con lo
que promete la aerolínea**. En los dos vuelos medidos la diferencia fue de
**23 y 24 minutos**. Eso está disponible en cualquier momento, sin matrícula.

Consecuencia: la rotación pasa de motor del producto a extra que aparece solo
cuando hay datos (ya está programado así). Y el posicionamiento frente a
Flighty cambia: no competimos en "dónde está tu avión", sino en "tu aerolínea
te está prometiendo 23 minutos que no se van a cumplir".

## ⚠️ Diferencias menores (manda el repo, según la regla del propio brief)

- **Idioma: NO es un choque.** §1 dice "todo en español", pero Fer confirmó
  el 11/11 que el producto es bilingüe español + inglés y que el brief
  simplemente no lo recogía. La versión inglesa del repo (adaptada, no
  traducida) es la correcta y **no se toca**.
- **Mensaje de portada.** §3 propone "¿Vas a recoger a alguien al
  aeropuerto?". El repo lleva "¿Cómo va tu vuelo?", elegido expresamente por
  Fer. Se mantiene; "voy a recoger" sirve igual como gancho de contenido.
- **Banner de cookies.** Hoy no hay, a propósito: no se rastrea nada. Pasa a
  ser obligatorio en cuanto entren AdSense o la cookie de 45 días de
  Travelpayouts.
- **Calendario.** §11 sitúa la compra del dominio a principios de diciembre;
  en sesión se había fijado el 2 de noviembre. Pendiente de confirmar.

## ℹ️ En el repo y no en el brief

- Lista de espera de emails (`Waitlist`), con consentimiento separado.
- Historial de puntualidad por número de vuelo (71 %, +10 min en datos
  reales), que funciona meses antes del vuelo y abre un segundo caso de uso:
  elegir qué vuelo comprar.
- Cálculo de compensación EU261 (250/400/600 €) ya implementado: es el gancho
  de AirHelp, medio construido.
- Caché adaptativa y límite por IP, que es lo que §5 pide para controlar el
  coste.
