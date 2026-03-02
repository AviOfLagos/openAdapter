/**
 * packages/shared/src/tools/__tests__/schemas.test.ts
 *
 * Unit tests for tool schemas validation and type safety.
 * Uses Vitest for testing (can be adapted to Jest or Node test runner).
 */

import { describe, it, expect } from 'vitest';
import {
  GetServerHealthTool,
  GetServerStatusTool,
  RestartSessionTool,
  GetLogsTool,
  SendChatCompletionTool,
  getToolsBySecurityLevel,
  requiresConfirmation,
  getConfirmationPrompt,
  isSuccess,
  isError,
  ToolSecurityLevel,
  ErrorCode,
  createErrorResponse,
  ALL_TOOLS,
  SAFE_TOOLS,
  CONFIRM_TOOLS,
} from '../schemas';

describe('Tool Schema Validation', () => {
  describe('GetServerHealthTool', () => {
    it('should validate empty parameters', () => {
      const result = GetServerHealthTool.parameters.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should have correct security level', () => {
      expect(GetServerHealthTool.securityLevel).toBe(ToolSecurityLevel.SAFE);
    });

    it('should validate response schema', () => {
      const mockResponse = {
        status: 'ok' as const,
        timestamp: '2026-03-02T10:30:00.000Z',
        uptime: {
          ms: 3600000,
          human: '1h 0m',
        },
        browser: {
          alive: true,
          contextExists: true,
          pageExists: true,
          lastUsed: '2026-03-02T10:25:00.000Z',
          sessionAge: 300000,
        },
        stats: {
          totalRequests: 42,
          successfulRequests: 38,
          failedRequests: 2,
          rateLimitHits: 2,
          sessionRestarts: 1,
          lastRequestTime: '2026-03-02T10:29:00.000Z',
        },
      };

      const result = GetServerHealthTool.response.safeParse(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid response', () => {
      const invalidResponse = {
        status: 'invalid',
        timestamp: 'not-a-date',
      };

      const result = GetServerHealthTool.response.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('GetLogsTool', () => {
    it('should validate valid parameters', () => {
      const result = GetLogsTool.parameters.safeParse({
        lines: 100,
        filter: 'error',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lines).toBe(100);
        expect(result.data.filter).toBe('error');
      }
    });

    it('should apply default values', () => {
      const result = GetLogsTool.parameters.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lines).toBe(100);
      }
    });

    it('should reject lines over max', () => {
      const result = GetLogsTool.parameters.safeParse({
        lines: 99999,
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative lines', () => {
      const result = GetLogsTool.parameters.safeParse({
        lines: -10,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('SendChatCompletionTool', () => {
    it('should validate simple text message', () => {
      const result = SendChatCompletionTool.parameters.safeParse({
        messages: [
          { role: 'user', content: 'Hello' },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should validate message with image', () => {
      const result = SendChatCompletionTool.parameters.safeParse({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is this?' },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,iVBOR...',
                },
              },
            ],
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty messages array', () => {
      const result = SendChatCompletionTool.parameters.safeParse({
        messages: [],
      });

      expect(result.success).toBe(false);
    });

    it('should apply defaults', () => {
      const result = SendChatCompletionTool.parameters.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stream).toBe(false);
        expect(result.data.model).toBe('claude-3-sonnet');
      }
    });
  });

  describe('RestartSessionTool', () => {
    it('should validate with reason', () => {
      const result = RestartSessionTool.parameters.safeParse({
        reason: 'Browser stuck',
      });

      expect(result.success).toBe(true);
    });

    it('should validate without reason', () => {
      const result = RestartSessionTool.parameters.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should have CONFIRM security level', () => {
      expect(RestartSessionTool.securityLevel).toBe(ToolSecurityLevel.CONFIRM);
    });

    it('should have confirmation prompt', () => {
      expect(RestartSessionTool.confirmationPrompt).toBeDefined();
      expect(RestartSessionTool.confirmationPrompt).toContain('browser');
    });
  });
});

describe('Tool Registry', () => {
  describe('getToolsBySecurityLevel', () => {
    it('should return SAFE tools', () => {
      const safes = getToolsBySecurityLevel(ToolSecurityLevel.SAFE);
      expect(safes).toContain('getServerHealth');
      expect(safes).toContain('getServerStatus');
      expect(safes).toContain('newChat');
      expect(safes).not.toContain('restartSession');
    });

    it('should return CONFIRM tools', () => {
      const confirms = getToolsBySecurityLevel(ToolSecurityLevel.CONFIRM);
      expect(confirms).toContain('restartSession');
      expect(confirms).toContain('recoverSession');
      expect(confirms).not.toContain('getServerHealth');
    });
  });

  describe('requiresConfirmation', () => {
    it('should return false for SAFE tools', () => {
      expect(requiresConfirmation('getServerHealth')).toBe(false);
      expect(requiresConfirmation('newChat')).toBe(false);
    });

    it('should return true for CONFIRM tools', () => {
      expect(requiresConfirmation('restartSession')).toBe(true);
      expect(requiresConfirmation('clearLogs')).toBe(true);
    });
  });

  describe('getConfirmationPrompt', () => {
    it('should return prompt for CONFIRM tools', () => {
      const prompt = getConfirmationPrompt('restartSession');
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
    });

    it('should return null for SAFE tools', () => {
      const prompt = getConfirmationPrompt('getServerHealth');
      expect(prompt).toBeNull();
    });
  });

  describe('ALL_TOOLS', () => {
    it('should contain all expected tools', () => {
      const toolNames = Object.keys(ALL_TOOLS);

      expect(toolNames).toContain('getServerHealth');
      expect(toolNames).toContain('getServerStatus');
      expect(toolNames).toContain('restartSession');
      expect(toolNames).toContain('recoverSession');
      expect(toolNames).toContain('newChat');
      expect(toolNames).toContain('getLogs');
      expect(toolNames).toContain('clearLogs');
      expect(toolNames).toContain('getConfig');
      expect(toolNames).toContain('sendChatCompletion');
    });

    it('should have consistent structure', () => {
      Object.entries(ALL_TOOLS).forEach(([name, tool]) => {
        expect(tool.name).toBe(name);
        expect(tool.description).toBeTruthy();
        expect(tool.securityLevel).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.response).toBeDefined();
      });
    });
  });
});

describe('Type Guards', () => {
  describe('isSuccess', () => {
    it('should return true for success result', () => {
      const result = { success: true as const, data: { status: 'ok' } };
      expect(isSuccess(result)).toBe(true);
    });

    it('should return false for error result', () => {
      const result = { success: false as const, error: 'Failed' };
      expect(isSuccess(result)).toBe(false);
    });
  });

  describe('isError', () => {
    it('should return true for error result', () => {
      const result = {
        success: false as const,
        error: 'Failed',
        code: ErrorCode.SERVER_ERROR,
      };
      expect(isError(result)).toBe(true);
    });

    it('should return false for success result', () => {
      const result = { success: true as const, data: { status: 'ok' } };
      expect(isError(result)).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  describe('createErrorResponse', () => {
    it('should create basic error response', () => {
      const error = createErrorResponse('Something failed');

      expect(error.error.message).toBe('Something failed');
      expect(error.error.type).toBe('api_error');
    });

    it('should include error code', () => {
      const error = createErrorResponse(
        'Not found',
        'not_found_error',
        ErrorCode.NOT_FOUND
      );

      expect(error.error.message).toBe('Not found');
      expect(error.error.type).toBe('not_found_error');
      expect(error.error.code).toBe(ErrorCode.NOT_FOUND);
    });
  });

  describe('ErrorCode', () => {
    it('should have expected error codes', () => {
      expect(ErrorCode.UNAUTHORIZED).toBe('unauthorized');
      expect(ErrorCode.RATE_LIMIT).toBe('rate_limit_exceeded');
      expect(ErrorCode.BROWSER_OFFLINE).toBe('browser_offline');
      expect(ErrorCode.TIMEOUT).toBe('timeout');
      expect(ErrorCode.VALIDATION_ERROR).toBe('validation_error');
    });
  });
});

describe('Security Categorization', () => {
  it('should have correct SAFE_TOOLS', () => {
    expect(SAFE_TOOLS).toContain('getServerHealth');
    expect(SAFE_TOOLS).toContain('getServerStatus');
    expect(SAFE_TOOLS).toContain('newChat');
    expect(SAFE_TOOLS).toContain('getLogs');
    expect(SAFE_TOOLS).toContain('getConfig');
    expect(SAFE_TOOLS).toContain('sendChatCompletion');
  });

  it('should have correct CONFIRM_TOOLS', () => {
    expect(CONFIRM_TOOLS).toContain('restartSession');
    expect(CONFIRM_TOOLS).toContain('recoverSession');
    expect(CONFIRM_TOOLS).toContain('clearLogs');
  });

  it('should not overlap SAFE and CONFIRM', () => {
    const overlap = SAFE_TOOLS.filter(t => CONFIRM_TOOLS.includes(t));
    expect(overlap).toHaveLength(0);
  });
});
