/** All money is stored and passed as integer cents. $9.99 = 999 */
export type Cents = number;

/** E.164 phone number string e.g. "+18435551234" */
export type E164Phone = string;

/** ISO 8601 timestamp string */
export type ISOTimestamp = string;

/** UUID v4 string */
export type UUID = string;

/** Two-letter US state code e.g. "SC" */
export type USStateCode = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Standard API error shape */
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}
