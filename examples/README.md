# OpenAdapter Examples

Practical scripts and examples for using OpenAdapter's features.

## Monitoring Script

`monitor.sh` - Health monitoring and recovery script for OpenAdapter.

### Usage

**One-time check:**
```bash
./examples/monitor.sh
```

**Continuous monitoring (every 30 seconds):**
```bash
watch -n 30 ./examples/monitor.sh
```

**With API key authentication:**
```bash
ADMIN_API_KEY=your-secret-key ./examples/monitor.sh
```

**Custom server URL:**
```bash
OPENADAPTER_URL=http://localhost:3000 ./examples/monitor.sh
```

### What it does

1. Fetches server health status
2. Displays uptime, browser status, and request statistics
3. Calculates success rate
4. Offers automatic recovery if browser is unresponsive
5. Color-coded output for quick status assessment

### Requirements

- `curl` - HTTP client
- `jq` - JSON processor (install with `brew install jq` on macOS, `apt install jq` on Ubuntu)

---

## Contributing Examples

Have a useful script or integration example? We'd love to include it!

Examples we're looking for:
- Docker deployment configurations
- Systemd service files
- Monitoring integrations (Prometheus, Grafana, etc.)
- CI/CD pipeline examples
- Language-specific client libraries (Python, JavaScript, Go, etc.)

Open a PR at https://github.com/AviOfLagos/openAdapter/pulls
