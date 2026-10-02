import { redirect } from "next/navigation";

export default async function BranchIndex({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  redirect(`/${branchId}/dashboard`);
}
