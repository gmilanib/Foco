import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it.each(['New', 'Stable'])('encerra somente Electron e Java da instalação %s, inclusive Java com caminho entre aspas', (channel) => {
  const script = resolve('desktop/build/close-installed.ps1').replaceAll("'", "''");
  const command = `
    . '${script}' -FunctionsOnly
    $directory = 'C:\\Apps\\Foco ${channel}'
    $items = @(
      [pscustomobject]@{ProcessId=1;Name='Foco ${channel}.exe';ExecutablePath="$directory\\Foco ${channel}.exe";CommandLine=''},
      [pscustomobject]@{ProcessId=2;Name='java.exe';ExecutablePath='C:\\Java\\java.exe';CommandLine="java -jar $directory\\resources\\backend\\foco-backend.jar --server.port=123"},
      [pscustomobject]@{ProcessId=3;Name='java.exe';ExecutablePath='C:\\Java\\java.exe';CommandLine=('java -jar "'+$directory+'\\resources\\backend\\foco-backend.jar" --server.port=123')},
      [pscustomobject]@{ProcessId=4;Name='Foco Stable.exe';ExecutablePath='C:\\Apps\\Stable\\Foco Stable.exe';CommandLine=''},
      [pscustomobject]@{ProcessId=5;Name='java.exe';ExecutablePath='C:\\Java\\java.exe';CommandLine='java -jar C:\\Other\\foco-backend.jar --server.port=123'},
      [pscustomobject]@{ProcessId=6;Name='Foco New.exe';ExecutablePath='C:\\Other\\Foco New.exe';CommandLine=''},
      [pscustomobject]@{ProcessId=7;Name='java.exe';ExecutablePath='C:\\Java\\java.exe';CommandLine="java -jar $directory\\resources\\backend\\foco-backend.jar.extra --server.port=123"}
    )
    @(Select-FocoProcesses $items $directory).ProcessId | ConvertTo-Json -Compress
  `;
  const result = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {encoding:'utf8'});
  expect(JSON.parse(result)).toEqual([1,2,3]);
});

it.each(['new', 'stable'])('inclui o encerramento da instalação anterior no pacote %s', (channel) => {
  const config = readFileSync(resolve(`desktop/electron-builder.${channel}.yml`), 'utf8');
  expect(config).toMatch(/nsis:\s*\r?\n\s+include: desktop\/build\/installer\.nsh/);
});
