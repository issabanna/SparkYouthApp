const nextConfig = {
  async headers() {
    // HTML must fetch the current export rather than an obsolete hashed bundle.
    return ['/app', '/app/', '/app/index.html'].map(source => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
    }));
  },
  async rewrites() {
    return [{ source: '/app', destination: '/app/index.html' }];
  },
};
export default nextConfig;
