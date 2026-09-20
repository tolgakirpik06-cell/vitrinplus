import { redirect } from "next/navigation";

/**
 * Eski sekmeli satıcı paneli kaldırıldı; her bölüm artık `/satici-panel/...` altında kendi
 * rotasına sahip. Bu bileşen eski içe aktarmalar kırılmasın diye yalnızca yönlendirir.
 */
export function SellerPanel() {
  redirect("/satici-panel");
}
