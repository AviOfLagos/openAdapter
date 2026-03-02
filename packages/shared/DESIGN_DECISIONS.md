# Tool Schema Design Decisions

This document explains the design choices made when creating type-safe tool schemas for OpenAdapter's management API.

## Core Design Principles

### 1. Type Safety First

**Decision**: Use Zod for runtime validation with full TypeScript integration.

**Rationale**:
- Runtime validation catches errors at API boundaries
- Automatic TypeScript type inference from schemas
- Vercel AI SDK uses Zod as its preferred schema library
- Single source of truth for types and validation

**Example**:
```typescript
// Schema defines both validation and types
export const GetLogsTool = {
  parameters: z.object({
    lines: z.number().positive().max(10000).default(100),
  }),
};

// TypeScript type automatically inferred
export type GetLogsParams = z.infer<typeof GetLogsTool.parameters>;
```

### 2. Security by Design

**Decision**: Categorize tools into security levels (SAFE, CONFIRM, RESTRICTED).

**Rationale**:
- Clear separation between read-only and destructive operations
- Enables autonomous AI tool usage for safe operations
- Requires explicit user confirmation for dangerous operations
- Prevents accidental data loss or service disruption

**Implementation**:
```typescript
export enum ToolSecurityLevel {
  SAFE = 'safe',           // Read-only, no side effects
  CONFIRM = 'confirm',     // Modifies state, needs confirmation
  RESTRICTED = 'restricted' // Dangerous operations, needs admin
}

// Each tool declares its security level
export const RestartSessionTool = {
  securityLevel: ToolSecurityLevel.CONFIRM,
  confirmationPrompt: 'This will close the browser...',
};
```

### 3. Error Handling Consistency

**Decision**: Use discriminated unions for all results.

**Rationale**:
- Type-safe error handling at compile time
- Forces developers to handle errors explicitly
- Consistent error format across all tools
- Compatible with OpenAI API error format

**Implementation**:
```typescript
type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ErrorCode };

// TypeScript ensures you handle both cases
if (result.success) {
  console.log(result.data); // TypeScript knows data exists
} else {
  console.error(result.error); // TypeScript knows error exists
}
```

### 4. API Compatibility

**Decision**: Match OpenAI's API format for chat completions.

**Rationale**:
- OpenAdapter already uses OpenAI-compatible format
- Easier migration from OpenAI to OpenAdapter
- Familiar API for developers
- Standard tooling works out-of-the-box

**Example**:
```typescript
// OpenAI-compatible message format
messages: z.array(
  z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.union([
      z.string(),
      z.array(z.discriminatedUnion('type', [
        z.object({ type: z.literal('text'), text: z.string() }),
        z.object({ type: z.literal('image_url'), image_url: {...} }),
      ])),
    ]),
  })
)
```

## Specific Design Choices

### Tool Parameter Design

**Decision**: Use optional parameters with sensible defaults.

**Rationale**:
- Lower barrier to entry (minimal required params)
- Progressive disclosure of advanced features
- Zod automatically applies defaults
- Better developer experience

**Example**:
```typescript
// Only lines parameter, with default
parameters: z.object({
  lines: z.number().positive().max(10000).default(100),
  filter: z.string().optional(),
})

// Can call with empty object
const result = await handlers.getLogs({}); // Uses default lines: 100
```

### Response Schema Validation

**Decision**: Validate both request and response with Zod.

**Rationale**:
- Catch server-side API changes early
- Ensure type safety throughout the request lifecycle
- Better error messages when API contract breaks
- Documentation through code

**Example**:
```typescript
export const GetServerHealthTool = {
  parameters: z.object({}), // Request validation
  response: z.object({      // Response validation
    status: z.literal('ok'),
    timestamp: z.string().datetime(),
    // ... full schema
  }),
};
```

### Handler vs Schema Separation

**Decision**: Separate schema definitions from execution handlers.

**Rationale**:
- Schemas can be shared without runtime dependencies
- Handlers can be customized per environment
- Testing is easier (mock handlers, validate schemas separately)
- Follows single responsibility principle

**Structure**:
```
src/tools/
  ├── schemas.ts    # Pure schemas, no HTTP logic
  ├── handlers.ts   # HTTP client and execution logic
  ├── index.ts      # Public API
  └── examples.ts   # Usage examples
```

### Middleware Pattern

**Decision**: Provide composable middleware (retry, logging, error boundary).

**Rationale**:
- Separation of concerns (core logic vs cross-cutting concerns)
- Opt-in complexity (add only what you need)
- Easy to test in isolation
- Follows functional programming principles

**Example**:
```typescript
// Compose middleware
const handler = withLogging(
  withRetry(
    withErrorBoundary(handlers.getServerHealth),
    3,
    1000
  ),
  'getServerHealth'
);
```

## Vercel AI SDK Integration

### Tool Format Compatibility

**Decision**: Provide helper to convert to Vercel AI SDK format.

**Rationale**:
- Vercel AI SDK has specific tool format requirements
- Our schemas contain additional metadata (security level, etc.)
- Helper function reduces boilerplate
- Easier to maintain compatibility with SDK updates

**Implementation**:
```typescript
export function toVercelAITool(tool) {
  return {
    description: tool.description,
    parameters: tool.parameters,
    // Omit: securityLevel, confirmationPrompt, response schema
  };
}
```

### Execute Function Pattern

**Decision**: Throw errors in execute functions for AI SDK compatibility.

**Rationale**:
- Vercel AI SDK expects execute functions to throw on error
- Our handlers return `ToolResult` discriminated union
- Conversion happens at integration boundary
- Keeps our internal API clean while supporting external requirements

**Example**:
```typescript
{
  execute: async (params) => {
    const result = await handlers.getServerHealth(params);
    if (isSuccess(result)) return result.data;
    throw new Error(result.error); // AI SDK expects thrown errors
  }
}
```

## Trade-offs and Alternatives Considered

### Alternative: JSON Schema

**Considered**: Using JSON Schema instead of Zod.

**Rejected because**:
- No automatic TypeScript type inference
- Requires separate type definitions
- More verbose schema syntax
- Zod is Vercel AI SDK's preferred library

### Alternative: Class-Based Architecture

**Considered**: Using classes for tools instead of plain objects.

**Rejected because**:
- More complex, less functional
- Harder to serialize/deserialize
- Tree-shaking less effective
- Plain objects are simpler and sufficient

### Alternative: Single Response Type

**Considered**: Using exceptions for errors instead of discriminated unions.

**Rejected because**:
- Exceptions are hidden control flow
- Type system doesn't track thrown exceptions
- Discriminated unions force explicit error handling
- Better aligns with functional programming principles

### Alternative: Per-Tool Files

**Considered**: One file per tool definition.

**Rejected because**:
- Too many small files for current scope (9 tools)
- Harder to see relationships between tools
- More import boilerplate
- Can refactor later if needed

## Future Considerations

### Extensibility

**Design allows**:
- Adding new tools without breaking existing code
- Custom tool implementations (override handlers)
- Plugin-style tool registration
- Multiple OpenAdapter instances

### Backward Compatibility

**Commitments**:
- Schema changes will use semantic versioning
- Breaking changes only in major versions
- Deprecation warnings before removal
- Migration guides for major versions

### Performance

**Optimizations considered**:
- Schema caching (Zod compiles schemas on first use)
- Connection pooling (if managing multiple servers)
- Request batching (if OpenAdapter supports it)
- Lazy tool loading (only import used tools)

## Lessons Learned

### What Worked Well

1. **Zod for schemas** - Excellent TypeScript integration
2. **Security levels** - Clear categorization helps AI integration
3. **Discriminated unions** - Type-safe error handling is valuable
4. **Examples file** - Comprehensive examples aid adoption

### What Could Be Improved

1. **Streaming support** - Current implementation incomplete
2. **Batch operations** - Could reduce round-trips
3. **Caching layer** - For frequently-accessed data (health, config)
4. **Tool dependencies** - Some tools should block others

### Open Questions

1. **Should we version tools individually?** - Currently all tools share package version
2. **How to handle breaking OpenAdapter API changes?** - Need adapter pattern?
3. **Should tools support plugins?** - Allow users to add custom tools?
4. **Performance monitoring?** - Built-in metrics vs external?

## References

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Zod Documentation](https://zod.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
