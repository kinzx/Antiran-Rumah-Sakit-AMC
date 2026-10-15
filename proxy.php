<?php
// ============================================================
// PROXY ANTRIAN RS AMC MUHAMMADIYAH
// Meneruskan request ke API server antrian internal RS.
// Kredensial dimuat dari file .env (tidak ikut di-commit).
// ============================================================

header('Content-Type: application/json');
header('Cache-Control: no-store');

// ---- Muat konfigurasi dari .env ----
// File .env berisi ANTRIAN_API_KEY dan ANTRIAN_API_URL.
// Jika .env tidak ada, proxy akan menolak semua request.
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Lewati baris komentar
        if ($line === '' || $line[0] === '#') continue;
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = array_map('trim', explode('=', $line, 2));
            // Set sebagai environment variable jika belum ada
            if (!getenv($key)) {
                putenv("$key=$value");
            }
        }
    }
}

// ---- Ambil kredensial dari environment ----
$apiKey = getenv('ANTRIAN_API_KEY');
$url    = getenv('ANTRIAN_API_URL');

if (!$apiKey || !$url) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Konfigurasi server belum lengkap. Pastikan file .env sudah diisi.',
        'data'    => [],
    ]);
    exit;
}

// ---- Pagar same-origin ----
// Hanya izinkan request yang datang dari halaman kita sendiri.
// Buka proxy.php langsung di address bar tidak mengirim Referer -> ditolak.
// Catatan: pagar ini menghalangi akses iseng lewat browser, bukan penyerang
// yang bisa menyetel header sendiri (curl -H "Referer: ..."). Frontend statis
// tidak bisa menyimpan rahasia; kunci sebenarnya ada di API key + pembatasan IP.
$refHost = parse_url($_SERVER['HTTP_REFERER'] ?? '', PHP_URL_HOST);
// HTTP_HOST memuat port (localhost:8000), parse_url hanya host -> port dibuang dulu
$selfHost = preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
if ($refHost === null || $refHost === false || $refHost !== $selfHost) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'UNAUTHORIZED',
            'message' => 'Missing or invalid API key. Send it via the "X-API-KEY" header.',
            'details' => new stdClass(),
        ],
        'meta' => [
            'request_id' => bin2hex(random_bytes(8)),
            'timestamp' => gmdate('Y-m-d\TH:i:s.000\Z'),
        ],
    ]);
    exit;
}

// ---- Kirim request ke API RS ----
$ctx = stream_context_create(['http' => [
    'timeout' => 10,
    'ignore_errors' => true, // supaya body error 401/403 tetap bisa dibaca
    'header'  => "x-api-key: {$apiKey}\r\nAccept: application/json\r\n",
]]);

$body = @file_get_contents($url, false, $ctx);

// status dari $http_response_header (stream HTTP, bukan cURL)
$status = 0;
if (isset($http_response_header)) {
    foreach ($http_response_header as $h) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) { $status = (int) $m[1]; }
    }
}

if ($body === false) {
    http_response_code(502);
    echo json_encode(['status' => 'error', 'message' => 'Tidak bisa menghubungi server antrian', 'data' => []]);
    exit;
}

if ($status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['status' => 'error', 'message' => "Server antrian balas HTTP $status", 'data' => []]);
    exit;
}

// API RS membungkus data: { success, data: { antrian: [...] } }.
// script.js mengharapkan { status: 'success', data: [...] }.
// Normalisasi di sini supaya script.js tidak perlu diubah.
$res = json_decode($body, true);
if (!is_array($res) || empty($res['success']) || !isset($res['data']['antrian']) || !is_array($res['data']['antrian'])) {
    http_response_code(502);
    echo json_encode(['status' => 'error', 'message' => 'Format respons server antrian tidak dikenali', 'data' => []]);
    exit;
}

echo json_encode(['status' => 'success', 'data' => $res['data']['antrian']]);