import { AccountPageFrame } from "@/components/account/AccountPageFrame";
import { AddressBook } from "@/components/account/AddressBook";

export const metadata = { title: "Adreslerim | VitrinPlus" };

export default function Page() {
  return (
    <AccountPageFrame>
      <AddressBook />
    </AccountPageFrame>
  );
}
