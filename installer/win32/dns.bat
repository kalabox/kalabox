@ECHO OFF
SETLOCAL
CLS

:: All praise BAT files
::
:: Kalabox Services Script.
::
:: Copyright (C) 2016 Kalabox Inc
::

:: Set out environment
SET VM=Kalabox2
SET VBOXMANAGE=%ProgramFiles%\Oracle\VirtualBox\VBoxManage.exe
SET KALABOX_DEFAULT_HOA=VirtualBox Host-Only Network

:: Get the Kalabox HOA
"%VBOXMANAGE%" showvminfo "%VM%" | FINDSTR /C:"Host-only Interface">%TEMP%\hoa.tmp
FOR /F "tokens=2 delims=," %%A IN ('TYPE "%TEMP%\hoa.tmp"') DO SET KALABOX_ATTACHMENT=%%A
FOR /F "tokens=2 delims='" %%A IN ("%KALABOX_ATTACHMENT%") DO SET KALABOX_VB_HOA=%%A
FOR /F "tokens=5 delims= " %%A IN ("%KALABOX_VB_HOA%") DO SET KALABOX_ADAPTER_ID=%%A

:: Append an ID to the HOA if needed
IF DEFINED KALABOX_ADAPTER_ID (SET KALABOX_WIN_HOA="%KALABOX_DEFAULT_HOA% %KALABOX_ADAPTER_ID%") ELSE (SET KALABOX_WIN_HOA="%KALABOX_DEFAULT_HOA%")

:: GEt the IP addrress assume
:: @todo: is it ok to assume the IP file is still here from the previous run of services.bat?
FOR /F %%A in ('TYPE "%TEMP%\ip.tmp"') DO (SET KALABOX_IP=%%A)
IF NOT DEFINED KALABOX_IP (SET KALABOX_IP=10.13.37.100)

:: Set the Kalabox IP address into the Kalabox HOA
netsh interface ipv4 set interface %KALABOX_WIN_HOA% metric=9999
netsh interface ipv4 add dnsservers %KALABOX_WIN_HOA% %KALABOX_IP% validate=no index=1
ipconfig /flushdns

:: Report success if we get this far
EXIT /B 0
