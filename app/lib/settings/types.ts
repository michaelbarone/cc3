/**
 * Types for user settings
 */

// Base interface for all settings
export interface Setting<T> {
  key: string;
  value: T;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Specific setting types
export interface PasswordSetting extends Setting<string | null> {
  key: "password";
}

export interface LastActiveUrlSetting extends Setting<string> {
  key: "lastActiveUrl";
}

export interface ThemePreferenceSetting extends Setting<"light" | "dark" | "system"> {
  key: "themePreference";
}

export interface LanguagePreferenceSetting extends Setting<string> {
  key: "languagePreference";
}

// Union type of all settings
export type UserSetting =
  | PasswordSetting
  | LastActiveUrlSetting
  | ThemePreferenceSetting
  | LanguagePreferenceSetting;

// Settings keys
export type SettingKey = UserSetting["key"];

// Settings service interface
export interface SettingsService {
  getSetting<T>(userId: string, key: string): Promise<T | null>;
  setSetting<T>(userId: string, key: string, value: T): Promise<void>;
  deleteSetting(userId: string, key: string): Promise<void>;
  getAllSettings(userId: string): Promise<Record<string, unknown>>;
}
