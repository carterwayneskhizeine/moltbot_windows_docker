; NSIS Custom Installation Script for OpenClaw
; This script is included in the NSIS installer

!macro customInstall
  ; Create app data directory
  CreateDirectory "$APPDATA\OpenClaw"

  ; Set up environment for bundled tools
  ; The tools will be in $INSTDIR\resources\tools

  ; Optional: Add OpenClaw to PATH (user level)
  ; Uncomment if you want to add OpenClaw CLI to system PATH
  ; Environ::SetHKCUValue "PATH" "$INSTDIR\resources\app;$$INSTDIR\resources\tools\nodejs"

  ; Create start menu entry for quick access
  CreateDirectory "$SMPROGRAMS\OpenClaw"
  CreateShortCut "$SMPROGRAMS\OpenClaw\OpenClaw.lnk" "$INSTDIR\OpenClaw.exe" "" "$INSTDIR\OpenClaw.exe" 0
  CreateShortCut "$SMPROGRAMS\OpenClaw\Uninstall.lnk" "$INSTDIR\Uninstall OpenClaw.exe" "" "$INSTDIR\Uninstall OpenClaw.exe" 0
!macroend

!macro customUnInstall
  ; Remove start menu entries
  RMDir /r "$SMPROGRAMS\OpenClaw"

  ; Optionally remove app data directory
  ; Uncomment to remove user data on uninstall (not recommended)
  ; RMDir /r "$APPDATA\OpenClaw"
!macroend
