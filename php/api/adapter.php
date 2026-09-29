<?php
/**
 * Traduce la respuesta de AeroDataBox a la forma interna de la app.
 *
 * Es el gemelo en PHP de src/lib/adapter.js. Se mantiene fiel a propósito:
 * los mismos nombres de campo y las mismas reglas, para que la interfaz no
 * note de dónde vienen los datos.
 *
 * Los nombres de campo están verificados contra respuestas reales del
 * proveedor (septiembre de 2026), no deducidos de la documentación.
 */

/** Estados que entiende el motor de veredicto. */
const ESTADOS = [
    'expected', 'checkIn', 'boarding', 'gateClosed', 'departed', 'enRoute',
    'approaching', 'arrived', 'delayed', 'diverted', 'canceled',
    'canceledUncertain', 'unknown',
];

/**
 * AeroDataBox devuelve el estado en PascalCase ("Arrived", "GateClosed")
 * aunque su esquema lo documente en camelCase. Sin normalizar, el motor no
 * reconoce ninguno y todos los vuelos acaban en "no sabemos qué avión te toca".
 */
function normalize_status(?string $raw): string {
    if (!$raw) return 'unknown';
    $key = lcfirst($raw);
    return in_array($key, ESTADOS, true) ? $key : 'unknown';
}

/** Extrae "hh:mm" de un tiempo de AeroDataBox ({ local, utc } o cadena). */
function hhmm($time): ?string {
    if (!$time) return null;
    $raw = is_string($time) ? $time : ($time['local'] ?? $time['utc'] ?? null);
    if (!$raw) return null;
    return preg_match('/(\d{2}):(\d{2})/', $raw, $m) ? "$m[1]:$m[2]" : null;
}

/** Extrae "AAAA-MM-DD" de un tiempo de AeroDataBox. */
function hhmm_date($time): ?string {
    if (!$time) return null;
    $raw = is_string($time) ? $time : ($time['local'] ?? $time['utc'] ?? null);
    return preg_match('/(\d{4}-\d{2}-\d{2})/', (string) $raw, $m) ? $m[1] : null;
}

/** Minutos entre dos horas "hh:mm", cruzando medianoche si hace falta. */
function minutes_between(?string $from, ?string $to): ?int {
    if (!$from || !$to) return null;
    $m = fn($t) => ((int) substr($t, 0, 2)) * 60 + ((int) substr($t, 3, 2));
    $diff = $m($to) - $m($from);
    if ($diff < 0) $diff += 1440;
    return $diff;
}

/** Diferencia en minutos entre la hora revisada y la programada. */
function delay_minutes(?array $movement): int {
    $scheduled = hhmm($movement['scheduledTime'] ?? null);
    $revised = hhmm($movement['revisedTime'] ?? null) ?? hhmm($movement['runwayTime'] ?? null);
    if (!$scheduled || !$revised) return 0;
    $m = fn($t) => ((int) substr($t, 0, 2)) * 60 + ((int) substr($t, 3, 2));
    $diff = $m($revised) - $m($scheduled);
    if ($diff < -720) $diff += 1440;
    if ($diff > 720) $diff -= 1440;
    return max(0, $diff);
}

function city(?array $movement): string {
    return $movement['airport']['municipalityName']
        ?? $movement['airport']['shortName']
        ?? $movement['airport']['name']
        ?? '—';
}

function iata(?array $movement): string {
    return $movement['airport']['iata'] ?? $movement['airport']['icao'] ?? '—';
}

/** Los tramos que el avión vuela hoy antes del tuyo. */
function build_rotation(array $flight, array $aircraftFlights): array {
    $legs = [];
    foreach ($aircraftFlights as $f) {
        if (($f['number'] ?? null) === ($flight['number'] ?? null)) continue;
        $estado = normalize_status($f['status'] ?? null);
        $salido = in_array($estado, ['departed', 'enRoute', 'approaching'], true);
        $llegado = $estado === 'arrived';
        $delay = delay_minutes($f['departure'] ?? null);

        if ($llegado) {
            $tag = ['kind' => 'landed', 'time' => hhmm($f['arrival']['revisedTime'] ?? $f['arrival']['scheduledTime'] ?? null)];
        } elseif ($salido) {
            $tag = ['kind' => 'inFlight'];
        } else {
            $tag = ['kind' => 'pending'];
        }

        $legs[] = [
            'airport' => city($f['arrival'] ?? null),
            'iata' => iata($f['arrival'] ?? null),
            'state' => $llegado ? 'done' : ($salido ? 'active' : 'pending'),
            'tag' => $tag,
            'delayMin' => $delay,
        ];
    }

    $legs[] = [
        'airport' => city($flight['arrival'] ?? null),
        'iata' => iata($flight['arrival'] ?? null),
        'state' => 'final',
        'tag' => ['kind' => 'yourFlight'],
    ];

    return $legs;
}

/** Historial de puntualidad del número de vuelo. */
function build_history(array $rangeFlights): array {
    $out = [];
    foreach ($rangeFlights as $f) {
        $date = hhmm_date($f['departure']['scheduledTime'] ?? null);
        if (!$date) continue;
        $out[] = ['date' => $date, 'delayMin' => delay_minutes($f['departure'] ?? null)];
    }
    usort($out, fn($a, $b) => strcmp($a['date'], $b['date']));
    return $out;
}

/** Retraso acumulado del avión hoy. */
function accumulated_delay(array $aircraftFlights): int {
    $max = 0;
    foreach ($aircraftFlights as $f) $max = max($max, delay_minutes($f['departure'] ?? null));
    return $max;
}

/** Minutos de escala en tu aeropuerto entre la llegada anterior y tu salida. */
function turnaround(array $flight, array $aircraftFlights): ?int {
    $inbound = null;
    foreach ($aircraftFlights as $f) {
        if (($f['number'] ?? null) === ($flight['number'] ?? null)) continue;
        if (iata($f['arrival'] ?? null) === iata($flight['departure'] ?? null)) $inbound = $f;
    }
    $llegada = hhmm($inbound['arrival']['revisedTime'] ?? $inbound['arrival']['scheduledTime'] ?? null);
    $salida = hhmm($flight['departure']['revisedTime'] ?? $flight['departure']['scheduledTime'] ?? null);
    return minutes_between($llegada, $salida);
}

/** Cuánto se desvía la predicción del proveedor respecto a lo programado. */
function predicted_delay(?array $movement): int {
    $scheduled = hhmm($movement['scheduledTime'] ?? null);
    $predicted = hhmm($movement['predictedTime'] ?? null);
    if (!$scheduled || !$predicted) return 0;
    $m = fn($t) => ((int) substr($t, 0, 2)) * 60 + ((int) substr($t, 3, 2));
    $diff = $m($predicted) - $m($scheduled);
    if ($diff < -720) $diff += 1440;
    if ($diff > 720) $diff -= 1440;
    return max(0, $diff);
}

/** Punto de entrada: respuesta del proveedor → forma interna. */
function to_internal(array $flight, array $aircraftFlights = [], array $rangeFlights = []): array {
    // Tres niveles de conocimiento sobre el avión, y no son lo mismo:
    // matrícula o Mode-S permiten seguir la rotación; el modelo solo permite
    // contar en qué vas a volar. Medido: hasta que el avión no despega, el
    // proveedor únicamente da el modelo.
    $reg = $flight['aircraft']['reg'] ?? null;
    $modeS = $flight['aircraft']['modeS'] ?? null;
    $model = $flight['aircraft']['model'] ?? null;
    $traceable = (bool) ($reg || $modeS);

    return [
        'code' => $flight['number'] ?? null,
        'status' => normalize_status($flight['status'] ?? null),
        'airline' => $flight['airline']['name'] ?? null,
        'route' => [
            'from' => ['city' => city($flight['departure'] ?? null), 'iata' => iata($flight['departure'] ?? null)],
            'to' => ['city' => city($flight['arrival'] ?? null), 'iata' => iata($flight['arrival'] ?? null)],
        ],
        'departure' => [
            'scheduled' => hhmm($flight['departure']['scheduledTime'] ?? null),
            'revised' => hhmm($flight['departure']['revisedTime'] ?? null),
            'terminal' => $flight['departure']['terminal'] ?? null,
            'gate' => $flight['departure']['gate'] ?? null,
        ],
        // La llegada es donde vive el valor: la aerolínea publica su hora
        // revisada y el proveedor su predicción, y no coinciden.
        'arrival' => [
            'scheduled' => hhmm($flight['arrival']['scheduledTime'] ?? null),
            'revised' => hhmm($flight['arrival']['revisedTime'] ?? null),
            'predicted' => hhmm($flight['arrival']['predictedTime'] ?? null),
            'terminal' => $flight['arrival']['terminal'] ?? null,
        ],
        'aircraft' => ($reg || $modeS || $model)
            ? ['reg' => $reg, 'modeS' => $modeS, 'model' => $model ?? 'Avión sin identificar', 'ageYears' => null]
            : null,
        'delayMin' => accumulated_delay($aircraftFlights),
        'turnaroundMin' => turnaround($flight, $aircraftFlights),
        'distanceKm' => $flight['greatCircleDistance']['km'] ?? null,
        'lastUpdatedUtc' => $flight['lastUpdatedUtc'] ?? null,
        'quality' => $flight['departure']['quality'] ?? [],
        // El proveedor publica su propia predicción de llegada, y la da incluso
        // sin avión asignado: es la mejor señal cuando menos sabemos.
        'predictedArrival' => hhmm($flight['arrival']['predictedTime'] ?? null),
        'predictedDelayMin' => predicted_delay($flight['arrival'] ?? null),
        'estimate' => null,
        'rotation' => $traceable ? build_rotation($flight, $aircraftFlights) : [],
        'history' => build_history($rangeFlights),
    ];
}
