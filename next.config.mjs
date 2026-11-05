/** @type {import('next').NextConfig} */
const nextConfig = {
  // geoip-lite reads its bundled dataset from a path computed relative to
  // its own module location at require() time; bundling it breaks that path
  // resolution (see the Session V2 implementation report), exactly like
  // better-sqlite3's native binding above — both need to stay a real,
  // unbundled require() at runtime.
  serverExternalPackages: ['better-sqlite3', 'geoip-lite'],
  devIndicators: false,
  // Lets a phone on the home Wi-Fi open the dev server at http://192.168.1.x:3000.
  allowedDevOrigins: ['192.168.1.*'],
};

export default nextConfig;
