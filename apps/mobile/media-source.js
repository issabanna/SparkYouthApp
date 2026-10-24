const appOrigin = 'https://sparkyouth.vercel.app';
function resolveMediaSource(path, platform, bundled) {
  if (typeof path !== 'string' || !path.trim()) return null;
  if (platform !== 'web' && Object.prototype.hasOwnProperty.call(bundled, path)) return bundled[path];
  if (/^(https:\/\/|data:image\/|file:\/\/|content:\/\/)/i.test(path)) return {uri:path};
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return {uri:platform === 'web' ? path : appOrigin + path};
}
module.exports = {resolveMediaSource};
