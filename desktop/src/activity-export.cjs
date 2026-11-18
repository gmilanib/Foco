function validateText(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 25 * 1024 * 1024)
    throw new Error('Texto inválido ou maior que 25 MB.');
}

function registerActivityExport({ ipcMain, clipboard, dialog, writeFile }) {
  ipcMain.handle('foco:copy-text', (_event, content) => {
    validateText(content);
    clipboard.writeText(content);
  });
  ipcMain.handle('foco:save-text', async (_event, { fileName, content }) => {
    validateText(content);
    if (typeof fileName !== 'string' || !/^[\w-]{1,120}\.txt$/.test(fileName))
      throw new Error('Nome de arquivo de texto inválido.');
    const picked = await dialog.showSaveDialog({
      title: 'Exportar lista de atividades', defaultPath: fileName,
      filters: [{ name: 'Arquivo de texto', extensions: ['txt'] }],
    });
    if (picked.canceled || !picked.filePath) return null;
    writeFile(picked.filePath, content, 'utf8');
    return picked.filePath;
  });
}

module.exports = { registerActivityExport };
