/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: ['@volyume/ui', '@volyume/supabase'],
};

export default nextConfig;
