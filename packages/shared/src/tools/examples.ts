/**
 * packages/shared/src/tools/examples.ts
 *
 * Usage examples for OpenAdapter tool schemas with Vercel AI SDK.
 * Demonstrates integration patterns, error handling, and best practices.
 */

import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  createToolHandlers,
  type ToolHandlers,
  type ConnectionConfig,
} from './handlers';
import {
  ALL_TOOLS,
  getVercelAITools,
  requiresConfirmation,
  getConfirmationPrompt,
  isSuccess,
  isError,
  type ToolName,
} from './schemas';

// ============================================================================
// Example 1: Basic Tool Integration
// ============================================================================

/**
 * Simple example: Check server health and get logs if unhealthy
 */
export async function example1_BasicHealthCheck() {
  const config: ConnectionConfig = {
    baseUrl: 'http://127.0.0.1:3000',
    apiKey: process.env.ADMIN_API_KEY,
    timeout: 30000,
  };

  const handlers = createToolHandlers(config);

  // Check health
  const healthResult = await handlers.getServerHealth({});

  if (isSuccess(healthResult)) {
    console.log('Server Status:', healthResult.data.status);
    console.log('Uptime:', healthResult.data.uptime.human);
    console.log('Browser Alive:', healthResult.data.browser.alive);

    // If browser is not alive, get logs for debugging
    if (!healthResult.data.browser.alive) {
      const logsResult = await handlers.getLogs({ lines: 50 });

      if (isSuccess(logsResult)) {
        console.log('Recent errors:');
        logsResult.data.logs
          .filter(line => line.toLowerCase().includes('error'))
          .forEach(line => console.log(line));
      }
    }
  } else {
    console.error('Health check failed:', healthResult.error);
  }
}

// ============================================================================
// Example 2: Vercel AI SDK Integration with Tools
// ============================================================================

/**
 * Use Vercel AI SDK to create an AI agent that can manage OpenAdapter
 */
export async function example2_AIAgentWithTools() {
  const config: ConnectionConfig = {
    baseUrl: 'http://127.0.0.1:3000',
    apiKey: process.env.ADMIN_API_KEY,
    timeout: 30000,
  };

  const handlers = createToolHandlers(config);

  // Convert tool schemas to Vercel AI SDK format
  const tools = getVercelAITools();

  const result = await generateText({
    model: openai('gpt-4'),
    prompt: 'Check the OpenAdapter server health and tell me if everything is working properly.',
    tools: {
      getServerHealth: {
        description: tools.getServerHealth.description,
        parameters: tools.getServerHealth.parameters,
        execute: async (params) => {
          const result = await handlers.getServerHealth(params);
          if (isSuccess(result)) {
            return result.data;
          }
          throw new Error(result.error);
        },
      },
      getServerStatus: {
        description: tools.getServerStatus.description,
        parameters: tools.getServerStatus.parameters,
        execute: async (params) => {
          const result = await handlers.getServerStatus(params);
          if (isSuccess(result)) {
            return result.data;
          }
          throw new Error(result.error);
        },
      },
    },
  });

  console.log('AI Response:', result.text);
  console.log('Tool Calls:', result.toolCalls);
}

// ============================================================================
// Example 3: Tool Execution with Confirmation Flow
// ============================================================================

/**
 * Handle tools that require user confirmation
 */
export async function example3_ConfirmationFlow() {
  const config: ConnectionConfig = {
    baseUrl: 'http://127.0.0.1:3000',
    apiKey: process.env.ADMIN_API_KEY,
    timeout: 30000,
  };

  const handlers = createToolHandlers(config);

  // Simulate AI wanting to restart the session
  const toolName: ToolName = 'restartSession';

  // Check if confirmation is required
  if (requiresConfirmation(toolName)) {
    const prompt = getConfirmationPrompt(toolName);
    console.log('Confirmation required:', prompt);

    // In a real UI, you would prompt the user here
    const userConfirmed = await mockUserConfirmation(prompt);

    if (!userConfirmed) {
      console.log('User cancelled operation');
      return;
    }
  }

  // Execute the tool
  const result = await handlers.restartSession({ reason: 'User requested restart' });

  if (isSuccess(result)) {
    console.log('Session restarted successfully:', result.data.message);
  } else {
    console.error('Restart failed:', result.error);
  }
}

/**
 * Mock user confirmation (replace with actual UI prompt)
 */
async function mockUserConfirmation(prompt: string | null): Promise<boolean> {
  // In a real application, this would show a UI dialog
  console.log(`User prompt: ${prompt}`);
  return true; // Simulate user confirming
}

// ============================================================================
// Example 4: Streaming Chat with Tool Integration
// ============================================================================

/**
 * Stream responses while allowing AI to use management tools
 */
export async function example4_StreamingWithTools() {
  const config: ConnectionConfig = {
    baseUrl: 'http://127.0.0.1:3000',
    apiKey: process.env.ADMIN_API_KEY,
    timeout: 30000,
  };

  const handlers = createToolHandlers(config);
  const tools = getVercelAITools();

  const result = await streamText({
    model: openai('gpt-4'),
    prompt: 'Monitor the OpenAdapter server and report any issues. Check health every 5 seconds for 30 seconds.',
    tools: {
      getServerHealth: {
        description: tools.getServerHealth.description,
        parameters: tools.getServerHealth.parameters,
        execute: async (params) => {
          const result = await handlers.getServerHealth(params);
          if (isSuccess(result)) {
            return result.data;
          }
          throw new Error(result.error);
        },
      },
      getLogs: {
        description: tools.getLogs.description,
        parameters: tools.getLogs.parameters,
        execute: async (params) => {
          const result = await handlers.getLogs(params);
          if (isSuccess(result)) {
            return result.data;
          }
          throw new Error(result.error);
        },
      },
    },
  });

  // Stream the response
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
}

// ============================================================================
// Example 5: Error Handling and Recovery
// ============================================================================

/**
 * Comprehensive error handling and automatic recovery
 */
export async function example5_ErrorHandlingAndRecovery() {
  const config: ConnectionConfig = {
    baseUrl: 'http://127.0.0.1:3000',
    apiKey: process.env.ADMIN_API_KEY,
    timeout: 30000,
  };

  const handlers = createToolHandlers(config);

  // Check server status
  const statusResult = await handlers.getServerStatus({});

  if (isError(statusResult)) {
    console.error('Failed to connect to server:', statusResult.error);
    return;
  }

  // If browser is offline, attempt recovery
  if (statusResult.data.status === 'degraded') {
    console.log('Browser is offline, attempting recovery...');

    const recoveryResult = await handlers.recoverSession({});

    if (isSuccess(recoveryResult)) {
      console.log('Recovery successful:', recoveryResult.data.message);
    } else {
      console.log('Recovery failed, attempting full restart...');

      const restartResult = await handlers.restartSession({
        reason: 'Recovery failed, forcing restart',
      });

      if (isSuccess(restartResult)) {
        console.log('Restart successful:', restartResult.data.message);
      } else {
        console.error('Complete failure - manual intervention required');
      }
    }
  } else {
    console.log('Server is healthy');
  }
}

// ============================================================================
// Example 6: Build a Complete AI Management Agent
// ============================================================================

/**
 * Complete AI agent that can manage OpenAdapter autonomously
 */
export async function example6_CompleteManagementAgent() {
  const config: ConnectionConfig = {
    baseUrl: 'http://127.0.0.1:3000',
    apiKey: process.env.ADMIN_API_KEY,
    timeout: 30000,
  };

  const handlers = createToolHandlers(config);
  const tools = getVercelAITools();

  // Create tool executors for all safe tools (no confirmation needed)
  const toolExecutors = {
    getServerHealth: {
      description: tools.getServerHealth.description,
      parameters: tools.getServerHealth.parameters,
      execute: async (params: any) => {
        const result = await handlers.getServerHealth(params);
        if (isSuccess(result)) return result.data;
        throw new Error(result.error);
      },
    },
    getServerStatus: {
      description: tools.getServerStatus.description,
      parameters: tools.getServerStatus.parameters,
      execute: async (params: any) => {
        const result = await handlers.getServerStatus(params);
        if (isSuccess(result)) return result.data;
        throw new Error(result.error);
      },
    },
    newChat: {
      description: tools.newChat.description,
      parameters: tools.newChat.parameters,
      execute: async (params: any) => {
        const result = await handlers.newChat(params);
        if (isSuccess(result)) return result.data;
        throw new Error(result.error);
      },
    },
    getLogs: {
      description: tools.getLogs.description,
      parameters: tools.getLogs.parameters,
      execute: async (params: any) => {
        const result = await handlers.getLogs(params);
        if (isSuccess(result)) return result.data;
        throw new Error(result.error);
      },
    },
    getConfig: {
      description: tools.getConfig.description,
      parameters: tools.getConfig.parameters,
      execute: async (params: any) => {
        const result = await handlers.getConfig(params);
        if (isSuccess(result)) return result.data;
        throw new Error(result.error);
      },
    },
  };

  const result = await generateText({
    model: openai('gpt-4'),
    prompt: `You are an AI assistant managing an OpenAdapter server.

    Check the current health status and:
    1. Report uptime and success rate
    2. Check if browser is responsive
    3. If there are any failed requests, examine logs to find errors
    4. Provide recommendations for optimization

    Be concise and actionable.`,
    tools: toolExecutors,
    maxToolRoundtrips: 5, // Allow up to 5 rounds of tool calls
  });

  console.log('Management Report:');
  console.log(result.text);
  console.log('\nTool calls made:', result.toolCalls?.length || 0);
}

// ============================================================================
// Example 7: Custom Tool Wrapper with Middleware
// ============================================================================

/**
 * Create a custom tool wrapper with logging and rate limiting
 */
export function createMonitoredToolWrapper(handlers: ToolHandlers) {
  const callCounts = new Map<string, number>();
  const lastCallTimes = new Map<string, number>();

  return {
    async executeWithMonitoring<T>(
      toolName: string,
      executor: () => Promise<T>
    ): Promise<T> {
      // Update call count
      callCounts.set(toolName, (callCounts.get(toolName) || 0) + 1);

      // Check rate limiting (max 1 call per second per tool)
      const lastCall = lastCallTimes.get(toolName) || 0;
      const now = Date.now();
      if (now - lastCall < 1000) {
        const waitTime = 1000 - (now - lastCall);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Execute with timing
      const startTime = Date.now();
      try {
        const result = await executor();
        const duration = Date.now() - startTime;

        console.log(`[${toolName}] Success in ${duration}ms (call #${callCounts.get(toolName)})`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${toolName}] Failed in ${duration}ms:`, error);
        throw error;
      } finally {
        lastCallTimes.set(toolName, Date.now());
      }
    },

    getStats() {
      return {
        callCounts: Object.fromEntries(callCounts),
        lastCallTimes: Object.fromEntries(lastCallTimes),
      };
    },
  };
}

// ============================================================================
// Example 8: Multi-Server Management
// ============================================================================

/**
 * Manage multiple OpenAdapter instances
 */
export async function example8_MultiServerManagement() {
  const servers = [
    {
      name: 'production',
      config: {
        baseUrl: 'http://prod.example.com:3000',
        apiKey: process.env.PROD_API_KEY,
        timeout: 30000,
      },
    },
    {
      name: 'staging',
      config: {
        baseUrl: 'http://staging.example.com:3000',
        apiKey: process.env.STAGING_API_KEY,
        timeout: 30000,
      },
    },
    {
      name: 'development',
      config: {
        baseUrl: 'http://127.0.0.1:3000',
        apiKey: process.env.DEV_API_KEY,
        timeout: 30000,
      },
    },
  ];

  // Check all servers in parallel
  const results = await Promise.all(
    servers.map(async ({ name, config }) => {
      const handlers = createToolHandlers(config);
      const health = await handlers.getServerHealth({});

      return {
        server: name,
        healthy: isSuccess(health) && health.data.browser.alive,
        ...health,
      };
    })
  );

  // Report
  console.log('\nMulti-Server Health Report:');
  results.forEach(result => {
    console.log(`\n${result.server.toUpperCase()}:`);
    if (result.healthy) {
      console.log('  Status: ✓ Healthy');
      if (isSuccess(result)) {
        console.log(`  Uptime: ${result.data.uptime.human}`);
        console.log(`  Requests: ${result.data.stats.totalRequests}`);
      }
    } else {
      console.log('  Status: ✗ Unhealthy');
      if (isError(result)) {
        console.log(`  Error: ${result.error}`);
      }
    }
  });
}

// ============================================================================
// Exports
// ============================================================================

export {
  example1_BasicHealthCheck,
  example2_AIAgentWithTools,
  example3_ConfirmationFlow,
  example4_StreamingWithTools,
  example5_ErrorHandlingAndRecovery,
  example6_CompleteManagementAgent,
  createMonitoredToolWrapper,
  example8_MultiServerManagement,
};
