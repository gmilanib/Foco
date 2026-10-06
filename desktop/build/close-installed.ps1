param([string]$InstallDirectory, [switch]$FunctionsOnly)
$ErrorActionPreference = 'Stop'

function Select-FocoProcesses($Processes, [string]$Directory) {
    $executables = @(
        (Join-Path $Directory 'Foco New.exe'),
        (Join-Path $Directory 'Foco Stable.exe')
    )
    $jar = Join-Path $Directory 'resources\backend\foco-backend.jar'
    $Processes | Where-Object {
        $executables -icontains $_.ExecutablePath -or
        ($_.Name -ieq 'java.exe' -and
         ($_.CommandLine -like "* -jar $jar --*" -or
          $_.CommandLine -like "* -jar `"$jar`" --*"))
    }
}

if ($FunctionsOnly) { return }
try {
    if (-not [IO.Path]::IsPathRooted($InstallDirectory)) { throw 'Installation path must be absolute.' }
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        $matches = @(Select-FocoProcesses (Get-CimInstance Win32_Process) $InstallDirectory)
        if ($matches.Count -eq 0) { exit 0 }
        foreach ($process in $matches) {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 250
    }
    throw 'Foco files are still in use.'
} catch {
    Write-Output $_.Exception.Message
    exit 1
}
