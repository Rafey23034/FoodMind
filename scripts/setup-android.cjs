const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Official Ninja release. Its SHA-256 is published with the GitHub release asset.
const VERSION = '1.13.2';
const SHA256 = '07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65';
async function main() {
  if (process.platform !== 'win32') return;
  const root = path.resolve(__dirname, '..');
  const directory = path.join(root, 'tmp', 'tools', 'ninja');
  const executable = path.join(directory, 'ninja.exe');
  if (fs.existsSync(executable)) return;
  console.log(`Preparing Ninja ${VERSION} for Android builds on Windows...`);
  const response = await fetch(`https://github.com/ninja-build/ninja/releases/download/v${VERSION}/ninja-win.zip`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Ninja download failed: HTTP ${response.status}`);
  const archive = Buffer.from(await response.arrayBuffer());
  if (crypto.createHash('sha256').update(archive).digest('hex') !== SHA256) {
    throw new Error('Ninja archive checksum did not match the official release.');
  }
  fs.mkdirSync(directory, { recursive: true });
  const archivePath = path.join(root, 'tmp', 'tools', `ninja-${VERSION}.zip`);
  fs.writeFileSync(archivePath, archive);
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Expand-Archive -LiteralPath $env:FOODMIND_NINJA_ARCHIVE -DestinationPath $env:FOODMIND_NINJA_DIRECTORY -Force'], {
    env: { ...process.env, FOODMIND_NINJA_ARCHIVE: archivePath, FOODMIND_NINJA_DIRECTORY: directory },
    stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(executable)) throw new Error('Could not extract the verified Ninja archive.');
  console.log(`Ninja ${VERSION} is ready in this project's tmp/tools folder.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
