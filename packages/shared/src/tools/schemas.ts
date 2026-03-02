/**
 * packages/shared/src/tools/schemas.ts
 *
 * Type-safe tool schemas for exposing OpenAdapter's management API as AI tools.
 * Uses Zod for runtime validation (Vercel AI SDK's preferred schema library).
 *
 * Security Levels:
 * - SAFE: Can run autonomously without user confirmation
 * - CONFIRM: Requires user confirmation before execution
 * - RESTRICTED: Requires elevated permissions or admin mode
 */

import { z } from 'zod';

// ============================================================================
// Base Types & Constants
// ============================================================================

/**
 * Security level for tool execution
 */
export enum ToolSecurityLevel {
  SAFE = 'safe',           // Read-only, no side effects
  CONFIRM = 'confirm',     // Modifies state, needs confirmation
  RESTRICTED = 'restricted' // Dangerous operations, needs admin
}

/**
 * Tool execution result with typed success/error states
 */
export type ToolResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Base configuration for OpenAdapter connection
 */
export const ConnectionConfig = z.object({
  baseUrl: z.string().url().default('http://127.0.0.1:3000'),
  apiKey: z.string().optional(),
  timeout: z.number().positive().default(30000),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfig>;

// ============================================================================
// Health & Status Tools
// ============================================================================

/**
 * GET /admin/health
 * Security: SAFE - Read-only health check
 */
export const GetServerHealthTool = {
  name: 'getServerHealth',
  description: 'Check OpenAdapter server health, uptime, browser status, and request statistics. Use this to diagnose server issues or verify the server is running properly.',
  securityLevel: ToolSecurityLevel.SAFE,
  parameters: z.object({}),
  response: z.object({
    status: z.literal('ok'),
    timestamp: z.string().datetime(),
    uptime: z.object({
      ms: z.number(),
      human: z.string(),
    }),
    browser: z.object({
      alive: z.boolean(),
      contextExists: z.boolean(),
      pageExists: z.boolean(),
      lastUsed: z.string().datetime().nullable(),
      sessionAge: z.number().nullable(),
    }),
    stats: z.object({
      totalRequests: z.number(),
      successfulRequests: z.number(),
      failedRequests: z.number(),
      rateLimitHits: z.number(),
      sessionRestarts: z.number(),
      lastRequestTime: z.string().datetime().nullable(),
    }),
  }),
} as const;

export type GetServerHealthParams = z.infer<typeof GetServerHealthTool.parameters>;
export type GetServerHealthResponse = z.infer<typeof GetServerHealthTool.response>;

/**
 * GET /admin/status
 * Security: SAFE - Simple status check for monitoring
 */
export const GetServerStatusTool = {
  name: 'getServerStatus',
  description: 'Get simple server status (healthy/degraded). Lightweight check suitable for frequent monitoring or uptime checks.',
  securityLevel: ToolSecurityLevel.SAFE,
  parameters: z.object({}),
  response: z.object({
    status: z.enum(['healthy', 'degraded']),
    timestamp: z.string().datetime(),
    browser: z.enum(['online', 'offline']),
  }),
} as const;

export type GetServerStatusParams = z.infer<typeof GetServerStatusTool.parameters>;
export type GetServerStatusResponse = z.infer<typeof GetServerStatusTool.response>;

// ============================================================================
// Session Management Tools
// ============================================================================

/**
 * POST /admin/session/restart
 * Security: CONFIRM - Destructive operation, closes browser and clears state
 */
export const RestartSessionTool = {
  name: 'restartSession',
  description: 'Force a complete browser session restart. Closes the current browser, resets all session state, and clears conversation history. The browser will be re-initialized on the next request. Use when the browser is stuck, unresponsive, or you need a completely fresh session.',
  securityLevel: ToolSecurityLevel.CONFIRM,
  confirmationPrompt: 'This will close the browser and clear all session state. Continue?',
  parameters: z.object({
    reason: z.string().optional().describe('Optional reason for restart (logged)'),
  }),
  response: z.object({
    success: z.boolean(),
    message: z.string(),
    timestamp: z.string().datetime(),
  }),
} as const;

export type RestartSessionParams = z.infer<typeof RestartSessionTool.parameters>;
export type RestartSessionResponse = z.infer<typeof RestartSessionTool.response>;

/**
 * POST /admin/session/recover
 * Security: CONFIRM - Attempts multi-tier recovery, may restart browser
 */
export const RecoverSessionTool = {
  name: 'recoverSession',
  description: 'Trigger the multi-tier session recovery process. Attempts to recover an unresponsive session through progressive recovery levels: L1 (page reload) → L2 (navigate to new chat) → L3 (full browser restart) → L4 (fatal/503). Use when the browser is unresponsive but you want to attempt recovery before forcing a full restart.',
  securityLevel: ToolSecurityLevel.CONFIRM,
  confirmationPrompt: 'This will attempt to recover the session, which may restart the browser. Continue?',
  parameters: z.object({
    maxLevel: z.number().min(1).max(4).optional().describe('Maximum recovery level to attempt (1-4)'),
  }),
  response: z.discriminatedUnion('success', [
    z.object({
      success: z.literal(true),
      message: z.string(),
      timestamp: z.string().datetime(),
      recoveryLevel: z.number().optional(),
    }),
    z.object({
      success: z.literal(false),
      error: z.string(),
      timestamp: z.string().datetime(),
    }),
  ]),
} as const;

export type RecoverSessionParams = z.infer<typeof RecoverSessionTool.parameters>;
export type RecoverSessionResponse = z.infer<typeof RecoverSessionTool.response>;

/**
 * POST /admin/session/new-chat
 * Security: SAFE - Navigates to new chat, preserves browser session
 */
export const NewChatTool = {
  name: 'newChat',
  description: 'Navigate to a new Claude conversation, starting fresh context while preserving the browser session. Use when you want to start a new conversation without the overhead of restarting the entire browser.',
  securityLevel: ToolSecurityLevel.SAFE,
  parameters: z.object({}),
  response: z.object({
    success: z.boolean(),
    message: z.string(),
    timestamp: z.string().datetime(),
  }),
} as const;

export type NewChatParams = z.infer<typeof NewChatTool.parameters>;
export type NewChatResponse = z.infer<typeof NewChatTool.response>;

// ============================================================================
// Log Management Tools
// ============================================================================

/**
 * GET /admin/logs
 * Security: SAFE - Read-only log access
 */
export const GetLogsTool = {
  name: 'getLogs',
  description: 'Retrieve recent log entries from the server. Useful for debugging issues, monitoring activity, or investigating errors. Supports filtering by number of lines.',
  securityLevel: ToolSecurityLevel.SAFE,
  parameters: z.object({
    lines: z.number().positive().max(10000).default(100)
      .describe('Number of recent log lines to return (max 10000)'),
    filter: z.string().optional()
      .describe('Optional regex pattern to filter log lines'),
  }),
  response: z.object({
    totalLines: z.number(),
    returned: z.number(),
    logs: z.array(z.string()),
    filtered: z.boolean().optional(),
  }),
} as const;

export type GetLogsParams = z.infer<typeof GetLogsTool.parameters>;
export type GetLogsResponse = z.infer<typeof GetLogsTool.response>;

/**
 * DELETE /admin/logs
 * Security: CONFIRM - Destructive operation, clears all logs
 */
export const ClearLogsTool = {
  name: 'clearLogs',
  description: 'Clear the log file completely. This operation is irreversible. Use when logs have grown too large or you want to start fresh log collection.',
  securityLevel: ToolSecurityLevel.CONFIRM,
  confirmationPrompt: 'This will permanently delete all log entries. Continue?',
  parameters: z.object({
    backup: z.boolean().default(false)
      .describe('Create a timestamped backup before clearing'),
  }),
  response: z.object({
    success: z.boolean(),
    message: z.string(),
    timestamp: z.string().datetime(),
    backupPath: z.string().optional(),
  }),
} as const;

export type ClearLogsParams = z.infer<typeof ClearLogsTool.parameters>;
export type ClearLogsResponse = z.infer<typeof ClearLogsTool.response>;

// ============================================================================
// Configuration Tools
// ============================================================================

/**
 * GET /admin/config
 * Security: SAFE - Read-only configuration access
 */
export const GetConfigTool = {
  name: 'getConfig',
  description: 'Get current server configuration values including timeouts, limits, and file paths. Useful for understanding how the server is configured or debugging timeout issues.',
  securityLevel: ToolSecurityLevel.SAFE,
  parameters: z.object({}),
  response: z.object({
    port: z.number(),
    timeouts: z.object({
      maxTimeout: z.number(),
      stableInterval: z.number(),
      sessionTimeout: z.number(),
      pollInterval: z.number(),
    }),
    limits: z.object({
      largePromptThreshold: z.number(),
      maxPayloadSize: z.string(),
    }),
    paths: z.object({
      tempDir: z.string(),
      browserProfile: z.string(),
      logFile: z.string(),
    }),
  }),
} as const;

export type GetConfigParams = z.infer<typeof GetConfigTool.parameters>;
export type GetConfigResponse = z.infer<typeof GetConfigTool.response>;

// ============================================================================
// Chat Completion Tool (Main API)
// ============================================================================

/**
 * POST /v1/chat/completions
 * Security: SAFE - Main API endpoint for sending prompts to Claude
 */
export const SendChatCompletionTool = {
  name: 'sendChatCompletion',
  description: 'Send a chat completion request to Claude via OpenAdapter. Supports streaming, file attachments, and system context. This is the main API endpoint for interacting with Claude.',
  securityLevel: ToolSecurityLevel.SAFE,
  parameters: z.object({
    messages: z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.union([
          z.string(),
          z.array(
            z.discriminatedUnion('type', [
              z.object({
                type: z.literal('text'),
                text: z.string(),
              }),
              z.object({
                type: z.literal('image_url'),
                image_url: z.object({
                  url: z.string(), // base64 data URL or HTTP(S) URL
                  detail: z.enum(['auto', 'low', 'high']).optional(),
                }),
              }),
            ])
          ),
        ]),
      })
    ).min(1).describe('Array of chat messages in OpenAI format'),
    stream: z.boolean().default(false)
      .describe('Whether to stream the response'),
    model: z.string().default('claude-3-sonnet')
      .describe('Model identifier (passed through but not used by OpenAdapter)'),
    temperature: z.number().min(0).max(2).optional()
      .describe('Temperature parameter (passed through but not used by OpenAdapter)'),
    max_tokens: z.number().positive().optional()
      .describe('Max tokens (passed through but not used by OpenAdapter)'),
  }),
  response: z.discriminatedUnion('stream', [
    // Non-streaming response
    z.object({
      stream: z.literal(false),
      id: z.string(),
      object: z.literal('chat.completion'),
      created: z.number(),
      model: z.string(),
      choices: z.array(
        z.object({
          index: z.number(),
          message: z.object({
            role: z.literal('assistant'),
            content: z.string(),
          }),
          finish_reason: z.enum(['stop', 'length', 'content_filter']),
        })
      ),
      usage: z.object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        total_tokens: z.number(),
      }),
    }),
    // Streaming response (SSE format)
    z.object({
      stream: z.literal(true),
      chunks: z.array(
        z.object({
          id: z.string(),
          object: z.literal('chat.completion.chunk'),
          created: z.number(),
          model: z.string(),
          choices: z.array(
            z.object({
              index: z.number(),
              delta: z.object({
                role: z.literal('assistant').optional(),
                content: z.string().optional(),
              }),
              finish_reason: z.enum(['stop', 'length', 'content_filter']).nullable(),
            })
          ),
        })
      ),
    }),
  ]),
} as const;

export type SendChatCompletionParams = z.infer<typeof SendChatCompletionTool.parameters>;
export type SendChatCompletionResponse = z.infer<typeof SendChatCompletionTool.response>;

// ============================================================================
// Tool Registry & Helpers
// ============================================================================

/**
 * Complete registry of all available tools
 */
export const ALL_TOOLS = {
  // Health & Status
  getServerHealth: GetServerHealthTool,
  getServerStatus: GetServerStatusTool,

  // Session Management
  restartSession: RestartSessionTool,
  recoverSession: RecoverSessionTool,
  newChat: NewChatTool,

  // Log Management
  getLogs: GetLogsTool,
  clearLogs: ClearLogsTool,

  // Configuration
  getConfig: GetConfigTool,

  // Chat Completion
  sendChatCompletion: SendChatCompletionTool,
} as const;

/**
 * Tool names as a union type
 */
export type ToolName = keyof typeof ALL_TOOLS;

/**
 * Get tools by security level
 */
export function getToolsBySecurityLevel(level: ToolSecurityLevel): ToolName[] {
  return (Object.entries(ALL_TOOLS) as [ToolName, typeof ALL_TOOLS[ToolName]][])
    .filter(([_, tool]) => tool.securityLevel === level)
    .map(([name]) => name);
}

/**
 * Safe tools that can run autonomously
 */
export const SAFE_TOOLS = getToolsBySecurityLevel(ToolSecurityLevel.SAFE);

/**
 * Tools that require user confirmation
 */
export const CONFIRM_TOOLS = getToolsBySecurityLevel(ToolSecurityLevel.CONFIRM);

/**
 * Tools that require elevated permissions
 */
export const RESTRICTED_TOOLS = getToolsBySecurityLevel(ToolSecurityLevel.RESTRICTED);

/**
 * Check if a tool requires confirmation
 */
export function requiresConfirmation(toolName: ToolName): boolean {
  const tool = ALL_TOOLS[toolName];
  return tool.securityLevel === ToolSecurityLevel.CONFIRM ||
         tool.securityLevel === ToolSecurityLevel.RESTRICTED;
}

/**
 * Get confirmation prompt for a tool
 */
export function getConfirmationPrompt(toolName: ToolName): string | null {
  const tool = ALL_TOOLS[toolName];
  return 'confirmationPrompt' in tool ? tool.confirmationPrompt : null;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard error response format (OpenAI-compatible)
 */
export const ErrorResponse = z.object({
  error: z.object({
    message: z.string(),
    type: z.string(),
    code: z.string().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

/**
 * Common error codes
 */
export enum ErrorCode {
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  RATE_LIMIT = 'rate_limit_exceeded',
  BROWSER_OFFLINE = 'browser_offline',
  SESSION_ERROR = 'session_error',
  TIMEOUT = 'timeout',
  VALIDATION_ERROR = 'validation_error',
}

/**
 * Create a standard error response
 */
export function createErrorResponse(
  message: string,
  type: string = 'api_error',
  code?: ErrorCode
): ErrorResponse {
  return {
    error: {
      message,
      type,
      ...(code && { code }),
    },
  };
}

// ============================================================================
// Vercel AI SDK Integration Helpers
// ============================================================================

/**
 * Convert tool schema to Vercel AI SDK format
 */
export function toVercelAITool<T extends typeof ALL_TOOLS[ToolName]>(
  tool: T
): {
  description: string;
  parameters: T['parameters'];
} {
  return {
    description: tool.description,
    parameters: tool.parameters,
  };
}

/**
 * Convert all tools to Vercel AI SDK format
 */
export function getVercelAITools() {
  return Object.entries(ALL_TOOLS).reduce((acc, [name, tool]) => {
    acc[name] = toVercelAITool(tool);
    return acc;
  }, {} as Record<ToolName, ReturnType<typeof toVercelAITool>>);
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for successful tool result
 */
export function isSuccess<T>(result: ToolResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard for error tool result
 */
export function isError<T>(result: ToolResult<T>): result is { success: false; error: string; code?: string } {
  return result.success === false;
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Enums
  ToolSecurityLevel,
  ErrorCode,

  // Types
  type ToolResult,
  type ToolName,

  // Tool Definitions
  GetServerHealthTool,
  GetServerStatusTool,
  RestartSessionTool,
  RecoverSessionTool,
  NewChatTool,
  GetLogsTool,
  ClearLogsTool,
  GetConfigTool,
  SendChatCompletionTool,

  // Registry
  ALL_TOOLS,
  SAFE_TOOLS,
  CONFIRM_TOOLS,
  RESTRICTED_TOOLS,

  // Helpers
  getToolsBySecurityLevel,
  requiresConfirmation,
  getConfirmationPrompt,
  createErrorResponse,
  toVercelAITool,
  getVercelAITools,
  isSuccess,
  isError,
};
