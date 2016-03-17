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
SET DOCKER_MACHINE=%USERPROFILE%\.kalabox\bin\docker-machine.exe
SET VBOXMANAGE=%ProgramFiles%\Oracle\VirtualBox\VBoxManage.exe
SET VM=Kalabox2

:: Get the free disk space in MB
wmic logicaldisk where (caption = "%SystemDrive%") get freespace>"%TEMP%\free.tmp"
FOR /F %%A in ('TYPE "%TEMP%\free.tmp"') DO (SET free=%%A)
SET VB_DISK=%free:~0,-6%

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

:: If the Kalabox2 VM does not exist then create it
:: @todo: handle errors?
"%VBOXMANAGE%" list vms | findstr "%VM%"
IF %ERRORLEVEL% NEQ 0 (

  "%DOCKER_MACHINE%" create -d virtualbox ^
    --virtualbox-memory 2048 ^
    --virtualbox-disk-size "%VB_DISK%" ^
    --virtualbox-hostonly-cidr 10.13.37.1/24 ^
    --virtualbox-host-dns-resolver ^
    --engine-opt dns=172.17.0.1 ^
    --engine-opt dns=208.67.222.222 ^
    "%VM%"

)

:: If the machine is not running start it up and regenerate certs
"%DOCKER_MACHINE%" status "%VM%" | findstr Running
IF %ERRORLEVEL% NEQ 0 (
  "%DOCKER_MACHINE%" start "%VM%"
  ECHO yes | "%DOCKER_MACHINE%" regenerate-certs "%VM%"
)
