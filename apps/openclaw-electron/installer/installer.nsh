; installer.nsh - OpenClaw NSIS 自定义脚本
; 在安装完成后将 openclaw 命令链接写入用户环境变量 PATH

!macro customInstall
  ; 创建 openclaw.cmd 命令链接
  SetOutPath "$INSTDIR\resources\bundled\openclaw"
  FileOpen $0 "$INSTDIR\resources\bundled\openclaw\openclaw.cmd" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 '"$INSTDIR\resources\bundled\node\node.exe" "$INSTDIR\resources\bundled\openclaw\openclaw.mjs" %*$\r$\n'
  FileClose $0

  ; 将安装目录的 resources\bundled\openclaw 追加到用户 PATH
  ReadRegStr $1 HKCU "Environment" "PATH"
  StrCpy $2 "$INSTDIR\resources\bundled\openclaw"
  
  ; 检查是否已在 PATH 中
  ${StrStr} $3 "$1" "$2"
  ${If} $3 == ""
    ${If} $1 == ""
      WriteRegStr HKCU "Environment" "PATH" "$2"
    ${Else}
      WriteRegStr HKCU "Environment" "PATH" "$1;$2"
    ${EndIf}
    ; 广播环境变量变更
    SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
  ${EndIf}
!macroend

!macro customUnInstall
  ; 卸载时从 PATH 中移除
  ReadRegStr $1 HKCU "Environment" "PATH"
  StrCpy $2 "$INSTDIR\resources\bundled\openclaw"
  ${StrStr} $3 "$1" "$2"
  ${If} $3 != ""
    ; 简单替换（移除路径）
    ${StrRep} $4 "$1" ";$2" ""
    ${StrRep} $4 "$4" "$2;" ""
    ${StrRep} $4 "$4" "$2" ""
    WriteRegStr HKCU "Environment" "PATH" "$4"
    SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
  ${EndIf}
  
  ; 删除命令链接
  Delete "$INSTDIR\resources\bundled\openclaw\openclaw.cmd"
!macroend
