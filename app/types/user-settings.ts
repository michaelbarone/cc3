/**
 * Types for user settings
 */

export enum Theme {
  LIGHT = "LIGHT",
  DARK = "DARK",
  SYSTEM = "SYSTEM",
}

export enum MenuPosition {
  TOP = "TOP",
  SIDE = "SIDE",
}

export interface UserSetting {
  userId: string;
  theme: Theme;
  menuPosition: MenuPosition;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsUpdateRequest {
  theme?: Theme;
  menuPosition?: MenuPosition;
}
