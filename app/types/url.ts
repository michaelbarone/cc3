/**
 * Interface for URL data
 */
export interface Url {
  id: string;
  urlId: string;
  url: string;
  title: string;
  faviconUrl: string | null;
  mobileSpecificUrl: string | null;
  notes: string | null;
  displayOrderInGroup?: number;
  groupSpecificTitle?: string | null;
}

/**
 * Interface for URL Group data
 */
export interface UrlGroup {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number | null;
  urls: Url[];
  createdAt?: string;
  updatedAt?: string;
}
