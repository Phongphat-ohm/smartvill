import { ModulePage } from "@/components/module-page";
import { NationalIdSearch } from "@/components/national-id-search";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function PeoplePage() {
  let canSensitive = false;
  if (isSupabaseConfigured()) { const supabase = await createServerSupabaseClient(); const { data } = await supabase.rpc("has_permission", { permission_key: "registry.resident.sensitive.read" }); canSensitive = Boolean(data); }
  return <div className="space-y-4"><NationalIdSearch enabled={canSensitive} /><ModulePage id="people" /></div>;
}
