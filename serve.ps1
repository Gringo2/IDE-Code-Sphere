$defaultPort = 8000
$port = $defaultPort
$foundPort = $false

while (-not $foundPort) {
    $portCheck = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "Port $port is already in use. Trying $($port + 1)..." -ForegroundColor Yellow
        $port++
    }
    else {
        $foundPort = $true
    }
}

Write-Host "Serving documentation on http://127.0.0.1:$port" -ForegroundColor Green
python -m mkdocs serve -a "127.0.0.1:$port"
