#!/usr/bin/env python3
"""
OpenAdapter Health Monitor - Python Example

A simple Python script demonstrating how to interact with OpenAdapter's
management API programmatically.

Usage:
    python3 examples/python_monitor.py

With API key:
    ADMIN_API_KEY=your-key python3 examples/python_monitor.py

Requirements:
    pip install requests
"""

import os
import sys
import time
from typing import Optional
import requests


class OpenAdapterMonitor:
    def __init__(self, base_url: str = "http://127.0.0.1:3000", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key

    def _headers(self) -> dict:
        """Build request headers with optional API key"""
        headers = {}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        return headers

    def get_health(self) -> dict:
        """Fetch comprehensive health status"""
        response = requests.get(f'{self.base_url}/admin/health', headers=self._headers())
        response.raise_for_status()
        return response.json()

    def get_status(self) -> dict:
        """Fetch simple status check"""
        response = requests.get(f'{self.base_url}/admin/status', headers=self._headers())
        response.raise_for_status()
        return response.json()

    def restart_session(self) -> dict:
        """Force browser session restart"""
        response = requests.post(
            f'{self.base_url}/admin/session/restart',
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def recover_session(self) -> dict:
        """Trigger multi-tier session recovery"""
        response = requests.post(
            f'{self.base_url}/admin/session/recover',
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def new_chat(self) -> dict:
        """Navigate to new chat"""
        response = requests.post(
            f'{self.base_url}/admin/session/new-chat',
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def get_logs(self, lines: int = 100) -> dict:
        """Retrieve recent log entries"""
        response = requests.get(
            f'{self.base_url}/admin/logs',
            params={'lines': lines},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def clear_logs(self) -> dict:
        """Clear log file"""
        response = requests.delete(
            f'{self.base_url}/admin/logs',
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def get_config(self) -> dict:
        """Get server configuration"""
        response = requests.get(
            f'{self.base_url}/admin/config',
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()


def format_uptime(ms: int) -> str:
    """Convert milliseconds to human-readable format"""
    seconds = ms // 1000
    minutes = seconds // 60
    hours = minutes // 60
    days = hours // 24

    if days > 0:
        return f"{days}d {hours % 24}h {minutes % 60}m"
    elif hours > 0:
        return f"{hours}h {minutes % 60}m"
    elif minutes > 0:
        return f"{minutes}m {seconds % 60}s"
    else:
        return f"{seconds}s"


def print_health_report(health: dict):
    """Print formatted health report"""
    print("\n" + "="*50)
    print("OpenAdapter Health Report")
    print("="*50)

    print(f"\nStatus:       {health['status'].upper()}")
    print(f"Uptime:       {health['uptime']['human']}")

    browser = health['browser']
    browser_status = "✓ Online" if browser['alive'] else "✗ Offline"
    print(f"Browser:      {browser_status}")

    if browser['lastUsed']:
        print(f"Last used:    {browser['lastUsed']}")

    stats = health['stats']
    total = stats['totalRequests']
    success = stats['successfulRequests']
    failed = stats['failedRequests']
    rate_limits = stats['rateLimitHits']

    print("\n" + "-"*50)
    print("Request Statistics")
    print("-"*50)

    print(f"Total requests:    {total}")
    print(f"Successful:        {success}")
    print(f"Failed:            {failed}")
    print(f"Rate limited:      {rate_limits}")

    if total > 0:
        success_rate = (success / total) * 100
        print(f"Success rate:      {success_rate:.1f}%")
    else:
        print(f"Success rate:      N/A")

    if stats['lastRequestTime']:
        print(f"\nLast request: {stats['lastRequestTime']}")

    print("\n" + "="*50 + "\n")


def main():
    # Get configuration from environment
    base_url = os.getenv('OPENADAPTER_URL', 'http://127.0.0.1:3000')
    api_key = os.getenv('ADMIN_API_KEY')

    # Initialize monitor
    monitor = OpenAdapterMonitor(base_url, api_key)

    try:
        # Fetch and display health
        health = monitor.get_health()
        print_health_report(health)

        # Check if browser is unhealthy
        if not health['browser']['alive']:
            print("⚠️  WARNING: Browser is not responding!")
            response = input("\nAttempt session recovery? (y/n): ")

            if response.lower() == 'y':
                print("Triggering recovery...")
                try:
                    result = monitor.recover_session()
                    if result.get('success'):
                        print(f"✓ Recovery successful: {result['message']}")
                    else:
                        print(f"✗ Recovery failed: {result.get('error', 'Unknown error')}")
                except requests.exceptions.HTTPError as e:
                    print(f"✗ Recovery failed with HTTP {e.response.status_code}")
                    print("\nTry restarting the browser session:")
                    print(f"  curl -X POST {base_url}/admin/session/restart")

    except requests.exceptions.ConnectionError:
        print(f"✗ Error: Could not connect to OpenAdapter at {base_url}")
        print("Make sure the server is running: npm start")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print("✗ Error: Unauthorized - invalid or missing API key")
            print("Set ADMIN_API_KEY environment variable or disable authentication")
        else:
            print(f"✗ HTTP Error: {e.response.status_code}")
            print(e.response.text)
        sys.exit(1)


if __name__ == '__main__':
    main()
