#define MyAppName "Jonas MP3 Player"
#define MyAppVersion "1.0"
#define MyAppPublisher "Jonas"
#define MyAppURL "http://www.example.com/"
#define MyAppExeName "Jonas MP3 Player.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
AppId={{F7A61A32-3F44-4CA4-84B9-32C84A6A9111}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; Uncomment the following line to run in non administrative install mode (install for current user only.)
;PrivilegesRequired=lowest
OutputDir=output
OutputBaseFilename=JonasMP3PlayerSetup
;SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "fileassociation"; Description: "Associate with audio files (.mp3, .wav, .ogg)"; GroupDescription: "File associations:"

[Files]
Source: "C:\Users\diene\Downloads\mp3\dist\win-unpacked\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\diene\Downloads\mp3\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Registry]
Root: HKCR; Subkey: ".mp3"; ValueType: string; ValueName: ""; ValueData: "JonasMP3Player"; Flags: uninsdeletevalue; Tasks: fileassociation
Root: HKCR; Subkey: ".wav"; ValueType: string; ValueName: ""; ValueData: "JonasMP3Player"; Flags: uninsdeletevalue; Tasks: fileassociation
Root: HKCR; Subkey: ".ogg"; ValueType: string; ValueName: ""; ValueData: "JonasMP3Player"; Flags: uninsdeletevalue; Tasks: fileassociation
Root: HKCR; Subkey: "JonasMP3Player"; ValueType: string; ValueName: ""; ValueData: "Jonas MP3 Player"; Flags: uninsdeletekey; Tasks: fileassociation
Root: HKCR; Subkey: "JonasMP3Player\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"; Tasks: fileassociation
Root: HKCR; Subkey: "JonasMP3Player\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: fileassociation