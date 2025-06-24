// Common types for URL-related entities

export interface Url {
  id: string;
  urlGroupId?: string;
  title: string;
  url: string;
  urlMobile: string | null;
  iconPath: string | null;
  displayOrder: number;
  idleTimeoutMinutes?: number;
  isLocalhost?: boolean;
  openInNewTab?: boolean;
  port?: string | null;
  path?: string | null;
  localhostMobilePath?: string | null;
  localhostMobilePort?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UrlGroup {
  id: string;
  name: string;
  description?: string;
  urls: Url[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserUrlGroup {
  userId: string;
  urlGroupId: string;
  createdAt?: string;
}
