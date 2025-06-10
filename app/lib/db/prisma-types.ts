/**
 * Type definitions and enum values for Prisma queries
 * These are used to provide better type safety when writing queries
 */

// Scalar field enums for proper type safety in groupBy, where, etc.
export const UserScalarFieldEnum = {
  id: "id",
  username: "username",
  passwordHash: "passwordHash",
  isAdmin: "isAdmin",
  lastActiveUrl: "lastActiveUrl",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  avatarUrl: "avatarUrl",
  menuPosition: "menuPosition",
  themeMode: "themeMode",
  lastLoginAt: "lastLoginAt",
} as const;

export type UserScalarFieldEnumType =
  (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum];

export const UrlGroupScalarFieldEnum = {
  id: "id",
  name: "name",
  description: "description",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type UrlGroupScalarFieldEnumType =
  (typeof UrlGroupScalarFieldEnum)[keyof typeof UrlGroupScalarFieldEnum];

export const UrlScalarFieldEnum = {
  id: "id",
  title: "title",
  url: "url",
  urlMobile: "urlMobile",
  iconPath: "iconPath",
  idleTimeoutMinutes: "idleTimeoutMinutes",
  isLocalhost: "isLocalhost",
  port: "port",
  path: "path",
  localhostMobilePath: "localhostMobilePath",
  localhostMobilePort: "localhostMobilePort",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type UrlScalarFieldEnumType = (typeof UrlScalarFieldEnum)[keyof typeof UrlScalarFieldEnum];

export const UserUrlGroupScalarFieldEnum = {
  userId: "userId",
  urlGroupId: "urlGroupId",
  createdAt: "createdAt",
} as const;

export type UserUrlGroupScalarFieldEnumType =
  (typeof UserUrlGroupScalarFieldEnum)[keyof typeof UserUrlGroupScalarFieldEnum];

export const UrlsInGroupsScalarFieldEnum = {
  urlId: "urlId",
  groupId: "groupId",
  displayOrder: "displayOrder",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type UrlsInGroupsScalarFieldEnumType =
  (typeof UrlsInGroupsScalarFieldEnum)[keyof typeof UrlsInGroupsScalarFieldEnum];

export const AppConfigScalarFieldEnum = {
  id: "id",
  appName: "appName",
  appLogo: "appLogo",
  favicon: "favicon",
  loginTheme: "loginTheme",
  registrationEnabled: "registrationEnabled",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type AppConfigScalarFieldEnumType =
  (typeof AppConfigScalarFieldEnum)[keyof typeof AppConfigScalarFieldEnum];

export const UserSettingScalarFieldEnum = {
  userId: "userId",
  key: "key",
  value: "value",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

export type UserSettingScalarFieldEnumType =
  (typeof UserSettingScalarFieldEnum)[keyof typeof UserSettingScalarFieldEnum];
