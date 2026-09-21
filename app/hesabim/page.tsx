import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import { AccountOverview } from "@/components/account/AccountOverview";

export const metadata = { title: "Hesabım | VitrinPlus" };

export default function Page() {
  return (
    <AccountPageFrame>
      <AccountOverview />
    </AccountPageFrame>
  );
}
