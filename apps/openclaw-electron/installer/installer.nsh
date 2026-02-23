; installer.nsh - OpenClaw NSIS 自定义脚本
; 安装时创建 openclaw.cmd 并将路径追加到用户 PATH
; 卸载时清理

!macro customInstall
  ; 创建 openclaw.cmd 命令链接
  FileOpen $0 "$INSTDIR\resources\bundled\openclaw\openclaw.cmd" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 '"$INSTDIR\resources\bundled\node\node.exe" "$INSTDIR\resources\bundled\openclaw\openclaw.mjs" %*$\r$\n'
  FileClose $0

  ; 读取当前用户 PATH
  ReadRegStr $1 HKCU "Environment" "PATH"

  ; 追加 openclaw 路径到用户 PATH（简单追加，不做重复检测）
  StrCmp $1 "" 0 +3
    WriteRegStr HKCU "Environment" "PATH" "$INSTDIR\resources\bundled\openclaw"
    Goto done
  WriteRegStr HKCU "Environment" "PATH" "$1;$INSTDIR\resources\bundled\openclaw"

  done:
  ; 广播环境变量变更
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro customUnInstall
  ; 删除命令链接
  Delete "$INSTDIR\resources\bundled\openclaw\openclaw.cmd"
  ; 注意：不自动清理 PATH（避免复杂的字符串操作导致错误），
  ; 卸载后路径自然失效。
!macroend
