export type SessionType = 'reversing' | 'testing' | 'analysis';

export type SessionStatus = 'active' | 'stopping' | 'stopped';

export interface AndroidState {
  status: 'pending' | 'starting' | 'ready' | 'stopped' | 'error';
  emulatorPort?: number;
  adbPort?: number;
  pid?: number;
  error?: string;
}

export interface MitmState {
  status: 'pending' | 'starting' | 'ready' | 'stopped' | 'error';
  proxyPort?: number;
  proxyHost?: string;
  pid?: number;
  androidProxyConfig?: {
    host: string;
    port: number;
  };
  error?: string;
}

export interface RevDockerState {
  status: 'pending' | 'starting' | 'ready' | 'stopped' | 'error';
  containerId?: string;
  containerName?: string;
  workspacePath?: string;
  startedAt?: string;
  error?: string;
}

export interface SessionState {
  sessionId: string;
  type: SessionType;
  status: SessionStatus;
  createdAt: string;
  stoppedAt?: string;
  android?: AndroidState;
  mitm?: MitmState;
  revdocker?: RevDockerState;
}

export interface SessionInfo {
  sessionId: string;
  type: SessionType;
  status: SessionStatus;
  createdAt: string;
  sessionPath: string;
}
