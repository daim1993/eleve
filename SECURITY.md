# Security notes

- Passwords are salted + scrypt-hashed; never stored in plaintext.
- Auth tokens are HMAC-signed (set a strong `SECRET` env var in production).
- API has per-IP rate limiting and JSON body size limits; basic security headers are set (nosniff, frame SAMEORIGIN, referrer policy, permissions policy).
- **Before production:** serve over HTTPS, set `SECRET` and `ADMIN_PASSWORD` via env (never defaults), add a Content-Security-Policy, move image uploads to object storage (not base64 in the DB), add email verification + password reset, and run dependency/supply-chain scans (`npm audit`). Report issues to creative@sentientbyelysian.com.
