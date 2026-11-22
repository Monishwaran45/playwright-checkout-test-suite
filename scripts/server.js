const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
// Root directory of the repository (parent of scripts/)
const PUBLIC_DIR = path.resolve(__dirname, '..');

// Whitelisted static MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=UTF-8',
  '.ico': 'image/x-icon'
};

// Strict enterprise HTTP security headers
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// Sensitive files and directories blocked from static serving
const BLOCKED_NAMES = new Set([
  'server.js',
  'package.json',
  'package-lock.json',
  'playwright.config.js',
  'README.md',
  'TEST_PLAN.md',
  'vercel.json'
]);

const BLOCKED_PREFIXES = ['.', 'tests', 'node_modules', 'playwright-report', 'test-results', 'scripts'];

const server = http.createServer((req, res) => {
  // 1. HTTP Method Restriction (Allow only GET and HEAD)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=UTF-8',
      'Allow': 'GET, HEAD'
    });
    res.end('405 Method Not Allowed');
    return;
  }

  // 2. URI Decoding & Path Traversal Prevention
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(req.url.split('?')[0]);
  } catch (err) {
    res.writeHead(400, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=UTF-8'
    });
    res.end('400 Bad Request');
    return;
  }

  // Enforce URL length limit to prevent buffer abuse
  if (req.url.length > 2048) {
    res.writeHead(414, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=UTF-8'
    });
    res.end('414 URI Too Long');
    return;
  }

  // Route defaults
  let reqPath = decodedUrl;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/favicon.ico') {
    reqPath = '/favicon.svg';
  }

  // Resolve absolute path and enforce jail to PUBLIC_DIR
  const resolvedPath = path.resolve(PUBLIC_DIR, '.' + reqPath);
  const relativeFromRoot = path.relative(PUBLIC_DIR, resolvedPath);

  // Jail check: if path attempts to escape the root directory
  if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    res.writeHead(403, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=UTF-8'
    });
    res.end('403 Forbidden');
    return;
  }

  // Check against blocked sensitive files or hidden directories
  const pathSegments = relativeFromRoot.split(path.sep);
  const isBlocked = pathSegments.some(segment => {
    return BLOCKED_PREFIXES.some(prefix => segment.startsWith(prefix)) || BLOCKED_NAMES.has(segment);
  });

  if (isBlocked) {
    res.writeHead(403, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=UTF-8'
    });
    res.end('403 Forbidden');
    return;
  }

  // Verify file existence and type
  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, {
        ...SECURITY_HEADERS,
        'Content-Type': 'text/plain; charset=UTF-8'
      });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      res.writeHead(403, {
        ...SECURITY_HEADERS,
        'Content-Type': 'text/plain; charset=UTF-8'
      });
      res.end('403 Forbidden: File type not permitted');
      return;
    }

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(resolvedPath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, {
          ...SECURITY_HEADERS,
          'Content-Type': 'text/plain; charset=UTF-8'
        });
        res.end('500 Internal Server Error');
      }
    });
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`QuickStore server listening on http://localhost:${PORT}`);
  });
}

module.exports = server;
