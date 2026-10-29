// Response headers shared by the local server (server.js) and the packaged Worker (build.mjs).
//
// The application page loads only its own modules and stylesheets: no inline scripts, no inline
// event handlers and no third-party origins. That makes a strict policy possible. A script-src
// without 'unsafe-inline' is what contains an injected <img onerror> or javascript: URL, so any
// markup that slips past rendering cannot run. Inline style attributes are used widely, hence
// 'unsafe-inline' for styles only. The mobile preview frames the app itself, so framing is limited
// to the same origin rather than denied.
export const APP_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

export const APP_SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': APP_CONTENT_SECURITY_POLICY,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});

// The sign-in page needs nothing but its own inline style and a same-origin form post.
export const SIGN_IN_SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
});

const COMPRESSIBLE = /\.(?:html|js|css|json|svg|txt|md)$/i;
export const isCompressible = (pathname) => COMPRESSIBLE.test(pathname);
