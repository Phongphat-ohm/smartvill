import { Suspense } from "react";
import { InviteForm } from "@/components/invite-form";

async function InviteContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteForm code={code} />;
}

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center text-sm text-slate-500">กำลังเปิดคำเชิญ…</main>}><InviteContent params={params} /></Suspense>;
}
