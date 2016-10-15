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
SET KALABOX_DEFAULT_HOA=vEthernet (DockerNAT)
SET KALABOX_IP=127.0.0.1

:: Get the Kalabox HYPERV HOA
ipconfig | FINDSTR /C:"%KALABOX_DEFAULT_HOA%">%TEMP%\hoa.tmp
FOR /F "tokens=1 delims=:" %%A IN ('TYPE "%TEMP%\hoa.tmp"') DO SET KALABOX_HOA_TRIMMED=%%A
FOR /F "tokens=5 delims= " %%A IN ("%KALABOX_HOA_TRIMMED%") DO SET KALABOX_ADAPTER_ID=%%A

:: Append an ID to the HOA if needed
IF DEFINED KALABOX_ADAPTER_ID (SET KALABOX_WIN_HOA="%KALABOX_DEFAULT_HOA% %KALABOX_ADAPTER_ID%") ELSE (SET KALABOX_WIN_HOA="%KALABOX_DEFAULT_HOA%")

:: We need to set these so that Windows does not use our DNS server as its primary
netsh interface ipv4 set interface %KALABOX_WIN_HOA% metric=9999
netsh interface ipv6 set interface %KALABOX_WIN_HOA% metric=9999

:: Set the Kalabox IP address into the Kalabox HOA
netsh interface ipv4 add dnsservers %KALABOX_WIN_HOA% %KALABOX_IP% validate=no index=1
ipconfig /flushdns

:: Report success if we get this far
EXIT /B 0
