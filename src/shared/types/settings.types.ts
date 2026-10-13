/**
 * أنواع وبيانات خدمة الإعدادات العامة (Settings Types)
 */

export interface SettingItem {
  key: string;
  value: string;
  updated_at: string;
}

export type SettingsMap = Record<string, string>;

export interface SettingUpdate {
  key: string;
  value: string;
}
