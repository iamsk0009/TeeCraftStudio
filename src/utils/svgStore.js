// utils/svgStore.js
class SvgStore {
  constructor() {
      this.originalBySrc = new Map();
      this.dataUrlByKey = new Map(); // cache data URLs    // `${src}|fill=...|stroke=...` -> blobURL
  }

  async getOriginal(src, signal) {
    if (this.originalBySrc.has(src)) return this.originalBySrc.get(src);
    const res = await fetch(src, { signal });
    const svgText = await res.text();
    this.originalBySrc.set(src, svgText);
    return svgText;
  }

  async getTransformed(src, opts = {}, signal) {
    // Only apply color transformations if a color is explicitly provided
    const hasColorUpdate = opts.fill && opts.fill !== '#000000';
    const fill = hasColorUpdate ? opts.fill : null;
    const stroke = hasColorUpdate ? opts.fill : null;
    const includeInline = !!opts.includeInline;

    const key = `${src}|fill=${fill}|stroke=${stroke}`;
    const cached = this.dataUrlByKey.get(key);
    if (cached && !includeInline) {
      return { dataUrl: cached, inline: '' };
    }

    const original = await this.getOriginal(src, signal);

    const parser = new DOMParser();
    const doc = parser.parseFromString(original, 'image/svg+xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) throw new Error('Invalid SVG');
      // Allow non-uniform scaling (true "fill/stretch")
   const root = doc.documentElement;
   root.setAttribute('preserveAspectRatio', 'none');
   if (!root.getAttribute('viewBox')) {
     const w = parseFloat(root.getAttribute('width')) || 1000;
     const h = parseFloat(root.getAttribute('height')) || 1000;
     root.setAttribute('viewBox', `0 0 ${w} ${h}`);
   }

    const targets = doc.querySelectorAll(
      'path, circle, ellipse, rect, polygon, polyline, line, text, use'
    );

    targets.forEach((el) => {
      // Keep original style if no color update
      let style = el.getAttribute('style') || '';
      
      // Only modify colors if a color update is requested
      if (fill || stroke) {
        style = style
          .replace(/fill\s*:[^;]+;?/gi, '')
          .replace(/stroke\s*:[^;]+;?/gi, '')
          .trim()
          .replace(/;+$/, '');

        const parts = [];
        if (fill) {
          parts.push(`fill:${fill} !important`);
          parts.push(`stroke:${fill} !important`);
          parts.push('stroke-width:10px !important');
        }

        const newStyles = parts.join('; ');
        style = style ? `${style}; ${newStyles}` : newStyles;
      }

      if (style) el.setAttribute('style', style);
    });

    const inline = new XMLSerializer().serializeToString(doc.documentElement);
   // Data URL (utf8)
   const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(inline)}`;
   this.dataUrlByKey.set(key, dataUrl);
   return { dataUrl, inline: includeInline ? inline : '' }
  }

  revokeAll() {
  // nothing to revoke for data URLs
  this.dataUrlByKey.clear();
  }

  revokeForSrc(src) {
  const keys = [...this.dataUrlByKey.keys()].filter((k) => k.startsWith(`${src}|`));
  for (const k of keys) this.dataUrlByKey.delete(k);
  }
}

export const svgStore = new SvgStore();
