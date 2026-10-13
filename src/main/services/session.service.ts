/**
 * خدمة إدارة الجلسات في المعالج الرئيسي (Session Service)
 * تدير حالة المستخدم النشط، وقت تسجيل الدخول، والتحقق السريع من الجلسة
 */

import { SafeUser } from '../../shared/types/users.types';
import { UserRole } from '../../shared/constants/roles';

export class SessionService {
  private currentUser: SafeUser | null = null;
  private loginTimestamp: number | null = null;

  /**
   * تعيين المستخدم الحالي عند تسجيل الدخول الناجح
   */
  setCurrentUser(user: SafeUser): void {
    this.currentUser = user;
    this.loginTimestamp = Date.now();
  }

  /**
   * جلب المستخدم الحالي الآمن
   */
  getCurrentUser(): SafeUser | null {
    return this.currentUser;
  }

  /**
   * جلب معرف المستخدم الحالي (إن وُجد)
   */
  getCurrentUserId(): number | null {
    return this.currentUser?.id ?? null;
  }

  /**
   * جلب دور المستخدم الحالي
   */
  getCurrentRole(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  /**
   * هل يوجد مستخدم نشط مسجل؟
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * إنهاء الجلسة الحالية (تسجيل الخروج)
   */
  clearSession(): void {
    this.currentUser = null;
    this.loginTimestamp = null;
  }

  /**
   * جلب مدة الجلسة الحالية بالثواني
   */
  getSessionDurationSeconds(): number {
    if (!this.loginTimestamp) return 0;
    return Math.floor((Date.now() - this.loginTimestamp) / 1000);
  }
}

export const sessionService = new SessionService();
