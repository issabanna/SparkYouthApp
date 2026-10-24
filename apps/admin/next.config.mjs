const nextConfig = {
  async headers() {
    // HTML must fetch the current export rather than an obsolete hashed bundle.
    return [
      ...['/app', '/app/', '/app/index.html'].map(source => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      })),
      {
        source: '/downloads/spark-youth-preview-0.1.0.apk',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Content-Disposition', value: 'attachment; filename="spark-youth-preview-0.1.0.apk"' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: '/app', destination: '/app/index.html' }];
  },
};
export default nextConfig;
