import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import { CustomerReturns } from "@/components/account/CustomerReturns";

export const metadata = { title: "İadelerim | VitrinPlus" };

export default function Page() {
  return (
    <AccountPageFrame>
      <CustomerReturns />
    </AccountPageFrame>
  );
}
