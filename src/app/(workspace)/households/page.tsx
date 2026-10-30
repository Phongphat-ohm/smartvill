import { ModulePage } from "@/components/module-page";
export default function HouseholdsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <ModulePage id="households" searchParams={searchParams} />; }
