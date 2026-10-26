/**
 * مسجل أحداث متزامن وعالي الموثوقية (Synchronous Diagnostic File Logger)
 * يكتب مباشرة وبشكل تزامني في ملف <userData>/logs/main.log
 * مع تدوير تلقائي للملف عند وصوله إلى ~1 ميجابايت (الاحتفاظ بنسخة main.old.log)
 * ويعمل قبل حتى اكتمال حدث app.ready عبر الرجوع التلقائي لمسار %APPDATA%
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_LOG_SIZE_BYTES = 1024 * 1024; // 1 MB

class Logger {
  private logDir: string;
  private logFilePath: string;
  private oldLogFilePath: string;

  constructor() {
    this.logDir = this.resolveLogDir();
    this.logFilePath = path.join(this.logDir, 'main.log');
    this.oldLogFilePath = path.join(this.logDir, 'main.old.log');
    this.ensureDirExists();
  }

  private resolveLogDir(): string {
    try {
      // محاولة استخدام app.getPath('userData') إذا كان Electron جاهزاً
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { app } = require('electron');
      if (app && typeof app.getPath === 'function') {
        const userData = app.getPath('userData');
        if (userData) {
          return path.join(userData, 'logs');
        }
      }
    } catch {
      // تجاهل
    }

    // الرجوع التلقائي لـ %APPDATA% قبل جاهزية Electron
    const appData =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));

    return path.join(appData, 'cosmetics-pos-system', 'logs');
  }

  private ensureDirExists(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create logs directory:', err);
    }
  }

  private rotateIfNeeded(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const stat = fs.statSync(this.logFilePath);
        if (stat.size >= MAX_LOG_SIZE_BYTES) {
          if (fs.existsSync(this.oldLogFilePath)) {
            try {
              fs.unlinkSync(this.oldLogFilePath);
            } catch {
              // تجاهل
            }
          }
          fs.renameSync(this.logFilePath, this.oldLogFilePath);
        }
      }
    } catch {
      // تجاهل أخطاء التدوير لضمان عدم توقف التسجيل
    }
  }

  public write(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    let formattedMessage = `[${timestamp}] [PID:${pid}] [${level}] ${message}`;

    if (meta !== undefined) {
      if (meta instanceof Error) {
        formattedMessage += `\n  Stack: ${meta.stack || meta.message}`;
      } else if (typeof meta === 'object') {
        try {
          formattedMessage += ` ${JSON.stringify(meta)}`;
        } catch {
          formattedMessage += ` [Object unstringifiable]`;
        }
      } else {
        formattedMessage += ` ${String(meta)}`;
      }
    }
    formattedMessage += '\n';

    // طباعة في الـ console
    if (level === 'ERROR') {
      console.error(formattedMessage.trimEnd());
    } else if (level === 'WARN') {
      console.warn(formattedMessage.trimEnd());
    } else {
      console.log(formattedMessage.trimEnd());
    }

    // كتابة تزامنية في الملف لضمان الحفظ حتى لو حدث كراش أو خروج مفاجئ
    try {
      this.ensureDirExists();
      this.rotateIfNeeded();
      fs.appendFileSync(this.logFilePath, formattedMessage, 'utf8');
    } catch (writeErr) {
      console.error('Failed to write to main.log:', writeErr);
    }
  }

  public info(message: string, meta?: any): void {
    this.write('INFO', message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.write('WARN', message, meta);
  }

  public error(message: string, meta?: any): void {
    this.write('ERROR', message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.write('DEBUG', message, meta);
  }

  public getLogPath(): string {
    return this.logFilePath;
  }

  public getLogDir(): string {
    return this.logDir;
  }
}

export const logger = new Logger();
