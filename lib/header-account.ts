/**
 * Müşteri header'ındaki hesap alanının (Giriş Yap düğmesi / kullanıcı menüsü) karar mantığı.
 * Saf fonksiyonlar: hem demo hem Supabase modunda aynı kural geçerlidir ve React olmadan test edilir.
 */

export type HeaderAccountInput = {
  /** Sağlayıcı oturum bilgisini çözdü mü? (demo: localStorage okundu, Supabase: oturum + profil yüklendi) */
  ready: boolean;
  /** Oturum var mı? Profil verisi henüz yüklenmemiş ya da yüklenememiş olsa bile true olabilir. */
  signedIn: boolean;
  user: { name: string; email: string } | null;
};

export type HeaderAccount =
  /** Oturum durumu henüz bilinmiyor: ne "Giriş Yap" ne kullanıcı menüsü gösterilir (yanlış düğme parlamasın diye). */
  | { status: "loading" }
  | { status: "guest" }
  | { status: "member"; name: string };

export const ACCOUNT_FALLBACK_NAME = "Hesabım";

/** Ad-soyad; yoksa e-postanın @ öncesi; o da yoksa "Hesabım". */
export function displayName(user: { name: string; email: string } | null | undefined): string {
  const name = user?.name?.trim();
  if (name) return name;
  const local = user?.email?.split("@")[0]?.trim();
  return local || ACCOUNT_FALLBACK_NAME;
}

export function resolveHeaderAccount({ ready, signedIn, user }: HeaderAccountInput): HeaderAccount {
  // Oturum açık kullanıcıya "Giriş Yap" hiçbir koşulda gösterilmez: kullanıcı nesnesi ya da oturum bilgisi varsa üyedir.
  if (user || signedIn) return { status: "member", name: displayName(user) };
  return ready ? { status: "guest" } : { status: "loading" };
}

/** Açılır menüdeki bağlantılar (Çıkış Yap ayrı bir işlemdir). Yollar `app/` altındaki gerçek sayfalardır. */
export const ACCOUNT_MENU_LINKS = [
  { key: "account", href: "/hesabim", label: "Hesabım" },
  { key: "orders", href: "/siparislerim", label: "Siparişlerim" },
  { key: "favorites", href: "/favoriler", label: "Favorilerim" },
  { key: "addresses", href: "/hesabim/adresler", label: "Adreslerim" },
] as const;

export type AccountMenuKey = (typeof ACCOUNT_MENU_LINKS)[number]["key"];

/** Alt bilgideki "Hesabım" sütunu. `guestOnly` bağlantılar oturum açık kullanıcıya gösterilmez. */
export const FOOTER_ACCOUNT_LINKS = [
  { label: "Favorilerim", href: "/favoriler", guestOnly: false },
  { label: "Sepetim", href: "/sepet", guestOnly: false },
  { label: "Giriş Yap", href: "/giris", guestOnly: true },
  { label: "Üye Ol", href: "/uye-ol", guestOnly: true },
] as const;

export type FooterLinkMode =
  /** Bağlantı olarak göster. */
  | "link"
  /** Oturum durumu belirsiz: yer ayrılır (sayfa kaymasın) ama ne bağlantı ne metin gösterilir. */
  | "placeholder"
  /** Hiç gösterme. */
  | "hidden";

export function footerLinkMode(link: { guestOnly: boolean }, account: HeaderAccount): FooterLinkMode {
  if (!link.guestOnly) return "link";
  if (account.status === "guest") return "link";
  return account.status === "loading" ? "placeholder" : "hidden";
}
