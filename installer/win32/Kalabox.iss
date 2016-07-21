#define MyAppName "Kalabox"
#define MyAppPublisher "Kalabox"
#define MyAppURL "https://kalabox.io"
#define MyAppContact "https://kalabox.io"

#define b2dIsoPath "boot2docker.iso"
#define kalabox "bundle"
#define kboxIco "kalabox.ico"
#define git "Git.exe"
#define virtualBoxCommon "common.cab"
#define virtualBoxMsi "virtualbox.msi"
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

[Tasks]
Name: desktopicon; Description: "{cm:CreateDesktopIcon}"
Name: modifypath; Description: "Add kbox binary to PATH"
Name: upgradevm; Description: "Upgrade Boot2Docker VM"

[Components]
Name: "VirtualBox"; Description: "VirtualBox"; Types: full custom; Flags: disablenouninstallwarning fixed
Name: "Git"; Description: "Git for Windows"; Types: full custom;
Name: "Kalabox"; Description: "Kalabox" ; Types: full custom; Flags: disablenouninstallwarning fixed

[Files]
Source: "{#virtualBoxCommon}"; DestDir: "{app}\installers\virtualbox"; Components: "VirtualBox"
Source: "{#virtualBoxMsi}"; DestDir: "{app}\installers\virtualbox"; DestName: "virtualbox.msi"; AfterInstall: RunInstallVirtualBox(); Components: "VirtualBox"
Source: "{#b2dIsoPath}"; DestDir: "{app}"; Flags: ignoreversion; Components: "Kalabox"; AfterInstall: CopyBoot2DockerISO()
Source: "{#kalabox}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs; Components: "Kalabox"
Source: "{#kboxIco}"; DestDir: "{app}"; DestName: "kalabox.ico"; Components: "Kalabox"
Source: "{#engineSetup}"; DestDir: "{app}"; Components: "Kalabox"; AfterInstall: RunEngineSetup();
Source: "{#servicesSetup}"; DestDir: "{app}"; Components: "Kalabox"; AfterInstall: RunServicesSetup();
Source: "{#dnsSetup}"; DestDir: "{app}"; Components: "Kalabox"; AfterInstall: RunServicesSetup();
Source: "{#git}"; DestDir: "{app}\installers\git"; DestName: "git.exe"; AfterInstall: RunInstallGit(); Components: "Git"

[Icons]
Name: "{userprograms}\Kalabox"; WorkingDir: "{app}\gui"; Filename: "{app}\gui\kalabox.exe"; Components: "Kalabox"; IconFilename: "{app}\kalabox.ico"
Name: "{commondesktop}\Kalabox"; WorkingDir: "{app}\gui"; Filename: "{app}\gui\kalabox.exe"; Tasks: desktopicon; Components: "Kalabox"; IconFilename: "{app}\kalabox.ico"

[UninstallRun]
Filename: "{app}\bin\docker-machine.exe"; Parameters: "stop Kalabox2";
Filename: "{app}\bin\docker-machine.exe"; Parameters: "rm -f Kalabox2";

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType:string; ValueName:"KALABOX_INSTALL_PATH"; ValueData:"{app}" ; Flags: preservestringtype ;

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
  if not ExecAsOriginalUser(ExpandConstant('{app}\engine.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    MsgBox('Engine activation failed', mbInformation, MB_OK);
end;

procedure RunServicesSetup();
var
  ResultCode: Integer;
begin
  WizardForm.FilenameLabel.Caption := 'Starting the proxy and dns services...'
  if not ExecAsOriginalUser(ExpandConstant('{app}\services.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    MsgBox('Service activation failed', mbInformation, MB_OK);
  WizardForm.FilenameLabel.Caption := 'Configuring DNS...'
  if not Exec(ExpandConstant('{app}\dns.bat'), '', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    MsgBox('DNS configuration failed', mbInformation, MB_OK);
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
  if not ForceDirectories(ExpandConstant('{localappdata}\..\..\.docker\machine\cache')) then
      MsgBox('Failed to create docker machine cache dir', mbError, MB_OK);
  if not FileCopy(ExpandConstant('{app}\boot2docker.iso'), ExpandConstant('{localappdata}\..\..\.docker\machine\cache\boot2docker.iso'), false) then
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

  if not DirExists(ExpandConstant('{localappdata}\..\..\.docker\machine\machines\Kalabox2')) then begin
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
    FileCopy(ExpandConstant('{localappdata}\..\..\.docker\machine\cache\boot2docker.iso'), ExpandConstant('{localappdata}\..\..\.docker\machine\machines\Kalabox2\boot2docker.iso'), false)
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
