<?php
// ponytail: no cache, tambah cache file 5 detik kalau RS komplain rate-limit
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');
$url = 'https://infoantrian.rsamcmuhammadiyah.com/antrian/getAntrianbyunit';
$ctx = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
$data = @file_get_contents($url, false, $ctx);
if ($data === false) {
    http_response_code(502);
    echo json_encode(['status' => 'error', 'message' => 'Gagal mengambil data RS', 'data' => []]);
    exit;
}
echo $data;
