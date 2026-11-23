-- Base de datos de IsItLate (Cloudflare D1).
--
-- Dos tablas, dos propósitos:
--
--   predicciones → medir si acertamos más que la aerolínea
--   gasto        → llevar la cuenta de unidades del proveedor de verdad,
--                  compartida entre todas las instancias del servidor
--
-- No se guarda NINGÚN dato personal: ni IP, ni identificador de usuario, ni
-- nada que permita saber quién buscó qué. Solo datos del vuelo, que son
-- públicos. Por eso esta base de datos no entra en el RGPD.
--
-- Para crearla:
--   npx wrangler d1 execute isitlate --remote --file=db/schema.sql

-- ───────────────────────────────────────────────────────────────────────
-- PREDICCIONES
--
-- Una fila por vuelo y día. Se escribe al consultarlo por primera vez, con
-- lo que decía cada uno, y se completa más tarde con la hora real.
--
-- Las predicciones CADUCAN: la de hoy no se puede recuperar mañana. Por eso
-- se guardan desde el primer día, aunque todavía no sepamos completarlas.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predicciones (
  vuelo               TEXT NOT NULL,   -- "IB1082", sin espacios
  fecha               TEXT NOT NULL,   -- día del vuelo, AAAA-MM-DD
  consultado_en       TEXT NOT NULL,   -- cuándo lo vimos, ISO en UTC

  origen              TEXT,            -- IATA
  destino             TEXT,            -- IATA
  estado              TEXT,            -- estado en el momento de la consulta

  salida_programada   TEXT,            -- "hh:mm"
  salida_aerolinea    TEXT,            -- la revisada por la aerolínea
  llegada_programada  TEXT,
  llegada_aerolinea   TEXT,            -- lo que promete la aerolínea
  llegada_prediccion  TEXT,            -- lo que predice el proveedor

  -- Se rellenan después, cuando el vuelo ya ha ocurrido.
  salida_real         TEXT,
  llegada_real        TEXT,
  cerrado_en          TEXT,

  PRIMARY KEY (vuelo, fecha)
);

-- Para encontrar rápido lo que falta por cerrar.
CREATE INDEX IF NOT EXISTS idx_predicciones_abiertas
  ON predicciones (cerrado_en, fecha);

-- ───────────────────────────────────────────────────────────────────────
-- GASTO
--
-- El contador de unidades del proveedor, por día. Vive aquí y no en memoria
-- porque Cloudflare levanta varias instancias del servidor y cada una tenía
-- su propia cuenta: el tope diario frenaba una avalancha pero no la cortaba.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gasto (
  dia       TEXT PRIMARY KEY,          -- AAAA-MM-DD en UTC
  unidades  INTEGER NOT NULL DEFAULT 0,
  avisado   INTEGER NOT NULL DEFAULT 0 -- 1 cuando ya se avisó al dueño
);
