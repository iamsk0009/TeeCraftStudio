// utils/svgPathColorizer.js
// Special utility for category img_cat_1766324638637
// Parses SVG and changes only the fill attribute of paths

class SvgPathColorizer {
  constructor() {
    this.cache = new Map(); // `${src}|${color}` -> dataUrl
  }

  async colorizePathFills(src, color, signal) {
    if (!src || !color) return null;

    const key = `${src}|${color}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const res = await fetch(src, { signal });
      const svgText = await res.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) throw new Error('Invalid SVG');

      const root = doc.documentElement;
      
      // Ensure proper scaling
      root.setAttribute('preserveAspectRatio', 'none');
      if (!root.getAttribute('viewBox')) {
        const w = parseFloat(root.getAttribute('width')) || 1000;
        const h = parseFloat(root.getAttribute('height')) || 1000;
        root.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }

      // Find all path elements and change their fill attribute only
      const paths = doc.querySelectorAll('path');
      paths.forEach((path) => {
        // Update the fill attribute directly
        path.setAttribute('fill', color);
        
        // Also update style if it has inline fill
        let style = path.getAttribute('style') || '';
        if (style.includes('fill')) {
          style = style.replace(/fill\s*:[^;]+;?/gi, `fill:${color}`);
          path.setAttribute('style', style);
        }
      });

      const serialized = new XMLSerializer().serializeToString(doc.documentElement);
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(serialized)}`;
      
      this.cache.set(key, dataUrl);
      return dataUrl;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('SVG path colorization failed:', error);
      }
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
  }

  clearForSrc(src) {
    const keys = [...this.cache.keys()].filter((k) => k.startsWith(`${src}|`));
    keys.forEach(k => this.cache.delete(k));
  }
}

export const svgPathColorizer = new SvgPathColorizer();
