/**
 * خدمة الترخيص والتفعيل (License Service)
 * تدير: التحقق من مفتاح التفعيل، توليد بصمة الجهاز،
 * حفظ وقراءة ملف التفعيل المشفر، والحماية من محاولات التخمين
 */

import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  ACTIVATION_KEY,
  LICENSE_ENCRYPTION_KEY,
  LICENSE_FILE_NAME,
  MAX_ACTIVATION_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from '../config/license.config';

/** بيانات ملف التفعيل المحفوظ */
interface LicenseData {
  activationKey: string;
  machineId: string;
  activatedAt: string;
  appVersion: string;
}

/** بيانات حالة محاولات التفعيل الخاطئة */
interface AttemptData {
  failedCount: number;
  lockedUntil: string | null;
}

/** نتيجة عملية التفعيل */
export interface ActivationResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
  lockedUntil?: string | null;
}

/** حالة الترخيص */
export interface LicenseStatus {
  isActivated: boolean;
  activatedAt?: string;
  machineId?: string;
}

export class LicenseService {
  private licenseFilePath: string;
  private attemptsFilePath: string;

  constructor() {
    const appDataDir = this.getAppDataDir();
    this.licenseFilePath = path.join(appDataDir, LICENSE_FILE_NAME);
    this.attemptsFilePath = path.join(appDataDir, '.license_attempts.dat');
  }

  /**
   * الحصول على مسار مجلد بيانات التطبيق
   */
  private getAppDataDir(): string {
    try {
      const { app } = require('electron');
      if (app && typeof app.getPath === 'function') {
        return app.getPath('userData');
      }
    } catch {
      // بيئة غير Electron
    }
    return path.resolve(process.cwd());
  }

  /**
   * توليد بصمة فريدة للجهاز بناء على خصائص الهاردوير
   * تجمع: اسم الجهاز + معالج + حجم ذاكرة + منصة + عناوين الشبكة
   */
  generateMachineId(): string {
    const components: string[] = [];

    // اسم الجهاز
    components.push(os.hostname());

    // نوع المعالج والمنصة
    components.push(os.platform());
    components.push(os.arch());

    // حجم الذاكرة الكلي (بالميغابايت لتجنب التغييرات الطفيفة)
    const totalMemGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    components.push(`mem-${totalMemGB}GB`);

    // معلومات المعالج
    const cpus = os.cpus();
    if (cpus.length > 0) {
      components.push(cpus[0].model);
      components.push(`cores-${cpus.length}`);
    }

    // عناوين MAC للشبكة (غير الداخلية فقط)
    const networkInterfaces = os.networkInterfaces();
    const macAddresses: string[] = [];
    for (const iface of Object.values(networkInterfaces)) {
      if (!iface) continue;
      for (const config of iface) {
        if (!config.internal && config.mac && config.mac !== '00:00:00:00:00:00') {
          macAddresses.push(config.mac);
        }
      }
    }
    macAddresses.sort();
    if (macAddresses.length > 0) {
      components.push(macAddresses[0]);
    }

    // اسم المستخدم في نظام التشغيل
    try {
      components.push(os.userInfo().username);
    } catch {
      // تجاهل في حال عدم التوفر
    }

    const fingerprint = components.join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
  }

  /**
   * تشفير البيانات باستخدام AES-256-GCM
   */
  private encrypt(data: string): string {
    const key = crypto.createHash('sha256').update(LICENSE_ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // الصيغة: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * فك تشفير البيانات
   */
  private decrypt(encryptedData: string): string | null {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) return null;

      const [ivHex, authTagHex, encrypted] = parts;
      const key = crypto.createHash('sha256').update(LICENSE_ENCRYPTION_KEY).digest();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return null;
    }
  }

  /**
   * قراءة بيانات محاولات التفعيل الخاطئة
   */
  private readAttempts(): AttemptData {
    try {
      if (fs.existsSync(this.attemptsFilePath)) {
        const raw = fs.readFileSync(this.attemptsFilePath, 'utf8');
        const decrypted = this.decrypt(raw);
        if (decrypted) {
          return JSON.parse(decrypted);
        }
      }
    } catch {
      // تجاهل الاخطاء وارجاع القيم الافتراضية
    }
    return { failedCount: 0, lockedUntil: null };
  }

  /**
   * حفظ بيانات محاولات التفعيل
   */
  private saveAttempts(data: AttemptData): void {
    try {
      const encrypted = this.encrypt(JSON.stringify(data));
      const dir = path.dirname(this.attemptsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.attemptsFilePath, encrypted, 'utf8');
    } catch {
      // تجاهل اخطاء الكتابة
    }
  }

  /**
   * فحص هل الحساب مقفل بسبب كثرة المحاولات الخاطئة
   */
  private isLockedOut(): { locked: boolean; lockedUntil: string | null } {
    const attempts = this.readAttempts();
    if (attempts.lockedUntil) {
      const lockTime = new Date(attempts.lockedUntil).getTime();
      if (lockTime > Date.now()) {
        return { locked: true, lockedUntil: attempts.lockedUntil };
      }
      // انتهت فترة القفل - اعادة التصفير
      this.saveAttempts({ failedCount: 0, lockedUntil: null });
    }
    return { locked: false, lockedUntil: null };
  }

  /**
   * تسجيل محاولة تفعيل فاشلة
   */
  private recordFailedAttempt(): { attemptsRemaining: number; lockedUntil: string | null } {
    const attempts = this.readAttempts();
    const newCount = attempts.failedCount + 1;

    if (newCount >= MAX_ACTIVATION_ATTEMPTS) {
      const lockUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
      ).toISOString();
      this.saveAttempts({ failedCount: newCount, lockedUntil: lockUntil });
      return { attemptsRemaining: 0, lockedUntil: lockUntil };
    }

    this.saveAttempts({ failedCount: newCount, lockedUntil: null });
    return {
      attemptsRemaining: MAX_ACTIVATION_ATTEMPTS - newCount,
      lockedUntil: null,
    };
  }

  /**
   * فحص حالة التفعيل الحالية
   */
  checkActivationStatus(): LicenseStatus {
    try {
      if (!fs.existsSync(this.licenseFilePath)) {
        return { isActivated: false };
      }

      const raw = fs.readFileSync(this.licenseFilePath, 'utf8');
      const decrypted = this.decrypt(raw);
      if (!decrypted) {
        return { isActivated: false };
      }

      const licenseData: LicenseData = JSON.parse(decrypted);

      // التحقق من تطابق بصمة الجهاز
      const currentMachineId = this.generateMachineId();
      if (licenseData.machineId !== currentMachineId) {
        return { isActivated: false };
      }

      // التحقق من صحة المفتاح المخزن
      if (!this.verifyKey(licenseData.activationKey)) {
        return { isActivated: false };
      }

      return {
        isActivated: true,
        activatedAt: licenseData.activatedAt,
        machineId: licenseData.machineId,
      };
    } catch {
      return { isActivated: false };
    }
  }

  /**
   * التحقق من صحة مفتاح التفعيل
   * يقبل المفتاح الرئيسي المباشر او اي مفتاح مشتق بخوارزمية HMAC
   */
  verifyKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const clean = key.trim().toUpperCase();

    // 1. فحص المفتاح الرئيسي الافتراضي
    if (clean === ACTIVATION_KEY) {
      return true;
    }

    // 2. التحقق من صيغة المفتاح المشتق (4 مجموعات من 4 خانات)
    const parts = clean.split('-');
    if (parts.length !== 4) return false;
    for (const part of parts) {
      if (part.length !== 4) return false;
    }

    // التحقق من توقيع HMAC
    const payload = `${parts[0]}-${parts[1]}`;
    const expectedSig = crypto
      .createHmac('sha256', LICENSE_ENCRYPTION_KEY)
      .update(payload)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    const actualSig = `${parts[2]}${parts[3]}`;
    return expectedSig === actualSig;
  }

  /**
   * تفعيل التطبيق بمفتاح التفعيل
   */
  activate(inputKey: string): ActivationResult {
    // فحص القفل المؤقت
    const lockStatus = this.isLockedOut();
    if (lockStatus.locked) {
      return {
        success: false,
        error: `تم قفل التفعيل مؤقتا بسبب كثرة المحاولات الخاطئة. يرجى الانتظار حتى انتهاء فترة القفل.`,
        attemptsRemaining: 0,
        lockedUntil: lockStatus.lockedUntil,
      };
    }

    // تنظيف المفتاح المدخل
    const cleanKey = inputKey.trim().toUpperCase();

    // التحقق من صحة المفتاح
    if (!this.verifyKey(cleanKey)) {
      const failResult = this.recordFailedAttempt();
      if (failResult.lockedUntil) {
        return {
          success: false,
          error: `مفتاح التفعيل غير صحيح. تم تجاوز الحد الاقصى للمحاولات وتم قفل التفعيل لمدة ${LOCKOUT_DURATION_MINUTES} دقيقة.`,
          attemptsRemaining: 0,
          lockedUntil: failResult.lockedUntil,
        };
      }
      return {
        success: false,
        error: `مفتاح التفعيل غير صحيح. المحاولات المتبقية: ${failResult.attemptsRemaining}`,
        attemptsRemaining: failResult.attemptsRemaining,
        lockedUntil: null,
      };
    }

    // المفتاح صحيح - حفظ التفعيل
    try {
      const machineId = this.generateMachineId();
      const licenseData: LicenseData = {
        activationKey: cleanKey,
        machineId,
        activatedAt: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      const encrypted = this.encrypt(JSON.stringify(licenseData));
      const dir = path.dirname(this.licenseFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.licenseFilePath, encrypted, 'utf8');

      // اعادة تصفير المحاولات عند النجاح
      this.saveAttempts({ failedCount: 0, lockedUntil: null });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: 'حدث خطا اثناء حفظ التفعيل. يرجى المحاولة مرة اخرى.',
      };
    }
  }

  /**
   * جلب معرف الجهاز لعرضه للمستخدم
   */
  getMachineId(): string {
    return this.generateMachineId();
  }

  /**
   * جلب معلومات الترخيص الحالية
   */
  getLicenseInfo(): LicenseStatus & { machineIdShort?: string } {
    const status = this.checkActivationStatus();
    const machineId = this.generateMachineId();
    return {
      ...status,
      machineId,
      machineIdShort: machineId.substring(0, 12).toUpperCase(),
    };
  }
}

export const licenseService = new LicenseService();
