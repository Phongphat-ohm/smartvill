export type DemoRow = Record<string, string | number | boolean>;

export const householdRows: DemoRow[] = [
  { id: "H-001", detailId: "H-001", houseNumber: "44/2", moo: "4", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "สมชาย ใจดี", members: 4, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-002", detailId: "H-002", houseNumber: "72/1", moo: "4", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "กมลวรรณ แสงดี", members: 3, waterStatus: "รอตรวจ", status: "มีผู้อยู่อาศัย" },
  { id: "H-003", detailId: "H-003", houseNumber: "118", moo: "5", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ผสม", head: "วิไลพร ใจมั่น", members: 5, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-004", detailId: "H-004", houseNumber: "155", moo: "5", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "พาณิชยกรรม", head: "สุชาติ แก้วใจ", members: 2, waterStatus: "ค้างชำระ", status: "มีผู้อยู่อาศัย" },
  { id: "H-005", detailId: "H-005", houseNumber: "201/3", moo: "6", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "มานพ พูนผล", members: 3, waterStatus: "รออ่าน", status: "มีผู้อยู่อาศัย" },
  { id: "H-006", detailId: "H-006", houseNumber: "212", moo: "6", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "—", members: 0, waterStatus: "ไม่มีจุดใช้น้ำ", status: "ว่าง" },
  { id: "H-007", detailId: "H-007", houseNumber: "8/7", moo: "3", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "อรุณี พรมมา", members: 4, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-008", detailId: "H-008", houseNumber: "91", moo: "4", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ผสม", head: "ธนกร คำสุข", members: 6, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-009", detailId: "H-009", houseNumber: "136/2", moo: "5", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "สายฝน แก้วคำ", members: 2, waterStatus: "ค้างชำระ", status: "มีผู้อยู่อาศัย" },
  { id: "H-010", detailId: "H-010", houseNumber: "174", moo: "5", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "พาณิชยกรรม", head: "ประเสริฐ บุญมี", members: 3, waterStatus: "ปกติ", status: "มีผู้อยู่อาศัย" },
  { id: "H-011", detailId: "H-011", houseNumber: "225/4", moo: "6", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "—", members: 1, waterStatus: "รอตรวจ", status: "มีผู้อยู่อาศัย" },
  { id: "H-012", detailId: "H-012", houseNumber: "240", moo: "6", address: "ต.บ้านใหม่ อ.เมือง จ.ขอนแก่น", type: "ที่อยู่อาศัย", head: "—", members: 0, waterStatus: "ปิดใช้งาน", status: "เก็บประวัติ" },
];

export const residentRows: DemoRow[] = [
  { id: "P-001", detailId: "P-001", name: "สมชาย ใจดี", household: "44/2", relationship: "หัวหน้าครัวเรือน", birthDate: "12 พ.ค. 2523", phone: "08x-xxx-1234", status: "อาศัยอยู่" },
  { id: "P-002", detailId: "P-002", name: "นภา ใจดี", household: "44/2", relationship: "คู่สมรส", birthDate: "3 มิ.ย. 2526", phone: "08x-xxx-3214", status: "อาศัยอยู่" },
  { id: "P-003", detailId: "P-003", name: "กมลวรรณ แสงดี", household: "72/1", relationship: "หัวหน้าครัวเรือน", birthDate: "21 ม.ค. 2531", phone: "09x-xxx-5521", status: "อาศัยอยู่" },
  { id: "P-004", detailId: "P-004", name: "วิไลพร ใจมั่น", household: "118", relationship: "หัวหน้าครัวเรือน", birthDate: "8 ส.ค. 2518", phone: "08x-xxx-8710", status: "อาศัยอยู่" },
  { id: "P-005", detailId: "P-005", name: "สุชาติ แก้วใจ", household: "155", relationship: "หัวหน้าครัวเรือน", birthDate: "17 มี.ค. 2522", phone: "08x-xxx-2240", status: "อาศัยอยู่" },
  { id: "P-006", detailId: "P-006", name: "อรุณี พรมมา", household: "8/7", relationship: "หัวหน้าครัวเรือน", birthDate: "9 พ.ย. 2528", phone: "08x-xxx-4108", status: "อาศัยอยู่" },
  { id: "P-007", detailId: "P-007", name: "ธนกร คำสุข", household: "91", relationship: "หัวหน้าครัวเรือน", birthDate: "28 ก.พ. 2524", phone: "09x-xxx-1189", status: "อาศัยอยู่" },
  { id: "P-008", detailId: "P-008", name: "สายฝน แก้วคำ", household: "136/2", relationship: "หัวหน้าครัวเรือน", birthDate: "14 ก.ค. 2533", phone: "08x-xxx-6320", status: "ย้ายเข้า" },
  { id: "P-009", detailId: "P-009", name: "ประเสริฐ บุญมี", household: "174", relationship: "หัวหน้าครัวเรือน", birthDate: "2 ธ.ค. 2512", phone: "08x-xxx-7781", status: "อาศัยอยู่" },
  { id: "P-010", detailId: "P-010", name: "ชลธิชา แสงทอง", household: "ไม่มีครัวเรือนปัจจุบัน", relationship: "—", birthDate: "30 เม.ย. 2538", phone: "09x-xxx-3402", status: "ย้ายออก" },
  { id: "P-011", detailId: "P-011", name: "บุญช่วย มีสุข", household: "ไม่มีครัวเรือนปัจจุบัน", relationship: "—", birthDate: "5 ม.ค. 2495", phone: "ไม่ระบุ", status: "เสียชีวิต" },
  { id: "P-012", detailId: "P-012", name: "วราภรณ์ ใจงาม", household: "225/4", relationship: "ผู้อาศัย", birthDate: "19 ก.ย. 2540", phone: "06x-xxx-9055", status: "อาศัยอยู่" },
];

export const readingRows: DemoRow[] = [
  { id: "M-0044", houseNumber: "44/2", name: "สมชาย ใจดี", previous: 1284, current: 1302, usage: 18, status: "บันทึกแล้ว" },
  { id: "M-0072", houseNumber: "72/1", name: "กมลวรรณ แสงดี", previous: 995, current: 962, usage: "—", status: "รอตรวจ" },
  { id: "M-0118", houseNumber: "118", name: "วิไลพร ใจมั่น", previous: 1740, current: 1761, usage: 21, status: "บันทึกแล้ว" },
  { id: "M-0155", houseNumber: "155", name: "สุชาติ แก้วใจ", previous: 812, current: 878, usage: 66, status: "รอตรวจ" },
  { id: "M-0201", houseNumber: "201/3", name: "มานพ พูนผล", previous: 2203, current: "—", usage: "—", status: "รออ่าน" },
  { id: "M-0008", houseNumber: "8/7", name: "อรุณี พรมมา", previous: 644, current: 659, usage: 15, status: "บันทึกแล้ว" },
  { id: "M-0091", houseNumber: "91", name: "ธนกร คำสุข", previous: 1320, current: 1347, usage: 27, status: "บันทึกแล้ว" },
  { id: "M-0136", houseNumber: "136/2", name: "สายฝน แก้วคำ", previous: 410, current: 420, usage: 10, status: "บันทึกแล้ว" },
  { id: "M-0174", houseNumber: "174", name: "ประเสริฐ บุญมี", previous: 1890, current: 1958, usage: 68, status: "รอตรวจ" },
  { id: "M-0225", houseNumber: "225/4", name: "วราภรณ์ ใจงาม", previous: 301, current: "—", usage: "—", status: "รออ่าน" },
  { id: "M-0063", houseNumber: "63", name: "วิชัย ทองดี", previous: 722, current: 735, usage: 13, status: "บันทึกแล้ว" },
  { id: "M-0142", houseNumber: "142", name: "รัตนา พรหมรักษ์", previous: 1008, current: 1026, usage: 18, status: "บันทึกแล้ว" },
];

export const invoiceRows: DemoRow[] = [
  { id: "WT-690101", houseNumber: "44/2", name: "สมชาย ใจดี", period: "ต.ค. 2569", amount: 198, paid: 198, due: "4 พ.ย. 2569", status: "ชำระแล้ว" },
  { id: "WT-690102", houseNumber: "72/1", name: "กมลวรรณ แสงดี", period: "ต.ค. 2569", amount: 0, paid: 0, due: "4 พ.ย. 2569", status: "รอตรวจมิเตอร์" },
  { id: "WT-690103", houseNumber: "118", name: "วิไลพร ใจมั่น", period: "ต.ค. 2569", amount: 219, paid: 100, due: "4 พ.ย. 2569", status: "ชำระบางส่วน" },
  { id: "WT-690104", houseNumber: "155", name: "สุชาติ แก้วใจ", period: "ก.ย. 2569", amount: 426, paid: 0, due: "4 ต.ค. 2569", status: "เกินกำหนด" },
  { id: "WT-690105", houseNumber: "201/3", name: "มานพ พูนผล", period: "ต.ค. 2569", amount: 0, paid: 0, due: "4 พ.ย. 2569", status: "รออ่านมิเตอร์" },
  { id: "WT-690106", houseNumber: "8/7", name: "อรุณี พรมมา", period: "ต.ค. 2569", amount: 165, paid: 165, due: "4 พ.ย. 2569", status: "ชำระแล้ว" },
  { id: "WT-690107", houseNumber: "91", name: "ธนกร คำสุข", period: "ต.ค. 2569", amount: 267, paid: 0, due: "4 พ.ย. 2569", status: "รอชำระ" },
  { id: "WT-690108", houseNumber: "136/2", name: "สายฝน แก้วคำ", period: "ต.ค. 2569", amount: 130, paid: 130, due: "4 พ.ย. 2569", status: "ชำระแล้ว" },
  { id: "WT-690109", houseNumber: "174", name: "ประเสริฐ บุญมี", period: "ต.ค. 2569", amount: 438, paid: 0, due: "4 พ.ย. 2569", status: "รอตรวจมิเตอร์" },
  { id: "WT-690110", houseNumber: "225/4", name: "วราภรณ์ ใจงาม", period: "ต.ค. 2569", amount: 0, paid: 0, due: "4 พ.ย. 2569", status: "รออ่านมิเตอร์" },
  { id: "WT-690111", houseNumber: "63", name: "วิชัย ทองดี", period: "ต.ค. 2569", amount: 151, paid: 50, due: "4 พ.ย. 2569", status: "ชำระบางส่วน" },
  { id: "WT-690112", houseNumber: "142", name: "รัตนา พรหมรักษ์", period: "ก.ย. 2569", amount: 198, paid: 0, due: "4 ต.ค. 2569", status: "เกินกำหนด" },
];

export const fundRows: DemoRow[] = [
  { id: "FT-690284", date: "29 ต.ค. 2569", description: "เงินสมทบสมาชิก", member: "สมชาย ใจดี", amount: 2500, type: "เงินเข้า", status: "รออนุมัติ" },
  { id: "FT-690283", date: "29 ต.ค. 2569", description: "ชำระค่าอุปกรณ์", member: "กองทุนหมู่บ้าน", amount: -1800, type: "เงินออก", status: "อนุมัติแล้ว" },
  { id: "FT-690282", date: "28 ต.ค. 2569", description: "เงินฝากสมาชิก", member: "วิไลพร ใจมั่น", amount: 1000, type: "เงินเข้า", status: "อนุมัติแล้ว" },
  { id: "FT-690281", date: "28 ต.ค. 2569", description: "ค่าซ่อมเครื่องสูบน้ำ", member: "กองทุนสาธารณูปโภค", amount: -3200, type: "เงินออก", status: "รออนุมัติ" },
  { id: "FT-690280", date: "27 ต.ค. 2569", description: "เงินสมทบประจำเดือน", member: "อรุณี พรมมา", amount: 500, type: "เงินเข้า", status: "อนุมัติแล้ว" },
  { id: "FT-690279", date: "27 ต.ค. 2569", description: "ซื้ออุปกรณ์สำนักงาน", member: "กองทุนหมู่บ้าน", amount: -950, type: "เงินออก", status: "อนุมัติแล้ว" },
  { id: "FT-690278", date: "26 ต.ค. 2569", description: "รับชำระเงินกู้", member: "ธนกร คำสุข", amount: 1850, type: "เงินเข้า", status: "อนุมัติแล้ว" },
  { id: "FT-690277", date: "25 ต.ค. 2569", description: "เงินฝากสัจจะ", member: "สายฝน แก้วคำ", amount: 700, type: "เงินเข้า", status: "รออนุมัติ" },
  { id: "FT-690276", date: "24 ต.ค. 2569", description: "ค่าบำรุงสถานที่", member: "กองทุนหมู่บ้าน", amount: -1200, type: "เงินออก", status: "อนุมัติแล้ว" },
  { id: "FT-690275", date: "23 ต.ค. 2569", description: "ดอกเบี้ยเงินฝาก", member: "กองทุนหมู่บ้าน", amount: 385, type: "เงินเข้า", status: "อนุมัติแล้ว" },
];

export const loanRows: DemoRow[] = [
  { id: "LN-690032", borrower: "วิไลพร ใจมั่น", product: "สินเชื่อฉุกเฉิน", principal: 20000, remaining: 12500, nextDue: "5 พ.ย. 2569", guarantors: 1, status: "กำลังชำระ" },
  { id: "LN-690031", borrower: "สุชาติ แก้วใจ", product: "สินเชื่อพัฒนาคุณภาพชีวิต", principal: 50000, remaining: 50000, nextDue: "—", guarantors: 2, status: "รออนุมัติ" },
  { id: "LN-690030", borrower: "มานพ พูนผล", product: "สินเชื่อฉุกเฉิน", principal: 15000, remaining: 0, nextDue: "—", guarantors: 1, status: "ปิดบัญชี" },
  { id: "LN-690029", borrower: "อรุณี พรมมา", product: "สินเชื่อพัฒนาคุณภาพชีวิต", principal: 35000, remaining: 28000, nextDue: "10 พ.ย. 2569", guarantors: 2, status: "กำลังชำระ" },
  { id: "LN-690028", borrower: "ธนกร คำสุข", product: "สินเชื่อฉุกเฉิน", principal: 10000, remaining: 7500, nextDue: "12 พ.ย. 2569", guarantors: 1, status: "กำลังชำระ" },
  { id: "LN-690027", borrower: "สายฝน แก้วคำ", product: "สินเชื่ออาชีพ", principal: 60000, remaining: 60000, nextDue: "—", guarantors: 2, status: "รออนุมัติ" },
  { id: "LN-690026", borrower: "ประเสริฐ บุญมี", product: "สินเชื่อฉุกเฉิน", principal: 12000, remaining: 3200, nextDue: "3 พ.ย. 2569", guarantors: 1, status: "เกินกำหนด" },
  { id: "LN-690025", borrower: "รัตนา พรหมรักษ์", product: "สินเชื่อพัฒนาคุณภาพชีวิต", principal: 45000, remaining: 19000, nextDue: "15 พ.ย. 2569", guarantors: 2, status: "กำลังชำระ" },
  { id: "LN-690024", borrower: "วิชัย ทองดี", product: "สินเชื่ออาชีพ", principal: 25000, remaining: 0, nextDue: "—", guarantors: 2, status: "ปิดบัญชี" },
  { id: "LN-690023", borrower: "ชลธิชา แสงทอง", product: "สินเชื่อฉุกเฉิน", principal: 8000, remaining: 8000, nextDue: "—", guarantors: 1, status: "รออนุมัติ" },
];

export const productRows: DemoRow[] = [
  { id: "PR-001", barcode: "8851234000012", name: "ข้าวหอมมะลิ 5 กก.", category: "อาหารแห้ง", price: 185, stock: 24, reorderAt: 10, status: "พร้อมขาย" },
  { id: "PR-002", barcode: "8851234000029", name: "น้ำดื่ม 600 มล.", category: "เครื่องดื่ม", price: 7, stock: 8, reorderAt: 20, status: "ใกล้หมด" },
  { id: "PR-003", barcode: "8851234000036", name: "ไข่ไก่ เบอร์ 2", category: "ของสด", price: 4, stock: 66, reorderAt: 30, status: "พร้อมขาย" },
  { id: "PR-004", barcode: "8851234000043", name: "น้ำมันพืช 1 ลิตร", category: "อาหารแห้ง", price: 48, stock: 5, reorderAt: 8, status: "ใกล้หมด" },
  { id: "PR-005", barcode: "8851234000050", name: "น้ำปลา 700 มล.", category: "เครื่องปรุง", price: 29, stock: 18, reorderAt: 8, status: "พร้อมขาย" },
  { id: "PR-006", barcode: "8851234000067", name: "บะหมี่กึ่งสำเร็จรูป", category: "อาหารแห้ง", price: 7, stock: 42, reorderAt: 20, status: "พร้อมขาย" },
  { id: "PR-007", barcode: "8851234000074", name: "นมถั่วเหลือง 300 มล.", category: "เครื่องดื่ม", price: 12, stock: 6, reorderAt: 12, status: "ใกล้หมด" },
  { id: "PR-008", barcode: "8851234000081", name: "สบู่ก้อนสมุนไพร", category: "ของใช้", price: 25, stock: 14, reorderAt: 6, status: "พร้อมขาย" },
  { id: "PR-009", barcode: "8851234000098", name: "ผงซักฟอก 800 กรัม", category: "ของใช้", price: 52, stock: 9, reorderAt: 10, status: "ใกล้หมด" },
  { id: "PR-010", barcode: "8851234000104", name: "ปลากระป๋อง 155 กรัม", category: "อาหารแห้ง", price: 22, stock: 31, reorderAt: 12, status: "พร้อมขาย" },
  { id: "PR-011", barcode: "8851234000111", name: "กาแฟปรุงสำเร็จ 20 ซอง", category: "เครื่องดื่ม", price: 69, stock: 16, reorderAt: 8, status: "พร้อมขาย" },
  { id: "PR-012", barcode: "8851234000128", name: "น้ำตาลทราย 1 กก.", category: "อาหารแห้ง", price: 28, stock: 0, reorderAt: 10, status: "สินค้าหมด" },
];

export const salesRows: DemoRow[] = [
  { id: "SR-690028", date: "29 ต.ค. 2569", items: "น้ำดื่ม 600 มล. × 2, ไข่ไก่ เบอร์ 2 × 10", amount: 54, paid: 54, method: "เงินสด", status: "สำเร็จ" },
  { id: "SR-690027", date: "29 ต.ค. 2569", items: "ข้าวหอมมะลิ 5 กก. × 1", amount: 185, paid: 185, method: "โอนเงิน", status: "สำเร็จ" },
  { id: "SR-690026", date: "28 ต.ค. 2569", items: "น้ำมันพืช 1 ลิตร × 2, น้ำปลา 700 มล. × 1", amount: 125, paid: 125, method: "เงินสด", status: "สำเร็จ" },
  { id: "SR-690025", date: "28 ต.ค. 2569", items: "บะหมี่กึ่งสำเร็จรูป × 12", amount: 84, paid: 100, method: "เงินสด", status: "สำเร็จ" },
  { id: "SR-690024", date: "27 ต.ค. 2569", items: "ผงซักฟอก 800 กรัม × 1, สบู่ก้อนสมุนไพร × 2", amount: 102, paid: 102, method: "พร้อมเพย์", status: "สำเร็จ" },
  { id: "SR-690023", date: "27 ต.ค. 2569", items: "ปลากระป๋อง 155 กรัม × 4, ข้าวหอมมะลิ 5 กก. × 1", amount: 273, paid: 273, method: "โอนเงิน", status: "สำเร็จ" },
  { id: "SR-690022", date: "26 ต.ค. 2569", items: "นมถั่วเหลือง 300 มล. × 6", amount: 72, paid: 72, method: "เงินสด", status: "สำเร็จ" },
  { id: "SR-690021", date: "26 ต.ค. 2569", items: "กาแฟปรุงสำเร็จ 20 ซอง × 1, น้ำตาลทราย 1 กก. × 2", amount: 125, paid: 125, method: "พร้อมเพย์", status: "สำเร็จ" },
  { id: "SR-690020", date: "25 ต.ค. 2569", items: "น้ำดื่ม 600 มล. × 12", amount: 84, paid: 84, method: "เงินสด", status: "สำเร็จ" },
  { id: "SR-690019", date: "25 ต.ค. 2569", items: "ไข่ไก่ เบอร์ 2 × 30", amount: 120, paid: 120, method: "เงินสด", status: "ยกเลิก" },
  { id: "SR-690018", date: "24 ต.ค. 2569", items: "น้ำปลา 700 มล. × 1, ปลากระป๋อง 155 กรัม × 3", amount: 95, paid: 95, method: "โอนเงิน", status: "สำเร็จ" },
];
