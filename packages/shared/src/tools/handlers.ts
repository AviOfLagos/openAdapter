/**
 * packages/shared/src/tools/handlers.ts
 *
 * Tool execution handlers for OpenAdapter management API.
 * Implements the actual HTTP calls to the OpenAdapter server.
 *
 * Each handler:
 * - Validates input parameters using Zod schemas
 * - Makes HTTP request to OpenAdapter
 * - Handles errors and returns typed results
 * - Supports authentication via API key
 */

import type {
  GetServerHealthParams,
  GetServerHealthResponse,
  GetServerStatusParams,
  GetServerStatusResponse,
  RestartSessionParams,
  RestartSessionResponse,
  RecoverSessionParams,
  RecoverSessionResponse,
  NewChatParams,
  NewChatResponse,
  GetLogsParams,
  GetLogsResponse,
  ClearLogsParams,
  ClearLogsResponse,
  GetConfigParams,
  GetConfigResponse,
  SendChatCompletionParams,
  SendChatCompletionResponse,
  ToolResult,
  ConnectionConfig,
  ErrorResponse,
} from './schemas';

import {
  GetServerHealthTool,
  GetServerStatusTool,
  RestartSessionTool,
  RecoverSessionTool,
  NewChatTool,
  GetLogsTool,
  ClearLogsTool,
  GetConfigTool,
  SendChatCompletionTool,
  ErrorCode,
  createErrorResponse,
} from './schemas';

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * Base HTTP client for OpenAdapter API calls
 */
class OpenAdapterClient {
  constructor(private config: ConnectionConfig) {}

  /**
   * Build request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ToolResult<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        // Handle specific HTTP status codes
        if (response.status === 401) {
          return {
            success: false,
            error: 'Unauthorized - invalid or missing API key',
            code: ErrorCode.UNAUTHORIZED,
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            error: errorData?.error?.message || 'Rate limit exceeded',
            code: ErrorCode.RATE_LIMIT,
          };
        }

        if (response.status === 503) {
          return {
            success: false,
            error: errorData?.error?.message || 'Browser offline or session recovery failed',
            code: ErrorCode.BROWSER_OFFLINE,
          };
        }

        return {
          success: false,
          error: errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          code: ErrorCode.SERVER_ERROR,
        };
      }

      const data = await response.json();
      return { success: true, data: data as T };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: `Request timeout after ${this.config.timeout}ms`,
            code: ErrorCode.TIMEOUT,
          };
        }

        return {
          success: false,
          error: error.message,
          code: ErrorCode.SERVER_ERROR,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred',
        code: ErrorCode.SERVER_ERROR,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string): Promise<ToolResult<T>> {
    return this.request<T>('GET', path);
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown): Promise<ToolResult<T>> {
    return this.request<T>('POST', path, body);
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<ToolResult<T>> {
    return this.request<T>('DELETE', path);
  }
}

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Create a tool handler factory with configuration
 */
export function createToolHandlers(config: ConnectionConfig) {
  const client = new OpenAdapterClient(config);

  return {
    /**
     * Get server health status
     */
    async getServerHealth(
      params: GetServerHealthParams
    ): Promise<ToolResult<GetServerHealthResponse>> {
      // Validate params
      const parsed = GetServerHealthTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      return client.get<GetServerHealthResponse>('/admin/health');
    },

    /**
     * Get simple server status
     */
    async getServerStatus(
      params: GetServerStatusParams
    ): Promise<ToolResult<GetServerStatusResponse>> {
      const parsed = GetServerStatusTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      return client.get<GetServerStatusResponse>('/admin/status');
    },

    /**
     * Restart browser session
     */
    async restartSession(
      params: RestartSessionParams
    ): Promise<ToolResult<RestartSessionResponse>> {
      const parsed = RestartSessionTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      return client.post<RestartSessionResponse>('/admin/session/restart', parsed.data);
    },

    /**
     * Trigger session recovery
     */
    async recoverSession(
      params: RecoverSessionParams
    ): Promise<ToolResult<RecoverSessionResponse>> {
      const parsed = RecoverSessionTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      return client.post<RecoverSessionResponse>('/admin/session/recover', parsed.data);
    },

    /**
     * Navigate to new chat
     */
    async newChat(
      params: NewChatParams
    ): Promise<ToolResult<NewChatResponse>> {
      const parsed = NewChatTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      return client.post<NewChatResponse>('/admin/session/new-chat');
    },

    /**
     * Get server logs
     */
    async getLogs(
      params: GetLogsParams
    ): Promise<ToolResult<GetLogsResponse>> {
      const parsed = GetLogsTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      const queryParams = new URLSearchParams();
      if (parsed.data.lines) {
        queryParams.set('lines', parsed.data.lines.toString());
      }

      const result = await client.get<GetLogsResponse>(
        `/admin/logs?${queryParams.toString()}`
      );

      // Apply client-side filtering if requested
      if (result.success && parsed.data.filter) {
        try {
          const regex = new RegExp(parsed.data.filter);
          const filteredLogs = result.data.logs.filter(line => regex.test(line));
          return {
            success: true,
            data: {
              ...result.data,
              logs: filteredLogs,
              returned: filteredLogs.length,
              filtered: true,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: `Invalid regex pattern: ${error instanceof Error ? error.message : 'unknown error'}`,
            code: ErrorCode.VALIDATION_ERROR,
          };
        }
      }

      return result;
    },

    /**
     * Clear server logs
     */
    async clearLogs(
      params: ClearLogsParams
    ): Promise<ToolResult<ClearLogsResponse>> {
      const parsed = ClearLogsTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      // Note: Backup functionality would need to be implemented server-side
      // or handled by the client before making the delete request
      if (parsed.data.backup) {
        // TODO: Implement backup logic
        console.warn('Backup functionality not yet implemented');
      }

      return client.delete<ClearLogsResponse>('/admin/logs');
    },

    /**
     * Get server configuration
     */
    async getConfig(
      params: GetConfigParams
    ): Promise<ToolResult<GetConfigResponse>> {
      const parsed = GetConfigTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      return client.get<GetConfigResponse>('/admin/config');
    },

    /**
     * Send chat completion request
     */
    async sendChatCompletion(
      params: SendChatCompletionParams
    ): Promise<ToolResult<SendChatCompletionResponse>> {
      const parsed = SendChatCompletionTool.parameters.safeParse(params);
      if (!parsed.success) {
        return {
          success: false,
          error: `Validation error: ${parsed.error.message}`,
          code: ErrorCode.VALIDATION_ERROR,
        };
      }

      // For streaming responses, we need special handling
      if (parsed.data.stream) {
        // Streaming would require Server-Sent Events (SSE) handling
        // This is a simplified implementation
        return {
          success: false,
          error: 'Streaming not yet implemented in handler',
          code: ErrorCode.SERVER_ERROR,
        };
      }

      return client.post<SendChatCompletionResponse>('/v1/chat/completions', parsed.data);
    },
  };
}

// ============================================================================
// Convenience Types
// ============================================================================

/**
 * Tool handlers type
 */
export type ToolHandlers = ReturnType<typeof createToolHandlers>;

/**
 * Handler function type
 */
export type HandlerFunction<P = unknown, R = unknown> = (
  params: P
) => Promise<ToolResult<R>>;

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Wrap handler with error boundary
 */
export function withErrorBoundary<P, R>(
  handler: HandlerFunction<P, R>
): HandlerFunction<P, R> {
  return async (params: P): Promise<ToolResult<R>> => {
    try {
      return await handler(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.SERVER_ERROR,
      };
    }
  };
}

/**
 * Retry handler with exponential backoff
 */
export function withRetry<P, R>(
  handler: HandlerFunction<P, R>,
  maxRetries = 3,
  initialDelay = 1000
): HandlerFunction<P, R> {
  return async (params: P): Promise<ToolResult<R>> => {
    let lastError: ToolResult<R> | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await handler(params);

      if (result.success) {
        return result;
      }

      lastError = result;

      // Don't retry on validation errors or auth errors
      if (result.code === ErrorCode.VALIDATION_ERROR ||
          result.code === ErrorCode.UNAUTHORIZED) {
        return result;
      }

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return lastError || {
      success: false,
      error: 'All retry attempts failed',
      code: ErrorCode.SERVER_ERROR,
    };
  };
}

/**
 * Add logging to handler
 */
export function withLogging<P, R>(
  handler: HandlerFunction<P, R>,
  handlerName: string
): HandlerFunction<P, R> {
  return async (params: P): Promise<ToolResult<R>> => {
    console.log(`[${handlerName}] Called with params:`, params);
    const startTime = Date.now();

    const result = await handler(params);

    const duration = Date.now() - startTime;
    console.log(`[${handlerName}] Completed in ${duration}ms:`, {
      success: result.success,
      ...(result.success ? {} : { error: result.error, code: result.code }),
    });

    return result;
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  OpenAdapterClient,
  createToolHandlers,
  withErrorBoundary,
  withRetry,
  withLogging,
};
