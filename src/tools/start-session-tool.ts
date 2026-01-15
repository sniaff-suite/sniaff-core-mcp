import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionRegistry } from '../core/session-registry.js';
import { StartSessionInputSchema } from '../types/schemas.js';
import { CoreError } from '../types/errors.js';

export function registerStartSessionTool(
  server: McpServer,
  sessionRegistry: SessionRegistry
): void {
  server.tool(
    'core.start_session',
    'Create a new sniaff session. This creates a shared session directory and state file that other MCPs (android, mitm) will use to coordinate.',
    {
      type: StartSessionInputSchema.shape.type,
    },
    async (args) => {
      try {
        const sessionInfo = await sessionRegistry.createSession(args.type || 'reversing');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  sessionId: sessionInfo.sessionId,
                  sessionPath: sessionInfo.sessionPath,
                  type: sessionInfo.type,
                  createdAt: sessionInfo.createdAt,
                  message: `Session created. Use this sessionId with sniaff.start() and mitm.start() to attach services.`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const coreError =
          error instanceof CoreError
            ? error
            : new CoreError(
                'INTERNAL_ERROR' as any,
                error instanceof Error ? error.message : String(error)
              );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: false,
                  error: coreError.toJSON(),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
