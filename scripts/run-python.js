// Runs a Python script with whichever Python 3 command exists on this machine
// ("python3" on macOS/Linux, "python" or "py" on Windows).
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
for (const cmd of ['python3', 'python', 'py']) {
  const probe = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
  if (probe.status === 0 && /Python 3/.test(`${probe.stdout}${probe.stderr}`)) {
    const run = spawnSync(cmd, args, { stdio: 'inherit' });
    process.exit(run.status === null ? 1 : run.status);
  }
}
console.error('Python 3 was not found. Install it from https://python.org/ and try again.');
process.exit(1);
