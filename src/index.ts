import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { Logger } from './utils/logger.js';
import { SessionRegistry } from './core/session-registry.js';
import {
  registerStartSessionTool,
  registerStopSessionTool,
  registerGetSessionTool,
  registerListSessionsTool,
} from './tools/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger('sniaff-core');

  await logger.initialize(config.logsDir);

  logger.info('Starting sniaff-core-mcp', { config });

  const server = new McpServer({
    name: 'sniaff-core-mcp',
    version: '0.1.0',
  });

  const sessionRegistry = new SessionRegistry({
    config,
    logger,
  });

  // Register tools
  registerStartSessionTool(server, sessionRegistry);
  registerStopSessionTool(server, sessionRegistry);
  registerGetSessionTool(server, sessionRegistry);
  registerListSessionsTool(server, sessionRegistry);

  logger.info('Tools registered', {
    tools: ['core.start_session', 'core.stop_session', 'core.get_session', 'core.list_sessions'],
  });

  // Setup graceful shutdown handlers
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Received shutdown signal, cleaning up...', { signal });

    try {
      await sessionRegistry.cleanupAllSessions();
      logger.info('Shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error: String(error) });
    }

    process.exit(0);
  };

  // Handle various termination signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  // Handle stdin close (client disconnected)
  process.stdin.on('close', () => {
    logger.info('stdin closed, client disconnected');
    shutdown('stdin-close');
  });

  // Handle stdin end
  process.stdin.on('end', () => {
    logger.info('stdin ended, client disconnected');
    shutdown('stdin-end');
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP server connected and ready');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
