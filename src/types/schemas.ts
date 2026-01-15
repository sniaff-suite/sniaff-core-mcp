import { z } from 'zod';

export const StartSessionInputSchema = z.object({
  type: z.enum(['reversing', 'testing', 'analysis']).default('reversing')
    .describe('Type of session to create'),
});

export const StopSessionInputSchema = z.object({
  sessionId: z.string().min(1)
    .describe('The session ID to stop'),
  cleanup: z.boolean().default(true)
    .describe('Delete session directory after stopping (default: true)'),
});

export const GetSessionInputSchema = z.object({
  sessionId: z.string().min(1)
    .describe('The session ID to retrieve'),
});

export const ListSessionsInputSchema = z.object({
  status: z.enum(['active', 'stopping', 'stopped', 'all']).default('active')
    .describe('Filter sessions by status'),
});

export type StartSessionInput = z.infer<typeof StartSessionInputSchema>;
export type StopSessionInput = z.infer<typeof StopSessionInputSchema>;
export type GetSessionInput = z.infer<typeof GetSessionInputSchema>;
export type ListSessionsInput = z.infer<typeof ListSessionsInputSchema>;
