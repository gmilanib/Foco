import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
const { registerActivityExport } = createRequire(import.meta.url)('./activity-export.cjs');

function setup() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const deps = { ipcMain: { handle: (name: string, fn: (...args: unknown[]) => unknown) => handlers.set(name, fn) },
    clipboard: { writeText: vi.fn() }, dialog: { showSaveDialog: vi.fn().mockResolvedValue({ filePath: 'atividades.txt', canceled: false }) }, writeFile: vi.fn() };
  registerActivityExport(deps);
  const invoke = (name: string, ...args: unknown[]) => Promise.resolve().then(() => handlers.get(name)!(undefined, ...args));
  let bridge!: { copyText: (text: unknown) => Promise<void>; saveText: (fileName: string, text: unknown) => Promise<string | null> };
  runInNewContext(readFileSync(resolve('desktop/src/preload.cjs'), 'utf8'), {
    require: () => ({ contextBridge: { exposeInMainWorld: (_key: string, value: typeof bridge) => { bridge = value; } }, ipcRenderer: { invoke } }),
  });
  return { ...deps, bridge };
}

it('copia texto pelo preload e preserva os acentos e as linhas no TXT local', async () => {
  const deps = setup(), text = 'Hora início - Duração\r\n09:00 - 01:00:00';
  await deps.bridge.copyText(text);
  expect(deps.clipboard.writeText).toHaveBeenCalledWith(text);
  expect(await deps.bridge.saveText('atividades-2026-11-17.txt', text)).toBe('atividades.txt');
  expect(deps.dialog.showSaveDialog).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: 'atividades-2026-11-17.txt', filters: [{ name: 'Arquivo de texto', extensions: ['txt'] }] }));
  expect(deps.writeFile).toHaveBeenCalledWith('atividades.txt', text, 'utf8');
});

it('não grava quando o usuário cancela a escolha do arquivo', async () => {
  const deps = setup(); deps.dialog.showSaveDialog.mockResolvedValue({ canceled: true });
  expect(await deps.bridge.saveText('atividades.txt', 'Texto')).toBeNull();
  expect(deps.writeFile).not.toHaveBeenCalled();
});

it('retorna falhas de cópia e gravação para a interface', async () => {
  const deps = setup();
  deps.clipboard.writeText.mockImplementation(() => { throw new Error('Falha na cópia'); });
  await expect(deps.bridge.copyText('Texto')).rejects.toThrow('Falha na cópia');
  deps.writeFile.mockImplementation(() => { throw new Error('Disco cheio'); });
  await expect(deps.bridge.saveText('atividades.txt', 'Texto')).rejects.toThrow('Disco cheio');
});

it('valida conteúdo e nome antes de copiar ou abrir o diálogo', async () => {
  const deps = setup();
  await expect(deps.bridge.copyText({ text: 'Texto' })).rejects.toThrow('Texto inválido');
  await expect(deps.bridge.saveText('atividades.txt', null)).rejects.toThrow('Texto inválido');
  await expect(deps.bridge.saveText('../atividades.txt', 'Texto')).rejects.toThrow('Nome de arquivo');
  await expect(deps.bridge.copyText('á'.repeat(13 * 1024 * 1024))).rejects.toThrow('maior que 25 MB');
  expect(deps.clipboard.writeText).not.toHaveBeenCalled(); expect(deps.dialog.showSaveDialog).not.toHaveBeenCalled();
});
