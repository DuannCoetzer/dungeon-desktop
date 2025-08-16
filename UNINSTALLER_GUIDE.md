# 🗑️ Uninstaller Guide
## Studio Cosmic North - Dungeon Desktop

Complete guide to the comprehensive uninstaller system for professional application removal.

## 🎯 Uninstaller Features

### **✅ Complete Removal**
- **Application files** - All program files and executables
- **Registry entries** - All Windows registry keys and values
- **Shortcuts** - Start Menu and Desktop shortcuts  
- **File associations** - .ddmap file type associations
- **User data** - Optional removal of saved maps and settings
- **Temporary files** - Cache and temp file cleanup

### **✅ User-Friendly Experience**
- **Confirmation dialogs** - Prevents accidental uninstallation
- **Progress indicators** - Shows uninstall progress
- **Data preservation option** - Choice to keep user maps/settings
- **Running process detection** - Safely closes app before uninstall
- **Cleanup verification** - Ensures complete removal

## 📦 Uninstaller Types

### **MSI Uninstaller (WiX)**
- **Location**: Windows Add/Remove Programs
- **Features**: 
  - Built-in Windows uninstaller UI
  - Automatic rollback if uninstall fails
  - Component-based removal
  - Registry cleanup actions
  - Custom cleanup actions

### **NSIS Uninstaller**
- **Location**: `Program Files\Dungeon Desktop\uninstall.exe`
- **Features**:
  - Custom branded uninstaller UI
  - Process detection and termination
  - User data removal options
  - Progress feedback
  - Completion confirmation

## 🔍 What Gets Removed

### **Application Files**
```
📁 Program Files\Dungeon Desktop\
├── 📄 dungeon-desktop.exe (main executable)
├── 📄 *.dll (dependencies)
├── 📄 WebView2Loader.dll
└── 📄 uninstall.exe (NSIS only)
```

### **Registry Entries**
```
🗝️ HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Dungeon Desktop
🗝️ HKLM\SOFTWARE\Studio Cosmic North\Dungeon Desktop  
🗝️ HKCU\SOFTWARE\Studio Cosmic North\Dungeon Desktop
🗝️ HKCR\.ddmap (file associations)
🗝️ HKCR\DungeonDesktop.Map
```

### **Shortcuts and Start Menu**
```
📁 Start Menu\Studio Cosmic North\Dungeon Desktop\
├── 🔗 Dungeon Desktop.lnk
└── 🔗 Uninstall Dungeon Desktop.lnk

🖥️ Desktop\Dungeon Desktop.lnk (if created)
```

### **User Data (Optional)**
```
📁 %APPDATA%\Studio Cosmic North\Dungeon Desktop\
├── 📄 maps\ (saved maps)
├── 📄 settings\ (user preferences)
└── 📄 assets\ (imported assets)

📁 %LOCALAPPDATA%\Studio Cosmic North\Dungeon Desktop\
└── 📄 cache\ (application cache)

📁 %TEMP%\dungeon-desktop\
└── 📄 temporary files
```

## 🧪 Testing Procedures

### **Pre-Uninstall Testing**
1. **Install the application** using both MSI and NSIS installers
2. **Create test data**:
   - Create and save a few test maps
   - Import custom assets
   - Modify application settings
   - Create file associations (.ddmap files)
3. **Verify installation**:
   - Check Start Menu shortcuts work
   - Verify desktop shortcut (if created)
   - Test file associations open correctly
   - Confirm application runs properly

### **Uninstaller Testing - MSI**
1. **Access via Add/Remove Programs**:
   ```
   Windows Settings > Apps > Apps & features > Dungeon Desktop > Uninstall
   ```
2. **Follow uninstall wizard**
3. **Verify removal**:
   - Application files deleted
   - Registry entries removed
   - Shortcuts removed
   - File associations cleared

### **Uninstaller Testing - NSIS**
1. **Run uninstaller directly**:
   ```
   "C:\Program Files\Dungeon Desktop\uninstall.exe"
   ```
2. **Test running process detection**:
   - Start Dungeon Desktop
   - Run uninstaller
   - Verify prompt to close running application
3. **Test user data options**:
   - Choose to keep user data
   - Verify maps and settings preserved
   - Re-run and choose to remove user data
   - Verify complete cleanup

### **Post-Uninstall Verification**
Run this verification checklist after uninstall:

#### **File System Check** ✅
- [ ] `C:\Program Files\Dungeon Desktop\` - Should not exist
- [ ] `%APPDATA%\Studio Cosmic North\Dungeon Desktop\` - Removed if selected
- [ ] `%LOCALAPPDATA%\Studio Cosmic North\Dungeon Desktop\` - Should not exist
- [ ] `%TEMP%\dungeon-desktop\` - Should not exist

#### **Registry Check** ✅
```powershell
# Run these commands to verify registry cleanup
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Dungeon Desktop" -ErrorAction SilentlyContinue
Get-ItemProperty "HKLM:\SOFTWARE\Studio Cosmic North" -ErrorAction SilentlyContinue
Get-ItemProperty "HKCR:\.ddmap" -ErrorAction SilentlyContinue
```
*All should return no results*

#### **Start Menu Check** ✅
- [ ] `Start Menu\Studio Cosmic North\Dungeon Desktop\` - Should not exist
- [ ] Desktop shortcut - Should not exist (if was created)

#### **Windows Features Check** ✅
- [ ] Add/Remove Programs entry - Should not exist
- [ ] File association - .ddmap files should not open with Dungeon Desktop

## 🚨 Troubleshooting Uninstaller Issues

### **Uninstaller Won't Start**
```powershell
# Run as administrator
Start-Process "uninstall.exe" -Verb RunAs

# Or via MSI
msiexec /x "DungeonDesktop_1.0.0_x64_en-US.msi"
```

### **Files Not Removed**
```powershell
# Manual cleanup script (run as admin)
Remove-Item "C:\Program Files\Dungeon Desktop" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:APPDATA\Studio Cosmic North\Dungeon Desktop" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Studio Cosmic North\Dungeon Desktop" -Recurse -Force -ErrorAction SilentlyContinue
```

### **Registry Not Cleaned**
```powershell
# Manual registry cleanup (run as admin)
Remove-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Dungeon Desktop" -ErrorAction SilentlyContinue
Remove-Item "HKLM:\SOFTWARE\Studio Cosmic North\Dungeon Desktop" -ErrorAction SilentlyContinue
Remove-Item "HKCU:\SOFTWARE\Studio Cosmic North\Dungeon Desktop" -ErrorAction SilentlyContinue
```

## 🔧 Advanced Uninstaller Features

### **Silent Uninstall**
For automated deployment systems:

**MSI Silent Uninstall:**
```cmd
msiexec /x "DungeonDesktop_1.0.0_x64_en-US.msi" /quiet /norestart
```

**NSIS Silent Uninstall:**
```cmd
"C:\Program Files\Dungeon Desktop\uninstall.exe" /S
```

### **Logging**
Enable uninstaller logging for debugging:

**MSI with Logging:**
```cmd
msiexec /x "DungeonDesktop_1.0.0_x64_en-US.msi" /l*v uninstall.log
```

### **Force Removal**
If standard uninstaller fails:

```powershell
# Nuclear option - complete manual cleanup
$ErrorActionPreference = "SilentlyContinue"

# Stop processes
Get-Process "dungeon-desktop" | Stop-Process -Force

# Remove files
Remove-Item "C:\Program Files\Dungeon Desktop" -Recurse -Force
Remove-Item "$env:APPDATA\Studio Cosmic North" -Recurse -Force
Remove-Item "$env:LOCALAPPDATA\Studio Cosmic North" -Recurse -Force
Remove-Item "$env:TEMP\dungeon-desktop" -Recurse -Force

# Remove registry
Remove-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Dungeon Desktop" -Force
Remove-Item "HKLM:\SOFTWARE\Studio Cosmic North" -Recurse -Force
Remove-Item "HKCU:\SOFTWARE\Studio Cosmic North" -Recurse -Force
Remove-Item "HKCR:\.ddmap" -Force
Remove-Item "HKCR:\DungeonDesktop.Map" -Recurse -Force

# Remove shortcuts
Remove-Item "$env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs\Studio Cosmic North" -Recurse -Force
Remove-Item "$env:PUBLIC\Desktop\Dungeon Desktop.lnk" -Force

Write-Host "Manual cleanup complete"
```

## ✅ Quality Assurance Checklist

Before release, verify:

### **Installation Testing** 
- [ ] Clean install on fresh Windows VM
- [ ] Install over previous version (upgrade)
- [ ] Install with different user privileges
- [ ] Install to custom directory

### **Uninstaller Testing**
- [ ] Uninstall via Add/Remove Programs
- [ ] Uninstall via NSIS uninstaller
- [ ] Silent uninstall works
- [ ] Uninstall with app running
- [ ] Uninstall with user data preservation
- [ ] Uninstall with complete data removal

### **Edge Case Testing**
- [ ] Uninstall after manual file deletion
- [ ] Uninstall after registry corruption
- [ ] Uninstall with insufficient privileges
- [ ] Multiple install/uninstall cycles

### **Cleanup Verification**
- [ ] No leftover files anywhere
- [ ] No leftover registry entries
- [ ] No broken shortcuts
- [ ] File associations removed
- [ ] Add/Remove Programs entry gone

---

**The comprehensive uninstaller ensures professional, clean removal of Dungeon Desktop while respecting user data choices and providing excellent user experience.**
