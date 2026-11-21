export function publicAssetUrl(path) {
  if (typeof path !== 'string') return path;
  return path.startsWith('/art/') ? `.${path}` : path;
}
