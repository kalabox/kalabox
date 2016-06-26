@ECHO OFF
SETLOCAL
CLS

:: All praise BAT files
::
:: Kalabox Engine Script.
::
:: Copyright (C) 2016 Kalabox Inc
::

:: Load in some env
SET DOCKER_MACHINE=%ProgramFiles%\Kalabox\bin\docker-machine.exe
SET VBOXMANAGE=%ProgramFiles%\Oracle\VirtualBox\VBoxManage.exe
SET VM=Kalabox2

:: Check to see if DOCKER MACHINE is actually installed
IF NOT EXIST "%DOCKER_MACHINE%" (
  ECHO "Docker Machine is not installed. Please re-run the Kalabox Installer and try again."
  EXIT /B 1
)

:: CHeck to see if VBMANAGE is actually installed
IF NOT EXIST "%VBOXMANAGE%" (
  ECHO "VirtualBox is not installed. Please re-run the Kalabox Installer and try again."
  EXIT /B 1
)

:: Get the free disk space in MB
wmic logicaldisk where (caption = "%SystemDrive%") get freespace>"%TEMP%\free.tmp"
FOR /F %%A in ('TYPE "%TEMP%\free.tmp"') DO (SET free=%%A)
SET FREE_DISK=%free:~0,-6%

:: Set an upperbound to the VB disk at 150GB, 2TB is the VMDK MAX
:: @todo: add a KALABOX_DISK_SPACE to customize this?
IF %FREE_DISK% GTR 150000 (
  SET VB_DISK=150000
) ELSE (
  SET VB_DISK=%FREE_DISK%
)

:: If the Kalabox2 VM does not exist then create it
:: @todo: handle errors?
"%VBOXMANAGE%" list vms | findstr "%VM%"
IF %ERRORLEVEL% NEQ 0 (

  "%DOCKER_MACHINE%" create -d virtualbox ^
    --virtualbox-memory 2048 ^
    --virtualbox-disk-size "%VB_DISK%" ^
    --virtualbox-hostonly-cidr 10.13.37.1/24 ^
    --virtualbox-host-dns-resolver ^
    "%VM%"

)

:: If the machine is not running start it up and regenerate certs
"%DOCKER_MACHINE%" status "%VM%" | findstr Running
IF %ERRORLEVEL% NEQ 0 (
  "%DOCKER_MACHINE%" start "%VM%"
  ECHO yes | "%DOCKER_MACHINE%" regenerate-certs "%VM%"
)
