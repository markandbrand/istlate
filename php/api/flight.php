<?php
/**
 * Endpoint de vuelos: GET /api/flight?code=IB1082
 *
 * Gemelo en PHP de src/lib/flightService.js, para alojarlo en SiteGround sin
 * montar Node. Mismas responsabilidades y en el mismo orden de importancia:
 *   1. Guardar la API key fuera del navegador.
 *   2. No pagar dos veces por la misma pregunta.
 *   3. Que nadie funda la cuota mensual.
 */
declare(strict_types=1);

require __DIR__ . '/adapter.php';

header('Content-Type: application/json; charset=utf-8');

$config = file_exists(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$KEY = $config['AERODATABOX_KEY'] ?? '';
$HOST = $config['AERODATABOX_HOST'] ?? 'aerodatabox.p.rapidapi.com';

/** Formato de número de vuelo: 2-3 caracteres de aerolínea + 1-4 dígitos. */
const FLIGHT_CODE = '/^[A-Z0-9]{2,3}\d{1,4}$/';
const RATE_MAX = 20;            // búsquedas por IP
const RATE_WINDOW = 60;         // y por minuto
const TTL_CERCA = 90;           // segundos, en la recta final
const TTL_LEJOS = 900;          // a más de 3 h de la salida
const TTL_HISTORIAL = 43200;    // 12 h: el histórico solo cambia al cerrar el día
const DIAS_HISTORIAL = 7;

/** Caché en disco. En hosting compartido no hay Redis, y con archivos basta. */
$CACHE_DIR = __DIR__ . '/../.cache';
if (!is_dir($CACHE_DIR)) @mkdir($CACHE_DIR, 0775, true);

function responder(array $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function cache_get(string $key): ?array {
    global $CACHE_DIR;
    $file = $CACHE_DIR . '/' . md5($key) . '.json';
    if (!file_exists($file)) return null;
    $raw = json_decode((string) file_get_contents($file), true);
    if (!is_array($raw) || ($raw['expires'] ?? 0) < time()) return null;
    return $raw['value'];
}

function cache_set(string $key, array $value, int $ttl): void {
    global $CACHE_DIR;
    @file_put_contents(
        $CACHE_DIR . '/' . md5($key) . '.json',
        json_encode(['expires' => time() + $ttl, 'value' => $value], JSON_UNESCAPED_UNICODE)
    );
}

/** Límite por IP, también en disco. Protege de ráfagas, que es lo que importa. */
function rate_limited(string $ip): bool {
    global $CACHE_DIR;
    $file = $CACHE_DIR . '/rate_' . md5($ip) . '.json';
    $hits = file_exists($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    $now = time();
    $hits = array_values(array_filter($hits, fn($t) => $now - $t < RATE_WINDOW));
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits));
    return count($hits) > RATE_MAX;
}

/** Opciones copiadas de la consola de RapidAPI. */
const OPCIONES = 'withAircraftImage=false&withLocation=false&withFlightPlan=false&dateLocalRole=Both';

/**
 * Llama a AeroDataBox.
 *
 * Ruta verificada en su consola: GET /flights/{searchBy}/{param}/{fecha},
 * donde searchBy ∈ { number, reg, callSign, icao24 }.
 */
function llamar_proveedor(string $path): array {
    global $KEY, $HOST;
    $ch = curl_init("https://$HOST$path");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => [
            "X-RapidAPI-Key: $KEY",
            "X-RapidAPI-Host: $HOST",
            'Accept: application/json',
        ],
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status === 404) return [];
    if ($status !== 200) throw new RuntimeException("Proveedor respondió $status");

    $data = json_decode((string) $body, true);
    if (!is_array($data)) return [];
    return array_is_list($data) ? $data : ($data['flights'] ?? [$data]);
}

$hoy = date('Y-m-d');
$desde = date('Y-m-d', strtotime('-' . DIAS_HISTORIAL . ' days'));
$hasta = date('Y-m-d', strtotime('-1 day'));

$code = strtoupper(trim((string) ($_GET['code'] ?? '')));
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'anon';

if (!preg_match(FLIGHT_CODE, $code)) {
    responder(['error' => 'invalid_code', 'message' => 'Eso no parece un número de vuelo. Prueba con algo como FR1234.'], 400);
}

if (rate_limited($ip)) {
    header('Retry-After: 60');
    responder(['error' => 'rate_limited', 'message' => 'Vas muy rápido. Espera un minuto y vuelve a intentarlo.'], 429);
}

// Sin key configurada la web sigue viva en modo demo, igual que en Netlify.
if (!$KEY || $KEY === 'PEGA_AQUI_TU_KEY') {
    header('X-IsItLate-Mode: demo');
    responder(['error' => 'no_key', 'message' => 'Falta configurar la API key en el servidor.'], 503);
}

$cacheKey = "$code:$hoy";
if ($cached = cache_get($cacheKey)) {
    header('X-IsItLate-Cache: hit');
    responder($cached);
}

try {
    // 1) El vuelo del usuario.
    $vuelos = llamar_proveedor("/flights/number/$code/$hoy?" . OPCIONES);
    $flight = $vuelos[0] ?? null;
    if (!$flight) {
        responder(['error' => 'not_found', 'message' => "No encontramos el vuelo $code para hoy."], 404);
    }

    // 2) Los tramos de ese avión hoy, si se le puede seguir la pista.
    //    Medido: hasta que despega, el proveedor no da ni matrícula ni Mode-S,
    //    así que casi siempre esto queda vacío antes de la salida.
    $reg = $flight['aircraft']['reg'] ?? null;
    $modeS = $flight['aircraft']['modeS'] ?? null;
    $buscarPor = $reg ? 'reg/' . rawurlencode($reg) : ($modeS ? 'icao24/' . rawurlencode($modeS) : null);
    $tramos = $buscarPor ? llamar_proveedor("/flights/$buscarPor/$hoy?" . OPCIONES) : [];

    // 3) El historial del número de vuelo. Se cachea 12 h aparte porque solo
    //    cambia al cerrarse el día y las consultas de rango son de las caras.
    $histKey = "hist:$code";
    $historial = cache_get($histKey);
    if ($historial === null) {
        try {
            $historial = llamar_proveedor("/flights/number/$code/$desde/$hasta?" . OPCIONES);
        } catch (Throwable $e) {
            error_log('[isitlate] historial no disponible: ' . $e->getMessage());
            $historial = [];
        }
        cache_set($histKey, $historial, TTL_HISTORIAL);
    }

    $result = to_internal($flight, $tramos, $historial);

    // Cerca de la salida conviene refrescar; lejos, no: medido, la ficha de un
    // vuelo puede pasar cinco horas sin que el proveedor la toque.
    $salidaUtc = $flight['departure']['scheduledTime']['utc'] ?? null;
    $faltan = $salidaUtc ? strtotime(str_replace('Z', ' UTC', $salidaUtc)) - time() : 0;
    cache_set($cacheKey, $result, $faltan > 3 * 3600 ? TTL_LEJOS : TTL_CERCA);

    header('X-IsItLate-Cache: miss');
    responder($result);
} catch (Throwable $e) {
    error_log('[isitlate] fallo consultando el proveedor: ' . $e->getMessage());
    responder(['error' => 'provider_error', 'message' => 'No hemos podido consultar el vuelo ahora mismo. Inténtalo en un minuto.'], 502);
}
