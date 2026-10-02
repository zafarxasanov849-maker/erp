import { redirect } from "next/navigation";

import { MOCK_BRANCHES } from "@/features/shell/mock";

// 1-bosqichda: kirmagan bo'lsa /login, aks holda foydalanuvchining birinchi filiali.
export default function Home() {
  redirect(`/${MOCK_BRANCHES[0]!.id}/dashboard`);
}
