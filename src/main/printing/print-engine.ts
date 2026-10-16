/**
 * محرك الطباعة المركزي فائق السرعة والأداء (High-Performance Print Engine)
 * - يعيد استخدام نافذة BrowserWindow خفية واحدة (Reusable Singleton Window) لمنع استهلاك الذاكرة وتأخير التشغيل (1-3 ثوانٍ)
 * - طابور معالجة تسلسلي (FIFO Print Queue / Mutex) يضمن عدم تداخل أو تعليق أوامر الطباعة
 * - قياس ديناميكي فائق الدقة لارتفاع محتوى الإيصال الحراري لتفادي هدر ورق البكرات
 * - حزام أمان قصوي ضد التجمد مع إمكانية التعافي الذاتي التلقائي
 */

import { BrowserWindow, app } from 'electron';

export interface PrintEngineJobOptions {
  html: string;
  deviceName?: string;
  silent?: boolean;
  printBackground?: boolean;
  color?: boolean;
  pageSize?: {
    width: number; // بالميكرون (1mm = 1000 microns)
    height?: number; // بالميكرون
  };
  calculateDynamicHeight?: boolean; // قياس الارتفاع الفعلي للمحتوى تلقائياً للإيصالات الحرارية
  timeoutMs?: number; // مهلة الأمان (الافتراضي 8000ms)
}

export interface PrintEngineResult {
  success: boolean;
  failureReason?: string;
}

class PrintEngine {
  private workerWindow: BrowserWindow | null = null;
  private queue: Promise<any> = Promise.resolve();
  private isDestroyed = false;

  constructor() {
    // إغلاق النافذة بنظافة عند إنهاء التطبيق
    try {
      if (app) {
        app.on('before-quit', () => {
          this.destroy();
        });
      }
    } catch {
      // بيئة الاختبار
    }
  }

  /**
   * جلب النافذة الخفية أو إنشاؤها إذا لم تكن موجودة أو تعرضت للإغلاق
   */
  private getOrCreateWorkerWindow(): BrowserWindow {
    if (this.workerWindow && !this.workerWindow.isDestroyed()) {
      return this.workerWindow;
    }

    this.workerWindow = new BrowserWindow({
      show: false,
      width: 450,
      height: 700,
      useContentSize: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        sandbox: true,
      },
    });

    this.workerWindow.on('closed', () => {
      this.workerWindow = null;
    });

    return this.workerWindow;
  }

  /**
   * تنفيذ مهمة طباعة مع حماية الطابور المتسلسل
   */
  async print(options: PrintEngineJobOptions): Promise<PrintEngineResult> {
    // إضافة المهمة إلى الطابور المتسلسل لضمان عدم تعارض مهام الطباعة
    const jobPromise = this.queue.then(async () => {
      return this.executePrintJob(options);
    });

    // تحديث مؤشر الطابور
    this.queue = jobPromise.catch(() => {});
    return jobPromise;
  }

  /**
   * التنفيذ الفعلي لعملية الطباعة
   */
  private async executePrintJob(options: PrintEngineJobOptions): Promise<PrintEngineResult> {
    if (this.isDestroyed) {
      return { success: false, failureReason: 'تم إنهاء محرك الطباعة' };
    }

    const timeoutDuration = options.timeoutMs || 8000;
    const win = this.getOrCreateWorkerWindow();

    return new Promise<PrintEngineResult>(async (resolve) => {
      let isDone = false;

      const finish = async (success: boolean, reason?: string) => {
        if (isDone) return;
        isDone = true;
        clearTimeout(safetyTimer);

        // تفريغ محتوى النافذة الخفية لتوفير الذاكرة دون تدميرها
        try {
          if (!win.isDestroyed()) {
            await win.loadURL('about:blank').catch(() => {});
          }
        } catch {}

        resolve({
          success,
          failureReason: reason,
        });
      };

      // مؤقت أمان قصوي لمنع تعليق التطبيق أو الأزرار
      const safetyTimer = setTimeout(() => {
        console.warn(`[PrintEngine] انتهت مهلة استجابة الطابعة (${timeoutDuration}ms)`);
        // في حال علقت النافذة تماماً يتم تدميرها للتعافي التلقائي
        try {
          if (!win.isDestroyed()) {
            win.destroy();
            this.workerWindow = null;
          }
        } catch {}
        finish(false, 'انتهت مهلة استجابة الطابعة، تأكد من تشغيلها وتوصيلها بالكمبيوتر');
      }, timeoutDuration);

      try {
        // تحميل كود HTML مباشرة
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`;
        await win.loadURL(dataUrl);

        // التأكد من استقرار التصيير ورسم المتجهات SVG
        await win.webContents.executeJavaScript(
          'document.readyState === "complete" || new Promise(r => window.addEventListener("load", r))'
        );

        // قياس الارتفاع الفعلي للمحتوى بدقة إذا طُلب ذلك (للإيصالات الحرارية)
        let resolvedHeightMicrons = options.pageSize?.height || 200000;
        if (options.calculateDynamicHeight) {
          try {
            const measuredHeightPx: number = await win.webContents.executeJavaScript(
              'Math.ceil((document.documentElement.scrollHeight || document.body.scrollHeight || 400))'
            );
            // تحويل البكسل (96 DPI) إلى ميكرون + هامش أمان صغير 15mm لضمان عدم اقتطاع السطور الأخيرة
            // 1 px = 25400 / 96 microns ≈ 264.58 microns
            const calculatedMicrons = Math.ceil(measuredHeightPx * 265) + 15000;
            // حد أدنى 60mm (60,000 microns) وحد أقصى 1000mm (1,000,000 microns)
            resolvedHeightMicrons = Math.max(60000, Math.min(1000000, calculatedMicrons));
          } catch (measureErr) {
            console.warn('[PrintEngine] تعذر قياس الارتفاع التلقائي للإيصال، استخدام الارتفاع الاحتياطي:', measureErr);
          }
        }

        const printWidthMicrons = options.pageSize?.width || 80000;

        const electronPrintOptions: any = {
          silent: options.silent !== false,
          printBackground: options.printBackground !== false,
          margins: { marginType: 'none' },
          color: Boolean(options.color),
          pageSize: {
            width: printWidthMicrons,
            height: resolvedHeightMicrons,
          },
        };

        if (options.deviceName && options.deviceName.trim()) {
          electronPrintOptions.deviceName = options.deviceName.trim();
        }

        // إرسال أمر الطباعة المباشر لنظام التشغيل
        win.webContents.print(electronPrintOptions, (success: boolean, failureReason: string) => {
          if (!success) {
            console.warn('[PrintEngine] فشل أمر الطباعة المباشر:', failureReason);
            finish(false, failureReason || 'رفضت الطابعة أمر الطباعة المباشر');
          } else {
            finish(true);
          }
        });
      } catch (err: any) {
        console.error('[PrintEngine] خطأ أثناء تجهيز صفحة الطباعة:', err);
        finish(false, err?.message || 'تعذر تجهيز بيانات الطباعة');
      }
    });
  }

  /**
   * إغلاق وتدمير النافذة الخفية
   */
  destroy() {
    this.isDestroyed = true;
    if (this.workerWindow && !this.workerWindow.isDestroyed()) {
      try {
        this.workerWindow.destroy();
      } catch {}
      this.workerWindow = null;
    }
  }
}

export const printEngine = new PrintEngine();
