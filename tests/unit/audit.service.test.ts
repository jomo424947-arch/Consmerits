import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/main/db/migrator';
import { AuditService } from '../../src/main/services/audit.service';
import { AuthService } from '../../src/main/services/auth.service';
import { USER_ROLES } from '../../src/shared/constants/roles';

describe('AuditService (سجل الرقابة والتدقيق الأمني - Append-Only)', () => {
  let db: Database.Database;
  let auditService: AuditService;
  let authService: AuthService;
  let testUser: any;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);

    auditService = new AuditService(db);
    authService = new AuthService(db, auditService);

    testUser = authService.createUser({
      username: 'audited_user',
      display_name: 'المستخدم المراقب',
      password: 'password',
      role: USER_ROLES.CASHIER,
    });
  });

  afterEach(() => {
    db.close();
  });

  test('تسجيل الأحداث الرقابية واسترجاعها بدقة', () => {
    auditService.log({
      userId: testUser.id,
      action: 'SECURITY_LOGIN_SUCCESS',
      entityType: 'users',
      entityId: testUser.id,
      details: { ip: '127.0.0.1', method: 'PIN' },
    });

    auditService.log({
      userId: testUser.id,
      action: 'PRICE_CHANGE',
      entityType: 'product_variants',
      entityId: 101,
      details: { oldPrice: 15000, newPrice: 18000 },
    });

    const { logs, total } = auditService.listLogs();
    expect(total).toBeGreaterThanOrEqual(2);
    expect(logs[0].action).toBe('PRICE_CHANGE');
    expect(logs[0].username).toBe('audited_user');
    expect(logs[0].details).toEqual({ oldPrice: 15000, newPrice: 18000 });
  });

  test('تصفية سجل التدقيق حسب نوع الحدث والتاريخ والمستخدم', () => {
    auditService.log({
      userId: testUser.id,
      action: 'EXCEPTION_DISCOUNT',
      entityType: 'sales',
      details: { percent: 12 },
    });

    // تصفية بنوع الحدث
    const filtered = auditService.listLogs({ action: 'EXCEPTION_DISCOUNT' });
    expect(filtered.logs.length).toBe(1);
    expect(filtered.logs[0].action).toBe('EXCEPTION_DISCOUNT');

    // تصفية بحدث غير موجود
    const empty = auditService.listLogs({ action: 'NON_EXISTENT_ACTION' });
    expect(empty.logs.length).toBe(0);
  });

  test('تصدير سجل الرقابة إلى ملف CSV متوافق مع Excel', () => {
    auditService.log({
      userId: testUser.id,
      action: 'DRAWER_OPEN_NOSALE',
      entityType: 'cash_drawer',
      details: { reason: 'فكة للزبون' },
    });

    const csv = auditService.exportToCSV();
    expect(csv.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
    expect(csv).toContain('DRAWER_OPEN_NOSALE');
    expect(csv).toContain('audited_user');
  });

  test('قواعد النزاهة الفائقة: منع تعديل أو حذف أي حركة رقابية نهائياً (Append-Only Triggers)', () => {
    auditService.log({
      userId: testUser.id,
      action: 'CRITICAL_ACTION',
      entityType: 'system',
    });

    const lastLog = db.prepare('SELECT id FROM audit_log ORDER BY id DESC LIMIT 1').get() as { id: number };

    // محاولة التعديل ترمي استثناء صريحاً من الـ Trigger
    expect(() => {
      db.prepare('UPDATE audit_log SET action = ? WHERE id = ?').run('MODIFIED_ACTION', lastLog.id);
    }).toThrow(/append-only/i);

    // محاولة الحذف ترمي استثناء صريحاً من الـ Trigger
    expect(() => {
      db.prepare('DELETE FROM audit_log WHERE id = ?').run(lastLog.id);
    }).toThrow(/append-only/i);
  });
});
