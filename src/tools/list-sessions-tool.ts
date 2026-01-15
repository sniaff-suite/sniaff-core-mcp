import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionRegistry } from '../core/session-registry.js';
import { ListSessionsInputSchema } from '../types/schemas.js';
import { CoreError } from '../types/errors.js';

export function registerListSessionsTool(
  server: McpServer,
  sessionRegistry: SessionRegistry
): void {
  server.tool(
    'core.list_sessions',
    'List all sniaff sessions, optionally filtered by status.',
    {
      status: ListSessionsInputSchema.shape.status,
    },
    async (args) => {
      try {
        const sessions = await sessionRegistry.listSessions(args.status || 'active');

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  count: sessions.length,
                  sessions,
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
