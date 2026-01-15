import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SessionState, AndroidState, MitmState } from '../types/session.js';
import { CoreError, ErrorCode } from '../types/errors.js';
import { Logger } from '../utils/logger.js';

const execPromise = promisify(exec);

const STATE_FILE = 'state.json';

export class StateManager {
  constructor(
    private sessionsDir: string,
    private logger: Logger
  ) {}

  private getStatePath(sessionId: string): string {
    return path.join(this.sessionsDir, sessionId, STATE_FILE);
  }

  private getSessionDir(sessionId: string): string {
    return path.join(this.sessionsDir, sessionId);
  }

  async createSessionDir(sessionId: string): Promise<string> {
    const sessionDir = this.getSessionDir(sessionId);
    try {
      await fs.promises.mkdir(sessionDir, { recursive: true });
      // Create subdirectories for each MCP
      await fs.promises.mkdir(path.join(sessionDir, 'android'), { recursive: true });
      await fs.promises.mkdir(path.join(sessionDir, 'mitm'), { recursive: true });
      await fs.promises.mkdir(path.join(sessionDir, 'core'), { recursive: true });
      this.logger.info('Created session directory', { sessionId, sessionDir });
      return sessionDir;
    } catch (error) {
      throw new CoreError(
        ErrorCode.DIRECTORY_CREATE_FAILED,
        `Failed to create session directory: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, sessionDir }
      );
    }
  }

  async write(sessionId: string, state: SessionState): Promise<void> {
    const statePath = this.getStatePath(sessionId);
    try {
      await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
      this.logger.debug('Wrote session state', { sessionId, status: state.status });
    } catch (error) {
      throw new CoreError(
        ErrorCode.STATE_WRITE_FAILED,
        `Failed to write session state: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, statePath }
      );
    }
  }

  async read(sessionId: string): Promise<SessionState> {
    const statePath = this.getStatePath(sessionId);
    try {
      const content = await fs.promises.readFile(statePath, 'utf-8');
      return JSON.parse(content) as SessionState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new CoreError(
          ErrorCode.SESSION_NOT_FOUND,
          `Session not found: ${sessionId}`,
          { sessionId }
        );
      }
      throw new CoreError(
        ErrorCode.STATE_READ_FAILED,
        `Failed to read session state: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, statePath }
      );
    }
  }

  async update(sessionId: string, partial: Partial<SessionState>): Promise<SessionState> {
    const current = await this.read(sessionId);
    const updated: SessionState = { ...current, ...partial };
    await this.write(sessionId, updated);
    return updated;
  }

  async updateAndroid(sessionId: string, android: Partial<AndroidState>): Promise<SessionState> {
    const current = await this.read(sessionId);
    const updated: SessionState = {
      ...current,
      android: { ...current.android, ...android } as AndroidState,
    };
    await this.write(sessionId, updated);
    return updated;
  }

  async updateMitm(sessionId: string, mitm: Partial<MitmState>): Promise<SessionState> {
    const current = await this.read(sessionId);
    const updated: SessionState = {
      ...current,
      mitm: { ...current.mitm, ...mitm } as MitmState,
    };
    await this.write(sessionId, updated);
    return updated;
  }

  async exists(sessionId: string): Promise<boolean> {
    const statePath = this.getStatePath(sessionId);
    try {
      await fs.promises.access(statePath);
      return true;
    } catch {
      return false;
    }
  }

  async listSessions(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(this.sessionsDir, { withFileTypes: true });
      const sessionIds: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('sniaff-')) {
          // Check if state.json exists
          const statePath = path.join(this.sessionsDir, entry.name, STATE_FILE);
          try {
            await fs.promises.access(statePath);
            sessionIds.push(entry.name);
          } catch {
            // No state.json, skip this directory
          }
        }
      }

      return sessionIds;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);

    // Stop and remove any Docker container associated with this session
    // This must happen BEFORE deleting the directory because the revdocker folder
    // is mounted as a volume in the container
    await this.cleanupDockerContainer(sessionId);

    try {
      await fs.promises.rm(sessionDir, { recursive: true, force: true });
      this.logger.info('Deleted session directory', { sessionId });
    } catch (error) {
      throw new CoreError(
        ErrorCode.DIRECTORY_DELETE_FAILED,
        `Failed to delete session directory: ${error instanceof Error ? error.message : String(error)}`,
        { sessionId, sessionDir }
      );
    }
  }

  /**
   * Cleanup Docker container for a session.
   * This is called before deleting the session directory to ensure
   * the revdocker volume mount doesn't block directory deletion.
   */
  private async cleanupDockerContainer(sessionId: string): Promise<void> {
    const containerName = `sniaff-revdocker-${sessionId}`;

    try {
      // Force stop and remove the container in one command
      await execPromise(`docker rm -f ${containerName}`);
      this.logger.info('Removed Docker container', { sessionId, containerName });
    } catch (error) {
      // Container might not exist - that's OK, just log at debug level
      this.logger.debug('No Docker container to cleanup (may not exist)', {
        sessionId,
        containerName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
