; Custom NSIS Template for Studio Cosmic North - Dungeon Desktop
; Enhanced installer with comprehensive uninstaller support

Unicode True
Name "{{product_name}}"
OutFile "{{out_file}}"
InstallDir "$PROGRAMFILES64\{{product_name}}"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; Version info
VIProductVersion "{{version}}.0"
VIAddVersionKey "ProductName" "{{product_name}}"
VIAddVersionKey "CompanyName" "Studio Cosmic North"
VIAddVersionKey "FileDescription" "Professional D&D map creation and management tool"
VIAddVersionKey "FileVersion" "{{version}}"
VIAddVersionKey "ProductVersion" "{{version}}"
VIAddVersionKey "LegalCopyright" "Copyright © 2025 Studio Cosmic North. All rights reserved."
VIAddVersionKey "OriginalFilename" "{{out_file}}"

; Branding
BrandingText "Studio Cosmic North - Professional D&D Tools"
Caption "$(^Name) Setup - Studio Cosmic North"

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "{{installer_icon}}"
!define MUI_UNICON "{{installer_icon}}"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "{{header_image}}"
!define MUI_WELCOMEFINISHPAGE_BITMAP "{{sidebar_image}}"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "{{sidebar_image}}"

; Pages
!define MUI_WELCOMEPAGE_TITLE "Welcome to $(^NameDA) Setup"
!define MUI_WELCOMEPAGE_TEXT "This will install $(^NameDA) on your computer.$\r$\n$\r$\nDungeon Desktop is a professional tool for creating and managing D&D maps, developed by Studio Cosmic North.$\r$\n$\r$\nIt is recommended that you close all other applications before starting Setup."

!include "MUI2.nsh"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "{{license}}"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Registry keys for uninstaller
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{product_name}}"

Section "MainApplication" MainApp
  SectionIn RO
  
  ; Set output path
  SetOutPath "$INSTDIR"
  
  ; Install files
  {{#each install_files}}
  File "{{this.source}}"
  {{/each}}
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Registry entries for Add/Remove Programs
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "{{product_name}}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\{{app_exe_name}}"
  WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "Studio Cosmic North"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "{{version}}"
  WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${UNINST_KEY}" "QuietUninstallString" "$INSTDIR\uninstall.exe /S"
  WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINST_KEY}" "InstallDate" "{{install_date}}"
  WriteRegStr HKLM "${UNINST_KEY}" "HelpLink" "https://studiocosmicnorth.com/dungeondesktop/help"
  WriteRegStr HKLM "${UNINST_KEY}" "URLInfoAbout" "https://studiocosmicnorth.com"
  WriteRegStr HKLM "${UNINST_KEY}" "URLUpdateInfo" "https://studiocosmicnorth.com/dungeondesktop/updates"
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "EstimatedSize" {{estimated_size}}
  
  ; Application registry entries
  WriteRegStr HKLM "Software\Studio Cosmic North\Dungeon Desktop" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\Studio Cosmic North\Dungeon Desktop" "Version" "{{version}}"
  WriteRegStr HKLM "Software\Studio Cosmic North\Dungeon Desktop" "InstallDate" "{{install_date}}"
  
  ; File associations
  WriteRegStr HKCR ".ddmap" "" "DungeonDesktop.Map"
  WriteRegStr HKCR "DungeonDesktop.Map" "" "Dungeon Desktop Map File"
  WriteRegStr HKCR "DungeonDesktop.Map\DefaultIcon" "" "$INSTDIR\{{app_exe_name}},0"
  WriteRegStr HKCR "DungeonDesktop.Map\shell\open\command" "" '"$INSTDIR\{{app_exe_name}}" "%1"'
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Studio Cosmic North"
  CreateDirectory "$SMPROGRAMS\Studio Cosmic North\Dungeon Desktop"
  CreateShortcut "$SMPROGRAMS\Studio Cosmic North\Dungeon Desktop\{{product_name}}.lnk" "$INSTDIR\{{app_exe_name}}" "" "$INSTDIR\{{app_exe_name}}" 0
  CreateShortcut "$SMPROGRAMS\Studio Cosmic North\Dungeon Desktop\Uninstall {{product_name}}.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0
  
  ; Optional desktop shortcut
  CreateShortcut "$DESKTOP\{{product_name}}.lnk" "$INSTDIR\{{app_exe_name}}" "" "$INSTDIR\{{app_exe_name}}" 0
SectionEnd

Section "Uninstall"
  ; Stop any running instances
  DetailPrint "Checking for running instances..."
  ${nsProcess::FindProcess} "{{app_exe_name}}" $R0
  ${If} $R0 == 0
    MessageBox MB_YESNO|MB_ICONQUESTION "{{product_name}} is currently running. Do you want to close it and continue with uninstall?" IDNO AbortUninstall
    ${nsProcess::KillProcess} "{{app_exe_name}}" $R0
    Sleep 2000
  ${EndIf}
  
  ; Remove application files
  {{#each install_files}}
  Delete "$INSTDIR\{{this.name}}"
  {{/each}}
  
  ; Remove uninstaller
  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Studio Cosmic North\Dungeon Desktop\{{product_name}}.lnk"
  Delete "$SMPROGRAMS\Studio Cosmic North\Dungeon Desktop\Uninstall {{product_name}}.lnk"
  Delete "$DESKTOP\{{product_name}}.lnk"
  RMDir "$SMPROGRAMS\Studio Cosmic North\Dungeon Desktop"
  RMDir "$SMPROGRAMS\Studio Cosmic North"
  
  ; Remove directories
  RMDir /r "$INSTDIR"
  
  ; Clean user data (with confirmation)
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove saved maps and user settings? This cannot be undone." IDNO SkipUserData
  RMDir /r "$APPDATA\Studio Cosmic North\Dungeon Desktop"
  RMDir /r "$LOCALAPPDATA\Studio Cosmic North\Dungeon Desktop"
  
  SkipUserData:
  
  ; Remove temporary files
  RMDir /r "$TEMP\dungeon-desktop"
  
  ; Registry cleanup
  DeleteRegKey HKLM "${UNINST_KEY}"
  DeleteRegKey HKLM "Software\Studio Cosmic North\Dungeon Desktop"
  DeleteRegKey HKCU "Software\Studio Cosmic North\Dungeon Desktop"
  
  ; File association cleanup
  DeleteRegKey HKCR ".ddmap"
  DeleteRegKey HKCR "DungeonDesktop.Map"
  
  ; Clean up empty registry keys
  DeleteRegKey /ifempty HKLM "Software\Studio Cosmic North"
  DeleteRegKey /ifempty HKCU "Software\Studio Cosmic North"
  
  AbortUninstall:
SectionEnd

; Functions
Function .onInit
  ; Check if already installed
  ReadRegStr $R0 HKLM "${UNINST_KEY}" "UninstallString"
  StrCmp $R0 "" done
  
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(^Name) is already installed. $\n$\nClick `OK` to remove the previous version or `Cancel` to cancel this upgrade." IDOK uninst
  Abort
  
  uninst:
    ClearErrors
    ExecWait '$R0 /S _?=$INSTDIR'
    
    IfErrors no_remove_uninstaller done
    no_remove_uninstaller:
  done:
FunctionEnd

Function .onInstSuccess
  ; Optional: Show completion message or open application
  MessageBox MB_YESNO "$(^Name) has been successfully installed. $\n$\nWould you like to launch the application now?" IDNO NoLaunch
  Exec '"$INSTDIR\{{app_exe_name}}"'
  NoLaunch:
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" IDYES +2
  Abort
FunctionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) has been successfully removed from your computer. $\n$\nThank you for using Studio Cosmic North software."
FunctionEnd
