<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
$script_url = "https://script.google.com/macros/s/AKfycbzMqLNqMB0oPwflNIyovyi8llXjZ4G4xwic4e2WKiuJBbIOKjW2r9D4UIkRY5ntXOGfEw/exec?p=submit"; // <-- tu URL de AppScript
// Lee cuerpo JSON
$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true);

// Validación simple
if (!$data || !isset($data['nombre']) || !isset($data['comentario'])) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Datos inválidos o incompletos"]);
    exit;
}

// Prepara los datos como formulario (application/x-www-form-urlencoded)
$postData = http_build_query($data);

$ch = curl_init($script_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // evita errores SSL
$response = curl_exec($ch);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => curl_error($ch)]);
    curl_close($ch);
    exit;
}

curl_close($ch);
echo $response; // devuelve lo que responda tu Apps Script
?>
