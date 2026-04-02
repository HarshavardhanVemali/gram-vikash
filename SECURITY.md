# SECURITY.md — Gram Vikash Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ Active |
| Any tagged release | ✅ Active |
| Feature branches | ⚠️ Best-effort |

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security issue, follow responsible disclosure:

1. **Email:** Send a detailed report to **security@gramvikash.in** (or the repository owner's email listed in the GitHub profile).
2. **Include in your report:**
   - A clear description of the vulnerability.
   - Steps to reproduce (proof-of-concept code, screenshots, or curl commands).
   - Potential impact assessment.
   - Your suggested fix (optional but appreciated).
3. **Response SLA:** You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 business days**.
4. **Disclosure:** We request a **90-day embargo** before any public disclosure (coordinated disclosure).

---

## Security Best Practices for Deployers

### ⚠️ Before Deploying to Production

- [ ] **Replace** the default `SECRET_KEY` in `gramvikash_api/.env` — generate a strong one
- [ ] **Set** `DEBUG=False` in the backend `.env`
- [ ] **Restrict** `ALLOWED_HOSTS` to your actual domain(s)
- [ ] **Rotate** all API keys listed in `.env.example` from their development values
- [ ] **Never commit** `.env` files — they are gitignored but confirm with `git status`
- [ ] **Never commit** `firebase_admin_sdk.json` — store as a GitHub Actions secret in CI
- [ ] **Enable** Postgres SSL (`?sslmode=require`) in production `DATABASE_URL`
- [ ] **Set up** CORS correctly — change `CORS_ALLOW_ALL_ORIGINS=True` to a whitelist

### 🔐 Secrets Management

| Secret | How to manage |
|--------|--------------|
| Django `SECRET_KEY` | Strong random string, never reuse, rotate annually |
| `GEMINI_API_KEY` | Restrict by IP/referrer in Google AI Studio |
| `AWS_SECRET_ACCESS_KEY` | Use IAM roles with least-privilege S3 permissions |
| `firebase_admin_sdk.json` | Store in GitHub Actions secret as base64-encoded string |
| Database password | Use a password manager, rotate quarterly |
| Ngrok authtoken | Store locally only, never commit `ngrok.yml` |

---

## Known Security Considerations

- The Django API currently runs with `CORS_ALLOW_ALL_ORIGINS = True` for development convenience. This **must** be restricted in production.
- The app uses Firebase OTP-based phone number authentication — ensure Firebase App Check is enabled in production.
- Audio data streamed to Gemini Live is processed by Google's API; review Google's data retention policies for your jurisdiction.

---

## Attribution

We sincerely thank security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in release notes (unless they prefer anonymity).
