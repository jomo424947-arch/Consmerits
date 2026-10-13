/**
 * تعريف الاستجابات العامة لقنوات الـ IPC
 */

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
