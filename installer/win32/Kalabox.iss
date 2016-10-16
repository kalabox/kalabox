#define MyAppName "Kalabox"
#define MyAppPublisher "Kalabox"
#define MyAppURL "https://kalabox.io"
#define MyAppContact "https://kalabox.io"

#define docker "Docker.msi"
#define engineSetup "engine.bat"
#define kalabox "bundle"
#define kboxIco "kalabox.ico"
#define dnsSetup "dns.bat"
#define git "Git.exe"

[Setup]
AppCopyright={#MyAppPublisher}
AppContact={#MyAppContact}
AppComments={#MyAppURL}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName=Kalabox
DisableProgramGroupPage=yes
DisableWelcomePage=no
OutputDir=dist
OutputBaseFilename=kalabox
WizardSmallImageFile=kalabox.bmp
WizardImageFile=kalabox-side.bmp
WizardImageAlphaFormat=premultiplied
Compression=lzma
SolidCompression=yes
WizardImageStretch=yes
UninstallDisplayIcon={app}\unins000.exe
SetupIconFile=kalabox.ico
SetupLogging=yes
ChangesEnvironment=true

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "Full installation"
Name: "custom"; Description: "Custom installation"; Flags: iscustom

[Tasks]
Name: desktopicon; Description: "{cm:CreateDesktopIcon}"
Name: modifypath; Description: "Add kbox binary to PATH"

[Components]
Name: "Git"; Description: "Git for Windows"; Types: full custom;
Name: "Kalabox"; Description: "Kalabox" ; Types: full custom; Flags: disablenouninstallwarning fixed
Name: "Docker"; Description: "Docker for Windows" ; Types: full custom; Flags: disablenouninstallwarning fixed

[Files]
Source: "{#docker}"; DestDir: "{app}\installers\docker"; DestName: "docker.msi"; BeforeInstall: CheckHyperV(); AfterInstall: RunInstallDocker(); Components: "Docker"
Source: "{#engineSetup}"; DestDir: "{app}"; Components: "Docker"; AfterInstall: RunEngineSetup();
Source: "{#kalabox}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Components: "Kalabox"
Source: "{#kboxIco}"; DestDir: "{app}"; DestName: "kalabox.ico"; Components: "Kalabox"
Source: "{#dnsSetup}"; DestDir: "{app}"; Components: "Kalabox"; AfterInstall: RunDNSSetup();
Source: "{#git}"; DestDir: "{app}\installers\git"; DestName: "git.exe"; AfterInstall: RunInstallGit(); Components: "Git"

[Icons]
Name: "{userprograms}\Kalabox"; WorkingDir: "{app}\gui"; Filename: "{app}\gui\kalabox.exe"; Components: "Kalabox"; IconFilename: "{app}\kalabox.ico"
Name: "{commondesktop}\Kalabox"; WorkingDir: "{app}\gui"; Filename: "{app}\gui\kalabox.exe"; Tasks: desktopicon; Components: "Kalabox"; IconFilename: "{app}\kalabox.ico"

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType:string; ValueName:"KALABOX_INSTALL_PATH"; ValueData:"{app}" ; Flags: preservestringtype ;

[Code]
procedure CheckHyperV();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Checking that HyperV is enabled and running...'
  if ExecAsOriginalUser(ExpandConstant('sc'), ExpandConstant('query vmms'), '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ( ResultCode = 0 ) then
    begin
      Log('HyperV is running with code ' + IntToStr(ResultCode));
    end
    else begin
      Log('HyperV is not running with code ' + IntToStr(ResultCode));
      MsgBox('HyperV is not running! Please install first and then run this installer.', mbCriticalError, MB_OK);
      WizardForm.Close;
      exit;
    end;
  end
  else begin
    Log('Something bad happened with code ' + IntToStr(ResultCode));
    MsgBox('Something bad happened. Install Fail.', mbCriticalError, MB_OK);
  end;
end;

procedure RunInstallDocker();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Installing Docker for Windows'
  if not Exec(ExpandConstant('msiexec'), ExpandConstant('/qn /i "{app}\installers\docker\docker.msi" /norestart'), '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    MsgBox('Docker for Windows install failure', mbInformation, MB_OK);
end;

procedure RunEngineSetup();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Activating the HyperV Docker Engine...'
  if ExecAsOriginalUser(ExpandConstant('{app}\engine.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ( ResultCode = 0 ) then
    begin
      Log('Engine activated with great success and result code ' + IntToStr(ResultCode));
    end
    else begin
      Log('Engine activation failed with code ' + IntToStr(ResultCode));
      MsgBox('Engine activation failed!', mbCriticalError, MB_OK);
      WizardForm.Close;
      exit;
    end;
  end
  else begin
    Log('Something bad happened with code ' + IntToStr(ResultCode));
    MsgBox('Something bad happened. Install Fail.', mbCriticalError, MB_OK);
  end;
end;

procedure RunDNSSetup();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Activating the DNS...'
  if Exec(ExpandConstant('{app}\dns.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ( ResultCode = 0 ) then
    begin
      Log('DNS activated with great success and result code ' + IntToStr(ResultCode));
    end
    else begin
      Log('DNS activation failed with code ' + IntToStr(ResultCode));
      MsgBox('DNS activation failed!', mbCriticalError, MB_OK);
      WizardForm.Close;
      exit;
    end;
  end
  else begin
    Log('Something bad happened with code ' + IntToStr(ResultCode));
    MsgBox('Something bad happened. Install Fail.', mbCriticalError, MB_OK);
  end;
end;

procedure RunInstallGit();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Installing Git for Windows'
  if Exec(ExpandConstant('{app}\installers\git\git.exe'), '/sp- /verysilent /norestart', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    // handle success if necessary; ResultCode contains the exit code
    //MsgBox('git installed OK', mbInformation, MB_OK);
  end
  else begin
    // handle failure if necessary; ResultCode contains the error code
    MsgBox('git install failure', mbCriticalError, MB_OK);
  end
end;

const
  ModPathName = 'modifypath';
  ModPathType = 'user';

function ModPathDir(): TArrayOfString;
begin
  setArrayLength(Result, 1);
  Result[0] := ExpandConstant('{app}\bin');
end;
#include "modpath.iss"

procedure CurStepChanged(CurStep: TSetupStep);
var
  Success: Boolean;
begin
  Success := True;
  if CurStep = ssPostInstall then
  begin
    if IsTaskSelected(ModPathName) then
    begin
      ModPath();
    end;
  end;
end;
