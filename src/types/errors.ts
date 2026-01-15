export enum ErrorCode {
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
  SESSION_INVALID_STATE = 'SESSION_INVALID_STATE',

  // State errors
  STATE_READ_FAILED = 'STATE_READ_FAILED',
  STATE_WRITE_FAILED = 'STATE_WRITE_FAILED',

  // Filesystem errors
  DIRECTORY_CREATE_FAILED = 'DIRECTORY_CREATE_FAILED',
  DIRECTORY_DELETE_FAILED = 'DIRECTORY_DELETE_FAILED',

  // Validation errors
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',

  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class CoreError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CoreError';
  }

  toJSON(): { code: ErrorCode; message: string; details?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
