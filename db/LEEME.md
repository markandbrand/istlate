# Base de datos — puesta en marcha

Cinco minutos, una sola vez. Mientras no esté hecho, la web funciona igual:
el código comprueba si hay base de datos y, si no la hay, sigue sin ella.

## 1. Crear la base de datos

En Cloudflare: **Storage & databases → D1 → Create database**.

Nombre: **`isitlate`**

## 2. Crear las tablas

En la propia base de datos, pestaña **Console**, pega el contenido de
`db/schema.sql` y ejecútalo.

## 3. Enchufarla a la web

En el proyecto de Pages: **Settings → Bindings → Add → D1 database**.

| Campo | Valor |
|---|---|
| Variable name | `DB` |
| D1 database | `isitlate` |

⚠️ El nombre de la variable tiene que ser exactamente **`DB`**, en mayúsculas.

## 4. Volver a desplegar

**Deployments → Retry deployment**. Las conexiones solo entran en el
siguiente despliegue.

## Comprobar que funciona

Busca un vuelo cualquiera en la web y luego, en la Console de D1:

```sql
SELECT * FROM predicciones ORDER BY consultado_en DESC LIMIT 5;
```

Si sale tu vuelo, ya está guardando.

## Las preguntas que podrás hacerle

Dentro de unas semanas, cuando haya filas cerradas:

```sql
-- ¿Quién se acerca más a la hora real: la aerolínea o la predicción?
SELECT
  COUNT(*) AS vuelos,
  ROUND(AVG(ABS(
    (CAST(substr(llegada_aerolinea,1,2) AS INT) * 60 + CAST(substr(llegada_aerolinea,4,2) AS INT)) -
    (CAST(substr(llegada_real,1,2) AS INT) * 60 + CAST(substr(llegada_real,4,2) AS INT))
  )), 1) AS error_aerolinea_min,
  ROUND(AVG(ABS(
    (CAST(substr(llegada_prediccion,1,2) AS INT) * 60 + CAST(substr(llegada_prediccion,4,2) AS INT)) -
    (CAST(substr(llegada_real,1,2) AS INT) * 60 + CAST(substr(llegada_real,4,2) AS INT))
  )), 1) AS error_prediccion_min
FROM predicciones
WHERE cerrado_en IS NOT NULL
  AND llegada_aerolinea IS NOT NULL
  AND llegada_prediccion IS NOT NULL;
```

Si `error_prediccion_min` sale más bajo que `error_aerolinea_min`, tienes tu
titular. Si sale más alto, tienes algo más valioso todavía: saberlo antes de
construir una campaña encima.

```sql
-- Cuánto gasto llevamos hoy
SELECT * FROM gasto ORDER BY dia DESC LIMIT 7;
```
