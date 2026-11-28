import { UpdatePasswordForm } from "@/components/update-password-form";
import { Brand } from "@/components/brand";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center px-4 py-10 md:p-10">
      <div className="w-full max-w-sm">
        <Brand className="mb-8 justify-center" />
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
