// Recolors SVG icons at runtime and caches the result as a data URI, keyed
// by (iconUrl, color). Some icon sets (e.g. maki) have no fill anywhere and
// just inherit from the root <svg>; others declare an explicit fill on each
// shape, which would otherwise override an inherited color. To cover both,
// every existing fill (other than "none", left alone since that's usually
// intentional transparency) gets overwritten, plus the root gets one too for
// shapes that never had their own.
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
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const root = doc.documentElement;
      root.setAttribute('fill', color);
      root.querySelectorAll('[fill]').forEach(el => {
        if (el.getAttribute('fill') !== 'none') {
          el.setAttribute('fill', color);
        }
      });
      const colored = new XMLSerializer().serializeToString(doc);
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
