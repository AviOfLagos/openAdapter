# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenAdapter, please report it responsibly.

**Do NOT open a public issue for security vulnerabilities.**

Instead, use one of these methods:

1. **GitHub Security Advisory** (preferred): Go to the [Security tab](https://github.com/AviOfLagos/openAdapter/security/advisories/new) and create a private advisory.
2. **Email:** Contact the maintainers directly via their GitHub profile.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** Within 72 hours
- **Assessment:** Within 1 week
- **Fix/Disclosure:** Depends on severity, but we aim for 30 days

## Security Considerations

OpenAdapter has some inherent security properties to be aware of:

- **Browser session:** `.browser-profile/` contains your Claude login session. Never commit or share this directory.
- **Management API:** The `/admin/*` endpoints can restart sessions and clear logs. Set `ADMIN_API_KEY` if exposing beyond localhost.
- **No authentication by default:** The chat completions endpoint has no auth. It's designed for local use only. Do not expose to the public internet without adding authentication.
- **Temp files:** `temp_uploads/` may contain uploaded files. These are cleaned up but could briefly contain sensitive data.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest on `main` | Yes |
| Feature branches | Best effort |
