// Colour maths for Souvenir. Pure functions, no dependencies, no file access.
//
// Exports (all colours as plain arrays unless named otherwise):
//   oklchToOklab([L, C, H])           -> [L, a, b]
//   oklabToOklch([L, a, b])           -> [L, C, H]   (H in [0, 360))
//   oklabToLinearSrgb([L, a, b])      -> [r, g, b]   linear light, not clamped
//   linearSrgbToOklab([r, g, b])      -> [L, a, b]
//   oklchToLinearSrgb([L, C, H])      -> [r, g, b]   linear light, not clamped
//   oklchToSrgb([L, C, H])            -> [r, g, b]   gamma-encoded 0..1, not clamped
//   srgbToOklch([r, g, b])            -> [L, C, H]   from gamma-encoded 0..1
//   inGamut([L, C, H], epsilon?)      -> boolean     true when every sRGB channel is inside 0..1
//   toHex([L, C, H])                  -> "#rrggbb"   clamped and rounded
//   hexToSrgb("#rrggbb" | "#rgb")     -> [r, g, b]   gamma-encoded 0..1
//   hexDistance(hexA, hexB)           -> largest difference in any 0..255 channel
//   relativeLuminance([r, g, b])      -> WCAG 2 relative luminance of a gamma-encoded sRGB colour
//   luminanceOfOklch([L, C, H])       -> WCAG 2 relative luminance (channels clamped to the gamut)
//   contrastRatio(lumA, lumB)         -> WCAG 2 ratio, 1..21
//   contrastOklch(a, b)               -> WCAG 2 ratio between two OKLCH colours
//   hueDistance(h1, h2)               -> shortest angle between two hues, 0..180
//   mixOklab(a, b, percentA)          -> [L, C, H]; like CSS color-mix(in oklab, a percentA%, b)
//   parseCssColor(string)             -> { srgb: [r, g, b], alpha } for #hex, rgb(), rgba(), oklch(), oklab(), color(srgb ...)
//   formatOklch([L, C, H])            -> "oklch(L C H)" using the numbers as given

const D2R = Math.PI / 180;

export function oklchToOklab([L, C, H]) {
  return [L, C * Math.cos(H * D2R), C * Math.sin(H * D2R)];
}

export function oklabToOklch([L, a, b]) {
  const C = Math.hypot(a, b);
  let H = Math.atan2(b, a) / D2R;
  if (H < 0) H += 360;
  return [L, C, C < 1e-9 ? 0 : H];
}

// Matrices from Björn Ottosson, "A perceptual color space for image processing" (2020).
export function oklabToLinearSrgb([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

export function linearSrgbToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

const encode = (x) => {
  const sign = x < 0 ? -1 : 1;
  const v = Math.abs(x);
  return sign * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
};
const decode = (x) => {
  const sign = x < 0 ? -1 : 1;
  const v = Math.abs(x);
  return sign * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function oklchToLinearSrgb(lch) {
  return oklabToLinearSrgb(oklchToOklab(lch));
}

export function oklchToSrgb(lch) {
  return oklchToLinearSrgb(lch).map(encode);
}

export function srgbToOklch(rgb) {
  return oklabToOklch(linearSrgbToOklab(rgb.map(decode)));
}

export function inGamut(lch, epsilon = 0.0005) {
  return oklchToSrgb(lch).every((c) => c >= -epsilon && c <= 1 + epsilon);
}

export function toHex(lch) {
  return '#' + oklchToSrgb(lch)
    .map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0'))
    .join('');
}

export function hexToSrgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export function hexDistance(a, b) {
  const x = hexToSrgb(a), y = hexToSrgb(b);
  return Math.max(...x.map((v, i) => Math.round(Math.abs(v - y[i]) * 255)));
}

export function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => decode(clamp01(c)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function luminanceOfOklch(lch) {
  return relativeLuminance(oklchToSrgb(lch));
}

export function contrastRatio(lumA, lumB) {
  const hi = Math.max(lumA, lumB), lo = Math.min(lumA, lumB);
  return (hi + 0.05) / (lo + 0.05);
}

export function contrastOklch(a, b) {
  return contrastRatio(luminanceOfOklch(a), luminanceOfOklch(b));
}

export function hueDistance(h1, h2) {
  const d = Math.abs((((h1 - h2) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export function mixOklab(a, b, percentA = 50) {
  const p = percentA / 100;
  const x = oklchToOklab(a), y = oklchToOklab(b);
  return oklabToOklch(x.map((v, i) => v * p + y[i] * (1 - p)));
}

export function formatOklch([L, C, H]) {
  return `oklch(${L} ${C} ${H})`;
}

const num = (s, scale = 1) => {
  s = s.trim();
  if (s === 'none') return 0;
  return s.endsWith('%') ? (parseFloat(s) / 100) * scale : parseFloat(s);
};

export function parseCssColor(input) {
  const s = String(input).trim().toLowerCase();
  if (s === 'transparent') return { srgb: [0, 0, 0], alpha: 0 };
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const alpha = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
    return { srgb: hexToSrgb(h.length === 8 ? h.slice(0, 6) : h.length === 4 ? h.slice(0, 3) : h), alpha };
  }
  const m = s.match(/^([a-z]+)\((.*)\)$/);
  if (!m) throw new Error(`unsupported colour: ${input}`);
  const [, fn, body] = m;
  const [main, alphaPart] = body.split('/');
  let parts = main.replace(/,/g, ' ').trim().split(/\s+/);
  let alpha = alphaPart !== undefined ? num(alphaPart) : 1;
  if ((fn === 'rgb' || fn === 'rgba') && parts.length === 4) { alpha = num(parts[3]); parts = parts.slice(0, 3); }
  if (fn === 'rgb' || fn === 'rgba') {
    return { srgb: parts.map((p) => (p.endsWith('%') ? num(p) : num(p) / 255)), alpha };
  }
  if (fn === 'oklch') {
    return { srgb: oklchToSrgb([num(parts[0]), num(parts[1], 0.4), num(parts[2])]), alpha };
  }
  if (fn === 'oklab') {
    return { srgb: oklabToLinearSrgb([num(parts[0]), num(parts[1], 0.4), num(parts[2], 0.4)]).map(encode), alpha };
  }
  if (fn === 'color' && parts[0] === 'srgb') {
    return { srgb: parts.slice(1, 4).map((p) => num(p)), alpha };
  }
  throw new Error(`unsupported colour: ${input}`);
}
