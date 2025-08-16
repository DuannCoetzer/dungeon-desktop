# 🔐 Code Signing & Distribution Guide
## Studio Cosmic North - Dungeon Desktop

This guide covers professional application distribution including code signing, proper icons, and Windows Store deployment.

## 📝 Current Status

✅ **Branding Updated**
- Product name: "Dungeon Desktop"
- Company: Studio Cosmic North
- Identifier: `com.studiocosmicnorth.dungeondesktop`
- Version: 1.0.0

## 🎨 Custom Icon Setup

### 1. Create Professional Icons
You'll need to create custom icons for Studio Cosmic North branding:

**Required Icon Sizes:**
- `32x32.png` - Small taskbar icon
- `128x128.png` - Standard application icon  
- `128x128@2x.png` - Retina/high-DPI icon
- `icon.ico` - Windows icon file (contains multiple sizes)
- `icon.icns` - macOS icon file

**Recommended Tools:**
- **Adobe Illustrator/Photoshop** - Professional design
- **GIMP** - Free alternative
- **Online Tools** - IconGenerator.net, favicon.io

### 2. Icon Placement
Replace the default icons in: `src-tauri/icons/`

## 🔐 Code Signing Setup

### Why Code Signing is Important
- **Prevents security warnings** when users download/install
- **Establishes trust** with Windows SmartScreen
- **Required for Windows Store** distribution
- **Professional appearance** in Windows

### 1. Obtain a Code Signing Certificate

**Options:**
1. **DigiCert** ($474/year) - Industry standard
2. **Sectigo** ($415/year) - Good alternative  
3. **SSL.com** ($399/year) - Competitive pricing
4. **Certum** ($179/year) - Budget option

**Requirements:**
- Business verification (D-U-N-S number helpful)
- Company documentation
- EV certificates require hardware token

### 2. Install Certificate
1. Install certificate in Windows Certificate Store
2. Note the certificate subject name
3. Verify with: `certlm.msc`

### 3. Configure Tauri for Code Signing

Add to `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERT_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### 4. Alternative: Sign After Build
```powershell
# Sign the executable
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a "app.exe"

# Sign the installer
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a "setup.exe"
```

## 🏪 Windows Store Distribution

### 1. Prepare for Store
- **Microsoft Partner Center** account ($19 one-time fee)
- **Age rating** questionnaire
- **Privacy policy** URL
- **Store listing** content

### 2. Create MSIX Package
Add to Tauri config:
```json
{
  "bundle": {
    "targets": ["msi", "nsis", "msix"]
  }
}
```

### 3. Store Submission Requirements
- ✅ Code signed application
- ✅ Privacy policy
- ✅ Age rating
- ✅ Store screenshots
- ✅ App description
- ✅ Keywords and categories

## 📦 Professional Distribution Checklist

### Pre-Release
- [ ] Custom Studio Cosmic North icons created
- [ ] Code signing certificate obtained
- [ ] Application signed and tested
- [ ] Privacy policy published
- [ ] Terms of service created
- [ ] User documentation complete

### Release Build
- [ ] Version number updated
- [ ] Release notes written
- [ ] Signed installer tested
- [ ] Windows Defender whitelist confirmed
- [ ] Download page prepared

### Marketing Assets
- [ ] App screenshots (1920x1080 recommended)
- [ ] Feature highlight images
- [ ] Video demonstration (optional)
- [ ] Press kit prepared

## 🚀 Build Commands for Distribution

### Signed Release Build
```bash
# Full production build
npm run release

# After build, sign the executables
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a "src-tauri/target/release/bundle/msi/*.msi"
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a "src-tauri/target/release/bundle/nsis/*.exe"
```

### Automated Signing Script
Create `sign-release.ps1`:
```powershell
# Sign all release artifacts
$artifacts = Get-ChildItem "src-tauri/target/release/bundle" -Recurse -Include "*.exe","*.msi"
foreach ($artifact in $artifacts) {
    Write-Host "Signing: $($artifact.Name)"
    signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a $artifact.FullName
}
Write-Host "All artifacts signed successfully!"
```

## 💰 Cost Breakdown

**One-Time Costs:**
- Code Signing Certificate: $179-$474/year
- Microsoft Partner Center: $19 (one-time)

**Ongoing Costs:**
- Certificate renewal: Annual
- Windows Store: 30% revenue share (after $25K)

## 🔄 CI/CD Integration

For automated signing in GitHub Actions:
```yaml
- name: Import Code Signing Certificate
  run: |
    $pfx = [System.Convert]::FromBase64String("${{ secrets.CODE_SIGN_PFX }}")
    [IO.File]::WriteAllBytes("cert.pfx", $pfx)
    Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\CurrentUser\My -Password (ConvertTo-SecureString "${{ secrets.CODE_SIGN_PASSWORD }}" -AsPlainText -Force)

- name: Build and Sign
  run: |
    npm run release
    signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f cert.pfx /p "${{ secrets.CODE_SIGN_PASSWORD }}" "src-tauri/target/release/bundle/msi/*.msi"
```

## 📞 Next Steps

1. **Design custom icons** for Studio Cosmic North
2. **Purchase code signing certificate** (recommend DigiCert or Sectigo)
3. **Set up Microsoft Partner Center** account
4. **Create privacy policy** and terms of service
5. **Test signed builds** thoroughly
6. **Prepare marketing materials**

---

**Questions or need help with implementation?**
This is a comprehensive setup for professional software distribution.
