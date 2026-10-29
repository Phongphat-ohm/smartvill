export type DemoRow = Record<string, string | number | boolean>;

export const householdRows: DemoRow[] = [
  { id: "H-001", houseNumber: "44/2", moo: "4", head: "สมชาย ใจดี", members: 4, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-002", houseNumber: "72/1", moo: "4", head: "กมลวรรณ แสงดี", members: 3, waterStatus: "รอตรวจ", status: "มีผู้อยู่อาศัย" },
  { id: "H-003", houseNumber: "118", moo: "5", head: "วิไลพร ใจมั่น", members: 5, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-004", houseNumber: "155", moo: "5", head: "สุชาติ แก้วใจ", members: 2, waterStatus: "ค้างชำระ", status: "มีผู้อยู่อาศัย" },
  { id: "H-005", houseNumber: "201/3", moo: "6", head: "มานพ พูนผล", members: 3, waterStatus: "รออ่าน", status: "มีผู้อยู่อาศัย" },
  { id: "H-006", houseNumber: "212", moo: "6", head: "พิมพ์ใจ รุ่งเรือง", members: 2, waterStatus: "ปกติ", status: "ย้ายออก" },
];

export const residentRows: DemoRow[] = [
  { id: "P-001", name: "สมชาย ใจดี", household: "44/2", relationship: "หัวหน้าครัวเรือน", phone: "08x-xxx-1234", status: "อาศัยอยู่" },
  { id: "P-002", name: "นภา ใจดี", household: "44/2", relationship: "คู่สมรส", phone: "08x-xxx-3214", status: "อาศัยอยู่" },
  { id: "P-003", name: "กมลวรรณ แสงดี", household: "72/1", relationship: "หัวหน้าครัวเรือน", phone: "09x-xxx-5521", status: "อาศัยอยู่" },
  { id: "P-004", name: "วิไลพร ใจมั่น", household: "118", relationship: "หัวหน้าครัวเรือน", phone: "08x-xxx-8710", status: "อาศัยอยู่" },
  { id: "P-005", name: "สุชาติ แก้วใจ", household: "155", relationship: "หัวหน้าครัวเรือน", phone: "08x-xxx-2240", status: "อาศัยอยู่" },
];

export const readingRows: DemoRow[] = [
  { id: "M-0044", houseNumber: "44/2", name: "สมชาย ใจดี", previous: 1284, current: 1302, usage: 18, status: "บันทึกแล้ว" },
  { id: "M-0072", houseNumber: "72/1", name: "กมลวรรณ แสงดี", previous: 995, current: 962, usage: "—", status: "รอตรวจ" },
  { id: "M-0118", houseNumber: "118", name: "วิไลพร ใจมั่น", previous: 1740, current: 1761, usage: 21, status: "บันทึกแล้ว" },
  { id: "M-0155", houseNumber: "155", name: "สุชาติ แก้วใจ", previous: 812, current: 878, usage: 66, status: "รอตรวจ" },
  { id: "M-0201", houseNumber: "201/3", name: "มานพ พูนผล", previous: 2203, current: "—", usage: "—", status: "รออ่าน" },
];

export const invoiceRows: DemoRow[] = [
  { id: "WT-690101", houseNumber: "44/2", name: "สมชาย ใจดี", period: "ต.ค. 2569", amount: 198, paid: 198, due: "4 พ.ย. 2569", status: "ชำระแล้ว" },
  { id: "WT-690102", houseNumber: "72/1", name: "กมลวรรณ แสงดี", period: "ต.ค. 2569", amount: 0, paid: 0, due: "4 พ.ย. 2569", status: "รอตรวจมิเตอร์" },
  { id: "WT-690103", houseNumber: "118", name: "วิไลพร ใจมั่น", period: "ต.ค. 2569", amount: 219, paid: 100, due: "4 พ.ย. 2569", status: "ชำระบางส่วน" },
  { id: "WT-690104", houseNumber: "155", name: "สุชาติ แก้วใจ", period: "ก.ย. 2569", amount: 426, paid: 0, due: "4 ต.ค. 2569", status: "เกินกำหนด" },
  { id: "WT-690105", houseNumber: "201/3", name: "มานพ พูนผล", period: "ต.ค. 2569", amount: 0, paid: 0, due: "4 พ.ย. 2569", status: "รออ่านมิเตอร์" },
];

export const fundRows: DemoRow[] = [
  { id: "FT-690284", date: "29 ต.ค. 2569", description: "เงินสมทบสมาชิก", member: "สมชาย ใจดี", amount: 2500, type: "เงินเข้า", status: "รออนุมัติ" },
  { id: "FT-690283", date: "29 ต.ค. 2569", description: "ชำระค่าอุปกรณ์", member: "กองทุนหมู่บ้าน", amount: -1800, type: "เงินออก", status: "อนุมัติแล้ว" },
  { id: "FT-690282", date: "28 ต.ค. 2569", description: "เงินฝากสมาชิก", member: "วิไลพร ใจมั่น", amount: 1000, type: "เงินเข้า", status: "อนุมัติแล้ว" },
];

export const loanRows: DemoRow[] = [
  { id: "LN-690032", borrower: "วิไลพร ใจมั่น", product: "สินเชื่อฉุกเฉิน", principal: 20000, remaining: 12500, nextDue: "5 พ.ย. 2569", guarantors: 1, status: "กำลังชำระ" },
  { id: "LN-690031", borrower: "สุชาติ แก้วใจ", product: "สินเชื่อพัฒนาคุณภาพชีวิต", principal: 50000, remaining: 50000, nextDue: "—", guarantors: 2, status: "รออนุมัติ" },
  { id: "LN-690030", borrower: "มานพ พูนผล", product: "สินเชื่อฉุกเฉิน", principal: 15000, remaining: 0, nextDue: "—", guarantors: 1, status: "ปิดบัญชี" },
];

export const productRows: DemoRow[] = [
  { id: "PR-001", barcode: "8851234000012", name: "ข้าวหอมมะลิ 5 กก.", category: "อาหารแห้ง", price: 185, stock: 24, reorderAt: 10, status: "พร้อมขาย" },
  { id: "PR-002", barcode: "8851234000029", name: "น้ำดื่ม 600 มล.", category: "เครื่องดื่ม", price: 7, stock: 8, reorderAt: 20, status: "ใกล้หมด" },
  { id: "PR-003", barcode: "8851234000036", name: "ไข่ไก่ เบอร์ 2", category: "ของสด", price: 4, stock: 66, reorderAt: 30, status: "พร้อมขาย" },
  { id: "PR-004", barcode: "8851234000043", name: "น้ำมันพืช 1 ลิตร", category: "อาหารแห้ง", price: 48, stock: 5, reorderAt: 8, status: "ใกล้หมด" },
];

export const salesRows: DemoRow[] = [
  { id: "SR-690028", date: "29 ต.ค. 2569", items: "น้ำดื่ม 600 มล. × 2, ไข่ไก่ เบอร์ 2 × 10", amount: 54, paid: 54, method: "เงินสด", status: "สำเร็จ" },
  { id: "SR-690027", date: "29 ต.ค. 2569", items: "ข้าวหอมมะลิ 5 กก. × 1", amount: 185, paid: 185, method: "โอนเงิน", status: "สำเร็จ" },
];
