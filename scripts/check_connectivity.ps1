$ErrorActionPreference = 'Continue'
$uri = 'https://app.dungeonscrawl.com'
try {
    $res = Invoke-WebRequest -Uri $uri -Method Head -TimeoutSec 20 -UseBasicParsing
    if ($res.StatusCode) {
        Write-Output ("HTTPStatus=" + $res.StatusCode)
    } else {
        Write-Output 'HTTPStatus='
    }
} catch {
    Write-Output ("HTTPError=" + $_.Exception.Message)
}

