import { readFile } from "node:fs/promises";
import { join } from "node:path";

type AddressRow = {
  name_th: string;
  zip_code: number;
  district: { name_th: string; province: { name_th: string } };
};

let addressRowsPromise: Promise<AddressRow[]> | undefined;

async function getAddressRows() {
  addressRowsPromise ??= readFile(join(process.cwd(), "public/data/sub_district_with_district_and_province.json"), "utf8")
    .then((content) => JSON.parse(content) as AddressRow[])
    .catch((error: unknown) => {
      addressRowsPromise = undefined;
      throw error;
    });
  return addressRowsPromise;
}

function uniqueNames(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "th")).map((value) => ({ value, label: value }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");
  if (level !== "provinces" && level !== "districts" && level !== "subdistricts") {
    return Response.json({ message: "ระดับข้อมูลที่อยู่ไม่ถูกต้อง" }, { status: 400 });
  }
  const rows = await getAddressRows();

  if (level === "provinces") {
    return Response.json(uniqueNames(rows.map((row) => row.district.province.name_th)));
  }

  const province = searchParams.get("province");
  if (!province) return Response.json({ message: "กรุณาเลือกจังหวัด" }, { status: 400 });
  const provinceRows = rows.filter((row) => row.district.province.name_th === province);

  if (level === "districts") {
    return Response.json(uniqueNames(provinceRows.map((row) => row.district.name_th)));
  }

  const district = searchParams.get("district");
  if (level === "subdistricts" && district) {
    const options = new Map<string, { value: string; label: string; postalCode: string }>();
    provinceRows.filter((row) => row.district.name_th === district).forEach((row) => {
      options.set(row.name_th, { value: row.name_th, label: row.name_th, postalCode: String(row.zip_code) });
    });
    return Response.json([...options.values()].sort((a, b) => a.label.localeCompare(b.label, "th")));
  }

  return Response.json({ message: "กรุณาเลือกอำเภอ" }, { status: 400 });
}
