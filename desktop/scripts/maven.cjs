const { spawnSync } = require('node:child_process');
const path = require('node:path');

function mavenCommand(platform, args) {
  return platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', 'mvnw.cmd', ...args] }
    : { command: 'sh', args: ['./mvnw', ...args] };
}
if (require.main === module) {
  const invocation = mavenCommand(process.platform, process.argv.slice(2));
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: path.resolve(__dirname, '../../backend'), stdio: 'inherit', windowsHide: true,
  });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
module.exports = { mavenCommand };
