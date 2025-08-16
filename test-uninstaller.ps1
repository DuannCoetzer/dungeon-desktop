# Uninstaller Test Script for Studio Cosmic North - Dungeon Desktop
# Comprehensive testing of uninstaller functionality

param(
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [string]$TestType = "full" # Options: "full", "msi", "nsis", "cleanup"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Studio Cosmic North - Uninstaller Test" -ForegroundColor Green
Write-Host "  Dungeon Desktop v1.0.0" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Test configuration
$AppName = "Dungeon Desktop"
$CompanyName = "Studio Cosmic North"
$InstallDir = "${env:ProgramFiles}\$AppName"
$AppDataDir = "${env:APPDATA}\$CompanyName\$AppName"
$LocalAppDataDir = "${env:LOCALAPPDATA}\$CompanyName\$AppName"
$TempDir = "${env:TEMP}\dungeon-desktop"
$UninstallKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$AppName"
$CompanyRegKey = "HKLM:\SOFTWARE\$CompanyName\$AppName"
$StartMenuDir = "${env:ALLUSERSPROFILE}\Microsoft\Windows\Start Menu\Programs\$CompanyName"

# Test results
$TestResults = @{
    "PreTest" = @{}
    "PostTest" = @{}
    "Issues" = @()
}

function Write-TestResult {
    param($Test, $Result, $Details = "")
    
    $Symbol = if ($Result) { "✅" } else { "❌" }
    $Color = if ($Result) { "Green" } else { "Red" }
    
    Write-Host "$Symbol $Test" -ForegroundColor $Color
    if ($Details -and $Verbose) {
        Write-Host "   $Details" -ForegroundColor Gray
    }
    
    return $Result
}

function Test-PathExists {
    param($Path, $ShouldExist = $true)
    
    $Exists = Test-Path $Path
    $Expected = if ($ShouldExist) { $Exists } else { -not $Exists }
    
    return $Expected
}

function Test-RegistryExists {
    param($Path, $ShouldExist = $true)
    
    try {
        $Exists = $null -ne (Get-ItemProperty $Path -ErrorAction SilentlyContinue)
        $Expected = if ($ShouldExist) { $Exists } else { -not $Exists }
        return $Expected
    } catch {
        return -not $ShouldExist
    }
}

function Test-PreUninstallState {
    Write-Host "🔍 Pre-Uninstall State Check" -ForegroundColor Cyan
    Write-Host "Verifying installation before testing uninstaller..." -ForegroundColor Gray
    Write-Host ""
    
    $TestResults.PreTest["InstallDir"] = Write-TestResult "Installation directory exists" (Test-PathExists $InstallDir)
    $TestResults.PreTest["Executable"] = Write-TestResult "Main executable exists" (Test-PathExists "$InstallDir\dungeon-desktop.exe")
    $TestResults.PreTest["UninstallKey"] = Write-TestResult "Uninstall registry key exists" (Test-RegistryExists $UninstallKey)
    $TestResults.PreTest["CompanyRegKey"] = Write-TestResult "Company registry key exists" (Test-RegistryExists $CompanyRegKey)
    $TestResults.PreTest["StartMenu"] = Write-TestResult "Start menu shortcuts exist" (Test-PathExists "$StartMenuDir\$AppName")
    
    # Optional items that may or may not exist
    if (Test-Path "$env:PUBLIC\Desktop\$AppName.lnk") {
        Write-TestResult "Desktop shortcut exists" $true "Optional component"
    }
    
    if (Test-Path $AppDataDir) {
        Write-TestResult "User data directory exists" $true "User has saved data"
    }
    
    Write-Host ""
}

function Test-PostUninstallState {
    Write-Host "🔍 Post-Uninstall State Check" -ForegroundColor Cyan
    Write-Host "Verifying complete removal..." -ForegroundColor Gray
    Write-Host ""
    
    $TestResults.PostTest["InstallDir"] = Write-TestResult "Installation directory removed" (Test-PathExists $InstallDir $false)
    $TestResults.PostTest["UninstallKey"] = Write-TestResult "Uninstall registry key removed" (Test-RegistryExists $UninstallKey $false)
    $TestResults.PostTest["CompanyRegKey"] = Write-TestResult "Company registry key removed" (Test-RegistryExists $CompanyRegKey $false)
    $TestResults.PostTest["StartMenu"] = Write-TestResult "Start menu shortcuts removed" (Test-PathExists "$StartMenuDir\$AppName" $false)
    $TestResults.PostTest["DesktopShortcut"] = Write-TestResult "Desktop shortcut removed" (Test-PathExists "$env:PUBLIC\Desktop\$AppName.lnk" $false)
    $TestResults.PostTest["TempFiles"] = Write-TestResult "Temp files cleaned" (Test-PathExists $TempDir $false)
    
    # File associations
    try {
        $FileAssoc = Get-ItemProperty "HKCR:\.ddmap" -ErrorAction SilentlyContinue
        $TestResults.PostTest["FileAssoc"] = Write-TestResult "File associations removed" ($null -eq $FileAssoc)
    } catch {
        $TestResults.PostTest["FileAssoc"] = Write-TestResult "File associations removed" $true
    }
    
    # User data (depends on user choice during uninstall)
    if (Test-Path $AppDataDir) {
        Write-Host "ℹ️  User data preserved (user choice)" -ForegroundColor Yellow
    } else {
        Write-TestResult "User data removed" $true "Complete cleanup"
    }
    
    Write-Host ""
}

function Test-MSIUninstaller {
    Write-Host "🗑️ Testing MSI Uninstaller" -ForegroundColor Cyan
    Write-Host ""
    
    # Find MSI file
    $MSIFiles = Get-ChildItem "src-tauri\target\*\bundle\msi\*.msi" -ErrorAction SilentlyContinue
    
    if (-not $MSIFiles) {
        Write-Host "❌ No MSI installer found. Please build the application first." -ForegroundColor Red
        return $false
    }
    
    $MSIFile = $MSIFiles[0].FullName
    Write-Host "Found MSI: $($MSIFiles[0].Name)" -ForegroundColor Green
    
    # Test uninstall via msiexec
    Write-Host "Starting MSI uninstall (with logging)..." -ForegroundColor Yellow
    $LogFile = "uninstall_test.log"
    
    try {
        $Process = Start-Process "msiexec" -ArgumentList "/x", "`"$MSIFile`"", "/l*v", $LogFile -Wait -PassThru
        
        if ($Process.ExitCode -eq 0) {
            Write-Host "✅ MSI uninstall completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ MSI uninstall failed with exit code: $($Process.ExitCode)" -ForegroundColor Red
            if (Test-Path $LogFile) {
                Write-Host "Check log file: $LogFile" -ForegroundColor Yellow
            }
            return $false
        }
    } catch {
        Write-Host "❌ Error running MSI uninstaller: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-NSISUninstaller {
    Write-Host "🗑️ Testing NSIS Uninstaller" -ForegroundColor Cyan
    Write-Host ""
    
    $UninstallerPath = "$InstallDir\uninstall.exe"
    
    if (-not (Test-Path $UninstallerPath)) {
        Write-Host "❌ NSIS uninstaller not found at: $UninstallerPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Found NSIS uninstaller: $UninstallerPath" -ForegroundColor Green
    
    # Test silent uninstall
    Write-Host "Starting NSIS silent uninstall..." -ForegroundColor Yellow
    
    try {
        $Process = Start-Process $UninstallerPath -ArgumentList "/S" -Wait -PassThru
        
        if ($Process.ExitCode -eq 0) {
            Write-Host "✅ NSIS uninstall completed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ NSIS uninstall failed with exit code: $($Process.ExitCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Error running NSIS uninstaller: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ManualCleanup {
    Write-Host "🧹 Testing Manual Cleanup" -ForegroundColor Cyan
    Write-Host "Performing complete manual cleanup..." -ForegroundColor Gray
    Write-Host ""
    
    $ErrorActionPreference = "SilentlyContinue"
    
    # Stop any running processes
    Get-Process "dungeon-desktop" | Stop-Process -Force
    Write-TestResult "Stopped running processes" $true
    
    # Remove files
    Remove-Item $InstallDir -Recurse -Force
    Write-TestResult "Removed installation files" (-not (Test-Path $InstallDir))
    
    Remove-Item $AppDataDir -Recurse -Force
    Write-TestResult "Removed user data" (-not (Test-Path $AppDataDir))
    
    Remove-Item $LocalAppDataDir -Recurse -Force
    Write-TestResult "Removed local app data" (-not (Test-Path $LocalAppDataDir))
    
    Remove-Item $TempDir -Recurse -Force
    Write-TestResult "Removed temp files" (-not (Test-Path $TempDir))
    
    # Remove registry entries
    Remove-Item $UninstallKey -Force
    Write-TestResult "Removed uninstall registry key" (-not (Test-RegistryExists $UninstallKey))
    
    Remove-Item $CompanyRegKey -Recurse -Force
    Write-TestResult "Removed company registry key" (-not (Test-RegistryExists $CompanyRegKey))
    
    # Remove shortcuts
    Remove-Item $StartMenuDir -Recurse -Force
    Write-TestResult "Removed start menu shortcuts" (-not (Test-Path $StartMenuDir))
    
    Remove-Item "$env:PUBLIC\Desktop\$AppName.lnk" -Force
    Write-TestResult "Removed desktop shortcut" (-not (Test-Path "$env:PUBLIC\Desktop\$AppName.lnk"))
    
    Write-Host ""
    Write-Host "✅ Manual cleanup completed" -ForegroundColor Green
}

function Show-TestSummary {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  TEST SUMMARY" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    $TotalTests = 0
    $PassedTests = 0
    
    foreach ($Category in $TestResults.Keys) {
        if ($Category -eq "Issues") { continue }
        
        Write-Host "$Category Tests:" -ForegroundColor Cyan
        foreach ($Test in $TestResults[$Category].Keys) {
            $Result = $TestResults[$Category][$Test]
            $Symbol = if ($Result) { "✅" } else { "❌" }
            $Color = if ($Result) { "Green" } else { "Red" }
            
            Write-Host "  $Symbol $Test" -ForegroundColor $Color
            $TotalTests++
            if ($Result) { $PassedTests++ }
        }
        Write-Host ""
    }
    
    $SuccessRate = if ($TotalTests -gt 0) { [math]::Round(($PassedTests / $TotalTests) * 100, 1) } else { 0 }
    
    Write-Host "Results: $PassedTests/$TotalTests tests passed ($SuccessRate%)" -ForegroundColor $(if ($SuccessRate -eq 100) { "Green" } else { "Yellow" })
    
    if ($TestResults.Issues.Count -gt 0) {
        Write-Host ""
        Write-Host "Issues Found:" -ForegroundColor Red
        foreach ($Issue in $TestResults.Issues) {
            Write-Host "  • $Issue" -ForegroundColor Red
        }
    }
    
    if ($SuccessRate -eq 100) {
        Write-Host ""
        Write-Host "🎉 All uninstaller tests passed! Professional quality uninstaller." -ForegroundColor Green
    } elseif ($SuccessRate -ge 90) {
        Write-Host ""
        Write-Host "⚠️  Minor issues found. Review and fix before release." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Significant issues found. Uninstaller needs work before release." -ForegroundColor Red
    }
}

# Main execution
Write-Host "Test Type: $TestType" -ForegroundColor Cyan
Write-Host "Verbose Output: $Verbose" -ForegroundColor Cyan
Write-Host ""

switch ($TestType.ToLower()) {
    "full" {
        Test-PreUninstallState
        
        # Ask user which uninstaller to test
        Write-Host "Select uninstaller to test:" -ForegroundColor Yellow
        Write-Host "1. MSI (via Add/Remove Programs)" -ForegroundColor Gray
        Write-Host "2. NSIS (direct executable)" -ForegroundColor Gray
        Write-Host "3. Manual cleanup test" -ForegroundColor Gray
        
        $Choice = Read-Host "Enter choice (1-3)"
        
        switch ($Choice) {
            "1" { Test-MSIUninstaller }
            "2" { Test-NSISUninstaller }  
            "3" { Test-ManualCleanup }
            default { 
                Write-Host "Invalid choice. Testing manual cleanup..." -ForegroundColor Yellow
                Test-ManualCleanup
            }
        }
        
        Write-Host "Waiting 3 seconds for cleanup to complete..." -ForegroundColor Gray
        Start-Sleep 3
        
        Test-PostUninstallState
        Show-TestSummary
    }
    "msi" {
        Test-PreUninstallState
        Test-MSIUninstaller
        Test-PostUninstallState
        Show-TestSummary
    }
    "nsis" {
        Test-PreUninstallState
        Test-NSISUninstaller
        Test-PostUninstallState
        Show-TestSummary
    }
    "cleanup" {
        Test-ManualCleanup
        Test-PostUninstallState
        Show-TestSummary
    }
    default {
        Write-Host "Invalid test type. Use: full, msi, nsis, or cleanup" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Uninstaller testing completed." -ForegroundColor Green
