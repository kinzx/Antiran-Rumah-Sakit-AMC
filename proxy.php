<?php
// ponytail: key dari env ANTRIAN_API_KEY, fallback literal hanya untuk dev lokal.
// JANGAN commit key sungguhan ke repo.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$apiKey = getenv('ANTRIAN_API_KEY');
if ($apiKey === false || $apiKey === '') {
    $apiKey = '02bf74a2f69e510dccfef77826b0841d';
}

$url = 'http://172.16.24.137:8080/api/antrian';

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