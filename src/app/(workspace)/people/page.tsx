import { ModulePage } from "@/components/module-page";
import { NationalIdSearch } from "@/components/national-id-search";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getAuthenticatedProfile, hasPermission } from "@/lib/data-access";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  let canSensitive = false;
  if (isSupabaseConfigured()) { const profile = await getAuthenticatedProfile(); canSensitive = await hasPermission("registry.resident.sensitive.read", profile); }
  return <div className="space-y-4"><NationalIdSearch enabled={canSensitive} /><ModulePage id="people" searchParams={searchParams} /></div>;
}
