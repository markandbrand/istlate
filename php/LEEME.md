# Backend en PHP para SiteGround

Alternativa a la función serverless de `netlify/functions/` y `functions/api/`,
para alojar el proyecto en un hosting compartido sin montar Node.

Hace exactamente lo mismo: `flight.php` es el gemelo de `src/lib/flightService.js`
y `adapter.php` el de `src/lib/adapter.js`. **Se han contrastado campo a campo
contra cuatro respuestas reales del proveedor y devuelven un JSON idéntico.**

## Qué sube a `public_html`

```
public_html/
  index.html          ← de dist/
  assets/             ← de dist/
  favicon.svg         ← de dist/
  .htaccess           ← de php/
  api/
    flight.php        ← de php/api/
    adapter.php       ← de php/api/
    config.php        ← lo creas tú (ver abajo)
```

La carpeta `.cache/` la crea el propio PHP la primera vez. Si el hosting no le
deja escribir, la web sigue funcionando: solo pierde la caché y gasta más
unidades del plan.

## La API key

1. Copia `api/config.example.php` a `api/config.php`
2. Pega la key de AeroDataBox dentro
3. **`config.php` no se sube al repositorio** (está en `.gitignore`), y el
   `.htaccess` prohíbe servirlo. Aunque alguien pida la URL, Apache ejecuta el
   PHP en vez de enseñar el código.

Sin key, el endpoint responde 503 diciendo que falta configurarla, en vez de
romperse en silencio.

## Requisitos

PHP 8.1 o superior con la extensión cURL, que SiteGround trae de serie.

## Comprobar que funciona

```
https://tudominio.com/api/flight?code=IB1082
```

Debe devolver un JSON con `code`, `status`, `route`, `departure`, `arrival`…
Si devuelve el HTML de la web, el `.htaccess` no se está aplicando.
