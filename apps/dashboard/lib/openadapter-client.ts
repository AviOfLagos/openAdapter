/**
 * OpenAdapter Management API Client
 *
 * Client for interacting with OpenAdapter server management endpoints.
 * Provides type-safe methods for health checks, session control, and log access.
 */

export interface HealthResponse {
  status: string;
  uptime: {
    ms: number;
    human: string;
  };
  browser: {
    alive: boolean;
    lastUsed: string | null;
  };
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rateLimitHits: number;
    lastRequestTime: string | null;
  };
}

export interface StatusResponse {
  status: string;
  uptime: number;
  browserAlive: boolean;
}

export interface SessionActionResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  totalLines: number;
}

export interface ConfigResponse {
  port: number;
  environment: string;
  maxTimeout: number;
  pollInterval: number;
  sessionTimeout: number;
  largePromptThreshold: number;
}

class OpenAdapterClient {
  private baseUrl: string;
  private apiKey: string | null;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_OPENADAPTER_SERVER_URL || 'http://127.0.0.1:3001';
    this.apiKey = apiKey || process.env.OPENADAPTER_ADMIN_API_KEY || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAdapter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get comprehensive health status
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/admin/health');
  }

  /**
   * Get simple status check
   */
  async getStatus(): Promise<StatusResponse> {
    return this.request<StatusResponse>('/admin/status');
  }

  /**
   * Force browser session restart
   */
  async restartSession(): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('/admin/session/restart', {
      method: 'POST',
    });
  }

  /**
   * Trigger multi-tier session recovery
   */
  async recoverSession(): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('/admin/session/recover', {
      method: 'POST',
    });
  }

  /**
   * Navigate to new chat
   */
  async newChat(): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('/admin/session/new-chat', {
      method: 'POST',
    });
  }

  /**
   * Get recent log entries
   */
  async getLogs(lines: number = 100): Promise<LogsResponse> {
    return this.request<LogsResponse>(`/admin/logs?lines=${lines}`);
  }

  /**
   * Clear log file
   */
  async clearLogs(): Promise<SessionActionResponse> {
    return this.request<SessionActionResponse>('/admin/logs', {
      method: 'DELETE',
    });
  }

  /**
   * Get server configuration
   */
  async getConfig(): Promise<ConfigResponse> {
    return this.request<ConfigResponse>('/admin/config');
  }
}

// Export singleton instance
export const openAdapterClient = new OpenAdapterClient();

// Export class for custom instances
export { OpenAdapterClient };
