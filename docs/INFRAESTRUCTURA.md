# Dónde alojar IsItLate y cuánto cuesta de verdad

Análisis del 17/11/2026, hecho para decidir dominio y alojamiento antes de
publicar. Las cifras de tráfico salen de los objetivos de ingresos del propio
proyecto (`docs/PLAN.md`, §6); las de precios de proveedor son aproximadas y
**hay que comprobarlas en su web**, porque desde el entorno de trabajo no se
puede acceder a ellas.

## 1. Cuánto tráfico hay que aguantar

Partiendo de los dos escenarios del plan y de los 0,13–0,25 € de ingreso por
búsqueda (tomamos 0,19 € de media):

| Escenario 2027 | Ingreso | Búsquedas/año | Búsquedas/mes | Búsquedas/día |
|---|---|---|---|---|
| Realista | ~24.500 € | ~129.000 | ~10.750 | **~355** |
| "Pepino" | ~45.000 € | ~237.000 | ~19.750 | **~650** |

Dos matices que la media esconde:

- **No toda visita busca.** Con las páginas de contenido para Google, las
  visitas serán 3-4 veces las búsquedas: entre 40.000 y 75.000 al mes.
- **El tráfico va a picos.** Este producto se usa cuando hay caos: una huelga
  de controladores, niebla en Barajas, una oleada de cancelaciones. Un día
  malo puede ser 10 o 20 veces la media. Hay que dimensionar para
  **3.500–7.000 búsquedas en un día**, no para 355.

Ese pico es justo el día en el que la web no se puede caer ni cortar.

## 2. El alojamiento no es el coste. Lo es la API

Este es el hallazgo principal y conviene no confundirse de problema.

### Alojamiento: 0 €, en los dos escenarios

En Cloudflare Pages los archivos estáticos no tienen tope de tráfico ni coste.
Lo único que consume cuota es la función `/api/flight`, y el plan gratuito de
Workers da del orden de **100.000 peticiones al día**.

Incluso en el escenario "pepino" con un pico de 20x estaríamos en ~13.000
peticiones en el peor día. Sobra con mucho margen.

> **Conclusión:** el alojamiento cuesta 0 € hasta muy por encima de los
> objetivos del plan. Si algún día se superan, el plan de pago de Workers son
> ~5 $/mes. No es la variable que hay que optimizar.

### La API: entre 0 € y varios cientos, según una decisión técnica

Cada búsqueda gasta **~4 unidades** de AeroDataBox (dos llamadas `getFlight`,
de 2 unidades cada una). Por tanto:

| Escenario | Unidades/mes sin caché compartida |
|---|---|
| Realista | ~43.000 |
| "Pepino" | ~79.000 |

El plan gratuito son ~600 unidades/mes. O sea que la API **sí** se paga, y es
el único gasto que crece con el éxito.

## 3. La palanca que de verdad importa: la caché compartida

`src/lib/flightService.js` ya cachea, pero con una limitación que el propio
archivo documenta: la caché vive **en memoria de cada instancia**. En
Cloudflare Workers eso significa muchas instancias, cada una con su copia, y
que se pierde en cada arranque en frío. Protege de ráfagas, pero no reduce el
gasto de forma apreciable.

Y aquí está lo importante: **mucha gente busca el mismo vuelo**. En un día de
caos, cientos de personas consultan el mismo IB1082. Con una caché de verdad,
eso es **una** llamada al proveedor por vuelo y ventana de tiempo, no
cientos.

Con Cloudflare KV o la Cache API de Workers, a esos volúmenes, es razonable
esperar un **60-80 % de aciertos**. Es decir:

| | Sin caché compartida | Con caché compartida |
|---|---|---|
| Realista | ~43.000 unidades | ~9.000–17.000 |
| "Pepino" | ~79.000 unidades | ~16.000–32.000 |

Eso puede ser la diferencia entre un plan de ~25 $/mes y uno de ~150 $/mes.
**Es la decisión de arquitectura con más impacto económico de todo el
proyecto**, y por eso la interfaz de `cache` se dejó deliberadamente mínima:
sustituirla por KV es cambiar dos funciones.

No hay que hacerlo antes de publicar. Hay que hacerlo **antes de pagar el
primer plan de API**.

## 4. Comparación honesta de alojamientos

| | Coste al nivel realista | ¿Aguanta el día de pico? | ¿Sube los cambios solo? | Pega principal |
|---|---|---|---|---|
| **Cloudflare Pages** | **0 €** | Sí: sin tope de tráfico | Sí, nativo desde GitHub | Ninguna seria para este caso |
| Netlify | 0 € hasta ~100 GB/mes y ~125.000 llamadas | Con tope: puede cortar o pedir pago | Sí, nativo | Te limita justo el día bueno |
| Vercel | 0 € al principio, Pro ~20 $/mes | Historial de facturas sorpresa en picos | Sí, nativo | Lo mismo, con peor fama |
| SiteGround u otro compartido | 5–15 €/mes **siempre** | Peor: un solo servidor, sin red global | No de forma cómoda | Hay que subir archivos a mano |

Un matiz sobre SiteGround: el proyecto tiene un gemelo en PHP (`php/`) hecho
precisamente para esa opción, y funciona. Pero paga todos los meses por algo
que aquí es gratis, va peor en los picos y rompe lo de desplegar solo. Se deja
como plan B, no como plan.

**Y hay una razón de futuro:** el plan pide páginas por vuelo, aerolínea y
aeropuerto para Google (`/vuelo/FR1234`). Eso necesita generarlas en el
servidor. Cloudflare permite añadirlo más adelante sin cambiar de proveedor ni
de precio. Las demás opciones obligarían a mudanza o a pagar más.

## 5. Dominio

`isitlate.com`, `.es`, `.io` y `.net` están ocupados. Libre: **`.app`**.

| Dónde | Precio aproximado | Notas |
|---|---|---|
| **Cloudflare Registrar** | ~14-16 €/año | A precio de coste, sin promo del primer año. Privacidad WHOIS incluida. Misma cuenta que el alojamiento |
| Porkbun / Namecheap | Similar o algo menos | Hay que apuntar el DNS a Cloudflare a mano |
| IONOS / GoDaddy | Barato el año 1, caro después | El juego de la renovación |

**Recomendación:** `isitlate.app` en Cloudflare Registrar.

Y una idea que merece la pena: **comprarlo para 2 o 3 años de golpe** (~45 €).
Perder el dominio por una tarjeta caducada es el único desastre irreversible
de todo esto, y pagando por adelantado se elimina el riesgo y se fija el
precio.

Sobre el `.app`: lo gestiona Google y obliga a conexión segura siempre. Con
Cloudflare eso es automático y gratis, así que no es un inconveniente: es un
candado permanente en la barra del navegador, que para un sitio donde la gente
deja su email, ayuda.

## 6. Presupuesto resultante

| Concepto | Hoy | Nivel realista | "Pepino" |
|---|---|---|---|
| Dominio | ~15 €/año | ~15 €/año | ~15 €/año |
| Alojamiento | 0 € | 0 € | 0 € (o ~5 $/mes) |
| API de vuelos | 0 € (plan gratis) | ~25-50 $/mes **con caché compartida** | ~50-150 $/mes |
| Emails (Brevo) | 0 € | 0 € hasta ~300 envíos/día | ~20 €/mes |

**Para empezar: 15 € al año y nada más.** El resto solo aparece cuando haya
ingresos que lo paguen, que es exactamente como debe ser.

## 7. Qué hacer y en qué orden

1. **Ahora:** comprar `isitlate.app` en Cloudflare y conectar Pages al
   repositorio. Coste 15 €, tiempo media hora.
2. **Antes de pagar el primer plan de API:** mover la caché a Cloudflare KV.
   Es la palanca del punto 3 y es barata de hacer.
3. **El mismo día que se contrate el plan Pro, sin falta:**

   🔓 **Quitar el `Disallow: /vuelo/` de `public/robots.txt`.**

   Se puso el 27/11/2026, al llegar el dominio, porque cada página de vuelo
   ejecuta una búsqueda real y un robot recorriéndolas vaciaba el plan
   gratuito en una tarde. No bloquea a ninguna persona, solo a los robots de
   los buscadores.

   Con plan de pago deja de tener sentido: el objetivo es que entren visitas
   vengan de donde vengan. Y conviene además generar esas páginas en el
   servidor, con contenido estable ("el IB1082 sale puntual el 29% de los
   días") en vez de dejar que el robot ejecute la aplicación: así se indexan
   de verdad y no cuestan una consulta por visita.

4. **Cuando el tráfico lo pida:** comparar AeroDataBox directo frente a
   RapidAPI, que cobra su parte por encima.
5. **Cuando haya páginas SEO:** generarlas en el servidor con Workers, sin
   cambiar de proveedor.
