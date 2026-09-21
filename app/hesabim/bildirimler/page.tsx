import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import { NotificationPrefsForm } from "@/components/account/NotificationPrefsForm";

export const metadata = { title: "Bildirimler | VitrinPlus" };

export default function Page() {
  return (
    <AccountPageFrame>
      <NotificationPrefsForm />
    </AccountPageFrame>
  );
}
