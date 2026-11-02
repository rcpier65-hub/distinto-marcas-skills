// Run from app/: node scripts/generate-finance-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = new URL('../public/icons/finanzas/v1/', import.meta.url);
const svg = await readFile(new URL('wallet.svg', base));
for (const [name, size] of [['icon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(svg).resize(size, size).png().toFile(fileURLToPath(new URL(name, base)));
}
// Keep the wallet and coin inside the central maskable safe circle.
// The artwork already fits inside the 80% diameter safe circle.
await sharp(svg).png().toFile(fileURLToPath(new URL('icon-maskable-512.png', base)));
