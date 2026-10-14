/**
 * أداة سطر الأوامر لفحص وتحليل قواعد بيانات SQLite (Standalone Database Inspector)
 * الاستخدام:
 *   powershell -Command "$env:ELECTRON_RUN_AS_NODE='1'; & npx electron scripts/inspect-db.js [مسار_الملف]"
 *
 * يقوم بقراءة أي ملف قاعدة بيانات (.db) في وضع القراءة فقط واستخراج:
 * 1. المستخدمين المسجلين وحساباتهم (مين مسجل؟)
 * 2. دليل الأرقام والتواصل والعملاء والموردين والمديونيات (الارقام)
 * 3. حركات وفواتير المبيعات وبنودها (العمليات)
 * 4. المخزون والمنتجات والأسعار
 * 5. الورديات والخزينة
 * 6. سجل الرقابة والتدقيق
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function formatBytes(bytes) {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function findDefaultDb() {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : '/var/local');
  const appDataDb = path.join(appData, 'cosmetics-pos-system', 'cosmetics_pos.db');
  if (fs.existsSync(appDataDb)) return appDataDb;

  const localDb = path.join(process.cwd(), 'cosmetics_pos.db');
  if (fs.existsSync(localDb)) return localDb;

  // فحص مجلد النسخ الاحتياطية
  const backupsDir = path.join(appData, 'cosmetics-pos-system', 'backups');
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.db'));
    if (files.length > 0) {
      files.sort((a, b) => fs.statSync(path.join(backupsDir, b)).mtimeMs - fs.statSync(path.join(backupsDir, a)).mtimeMs);
      return path.join(backupsDir, files[0]);
    }
  }

  return appDataDb;
}

const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : findDefaultDb();

console.log('='.repeat(70));
console.log('🔍 مستكشف وفاحص قواعد البيانات SQLite - Boutique Gouri');
console.log('='.repeat(70));

if (!fs.existsSync(targetPath)) {
  console.error(`❌ خطأ: ملف قاعدة البيانات غير موجود في المسار:`);
  console.error(`   ${targetPath}`);
  process.exit(1);
}

const stat = fs.statSync(targetPath);
console.log(`📁 الملف المستهدف: ${path.basename(targetPath)}`);
console.log(`📍 المسار الكامل: ${targetPath}`);
console.log(`📦 الحجم: ${formatBytes(stat.size)}`);
console.log(`🕒 تاريخ التعديل: ${stat.mtime.toLocaleString('ar-EG')}`);

// فتح قاعدة البيانات في وضع القراءة فقط
let db;
try {
  db = new Database(targetPath, { readonly: true, fileMustExist: true });
} catch (err) {
  console.error(`❌ فشل فتح ملف قاعدة البيانات: ${err.message}`);
  process.exit(1);
}

try {
  // 1. فحص السلامة والتكامل
  const integrity = db.pragma('integrity_check');
  const integrityResult = integrity[0] ? Object.values(integrity[0])[0] : 'Unknown';
  console.log(`🛡️ فحص السلامة (PRAGMA integrity_check): ${integrityResult === 'ok' ? '✅ سليم 100%' : '⚠️ ' + integrityResult}`);

  // الجداول المتوفرة
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));

  // اسم المتجر
  let storeName = 'غير محدد';
  let storePhone = 'غير محدد';
  if (tables.has('settings')) {
    const sRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('store_name', 'store_phone')").all();
    for (const r of sRows) {
      if (r.key === 'store_name') storeName = r.value;
      if (r.key === 'store_phone') storePhone = r.value;
    }
  }
  console.log(`🏪 اسم المتجر: ${storeName} | هاتف المتجر: ${storePhone}`);
  console.log('-'.repeat(70));

  // 2. المستخدمين المسجلين (مين مسجل؟)
  console.log('\n👥 [1] المستخدمين المسجلين في النظام (الحسابات والصلاحيات):');
  let users = [];
  if (tables.has('users')) {
    users = db.prepare("SELECT id, username, display_name, role, is_active, created_at, (pin_hash IS NOT NULL AND pin_hash != '') as has_pin FROM users ORDER BY id ASC").all();
    if (users.length === 0) {
      console.log('   (لا يوجد مستخدمين مسجلين)');
    } else {
      users.forEach(u => {
        const roleAr = u.role === 'owner' ? 'مالك النظام' : u.role === 'manager' ? 'مدير فرع' : 'كاشير مبيعات';
        const statusAr = u.is_active ? 'نشط' : 'معطل';
        console.log(`   #${u.id} | ${u.display_name} (@${u.username}) | الدور: ${roleAr} | PIN: ${u.has_pin ? 'نعم' : 'لا'} | الحالة: ${statusAr} | مسجل في: ${u.created_at}`);
      });
    }
  } else {
    console.log('   (جدول المستخدمين غير موجود)');
  }

  // 3. دليل الأرقام والتواصل (الارقام)
  console.log('\n📞 [2] دليل الأرقام والتواصل (العملاء والموردين والمديونيات):');
  let customers = [];
  let suppliers = [];
  if (tables.has('customers')) {
    customers = db.prepare("SELECT id, name, phone, balance, notes, created_at FROM customers ORDER BY balance DESC, id DESC").all();
  }
  if (tables.has('suppliers')) {
    suppliers = db.prepare("SELECT id, name, phone, address, balance, created_at FROM suppliers ORDER BY id DESC").all();
  }

  console.log(`   🔹 إجمالي العملاء: ${customers.length} عميل | إجمالي الموردين: ${suppliers.length} مورد`);
  if (customers.length > 0) {
    console.log('   --- العملاء المسجلون وأرقامهم:');
    customers.forEach(c => {
      const balanceEgp = (c.balance || 0) / 100;
      const debtStatus = balanceEgp > 0 ? `[مديونية: ${balanceEgp.toFixed(2)} ج.م]` : `[رصيد: ${balanceEgp.toFixed(2)} ج.م]`;
      console.log(`   👤 عميل: ${c.name} | هاتف: ${c.phone || 'بدون هاتف'} | ${debtStatus} ${c.notes ? '| ملاحظات: ' + c.notes : ''}`);
    });
  }
  if (suppliers.length > 0) {
    console.log('   --- الموردون وشركات التوريد:');
    suppliers.forEach(s => {
      const balanceEgp = (s.balance || 0) / 100;
      console.log(`   🏢 مورد: ${s.name} | هاتف: ${s.phone || 'بدون هاتف'} | رصيد: ${balanceEgp.toFixed(2)} ج.م | عنوان: ${s.address || '—'}`);
    });
  }

  // 4. العمليات والمبيعات (كل العمليات)
  console.log('\n🧾 [3] العمليات وفواتير المبيعات المسجلة:');
  let sales = [];
  if (tables.has('sales')) {
    const saleRows = db.prepare(`
      SELECT s.id, s.invoice_no, s.created_at, s.total, s.discount_amount, s.status,
             u.display_name as cashier_name,
             c.name as customer_name, c.phone as customer_phone
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.id DESC
      LIMIT 100
    `).all();

    sales = saleRows;
    const totalRev = db.prepare("SELECT COALESCE(SUM(total), 0) as rev FROM sales WHERE status = 'completed'").get().rev / 100;
    console.log(`   🔹 إجمالي الفواتير: ${sales.length} فاتورة | إجمالي المبيعات المحققة: ${totalRev.toLocaleString()} ج.م`);

    if (sales.length > 0) {
      sales.slice(0, 15).forEach(s => {
        const totalEgp = (s.total || 0) / 100;
        console.log(`   🧾 فاتورة ${s.invoice_no} | التاريخ: ${s.created_at} | الكاشير: ${s.cashier_name || 'غير معروف'} | العميل: ${s.customer_name || 'نقدي'} | الصافي: ${totalEgp.toFixed(2)} ج.م | الحالة: ${s.status}`);
      });
      if (sales.length > 15) {
        console.log(`   ... وهناك ${sales.length - 15} فاتورة أخرى (تم عرض أحدث 15).`);
      }
    } else {
      console.log('   (لا توجد فواتير مبيعات مسجلة)');
    }
  }

  // 5. المنتجات والمخزون
  console.log('\n📦 [4] المنتجات والمخزون:');
  if (tables.has('products')) {
    const countRow = db.prepare("SELECT COUNT(*) as total_products FROM products").get();
    console.log(`   🔹 عدد المنتجات المسجلة في الكتالوج: ${countRow.total_products} منتج`);
  }

  // 6. الورديات
  console.log('\n🕒 [5] الورديات المسجلة:');
  if (tables.has('shifts')) {
    const shiftRows = db.prepare(`
      SELECT s.id, s.opened_at, s.closed_at, s.status, s.opening_balance, s.closing_balance,
             u.display_name as cashier_name
      FROM shifts s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
      LIMIT 10
    `).all();
    console.log(`   🔹 إجمالي الورديات المسجلة: ${shiftRows.length} وردية`);
    shiftRows.forEach(sh => {
      console.log(`    وردية #${sh.id} | الكاشير: ${sh.cashier_name} | الحالة: ${sh.status} | فتحت: ${sh.opened_at}`);
    });
  }

  // تصدير ملف JSON كامل
  const exportPath = path.join(process.cwd(), `database_audit_${path.basename(targetPath, '.db')}.json`);
  const exportPayload = {
    analyzedAt: new Date().toISOString(),
    databaseFile: targetPath,
    fileSizeBytes: stat.size,
    integrity: integrityResult,
    store: { name: storeName, phone: storePhone },
    users,
    contacts: {
      customers,
      suppliers,
    },
    salesSummary: {
      totalCount: sales.length,
      recentSales: sales,
    },
  };

  fs.writeFileSync(exportPath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log('\n' + '='.repeat(70));
  console.log(`✅ تم حفظ تقرير الفحص الشامل بصيغة JSON في:`);
  console.log(`   ${exportPath}`);
  console.log('='.repeat(70));

} finally {
  db.close();
}
