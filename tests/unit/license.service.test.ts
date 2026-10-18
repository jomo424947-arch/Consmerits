import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { LicenseService } from '../../src/main/services/license.service';
import { ACTIVATION_KEY, LICENSE_ENCRYPTION_KEY } from '../../src/main/config/license.config';

describe('LicenseService (نظام الترخيص والتفعيل الاوفلاين)', () => {
  let service: LicenseService;
  let testDir: string;
  let licenseFilePath: string;
  let attemptsFilePath: string;

  beforeEach(() => {
    service = new LicenseService();
    testDir = path.resolve(process.cwd());
    licenseFilePath = path.join(testDir, '.license.dat');
    attemptsFilePath = path.join(testDir, '.license_attempts.dat');

    // تنظيف اي ملفات قديمة قبل الفحص
    if (fs.existsSync(licenseFilePath)) {
      try { fs.unlinkSync(licenseFilePath); } catch {}
    }
    if (fs.existsSync(attemptsFilePath)) {
      try { fs.unlinkSync(attemptsFilePath); } catch {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(licenseFilePath)) {
      try { fs.unlinkSync(licenseFilePath); } catch {}
    }
    if (fs.existsSync(attemptsFilePath)) {
      try { fs.unlinkSync(attemptsFilePath); } catch {}
    }
  });

  it('توليد معرف فريد وثابت للجهاز (Machine ID)', () => {
    const id1 = service.generateMachineId();
    const id2 = service.generateMachineId();

    expect(id1).toBeDefined();
    expect(typeof id1).toBe('string');
    expect(id1.length).toBe(32);
    expect(id1).toBe(id2); // ثابت لنفس الجهاز
  });

  it('التحقق من صحة المفتاح الرئيسي الثابت', () => {
    expect(service.verifyKey(ACTIVATION_KEY)).toBe(true);
    expect(service.verifyKey(ACTIVATION_KEY.toLowerCase())).toBe(true);
  });

  it('التحقق من صحة مفتاح تفعيل مشتق بواسطة HMAC', () => {
    const part1 = 'ABCD';
    const part2 = '1234';
    const payload = `${part1}-${part2}`;
    const sig = crypto
      .createHmac('sha256', LICENSE_ENCRYPTION_KEY)
      .update(payload)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    const derivedKey = `${part1}-${part2}-${sig.substring(0, 4)}-${sig.substring(4, 8)}`;
    expect(service.verifyKey(derivedKey)).toBe(true);
  });

  it('رفض المفاتيح المزيفة وغير المتطابقة', () => {
    expect(service.verifyKey('INVALID-KEY-1234-5678')).toBe(false);
    expect(service.verifyKey('1111-2222-3333-4444')).toBe(false);
    expect(service.verifyKey('')).toBe(false);
    expect(service.verifyKey('SHORT-KEY')).toBe(false);
  });

  it('فحص حالة غير مفعّل عند عدم وجود ملف التفعيل', () => {
    const status = service.checkActivationStatus();
    expect(status.isActivated).toBe(false);
  });

  it('تفعيل النظام بالمفتاح الصحيح وحفظ ملف تفعيل مشفر', () => {
    const res = service.activate(ACTIVATION_KEY);
    expect(res.success).toBe(true);

    // التأكد من انشاء ملف التفعيل
    expect(fs.existsSync(licenseFilePath)).toBe(true);

    // فحص الحالة بعد التفعيل
    const status = service.checkActivationStatus();
    expect(status.isActivated).toBe(true);
    expect(status.machineId).toBe(service.generateMachineId());
  });

  it('رفض التفعيل عند ادخال مفتاح خاطئ وتخفيض عدد المحاولات المتبقية', () => {
    const res = service.activate('WRON-GKEY-0000-0000');
    expect(res.success).toBe(false);
    expect(res.attemptsRemaining).toBe(4);

    const status = service.checkActivationStatus();
    expect(status.isActivated).toBe(false);
  });

  it('قفل التفعيل مؤقتا بعد تجاوز الحد الاقصى للمحاولات الخاطئة (5 محاولات)', () => {
    for (let i = 0; i < 4; i++) {
      service.activate('WRON-GKEY-0000-0000');
    }
    const finalAttempt = service.activate('WRON-GKEY-0000-0000');
    expect(finalAttempt.success).toBe(false);
    expect(finalAttempt.attemptsRemaining).toBe(0);
    expect(finalAttempt.lockedUntil).not.toBeNull();

    // محاولة اخرى بعد القفل
    const lockedAttempt = service.activate(ACTIVATION_KEY);
    expect(lockedAttempt.success).toBe(false);
    expect(lockedAttempt.error).toContain('تم قفل التفعيل مؤقتا');
  });
});
