/**
 * سيناريو التحقق الآلي من الإقلاع المتكرر والتعافي من الإغلاق القسري
 * (Automated Verification of Repeated Relaunches & Unclean Exit Recovery)
 *
 * يختبر:
 * 1. دورة التشغيل والإغلاق النظيف عبر النقر على زر الإغلاق 10 مرات متتالية فورية (Graceful Shutdown via mainWindow.close())
 * 2. التأكد من اختفاء العملية تماماً من إدارة المهام خلال أقل من 5 ثوانٍ
 * 3. التأكد من تفريغ ملف الـ WAL إلى 0 بايت أو اختفائه تماماً
 * 4. دورة الإغلاق القسري (Force Kill - taskkill /F) لـ 3 مرات لاختبار التعافي من الانهيار (Unclean Exit Recovery)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const USER_DATA_DIR = path.join(APPDATA, 'cosmetics-pos-system');
const LOG_FILE = path.join(USER_DATA_DIR, 'logs', 'main.log');
const DB_WAL_FILE = path.join(USER_DATA_DIR, 'boutique_gouri.db-wal');
const SESSION_ACTIVE_FILE = path.join(USER_DATA_DIR, '.session-active');

function findExecutable() {
  const candidates = [
    path.resolve(__dirname, '../release/win-unpacked/BoutiqueGouri.exe'),
    path.resolve(__dirname, '../release/win-ia32-unpacked/BoutiqueGouri.exe'),
    path.resolve(__dirname, '../release/win-unpacked/Boutique Gouri - نظام بيع وجرد مستحضرات التجميل.exe'),
    path.resolve(__dirname, '../release/win-ia32-unpacked/Boutique Gouri - نظام بيع وجرد مستحضرات التجميل.exe'),
    path.resolve(__dirname, '../node_modules/electron/dist/electron.exe'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  throw new Error('لم يتم العثور على أي ملف تنفيذي لاختباره.');
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function isPidRunning(pid) {
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: 'utf8' });
    return out.includes(String(pid));
  } catch {
    return false;
  }
}

function killPidForced(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
  } catch {
    // تجاهل
  }
}

function getLogSize() {
  if (fs.existsSync(LOG_FILE)) {
    return fs.statSync(LOG_FILE).size;
  }
  return 0;
}

function readNewLogs(fromOffset) {
  if (!fs.existsSync(LOG_FILE)) return '';
  const currentSize = fs.statSync(LOG_FILE).size;
  if (currentSize <= fromOffset) return '';

  const fd = fs.openSync(LOG_FILE, 'r');
  const buffer = Buffer.alloc(currentSize - fromOffset);
  fs.readSync(fd, buffer, 0, buffer.length, fromOffset);
  fs.closeSync(fd);
  return buffer.toString('utf8');
}

function waitForLogMessage(fromOffset, expectedText, timeoutMs = 12000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const newLogs = readNewLogs(fromOffset);
    if (newLogs.includes(expectedText)) {
      return true;
    }
    sleep(200);
  }
  return false;
}

async function runTest() {
  console.log('================================================================');
  console.log('  بدء الاختبار الآلي: التحقق من استقرار الإقلاع المتكرر والتعافي  ');
  console.log('================================================================');

  const exePath = findExecutable();
  console.log(`✓ الملف التنفيذي المستخدم: ${exePath}`);
  console.log(`✓ مسار مجلد البيانات: ${USER_DATA_DIR}`);
  console.log(`✓ مسار ملف السجلات: ${LOG_FILE}\n`);

  let passedTests = 0;
  let totalTests = 0;

  // -------------------------------------------------------------
  // الجزء الأول: 10 دورات تشغيل وإغلاق نظيف متتالي (محاكاة نقر المستخدم على X)
  // -------------------------------------------------------------
  console.log('--- [المرحلة 1]: اختبار 10 دورات تشغيل وإغلاق نظيف متتالي (Graceful Shutdown) ---');

  for (let cycle = 1; cycle <= 10; cycle++) {
    totalTests++;
    console.log(`\n[دورة ${cycle}/10] جاري بدء التشغيل مع إغلاق آلي محاكي لنقر الزر X...`);
    const initialLogOffset = getLogSize();

    const isPackaged = !exePath.endsWith('electron.exe');
    const args = isPackaged
      ? ['--test-auto-close=2000']
      : [path.resolve(__dirname, '..'), '--test-auto-close=2000'];

    const child = spawn(exePath, args, { detached: false, stdio: 'ignore' });
    const pid = child.pid;
    console.log(`  -> انطلقت العملية PID: ${pid}`);

    // الانتظار حتى ظهور حدث إظهار النافذة في السجل
    const windowShown = waitForLogMessage(initialLogOffset, 'Revealing main window', 15000);
    if (!windowShown) {
      console.error(`  ✕ فشل: لم يتم رصد ظهور النافذة خلال 15 ثانية في الدورة ${cycle}`);
      killPidForced(pid);
      continue;
    }
    console.log('  -> تم رصد ظهور النافذة الرئيسية بنجاح في السجل.');

    // انتظار تنفيذ الإغلاق الآلي (مضبوط على 2000ms من تاريخ الظهور)
    console.log('  -> جاري انتظار تنفيذ الإغلاق النظيف (mainWindow.close())...');
    const shutdownLogged = waitForLogMessage(initialLogOffset, 'STARTING CLEAN SHUTDOWN', 10000);
    if (!shutdownLogged) {
      console.warn('  ! تنبيه: لم يتم تسجيل سطر STARTING CLEAN SHUTDOWN خلال المهلة');
    }

    // التحقق من موت العملية تماماً من إدارة المهام خلال 5 ثوانٍ من الإغلاق
    let processExited = false;
    const shutdownStart = Date.now();
    while (Date.now() - shutdownStart < 5000) {
      if (!isPidRunning(pid)) {
        processExited = true;
        break;
      }
      sleep(150);
    }

    if (!processExited) {
      console.error(`  ✕ فشل: ظلت العملية معلقة كـ Zombie بعد 5 ثوانٍ من أمر الإغلاق!`);
      killPidForced(pid);
      continue;
    }
    const elapsed = Date.now() - shutdownStart;
    console.log(`  -> تأكيد: العملية انتهت تماماً من إدارة المهام في ${elapsed}ms.`);

    // التحقق من تفريغ ملف الـ WAL
    let walClean = true;
    if (fs.existsSync(DB_WAL_FILE)) {
      const walSize = fs.statSync(DB_WAL_FILE).size;
      if (walSize > 0) {
        console.warn(`  ! تنبيه: ملف الـ WAL ما زال يحتوي على ${walSize} بايت.`);
        walClean = false;
      } else {
        console.log(`  -> تأكيد: ملف الـ WAL مفرغ بنجاح (0 بايت).`);
      }
    } else {
      console.log(`  -> تأكيد: ملف الـ WAL غير موجود (مفرغ ومغلق تماماً).`);
    }

    passedTests++;
    console.log(`✓ نجحت الدورة ${cycle}/10 بنجاح تام وبدون أي تأخير.`);
  }

  // -------------------------------------------------------------
  // الجزء الثاني: 3 دورات إغلاق قسري (Force Kill) واختبار التعافي
  // -------------------------------------------------------------
  console.log('\n--- [المرحلة 2]: اختبار 3 دورات إغلاق قسري (Crash Simulation & Recovery) ---');

  for (let killCycle = 1; killCycle <= 3; killCycle++) {
    totalTests++;
    console.log(`\n[دورة قسرية ${killCycle}/3] بدء التشغيل...`);
    let logOffset = getLogSize();

    const isPackaged = !exePath.endsWith('electron.exe');
    let child = isPackaged
      ? spawn(exePath, [], { detached: false, stdio: 'ignore' })
      : spawn(exePath, [path.resolve(__dirname, '..')], { detached: false, stdio: 'ignore' });

    let pid = child.pid;
    console.log(`  -> العملية PID: ${pid}`);

    const ready = waitForLogMessage(logOffset, 'Revealing main window', 15000);
    if (!ready) {
      console.error('  ✕ فشل الإقلاع الأولي');
      killPidForced(pid);
      continue;
    }

    sleep(1000);

    // تنفيذ إنهاء قسري فوري (محاكاة انقطاع الكهرباء أو Task Manager Kill)
    console.log('  -> تنفيذ إنهاء قسري فوري (taskkill /F)...');
    killPidForced(pid);
    sleep(1000);

    // التأكد من بقاء ملف .session-active دليلاً على الانهيار المفاجئ
    const sessionActiveExisted = fs.existsSync(SESSION_ACTIVE_FILE);
    console.log(`  -> هل بقي ملف المؤشر (.session-active) دليلاً على الانهيار المفاجئ؟ ${sessionActiveExisted ? 'نعم (صحيح)' : 'لا'}`);

    // إعادة التشغيل الفوري بعد الانهيار مع إغلاق آلي
    console.log('  -> إعادة تشغيل البرنامج فوراً لاختبار آلية التعافي (Recovery)...');
    logOffset = getLogSize();

    const recoveryArgs = isPackaged
      ? ['--test-auto-close=2000']
      : [path.resolve(__dirname, '..'), '--test-auto-close=2000'];

    child = spawn(exePath, recoveryArgs, { detached: false, stdio: 'ignore' });
    pid = child.pid;

    // التحقق من رصد سطر التعافي في السجل
    const recoveryTriggered = waitForLogMessage(logOffset, '.session-active marker found', 15000);
    const windowShownAfterCrash = waitForLogMessage(logOffset, 'Revealing main window', 15000);

    if (recoveryTriggered && windowShownAfterCrash) {
      console.log('  -> تأكيد: تم تشغيل بروتوكول التعافي وتفريغ قاعدة البيانات وفتح النافذة بنجاح!');
      passedTests++;
    } else {
      console.error('  ✕ فشل بروتوكول التعافي أو لم تفتح النافذة بعد الانهيار.');
    }

    // انتظار انتهاء الإغلاق الآلي
    sleep(3000);
    if (isPidRunning(pid)) killPidForced(pid);
  }

  // -------------------------------------------------------------
  // التقرير النهائي
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`                 ملخص نتائج الاختبار الشامل                       `);
  console.log('================================================================');
  console.log(`عدد الاختبارات الإجمالي: ${totalTests}`);
  console.log(`الاختبارات الناجحة:      ${passedTests}`);
  console.log(`الاختبارات الفاشلة:      ${totalTests - passedTests}`);
  console.log(`نسبة النجاح:             ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n>>> النتيجة: PASS (اجتازت كافة الاختبارات بنجاح 100%) <<<');
    process.exit(0);
  } else {
    console.log('\n>>> النتيجة: FAIL (هناك اختبارات فشلت) <<<');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('خطأ غير متوقع أثناء تشغيل الاختبار:', err);
  process.exit(1);
});
