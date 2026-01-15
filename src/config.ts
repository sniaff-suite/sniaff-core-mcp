import * as os from 'os';
import * as path from 'path';

export interface Config {
  // Base directory for all sniaff data
  sniaffDir: string;
  // Directory for session state files
  sessionsDir: string;
  // Directory for logs
  logsDir: string;
}

export function loadConfig(): Config {
  const homeDir = os.homedir();
  const sniaffDir = process.env.SNIAFF_DIR || path.join(homeDir, '.sniaff');

  return {
    sniaffDir,
    sessionsDir: process.env.SNIAFF_SESSIONS_DIR || path.join(sniaffDir, 'sessions'),
    logsDir: process.env.SNIAFF_LOGS_DIR || path.join(sniaffDir, 'logs'),
  };
}
