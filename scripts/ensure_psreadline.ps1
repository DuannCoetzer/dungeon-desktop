$ErrorActionPreference = 'Continue'
try {
    if (-not (Get-Module -ListAvailable -Name PSReadLine)) {
        try { Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -ErrorAction SilentlyContinue } catch {}
        try { Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue } catch {}
        Install-Module -Name PSReadLine -Scope CurrentUser -Force -AllowClobber
    }
    $mod = Get-Module -ListAvailable -Name PSReadLine | Select-Object -First 1
    if ($mod) {
        Write-Output ("PSReadLineVersion=" + $mod.Version.ToString())
    } else {
        Write-Output 'PSReadLineVersion='
    }
} catch {
    Write-Output ("InstallError=" + $_.Exception.Message)
}

