import React, { useState, useEffect } from 'react';
import {
  Coins,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Plus,
  Minus,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { GlassIcon } from '../../components/common/GlassIcon';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatMoney } from '../../../shared/utils/money';
import { sounds } from '../../lib/sounds';
import { useToast } from '../../components/common/ToastContext';
import { MESSAGES } from '../../lib/messages';

interface CashMovement {
  id: number;
  type: 'sale' | 'expense' | 'deposit' | 'withdrawal';
  typeLabel: string;
  amount: number;
  reason: string;
  time: string;
}

export function CashScreen(): React.ReactElement {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isShiftActive, setIsShiftActive] = useState<boolean>(true);
  const [openingBalance, setOpeningBalance] = useState<number>(50000); // 500.00 ج.م
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);

  // حقول المصروف
  const [expenseAmountStr, setExpenseAmountStr] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('نثريات وضيافة');
  const [expenseNotes, setExpenseNotes] = useState('');

  // حقول الإيداع
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositReason, setDepositReason] = useState('تغذية فكة إضافية للدرج');

  // حركات الوردية
  const [movements, setMovements] = useState<CashMovement[]>([
    { id: 1, type: 'deposit', typeLabel: 'افتتاح الوردية', amount: 50000, reason: 'رصيد بداية الوردية', time: '09:00 ص' },
    { id: 2, type: 'sale', typeLabel: 'مبيعات نقدية', amount: 14500, reason: 'فاتورة كاش #1021', time: '09:45 ص' },
    { id: 3, type: 'sale', typeLabel: 'مبيعات نقدية', amount: 28000, reason: 'فاتورة كاش #1022', time: '10:30 ص' },
    { id: 4, type: 'expense', typeLabel: 'مصروف نقدي', amount: 3500, reason: 'ضيافة وشاي للمحل', time: '11:15 ص' },
    { id: 5, type: 'sale', typeLabel: 'مبيعات نقدية', amount: 19500, reason: 'فاتورة كاش #1023', time: '12:00 م' },
  ]);

  const totalSalesCash = movements
    .filter((m) => m.type === 'sale')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpenses = movements
    .filter((m) => m.type === 'expense' || m.type === 'withdrawal')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalDeposits = movements
    .filter((m) => m.type === 'deposit')
    .reduce((sum, m) => sum + m.amount, 0);

  const currentDrawerCash = totalDeposits + totalSalesCash - totalExpenses;

  // فتح الدرج
  const handleOpenDrawer = () => {
    sounds.playCashRegister();
    toastSuccess('تم إرسال أمر فتح درج النقدية عبر الطابعة');
  };

  // تسجيل مصروف
  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(expenseAmountStr);
    if (isNaN(val) || val <= 0) {
      sounds.playError();
      toastError('يرجى إدخال مبلغ مصروف صحيح');
      return;
    }

    const piasters = Math.round(val * 100);
    if (piasters > currentDrawerCash) {
      sounds.playError();
      toastError('رصيد الدرج النقدي غير كافٍ لصرف هذا المبلغ');
      return;
    }

    const newMov: CashMovement = {
      id: Date.now(),
      type: 'expense',
      typeLabel: `مصروف (${expenseCategory})`,
      amount: piasters,
      reason: expenseNotes.trim() || expenseCategory,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    sounds.playDelete();
    setMovements([newMov, ...movements]);
    toastSuccess(MESSAGES.EXPENSE_RECORDED);
    setIsExpenseModalOpen(false);
    setExpenseAmountStr('');
    setExpenseNotes('');
  };

  // تسجيل إيداع / فكة
  const handleRecordDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmountStr);
    if (isNaN(val) || val <= 0) {
      sounds.playError();
      toastError('يرجى إدخال مبلغ إيداع صحيح');
      return;
    }

    const piasters = Math.round(val * 100);
    const newMov: CashMovement = {
      id: Date.now(),
      type: 'deposit',
      typeLabel: 'إيداع نقدية بالدرج',
      amount: piasters,
      reason: depositReason.trim(),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    sounds.playSaleSuccess();
    setMovements([newMov, ...movements]);
    toastSuccess(MESSAGES.CASH_DEPOSIT_SUCCESS);
    setIsDepositModalOpen(false);
    setDepositAmountStr('');
  };

  // إغلاق الوردية
  const handleConfirmCloseShift = () => {
    sounds.playCashRegister();
    setIsShiftActive(false);
    setIsCloseShiftModalOpen(false);
    toastSuccess(MESSAGES.SHIFT_CLOSED);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      {/* بطاقات المؤشرات المالية للوردية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={Coins} size="lg" variant="gold" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>رصيد النقدية الحالي بالدرج</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {formatMoney(currentDrawerCash)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={TrendingUp} size="lg" variant="success" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>مبيعات الوردية النقدية</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#21633D' }}>
              {formatMoney(totalSalesCash)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={TrendingDown} size="lg" variant="danger" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>المصروفات النثرية المسحوبة</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#962B34' }}>
              {formatMoney(totalExpenses)}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF' }}
        >
          <GlassIcon icon={DollarSign} size="lg" variant="brand" glow />
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>رصيد افتتاح الوردية</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-brand-deep)' }}>
              {formatMoney(openingBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* شريط الإجراءات والتحكم بالوردية */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand-deep)' }}>
            حالة الوردية الحالية:
          </span>
          {isShiftActive ? (
            <span className="badge badge-success">
              <span className="pulse-indicator" style={{ width: 6, height: 6 }} />
              وردية نشطة ومفتوحة
            </span>
          ) : (
            <span className="badge badge-danger">الوردية مغلقة</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            onClick={handleOpenDrawer}
            title="فتح درج النقدية الكهرومغناطيسي"
            style={{ height: 40 }}
          >
            <Unlock size={15} />
            <span>فتح الدرج</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              sounds.playClick();
              setIsDepositModalOpen(true);
            }}
            style={{ height: 40 }}
          >
            <Plus size={15} />
            <span>إيداع فكة</span>
          </Button>

          <Button
            variant="danger-outline"
            onClick={() => {
              sounds.playClick();
              setIsExpenseModalOpen(true);
            }}
            style={{ height: 40 }}
          >
            <Minus size={15} />
            <span>تسجيل مصروف</span>
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              sounds.playWarning();
              setIsCloseShiftModalOpen(true);
            }}
            style={{ height: 40 }}
          >
            <Printer size={15} />
            <span>إغلاق الوردية وتقرير Z</span>
          </Button>
        </div>
      </div>

      {/* جدول حركات النقدية خلال الوردية */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#FAFBF9', borderBottom: '1.5px solid var(--border-light)' }}>
                <th style={{ width: '6%', padding: '12px 16px', textAlign: 'center' }}>#</th>
                <th style={{ width: '16%', padding: '12px 16px' }}>الوقت</th>
                <th style={{ width: '22%', padding: '12px 16px' }}>نوع الحركة</th>
                <th style={{ width: '36%', padding: '12px 16px' }}>البيان والتفاصيل</th>
                <th style={{ width: '20%', padding: '12px 16px', textAlign: 'left' }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, idx) => {
                const isPos = m.type === 'sale' || m.type === 'deposit';

                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {m.time}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${isPos ? 'badge-success' : 'badge-danger'}`}>
                        {m.typeLabel}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text-secondary)' }}>
                      {m.reason}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: 700,
                        fontSize: 15,
                        color: isPos ? '#21633D' : '#962B34',
                      }}
                    >
                      {isPos ? `+${formatMoney(m.amount)}` : `-${formatMoney(m.amount)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تسجيل مصروف */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="تسجيل مصروف نقدي من الدرج"
        icon={<GlassIcon icon={Minus} size="sm" variant="danger" />}
        width={480}
      >
        <form onSubmit={handleRecordExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              المبلغ المصروف (ج.م) *
            </label>
            <Input
              type="number"
              step="any"
              value={expenseAmountStr}
              onChange={(e) => setExpenseAmountStr(e.target.value)}
              placeholder="مثال: 50.00"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              تصنيف المصروف
            </label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="in"
              style={{ height: 44 }}
            >
              <option value="نثريات وضيافة">نثريات وضيافة</option>
              <option value="أدوات ومستلزمات تغليف">أدوات ومستلزمات تغليف</option>
              <option value="صيانة وتنظيف">صيانة وتنظيف</option>
              <option value="مصاريف شحن ونقل">مصاريف شحن ونقل</option>
              <option value="سحب عهدة">سحب عهدة</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              البيان / الملاحظات
            </label>
            <Input
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
              placeholder="مثال: شراء أكياس تغليف هدايا"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Button type="submit" variant="danger" style={{ flex: 1, height: 44 }}>
              خصم المصروف من الدرج
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                sounds.playClick();
                setIsExpenseModalOpen(false);
              }}
              style={{ width: 100, height: 44 }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* نافذة إيداع فكة */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title="إيداع فكة إضافية بالدرج"
        icon={<GlassIcon icon={Plus} size="sm" variant="success" />}
        width={460}
      >
        <form onSubmit={handleRecordDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              مبلغ الإيداع (ج.م) *
            </label>
            <Input
              type="number"
              step="any"
              value={depositAmountStr}
              onChange={(e) => setDepositAmountStr(e.target.value)}
              placeholder="مثال: 200.00"
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              البيان
            </label>
            <Input
              value={depositReason}
              onChange={(e) => setDepositReason(e.target.value)}
              placeholder="تغذية فكة إضافية للدرج"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <Button type="submit" variant="success" style={{ flex: 1, height: 44 }}>
              إيداع في الدرج
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                sounds.playClick();
                setIsDepositModalOpen(false);
              }}
              style={{ width: 100, height: 44 }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* تأكيد إغلاق الوردية وطباعة Z-Report */}
      <ConfirmDialog
        isOpen={isCloseShiftModalOpen}
        title="تأكيد إغلاق الوردية الحالية وإصدار تقرير Z"
        message={`الرصيد النقدي المتوقع بالدرج هو ${formatMoney(currentDrawerCash)}. هل تم جرد الدرج فعلياً وتأكيد مطابقة النقدية؟ سيتم قفل الوردية وترحيل العمليات وطباعة التقرير الحراري Z.`}
        confirmLabel="إغلاق الوردية وطباعة Z-Report"
        cancelLabel="العودة"
        onConfirm={handleConfirmCloseShift}
        onCancel={() => setIsCloseShiftModalOpen(false)}
      />
    </div>
  );
}

export default CashScreen;
