import type { NotificationPrefs } from "@/types/database";
import { MarketplaceError } from "./errors";

/** Adres ve profil doğrulaması (veritabanı kısıtlarının aynası: 0002_catalog.sql addresses, 0001 profiles). */
export const PHONE_PATTERN = /^\+?[0-9 ()-]{10,18}$/;

export type AddressFields = { title: string; fullName: string; phone: string; city: string; district: string; addressLine: string; postalCode: string };

function length(value: string, min: number, max: number): boolean {
  const size = value.trim().length;
  return size >= min && size <= max;
}

export function validateAddress(input: AddressFields): string[] {
  const errors: string[] = [];
  if (!length(input.title, 1, 40)) errors.push("Adres başlığı 1–40 karakter olmalı.");
  if (!length(input.fullName, 2, 80)) errors.push("Ad soyad 2–80 karakter olmalı.");
  if (!PHONE_PATTERN.test(input.phone.trim())) errors.push("Geçerli bir telefon numarası gir.");
  if (!length(input.city, 2, 60)) errors.push("İl 2–60 karakter olmalı.");
  if (!length(input.district, 2, 60)) errors.push("İlçe 2–60 karakter olmalı.");
  if (!length(input.addressLine, 5, 300)) errors.push("Açık adres 5–300 karakter olmalı.");
  if (input.postalCode.trim().length > 10) errors.push("Posta kodu en fazla 10 karakter olabilir.");
  return errors;
}

export function assertValidAddress(input: AddressFields): void {
  const errors = validateAddress(input);
  if (errors.length) throw new MarketplaceError("INVALID_ADDRESS", errors[0]);
}

export const MAX_ADDRESSES = 10;

export function validateProfileFields(input: { fullName?: string; phone?: string }): string[] {
  const errors: string[] = [];
  if (input.fullName !== undefined && (input.fullName.trim().length < 2 || input.fullName.trim().length > 120)) errors.push("Ad soyad 2–120 karakter olmalı.");
  if (input.phone !== undefined && input.phone.trim() !== "" && !PHONE_PATTERN.test(input.phone.trim())) errors.push("Geçerli bir telefon numarası gir.");
  return errors;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { orderUpdates: true, returnUpdates: true, questionAnswers: true, promotions: false, email: true, sms: false };

/** Bilinmeyen / eksik alanları varsayılanla tamamlar; yalnızca boolean değerleri kabul eder. */
export function normalizeNotificationPrefs(value: unknown): NotificationPrefs {
  const result: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (typeof value !== "object" || value === null) return result;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(result) as (keyof NotificationPrefs)[]) {
    if (typeof record[key] === "boolean") result[key] = record[key];
  }
  return result;
}
