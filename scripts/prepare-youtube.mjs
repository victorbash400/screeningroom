import { createHash } from 'node:crypto';
import { mkdir, writeFile, chmod, readFile } from 'node:fs/promises';
import { join } from 'node:path';

if (!process.env.YTDLP_PATH) {
  const directory = join(process.cwd(), '.media-bin');
  const path = join(directory, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  const asset = process.platform === 'darwin' ? 'yt-dlp_macos' : process.platform === 'win32' ? 'yt-dlp.exe' : process.arch === 'x64' ? 'yt-dlp_linux' : process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : undefined;
  if (!asset) throw new Error('Configure YTDLP_PATH for this server architecture.');
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
  const checksum = await fetch(base + 'SHA2-256SUMS', { signal: AbortSignal.timeout(120000) });
  if (!checksum.ok) throw new Error('Could not verify the YouTube processing binary.');
  const rows = (await checksum.text()).split('\n').map(line => line.trim().split(' ').filter(Boolean));
  const expected = rows.find(row => row[1] === asset)?.[0];
  if (!expected) throw new Error('YouTube binary checksum is unavailable for this server architecture.');
  let current;
  try { current = await readFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!current || createHash('sha256').update(current).digest('hex') !== expected) {
    const binary = await fetch(base + asset, { signal: AbortSignal.timeout(120000) });
    if (!binary.ok) throw new Error('Could not prepare the YouTube processing binary.');
    const bytes = Buffer.from(await binary.arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('YouTube binary checksum verification failed.');
    await mkdir(directory, { recursive: true });
    await writeFile(path, bytes);
  }
  await chmod(path, 0o755);
}
