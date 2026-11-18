const path = require('node:path');

function dataDirectory({ platform, env, home, appData }) {
  if (env.FOCO_DATA_DIR) return env.FOCO_DATA_DIR;
  if (platform === 'linux') {
    const root = env.XDG_DATA_HOME && path.posix.isAbsolute(env.XDG_DATA_HOME)
      ? env.XDG_DATA_HOME : path.posix.join(home, '.local/share');
    return path.posix.join(root, 'foco-java/data');
  }
  return path.win32.join(appData, 'foco-java', 'data');
}

// Linux desktops can accept a tray icon without displaying it.
function concealWindow(window, platform, tray) {
  if (platform === 'win32' && tray && !tray.isDestroyed()) window.hide();
  else window.minimize();
}
module.exports = { dataDirectory, concealWindow };
