import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import { ProfileForm } from "@/components/account/ProfileForm";

export const metadata = { title: "Profil | VitrinPlus" };

export default function Page() {
  return (
    <AccountPageFrame>
      <ProfileForm />
    </AccountPageFrame>
  );
}
