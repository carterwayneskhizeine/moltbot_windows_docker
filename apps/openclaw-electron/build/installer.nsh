!macro customInstall
  DetailPrint "Adding OpenClaw CLI to PATH variable..."
  nsExec::ExecToLog 'powershell -NoProfile -Command "$$path = [Environment]::GetEnvironmentVariable(\"Path\", \"User\"); $$add = \"$APPDATA\OpenClaw\resources\"; if ($$path -notlike \"*$$add*\") { [Environment]::SetEnvironmentVariable(\"Path\", $$path + \";\" + $$add, \"User\") }"'
!macroend

!macro customUnInstall
  DetailPrint "Removing OpenClaw CLI from PATH variable..."
  nsExec::ExecToLog 'powershell -NoProfile -Command "$$path = [Environment]::GetEnvironmentVariable(\"Path\", \"User\"); $$rem = \"$APPDATA\OpenClaw\resources\"; $$newPath = $$path.Replace(\";\" + $$rem, \"\").Replace($$rem + \";\", \"\").Replace($$rem, \"\"); [Environment]::SetEnvironmentVariable(\"Path\", $$newPath, \"User\")"'
  
  DetailPrint "Cleaning up AppData OpenClaw user resources..."
  RMDir /r "$APPDATA\OpenClaw"
!macroend
