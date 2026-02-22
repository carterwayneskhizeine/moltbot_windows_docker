[Setup]
AppName=OpenClaw
AppVersion=2026.2.22
AppVerName=OpenClaw 2026.2.22
AppPublisher=OpenClaw
DefaultDirName={autopf}\OpenClaw
DefaultGroupName=OpenClaw
OutputDir=D:\Code\goldieopenclaw\apps\electron\dist-electron
OutputBaseFilename=OpenClaw-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
UninstallDisplayIcon={app}\OpenClaw.exe
UninstallDisplayName=OpenClaw
SourceDir=D:\Code\goldieopenclaw\apps\electron

[Files]
Source: "dist-electron\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\OpenClaw"; Filename: "{app}\OpenClaw.exe"
Name: "{commondesktop}\OpenClaw"; Filename: "{app}\OpenClaw.exe"

[Run]
Filename: "{app}\OpenClaw.exe"; Description: "Launch OpenClaw"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
