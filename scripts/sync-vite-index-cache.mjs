#!/usr/bin/env node
/**
 * Copy index.html to os.tmpdir so Vite can fall back when macOS blocks Desktop reads.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const indexPath = path.join(projectRoot, 'index.html');
const cachePath = path.join(os.tmpdir(), 'selorg-dashboard-index.html');

try {
  const html = fs.readFileSync(indexPath, 'utf-8');
  fs.writeFileSync(cachePath, html, { encoding: 'utf-8', mode: 0o644 });
  console.log(`[sync-vite-index-cache] OK → ${cachePath}`);
} catch (err) {
  if (fs.existsSync(cachePath)) {
    console.log(`[sync-vite-index-cache] project read failed; cache already exists at ${cachePath}`);
  } else {
    console.warn('[sync-vite-index-cache]', err instanceof Error ? err.message : err);
  }
}
