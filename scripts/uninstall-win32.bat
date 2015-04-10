@ECHO OFF
CLS

REM All praise BAT files
REM
REM Kalabox Uninstaller Script.
REM
REM Copyright (C) 2014 Kalamuna LLC
REM
REM This file also contains a modified VirtualBox uninstallers.
REM
REM

ECHO.
ECHO Welcome to the Kalabox uninstaller script.
ECHO.
ECHO This script will destroy your current Kalabox build. If you want
ECHO to save your current build for later please either vagrant package
ECHO your existing build or export the relevant VirtualBox appliance.
ECHO.
ECHO MAKE SURE THAT YOU'VE EXITED THE KALABOX APP OR THIS WILL BLOW UP!!!
ECHO.
ECHO ALSO MAKE SURE YOU VISIT 127.0.0.1:60008 AND SHUTDOWN SYNCTHING
ECHO.
ECHO WHAT YOU WANT TO DO?
ECHO.
ECHO 1. Remove all the things.
ECHO 2. Forget this ever happened.
ECHO.
SET /p id=Choose your destiny:

IF %id% == 1 (
  ECHO Stopping and removing Kalabox2
  boot2docker --vm="Kalabox2" destroy
  ECHO DESTROYED!
  ECHO.
  IF EXIST "%HOMEPATH%\.kalabox" (
    ECHO Removing Kalabox directories
    RMDIR %HOMEPATH%\.kalabox /S /Q
    RMDIR "%HOMEPATH%\VirtualBox VMs\Kalabox2" /S /Q
    ECHO REMOVED!
    ECHO.
  )
  IF EXIST "C:\Program Files (x86)\Git\unins000.exe" (
    "C:\Program Files (x86)\Git\unins000.exe" /SILENT /SUPRESSMSGBOXES /NORESTART
    ECHO UNINSTALLED MYSYS GIT!
    ECHO.
  )
  IF EXIST "C:\Program Files\Boot2Docker for Windows\unins000.exe" (
    "C:\Program Files\Boot2Docker for Windows\unins000.exe" /SILENT /SUPRESSMSGBOXES /NORESTART
    ECHO UNINSTALLED MYSYS GIT!
    ECHO.
  )
  ECHO "YOU WILL NEED TO UNINSTALL VIRTUALBOX MANUALLY TO COMPLETE THE UNINSTALL"
)

IF %id% == 2 (
  ECHO SO BE IT.... JEDI
)

PAUSE
