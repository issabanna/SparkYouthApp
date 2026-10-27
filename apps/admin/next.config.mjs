const nextConfig = {
  async headers() {
    // HTML must fetch the current export rather than an obsolete hashed bundle.
    return [
      ...['/app', '/app/', '/app/index.html'].map(source => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      })),
      ...['0.1.0', '0.1.1', '0.1.2', '0.1.3', '0.1.4', '0.1.5', '0.1.6'].map(version => ({
        source: `/downloads/spark-youth-preview-${version}.apk`,
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Content-Disposition', value: `attachment; filename="spark-youth-preview-${version}.apk"` },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      })),
    ];
  },
  async rewrites() {
    return [{ source: '/app', destination: '/app/index.html' }];
  },
};
export default nextConfig;
