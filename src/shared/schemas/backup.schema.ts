import { z } from 'zod';

export const createBackupSchema = z.object({
  destPath: z.string().optional(),
});

export const restoreBackupSchema = z.object({
  backupFilePath: z.string().min(1, 'مسار ملف النسخة الاحتياطية مطلوب'),
  ownerPassword: z.string().optional(),
});

export const exportUsbSchema = z.object({
  targetPath: z.string().min(1, 'مسار التصدير مطلوب'),
});
