@ECHO OFF

SETLOCAL

SET "NODE_EXE=%~dp0\node.exe"
IF NOT EXIST "%NODE_EXE%" (
  SET "NODE_EXE=node"
) ELSE (
  SET "KBOX_CLI_JS=%~dp0.\node_modules\kalabox\bin\kbox.js"
)

IF NOT EXIST "%KBOX_CLI_JS%" (
  SET "KBOX_CLI_JS=%~dp0\kbox.js"
)

"%NODE_EXE%" "%KBOX_CLI_JS%" %*
