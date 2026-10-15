const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local');
const targetPaths = [
  path.join(appData, 'cosmetics-pos-system', 'cosmetics_pos.db'),
  path.join(process.cwd(), 'cosmetics_pos.db'),
];

const existingDbs = targetPaths.filter((p) => fs.existsSync(p));

if (existingDbs.length === 0) {
  console.log('لا يوجد ملفات قواعد بيانات حالية.');
  process.exit(0);
}

for (const dbPath of existingDbs) {
  console.log(`\n======================================================`);
  console.log(`🧹 جاري تصفير ومسح قاعدة البيانات: ${dbPath}`);
  console.log(`======================================================`);

  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF');

  // 1. حذف التريجرز مؤقتاً لتخطي حماية الـ Append-Only أثناء التهيئة
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger'").all();
  console.log(`Dropping ${triggers.length} triggers temporarily...`);
  for (const trg of triggers) {
    db.exec(`DROP TRIGGER IF EXISTS "${trg.name}"`);
  }

  // 2. تفريغ جميع الجداول
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_version'")
    .all();

  let totalDeleted = 0;
  for (const t of tables) {
    try {
      const res = db.prepare(`DELETE FROM "${t.name}"`).run();
      totalDeleted += res.changes;
      console.log(`Wiped: ${t.name} (${res.changes} rows)`);
    } catch (err) {
      console.error(`Failed ${t.name}:`, err.message);
    }
  }

  // 3. تصفير عدادات الأرقام التسلسلية
  try {
    db.prepare('DELETE FROM sqlite_sequence').run();
  } catch {}

  // 4. إعادة بناء التريجرز
  console.log('Re-creating triggers...');
  for (const trg of triggers) {
    if (trg.sql) {
      db.exec(trg.sql);
    }
  }

  // 5. تهيئة الإعدادات الافتراضية
  try {
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES 
      ('store_name', 'بوتيك جوري - كوزمتكس', datetime('now')),
      ('system_initialized', '0', datetime('now')),
      ('vat_enabled', '0', datetime('now')),
      ('vat_rate', '14', datetime('now')),
      ('currency', 'ج.م', datetime('now')),
      ('backup_retention_days', '30', datetime('now')),
      ('auto_lock_minutes', '5', datetime('now')),
      ('max_login_attempts', '5', datetime('now')),
      ('lockout_minutes', '15', datetime('now'))
    `).run();
  } catch (e) {
    console.log('Settings error:', e.message);
  }

  // 6. تهيئة عدادات الباركود والفواتير
  try {
    db.prepare("INSERT OR REPLACE INTO counters (name, value) VALUES ('internal_barcode_seq', 1)").run();
    db.prepare("INSERT OR REPLACE INTO counters (name, value) VALUES ('sale_seq', 0)").run();
    db.prepare("INSERT OR REPLACE INTO counters (name, value) VALUES ('purchase_seq', 0)").run();
  } catch {}

  db.pragma('foreign_keys = ON');
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();

  console.log(`🎉 تم تصفير قاعدة البيانات بنجاح تام! Total rows wiped: ${totalDeleted}`);
}
