import { NoAccess } from "@/components/no-access";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg items-center p-6">
      <div className="w-full">
        <NoAccess />
      </div>
    </main>
  );
}
