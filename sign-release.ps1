# Automated Code Signing Script for Studio Cosmic North - Dungeon Desktop
# Requires a valid code signing certificate installed in the Windows Certificate Store

param(
    [Parameter(Mandatory=$false)]
    [string]$CertificatePath,
    
    [Parameter(Mandatory=$false)]
    [string]$CertificatePassword,
    
    [Parameter(Mandatory=$false)]
    [string]$TimestampServer = "http://timestamp.digicert.com"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Studio Cosmic North - Code Signing" -ForegroundColor Green  
Write-Host "  Dungeon Desktop v1.0.0" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Check if signtool is available
try {
    $null = Get-Command signtool -ErrorAction Stop
    Write-Host "✓ SignTool found" -ForegroundColor Green
} catch {
    Write-Host "✗ SignTool not found. Please install Windows SDK." -ForegroundColor Red
    Write-Host "Download from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/" -ForegroundColor Yellow
    exit 1
}

# Find release artifacts
$releaseDir = "src-tauri\target\release\bundle"
if (-not (Test-Path $releaseDir)) {
    Write-Host "✗ Release directory not found: $releaseDir" -ForegroundColor Red
    Write-Host "Please run a release build first: npm run release" -ForegroundColor Yellow
    exit 1
}

# Find all executables and installers
$artifacts = @()
$artifacts += Get-ChildItem "$releaseDir\msi" -Filter "*.msi" -ErrorAction SilentlyContinue
$artifacts += Get-ChildItem "$releaseDir\nsis" -Filter "*.exe" -ErrorAction SilentlyContinue
$artifacts += Get-ChildItem "src-tauri\target\release" -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*dungeon*" }

if ($artifacts.Count -eq 0) {
    Write-Host "✗ No artifacts found to sign" -ForegroundColor Red
    Write-Host "Expected locations:" -ForegroundColor Yellow
    Write-Host "  - $releaseDir\msi\*.msi" -ForegroundColor Gray
    Write-Host "  - $releaseDir\nsis\*.exe" -ForegroundColor Gray
    exit 1
}

Write-Host "Found $($artifacts.Count) artifact(s) to sign:" -ForegroundColor Cyan
foreach ($artifact in $artifacts) {
    Write-Host "  • $($artifact.Name)" -ForegroundColor Gray
}
Write-Host ""

# Prepare signing command
$signCommand = @(
    "signtool", "sign"
    "/fd", "SHA256"
    "/tr", $TimestampServer
    "/td", "SHA256"
)

# Add certificate parameters
if ($CertificatePath -and (Test-Path $CertificatePath)) {
    Write-Host "Using certificate file: $CertificatePath" -ForegroundColor Cyan
    $signCommand += "/f", $CertificatePath
    if ($CertificatePassword) {
        $signCommand += "/p", $CertificatePassword
    }
} else {
    Write-Host "Using certificate from Windows Certificate Store" -ForegroundColor Cyan
    $signCommand += "/a"
}

# Sign each artifact
$successCount = 0
$failCount = 0

foreach ($artifact in $artifacts) {
    Write-Host "Signing: $($artifact.Name)..." -ForegroundColor Yellow
    
    $currentCommand = $signCommand + $artifact.FullName
    
    try {
        $result = & $currentCommand[0] $currentCommand[1..($currentCommand.Length-1)] 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Successfully signed" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ✗ Failed to sign" -ForegroundColor Red
            Write-Host "    Error: $result" -ForegroundColor Gray
            $failCount++
        }
    } catch {
        Write-Host "  ✗ Exception during signing: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SIGNING COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Successfully signed: $successCount" -ForegroundColor Green
Write-Host "Failed to sign: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 All artifacts signed successfully!" -ForegroundColor Green
    Write-Host "Your application is ready for professional distribution." -ForegroundColor Green
    Write-Host ""
    Write-Host "Signed files location:" -ForegroundColor Cyan
    foreach ($artifact in $artifacts) {
        Write-Host "  📦 $($artifact.FullName)" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Some artifacts failed to sign." -ForegroundColor Yellow
    Write-Host "Please check your certificate installation and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the signed installers on a clean Windows machine" -ForegroundColor Gray
Write-Host "2. Verify no security warnings appear during installation" -ForegroundColor Gray
Write-Host "3. Upload to distribution channels" -ForegroundColor Gray
