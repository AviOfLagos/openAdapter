/**
 * packages/shared/src/tools/index.ts
 *
 * Main entry point for OpenAdapter tool schemas and handlers.
 * Exports everything needed for Vercel AI SDK integration.
 */

// Export all schemas
export * from './schemas';

// Export all handlers
export * from './handlers';

// Export examples (for reference/documentation)
export * as examples from './examples';

// Re-export commonly used items for convenience
export {
  // Tool definitions
  ALL_TOOLS,
  GetServerHealthTool,
  GetServerStatusTool,
  RestartSessionTool,
  RecoverSessionTool,
  NewChatTool,
  GetLogsTool,
  ClearLogsTool,
  GetConfigTool,
  SendChatCompletionTool,

  // Tool registry helpers
  SAFE_TOOLS,
  CONFIRM_TOOLS,
  RESTRICTED_TOOLS,
  getToolsBySecurityLevel,
  requiresConfirmation,
  getConfirmationPrompt,

  // Vercel AI SDK integration
  getVercelAITools,
  toVercelAITool,

  // Type guards
  isSuccess,
  isError,

  // Error handling
  createErrorResponse,
  ErrorCode,
  ToolSecurityLevel,
} from './schemas';

export {
  // Main factory
  createToolHandlers,

  // Client
  OpenAdapterClient,

  // Middleware
  withErrorBoundary,
  withRetry,
  withLogging,
} from './handlers';

// Default export for convenience
export { createToolHandlers as default } from './handlers';
