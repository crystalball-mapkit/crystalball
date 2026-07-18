// Recolors monochrome (maki-style) SVG icons at runtime and caches the result
// as a data URI, keyed by (iconUrl, color). Maki icons ship with no fill on
// their <path>, so injecting fill on the root <svg> cascades to it for free.
const cache = new Map();
const pending = new Map();

const buildKey = (iconUrl, color) => `${iconUrl}::${color}`;

export function getCachedColoredIcon(iconUrl, color) {
  return cache.get(buildKey(iconUrl, color));
}

export function ensureColoredIcon(iconUrl, color) {
  const key = buildKey(iconUrl, color);
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key));
  }
  if (pending.has(key)) {
    return pending.get(key);
  }
  const promise = fetch(iconUrl)
    .then(res => res.text())
    .then(svg => {
      const colored = svg.replace('<svg ', `<svg fill="${color}" `);
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(colored)}`;
      cache.set(key, dataUri);
      pending.delete(key);
      return dataUri;
    })
    .catch(() => {
      pending.delete(key);
      return iconUrl;
    });
  pending.set(key, promise);
  return promise;
}
