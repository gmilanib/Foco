!macro customCheckAppRunning
  InitPluginsDir
  File /oname=$PLUGINSDIR\close-installed.ps1 "${PROJECT_DIR}\desktop\build\close-installed.ps1"
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\close-installed.ps1" -InstallDirectory "$INSTDIR"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    DetailPrint "$1"
    MessageBox MB_OK|MB_ICONEXCLAMATION "Não foi possível encerrar o Foco. Feche o aplicativo e tente novamente. $1" /SD IDOK
    SetErrorLevel 1
    Quit
  ${EndIf}
!macroend
