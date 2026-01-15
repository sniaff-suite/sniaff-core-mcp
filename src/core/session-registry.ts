import { StateManager } from './state-manager.js';
import { SessionState, SessionType, SessionInfo } from '../types/session.js';
import { CoreError, ErrorCode } from '../types/errors.js';
import { Logger } from '../utils/logger.js';
import { generateSessionId } from '../utils/id-generator.js';
import { Config } from '../config.js';

export interface SessionRegistryDeps {
  config: Config;
  logger: Logger;
}

export class SessionRegistry {
  private stateManager: StateManager;
  private logger: Logger;
  private config: Config;

  constructor(deps: SessionRegistryDeps) {
    this.config = deps.config;
    this.logger = deps.logger;
    this.stateManager = new StateManager(deps.config.sessionsDir, deps.logger);
  }

  async createSession(type: SessionType): Promise<SessionInfo> {
    const sessionId = generateSessionId();

    this.logger.info('Creating session', { sessionId, type });

    // Create directory structure
    const sessionPath = await this.stateManager.createSessionDir(sessionId);

    // Create initial state
    const state: SessionState = {
      sessionId,
      type,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await this.stateManager.write(sessionId, state);

    this.logger.info('Session created', { sessionId, type, sessionPath });

    return {
      sessionId,
      type,
      status: 'active',
      createdAt: state.createdAt,
      sessionPath,
    };
  }

  async getSession(sessionId: string): Promise<SessionState> {
    return await this.stateManager.read(sessionId);
  }

  async stopSession(sessionId: string, cleanup: boolean = true): Promise<SessionState> {
    const state = await this.stateManager.read(sessionId);

    if (state.status === 'stopped') {
      throw new CoreError(
        ErrorCode.SESSION_INVALID_STATE,
        `Session is already stopped: ${sessionId}`,
        { sessionId, currentStatus: state.status }
      );
    }

    this.logger.info('Stopping session', { sessionId, cleanup });

    // Mark as stopping - other MCPs will watch this and stop their processes
    const updated = await this.stateManager.update(sessionId, {
      status: 'stopping',
      stoppedAt: new Date().toISOString(),
    });

    this.logger.info('Session marked as stopping', { sessionId });

    // Cleanup session directory if requested
    if (cleanup) {
      await this.stateManager.deleteSession(sessionId);
      this.logger.info('Session directory deleted', { sessionId });
    }

    return { ...updated, status: 'stopped' };
  }

  async listSessions(statusFilter?: 'active' | 'stopping' | 'stopped' | 'all'): Promise<SessionInfo[]> {
    const sessionIds = await this.stateManager.listSessions();
    const sessions: SessionInfo[] = [];

    for (const sessionId of sessionIds) {
      try {
        const state = await this.stateManager.read(sessionId);

        // Apply filter
        if (statusFilter && statusFilter !== 'all' && state.status !== statusFilter) {
          continue;
        }

        sessions.push({
          sessionId: state.sessionId,
          type: state.type,
          status: state.status,
          createdAt: state.createdAt,
          sessionPath: `${this.config.sessionsDir}/${sessionId}`,
        });
      } catch (error) {
        // Skip invalid sessions
        this.logger.warn('Skipping invalid session', { sessionId, error: String(error) });
      }
    }

    // Sort by createdAt descending (newest first)
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sessions;
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return await this.stateManager.exists(sessionId);
  }

  /**
   * Cleanup all active sessions. Called on process exit.
   */
  async cleanupAllSessions(): Promise<void> {
    this.logger.info('Cleaning up all active sessions...');

    const sessions = await this.listSessions('active');

    for (const session of sessions) {
      try {
        await this.stateManager.deleteSession(session.sessionId);
        this.logger.info('Cleaned up session', { sessionId: session.sessionId });
      } catch (error) {
        this.logger.error('Failed to cleanup session', {
          sessionId: session.sessionId,
          error: String(error),
        });
      }
    }

    this.logger.info('All sessions cleaned up', { count: sessions.length });
  }
}
