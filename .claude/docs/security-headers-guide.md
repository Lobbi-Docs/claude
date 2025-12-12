# Security Headers Quick Reference Guide

## Overview

Security headers have been implemented to protect against:
- XSS (Cross-Site Scripting) attacks
- Clickjacking attacks
- MIME type sniffing vulnerabilities
- Protocol downgrade attacks
- Information leakage
- Unauthorized feature access

## Implementation Locations

### 1. Next.js Config (`next.config.mjs`)
Global headers applied to all routes via Next.js configuration.

\`\`\`javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: securityHeaders,
    },
  ]
}
\`\`\`

### 2. Middleware (`middleware.ts`)
Runtime headers with authentication and context awareness.

\`\`\`typescript
const securityHeaders = getSecurityHeaders({
  strictCSP: false,
  frameProtection: true,
  forceHTTPS: process.env.NODE_ENV === 'production',
})
\`\`\`

### 3. Security Module (`lib/security/headers.ts`)
Reusable header utilities for API routes and custom responses.

\`\`\`typescript
import { getSecurityHeaders, getAPIHeaders } from '@/lib/security/headers'
\`\`\`

## Headers Reference

| Header | Value | Purpose |
|--------|-------|---------|
| X-DNS-Prefetch-Control | on | Enable DNS prefetching |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload | Force HTTPS (2 years) |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | Enable XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Control referer info |
| Permissions-Policy | camera=(), microphone=()... | Disable features |
| Content-Security-Policy | (see below) | XSS protection |

## Content Security Policy (CSP)

\`\`\`
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https:;
font-src 'self';
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
\`\`\`

### CSP Directives Explained

- **default-src 'self'**: Only allow same-origin by default
- **script-src**: Allow scripts (unsafe-inline/eval for Next.js)
- **style-src**: Allow styles (unsafe-inline for CSS-in-JS)
- **img-src**: Allow images from any HTTPS source
- **font-src**: Only allow same-origin fonts
- **connect-src**: Allow Supabase API and WebSocket
- **frame-ancestors 'none'**: Prevent iframe embedding
- **base-uri 'self'**: Restrict `<base>` tag URLs
- **form-action 'self'**: Restrict form submissions

## Usage Examples

### In API Routes

\`\`\`typescript
import { getAPIHeaders } from '@/lib/security/headers'

export async function GET(request: Request) {
  const headers = getAPIHeaders(['https://app.example.com'])

  return new Response(JSON.stringify({ data: 'secure' }), {
    status: 200,
    headers,
  })
}
\`\`\`

### With Custom CORS

\`\`\`typescript
import { getCORSHeaders, getSecurityHeaders } from '@/lib/security/headers'

const headers = {
  ...getSecurityHeaders(),
  ...getCORSHeaders(['https://trusted-domain.com']),
}
\`\`\`

### Production vs Development

\`\`\`typescript
// Enable HSTS only in production
const headers = getSecurityHeaders({
  forceHTTPS: process.env.NODE_ENV === 'production',
  strictCSP: true,
  frameProtection: true,
})
\`\`\`

## Testing Headers

### Browser DevTools
1. Open DevTools (F12)
2. Network tab → Refresh page
3. Click document request
4. Check Response Headers

### curl Command
\`\`\`bash
curl -I http://localhost:3000
\`\`\`

### Online Tools
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

## Common Issues & Solutions

### Issue: External images not loading
**Solution**: Images are allowed from all HTTPS sources via `img-src 'self' blob: data: https:`

### Issue: Third-party scripts blocked
**Solution**: Add trusted domain to CSP in `next.config.mjs`:
\`\`\`javascript
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://trusted-cdn.com;
\`\`\`

### Issue: Styles not applying
**Solution**: Already using `'unsafe-inline'` for Next.js compatibility

### Issue: API calls failing
**Solution**: Add domain to `connect-src` in CSP:
\`\`\`javascript
connect-src 'self' https://*.supabase.co https://api.example.com;
\`\`\`

### Issue: HSTS warnings in dev
**Solution**: HSTS is automatically disabled in development mode

## Adding New Domains

### For Scripts
\`\`\`javascript
// next.config.mjs
const ContentSecurityPolicy = `
  ...
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://analytics.example.com;
  ...
`
\`\`\`

### For APIs
\`\`\`javascript
connect-src 'self' https://*.supabase.co https://api.newservice.com;
\`\`\`

### For Fonts
\`\`\`javascript
font-src 'self' https://fonts.googleapis.com;
\`\`\`

## Security Checklist

- [x] XSS Protection enabled
- [x] Clickjacking prevention (X-Frame-Options)
- [x] MIME sniffing blocked
- [x] HTTPS enforced (production)
- [x] Content Security Policy configured
- [x] Referrer policy set
- [x] Permissions policy restricts features
- [x] DNS prefetch enabled
- [x] CORS configured for API routes

## Monitoring

### CSP Violations
To monitor CSP violations, add reporting endpoint:

\`\`\`javascript
// next.config.mjs
const ContentSecurityPolicy = `
  ...
  report-uri /api/csp-report;
`
\`\`\`

\`\`\`typescript
// app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json()
  console.log('CSP Violation:', report)
  return new Response('OK', { status: 200 })
}
\`\`\`

## Best Practices

1. Test headers in development before deploying
2. Use browser DevTools to verify headers
3. Run security audits regularly
4. Document any CSP exceptions
5. Keep headers updated with security standards
6. Monitor CSP violation reports
7. Use HTTPS everywhere in production

## References

- [Next.js Security Headers Guide](C:\Users\MarkusAhling\dev\new-alpa-1.4\Alpha-1.4\SECURITY-HEADERS.md)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)

## Files Modified

- `next.config.mjs` - Global security headers configuration
- `middleware.ts` - Already had security headers integration
- `lib/security/headers.ts` - Enhanced with comprehensive headers
- `SECURITY-HEADERS.md` - Detailed documentation
- `.claude/docs/security-headers-guide.md` - Quick reference (this file)
