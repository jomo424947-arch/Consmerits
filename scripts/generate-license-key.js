/**
 * اداة توليد وادارة مفاتيح التفعيل لنظام Boutique Gouri
 * خاصة بالمطور لتوليد مفاتيح خاصة بكل عميل
 * 
 * الاستخدام:
 *   node scripts/generate-license-key.js generate --client "اسم العميل"
 *   node scripts/generate-license-key.js list
 *   node scripts/generate-license-key.js verify --key "XXXX-XXXX-XXXX-XXXX"
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LICENSE_ENCRYPTION_KEY = 'cG9zLWJvdXRpcXVlLWdvdXJpLTIwMjYtc2VjcmV0LWtleQ==';
const MASTER_KEY = 'GOUR-BTQE-2026-XKEY';
const REGISTRY_PATH = path.join(__dirname, 'license-registry.json');

function getRegistry() {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // ملف جديد
  }
  return { keys: [] };
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

function generateKeyForClient(clientName) {
  // توليد بادئة فريدة مكونة من جزئين (كل جزء 4 خانات)
  const seed = `${clientName || 'CLIENT'}_${Date.now()}_${Math.random()}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex').toUpperCase();
  
  const part1 = hash.substring(0, 4);
  const part2 = hash.substring(4, 8);
  const payload = `${part1}-${part2}`;

  // حساب التوقيع بواسطة مفتاح التشفير
  const sig = crypto
    .createHmac('sha256', LICENSE_ENCRYPTION_KEY)
    .update(payload)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  const part3 = sig.substring(0, 4);
  const part4 = sig.substring(4, 8);

  const fullKey = `${part1}-${part2}-${part3}-${part4}`;

  const registry = getRegistry();
  const entry = {
    key: fullKey,
    client: clientName || 'عميل بدون اسم',
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  registry.keys.push(entry);
  saveRegistry(registry);

  return entry;
}

function verifyKey(key) {
  if (!key) return false;
  const clean = key.trim().toUpperCase();

  if (clean === MASTER_KEY) {
    return { valid: true, isMaster: true };
  }

  const parts = clean.split('-');
  if (parts.length !== 4) return { valid: false };
  for (const part of parts) {
    if (part.length !== 4) return { valid: false };
  }

  const payload = `${parts[0]}-${parts[1]}`;
  const expectedSig = crypto
    .createHmac('sha256', LICENSE_ENCRYPTION_KEY)
    .update(payload)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();

  const actualSig = `${parts[2]}${parts[3]}`;
  const valid = expectedSig === actualSig;

  return { valid, isMaster: false };
}

// قراءة المدخلات من سطر الاوامر
const args = process.argv.slice(2);
const command = args[0];

console.log('==================================================');
console.log('نظام ادارة تراخيص تطبيق Boutique Gouri');
console.log('المفتاح الرئيسي الثابت:', MASTER_KEY);
console.log('==================================================\n');

if (command === 'generate') {
  let clientName = 'افتراضي';
  const clientIdx = args.indexOf('--client');
  if (clientIdx !== -1 && args[clientIdx + 1]) {
    clientName = args[clientIdx + 1];
  }

  const entry = generateKeyForClient(clientName);
  console.log('[نجاح] تم توليد مفتاح تفعيل جديد بنجاح:');
  console.log('--------------------------------------------------');
  console.log('العميل:       ', entry.client);
  console.log('مفتاح التفعيل:', entry.key);
  console.log('تاريخ الانشاء:', entry.createdAt);
  console.log('--------------------------------------------------');
  console.log('تم تسجيل المفتاح في:', REGISTRY_PATH);
} else if (command === 'verify') {
  let keyToVerify = '';
  const keyIdx = args.indexOf('--key');
  if (keyIdx !== -1 && args[keyIdx + 1]) {
    keyToVerify = args[keyIdx + 1];
  } else if (args[1]) {
    keyToVerify = args[1];
  }

  if (!keyToVerify) {
    console.log('[خطا] يرجى تحديد المفتاح المراد فحصه: node scripts/generate-license-key.js verify --key "XXXX-XXXX-XXXX-XXXX"');
    process.exit(1);
  }

  const res = verifyKey(keyToVerify);
  if (res.valid) {
    console.log('[صحيح] المفتاح صالح ومطابق للنظام' + (res.isMaster ? ' (المفتاح الرئيسي)' : ' (مفتاح عميل مشتق)'));
  } else {
    console.log('[خطا] المفتاح غير صالح او غير مطابق لخوارزمية التحقق');
  }
} else if (command === 'list') {
  const reg = getRegistry();
  console.log('قائمة المفاتيح المولدة (' + reg.keys.length + ' مفتاح):');
  console.log('--------------------------------------------------');
  if (reg.keys.length === 0) {
    console.log('لا توجد مفاتيح مولدة بعد.');
  } else {
    reg.keys.forEach((k, idx) => {
      console.log(`${idx + 1}. [${k.status}] ${k.key} - ${k.client} (${k.createdAt.split('T')[0]})`);
    });
  }
  console.log('--------------------------------------------------');
} else {
  console.log('الاوامر المتاحة:');
  console.log('  node scripts/generate-license-key.js generate --client "اسم العميل"');
  console.log('  node scripts/generate-license-key.js list');
  console.log('  node scripts/generate-license-key.js verify --key "XXXX-XXXX-XXXX-XXXX"');
}
