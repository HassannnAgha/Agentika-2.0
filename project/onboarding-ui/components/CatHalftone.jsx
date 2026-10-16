/* eslint-disable @next/next/no-img-element */

/**
 * The hero artwork: the reference painting rendered as a halftone dot field.
 *
 * Served as its own file rather than inline, so the page stays light and the
 * browser caches it. AVIF first, WebP for anything that cannot take it — the
 * dot texture is high-frequency, so both are encoded generously to stop the
 * compressor smearing the dots into mush.
 *
 * The plate is portrait and the panel is landscape, so the image is cropped by
 * `object-fit: cover`; `object-position` holds the crop over the cat rather
 * than letting it settle on the table.
 */
export default function CatHalftone({ position = '50% 30%', style }) {
  const fill = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: position,
    ...style,
  };

  return (
    <picture>
      <source srcSet="/cat-halftone.avif" type="image/avif" />
      <source srcSet="/cat-halftone.webp" type="image/webp" />
      <img src="/cat-halftone.webp" alt="" aria-hidden="true" style={fill} />
    </picture>
  );
}
