const nextConfig = {
  async rewrites() {
    return [{ source: '/app', destination: '/app/index.html' }];
  },
};
export default nextConfig;
