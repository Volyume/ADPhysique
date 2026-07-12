import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ['@volyume/ui', '@volyume/supabase'],
};

export default nextConfig;
