@ECHO OFF
SETLOCAL
CLS

:: All praise BAT files
::
:: Kalabox Services Script.
::
:: Copyright (C) 2016 Kalabox Inc
::

:: Load our environment
SET DOCKER_MACHINE=%~dp0bin\docker-machine.exe
SET DOCKER_COMPOSE=%~dp0bin\docker-compose.exe
SET VBOXMANAGE=%ProgramFiles%\Oracle\VirtualBox\VBoxManage.exe
SET VM=Kalabox2

:: Check to see if docker compose is installed
IF NOT EXIST "%DOCKER_COMPOSE%" (
  ECHO "Docker Compose is not installed. Please re-run the Kalabox Installer and try again."
  EXIT /B 1
)

:: Get the kalabox IP
"%DOCKER_MACHINE%" ip "%VM%">"%TEMP%\ip.tmp"
FOR /F %%A in ('TYPE "%TEMP%\ip.tmp"') DO (SET KALABOX_IP=%%A)

:: Set our environment so we can connect to docker
SET DOCKER_TLS_VERIFY=1
SET DOCKER_HOST=tcp://%KALABOX_IP%:2376
SET DOCKER_CERT_PATH=%USERPROFILE%\.docker\machine\machines\%VM%
SET DOCKER_MACHINE_NAME=%VM%
SET KALABOX_DOMAIN=kbox
SET KALABOX_ENGINE_IP=%KALABOX_IP%

:: Spin up needed core services
"%DOCKER_COMPOSE%" ^
  -p kalabox ^
  -f "%~dp0services\services.yml" ^
  up ^
  -d ^
  --force-recreate

:: Report an error if something didnt go correctly
IF %ERRORLEVEL% NEQ 0 (
  ECHO "Something went wrong during services installation."
  EXIT /B 666
)
