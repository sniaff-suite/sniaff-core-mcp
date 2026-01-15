import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionRegistry } from '../core/session-registry.js';
import { StopSessionInputSchema } from '../types/schemas.js';
import { CoreError } from '../types/errors.js';

export function registerStopSessionTool(
  server: McpServer,
  sessionRegistry: SessionRegistry
): void {
  server.tool(
    'core.stop_session',
    'Stop a sniaff session. This marks the session as "stopping" in the shared state file, signaling other MCPs (android, mitm) to stop their processes. By default, the session directory is deleted.',
    {
      sessionId: StopSessionInputSchema.shape.sessionId,
      cleanup: StopSessionInputSchema.shape.cleanup,
    },
    async (args) => {
      try {
        const state = await sessionRegistry.stopSession(args.sessionId, args.cleanup);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ok: true,
                  sessionId: state.sessionId,
                  status: state.status,
                  stoppedAt: state.stoppedAt,
                  cleanup: args.cleanup,
                  message: args.cleanup
                    ? `Session stopped and directory deleted.`
                    : `Session marked as stopping. Other MCPs will detect this and stop their processes.`,
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
