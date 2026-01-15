import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionRegistry } from '../core/session-registry.js';
import { GetSessionInputSchema } from '../types/schemas.js';
import { CoreError } from '../types/errors.js';

export function registerGetSessionTool(
  server: McpServer,
  sessionRegistry: SessionRegistry
): void {
  server.tool(
    'core.get_session',
    'Get the full state of a sniaff session, including android and mitm status.',
    {
      sessionId: GetSessionInputSchema.shape.sessionId,
    },
    async (args) => {
      try {
        const state = await sessionRegistry.getSession(args.sessionId);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  session: state,
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
