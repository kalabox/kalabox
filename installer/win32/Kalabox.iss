#define MyAppName "Kalabox"
#define MyAppPublisher "Kalabox"
#define MyAppURL "https://kalabox.io"
#define MyAppContact "https://kalabox.io"

#define dockerMachineCli "bundle\docker-machine.exe"
#define dockerComposeCli "bundle\docker-compose.exe"
#define b2dIsoPath "bundle\boot2docker.iso"
#define kalaboxCli "bundle\kbox.exe"
#define kalaboxDocs "docs"
#define kalaboxGui "bundle"
#define kboxIco "kalabox.ico"
#define git "bundle\Git.exe"
#define virtualBoxCommon "bundle\common.cab"
#define virtualBoxMsi "bundle\VirtualBox_amd64.msi"
#define engineSetup "engine.bat"
#define servicesSetup "services.bat"
#define dnsSetup "dns.bat"

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

[Run]
Filename: "{win}\explorer.exe"; Parameters: "{userprograms}\Kalabox\"; Flags: postinstall skipifsilent; Description: "View Shortcuts in File Explorer"

[Tasks]
Name: desktopicon; Description: "{cm:CreateDesktopIcon}"
Name: modifypath; Description: "Add kalabox binary to &PATH"
Name: upgradevm; Description: "Upgrade Boot2Docker VM"

[Components]
Name: "DockerMachine"; Description: "Docker Machine for Windows" ; Types: full custom; Flags: fixed
Name: "DockerCompose"; Description: "Docker Compose for Windows" ; Types: full custom; Flags: fixed
Name: "VirtualBox"; Description: "VirtualBox"; Types: full custom; Flags: disablenouninstallwarning fixed
Name: "EngineSetup"; Description: "Kalabox Engine" ; Types: full custom; Flags: fixed
Name: "KalaboxServices"; Description: "Kalabox Services" ; Types: full custom; Flags: fixed
Name: "Git"; Description: "Git for Windows"; Types: full custom; Flags: disablenouninstallwarning fixed
Name: "KalaboxCLI"; Description: "Kalabox CLI" ; Types: full custom;
Name: "KalaboxGUI"; Description: "Kalabox GUI" ; Types: full custom

[Files]
Source: "{#dockerMachineCli}"; DestDir: "{userdocs}\..\.kalabox\bin"; Flags: ignoreversion; Components: "DockerMachine"
Source: "{#dockerComposeCli}"; DestDir: "{userdocs}\..\.kalabox\bin"; Flags: ignoreversion; Components: "DockerCompose"
Source: "{#b2dIsoPath}"; DestDir: "{app}"; Flags: ignoreversion; Components: "DockerMachine"; AfterInstall: CopyBoot2DockerISO()
Source: "{#virtualBoxCommon}"; DestDir: "{app}\installers\virtualbox"; Components: "VirtualBox"
Source: "{#virtualBoxMsi}"; DestDir: "{app}\installers\virtualbox"; DestName: "virtualbox.msi"; AfterInstall: RunInstallVirtualBox(); Components: "VirtualBox"
Source: "{#engineSetup}"; DestDir: "{userdocs}\..\.kalabox\setup"; Components: "EngineSetup"; AfterInstall: RunEngineSetup();
Source: "bundle\*.yml"; DestDir: "{userdocs}\..\.kalabox\services"; Components: "KalaboxServices";
Source: "{#servicesSetup}"; DestDir: "{userdocs}\..\.kalabox\setup"; Components: "KalaboxServices"; AfterInstall: RunServicesSetup();
Source: "{#dnsSetup}"; DestDir: "{userdocs}\..\.kalabox\setup"; Components: "KalaboxServices"; AfterInstall: RunServicesSetup();
Source: "{#kalaboxCli}"; DestDir: "{app}\bin"; Flags: ignoreversion; Components: "KalaboxCLI"
Source: "{#kalaboxGui}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Components: "KalaboxGUI"
Source: "{#kalaboxDocs}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Components: "KalaboxGUI"
Source: "{#git}"; DestDir: "{app}\installers\git"; DestName: "git.exe"; AfterInstall: RunInstallGit();  Components: "Git"
Source: "{#kboxIco}"; DestDir: "{app}"; DestName: "kalabox.ico"; Components: "KalaboxGUI"

[Icons]
Name: "{userprograms}\Kalabox"; WorkingDir: "{app}"; Filename: "{app}\kalabox.exe"; Components: "KalaboxGUI"; IconFilename: "{app}\kalabox.ico"
Name: "{commondesktop}\Kalabox"; WorkingDir: "{app}"; Filename: "{app}\kalabox.exe"; Tasks: desktopicon; Components: "KalaboxGUI"; IconFilename: "{app}\kalabox.ico"

[UninstallRun]
Filename: "{userdocs}\..\.kalabox\bin\docker-machine.exe"; Parameters: "rm -f Kalabox2";

[UninstallDelete]
Type: filesandordirs; Name: "{userdocs}\..\.kalabox"

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType:string; ValueName:"KALABOX_INSTALL_PATH"; ValueData:"{userdocs}\..\.kalabox\bin" ; Flags: preservestringtype ;

[Code]
function NeedToInstallVirtualBox(): Boolean;
begin
  // TODO: Also compare versions
  Result := (
    (GetEnv('VBOX_INSTALL_PATH') = '')
    and
    (GetEnv('VBOX_MSI_INSTALL_PATH') = '')
  );
end;

function VBoxPath(): String;
begin
  if GetEnv('VBOX_INSTALL_PATH') <> '' then
    Result := GetEnv('VBOX_INSTALL_PATH')
  else
    Result := GetEnv('VBOX_MSI_INSTALL_PATH')
end;

function NeedToInstallGit(): Boolean;
begin
  // TODO: Find a better way to see if Git is installed
  Result := not DirExists('C:\Program Files\Git') or not FileExists('C:\Program Files\Git\git-bash.exe')
end;

procedure RunInstallVirtualBox();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Installing VirtualBox'
  if not Exec(ExpandConstant('msiexec'), ExpandConstant('/qn /i "{app}\installers\virtualbox\virtualbox.msi" /norestart'), '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    MsgBox('virtualbox install failure', mbInformation, MB_OK);
end;

procedure RunEngineSetup();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Activating the engine...'
  ExecAsOriginalUser(ExpandConstant('{userdocs}\..\.kalabox\setup\engine.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
  if ResultCode <> 0 then begin
    exit
  end
  else begin
    SaveStringToFile(ExpandConstant('{userdocs}\..\.kalabox\provisioned'), 'provisioned', True);
  end;
end;

procedure RunServicesSetup();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Starting the services and configuring DNS...'
  ExecAsOriginalUser(ExpandConstant('{userdocs}\..\.kalabox\setup\services.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
  if ResultCode <> 0 then begin
    exit
  end;
  Exec(ExpandConstant('{userdocs}\..\.kalabox\setup\dns.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
  if ResultCode <> 0 then begin
    exit
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
    MsgBox('git install failure', mbInformation, MB_OK);
  end;
end;

procedure CopyBoot2DockerISO();
begin
  WizardForm.FilenameLabel.Caption := 'Copying boot2docker iso'
  if not ForceDirectories(ExpandConstant('{userdocs}\..\.docker\machine\cache')) then
      MsgBox('Failed to create docker machine cache dir', mbError, MB_OK);
  if not FileCopy(ExpandConstant('{app}\boot2docker.iso'), ExpandConstant('{userdocs}\..\.docker\machine\cache\boot2docker.iso'), false) then
      MsgBox('File moving failed!', mbError, MB_OK);
end;

function CanUpgradeVM(): Boolean;
var
  ResultCode: Integer;
begin
  if NeedToInstallVirtualBox() or not FileExists(ExpandConstant('{app}\docker-machine.exe')) then begin
    Result := false
    exit
  end;

  ExecAsOriginalUser(VBoxPath() + 'VBoxManage.exe', 'showvminfo Kalabox2', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
  if ResultCode <> 0 then begin
    Result := false
    exit
  end;

  if not DirExists(ExpandConstant('{userdocs}\..\.docker\machine\machines\Kalabox2')) then begin
    Result := false
    exit
  end;

  Result := true
end;

function UpgradeVM() : Boolean;
var
  ResultCode: Integer;
begin
  WizardForm.StatusLabel.Caption := 'Upgrading Kalabox VM...'
  ExecAsOriginalUser(ExpandConstant('{app}\docker-machine.exe'), 'stop Kalabox2', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)
  if (ResultCode = 0) or (ResultCode = 1) then
  begin
    FileCopy(ExpandConstant('{userdocs}\..\.docker\machine\cache\boot2docker.iso'), ExpandConstant('{userdocs}\..\.docker\machine\machines\Kalabox2\boot2docker.iso'), false)
  end
  else begin
    MsgBox('VM Upgrade Failed because the VirtualBox VM could not be stopped.', mbCriticalError, MB_OK);
    Result := false
    WizardForm.Close;
    exit;
  end;
  Result := true
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
      ModPath();
    if not WizardSilent() then
    begin
      if IsTaskSelected('upgradevm') then
      begin
        if CanUpgradeVM() then begin
          Success := UpgradeVM();
        end;
      end;
    end;
  end;
end;
