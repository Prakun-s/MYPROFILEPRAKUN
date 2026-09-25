import {
  ClaimRecord,
  fetchAllClaims,
  fetchAllOrders,
  fetchMyClaims,
  fetchMyOrders,
} from "../api";

export interface NotificationItem {
  id: string;
  icon: string;
  iconColor: string;
  text: string;
  date: string;
}

// ข้อความ/ไอคอนต่อสถานะ — ดึงจากข้อมูลออเดอร์และคำขอเคลมจริงที่มีอยู่แล้วใน backend
// (ไม่มีตาราง/ระบบ "แจ้งเตือน" แยกต่างหากในฐานข้อมูล จึงประกอบแจ้งเตือนจากสถานะจริงแทน)
const MY_ORDER_STATUS_TEXT: Partial<Record<string, (id: number) => string>> = {
  shipping: (id) => `ออเดอร์ #${id} กำลังจัดส่ง`,
  delivered: (id) => `ออเดอร์ #${id} จัดส่งสำเร็จแล้ว`,
  cancelled: (id) => `ออเดอร์ #${id} ถูกยกเลิก`,
};

const MY_CLAIM_STATUS_TEXT: Record<string, (id: number) => string> = {
  pending: (id) => `ส่งคำขอเคลม #${id} แล้ว กำลังรอตรวจสอบ`,
  approved: (id) => `คำขอเคลม #${id} ได้รับการอนุมัติแล้ว`,
  rejected: (id) => `คำขอเคลม #${id} ถูกปฏิเสธ`,
  completed: (id) => `คำขอเคลม #${id} ดำเนินการเสร็จสิ้นแล้ว`,
};

export function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;

  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// รวบรวม "แจ้งเตือน" จากข้อมูลจริงที่มีอยู่แล้ว (ไม่มีการสร้างข้อมูลปลอม)
// แอดมิน: ออเดอร์/คำขอเคลมใหม่ที่รอดำเนินการทั้งร้าน
// ผู้ใช้ทั่วไป: ความเคลื่อนไหวของออเดอร์/คำขอเคลมของตัวเอง
export async function loadNotifications(isAdmin: boolean): Promise<NotificationItem[]> {
  const list: NotificationItem[] = [];

  if (isAdmin) {
    const [orders, claims] = await Promise.all([
      fetchAllOrders().catch(() => []),
      fetchAllClaims().catch(() => []),
    ]);

    for (const o of orders as any[]) {
      if (o.status === "pending") {
        list.push({
          id: `order-${o.id}`,
          icon: "receipt_long",
          iconColor: "#D97706",
          text: `ออเดอร์ใหม่ #${o.id} รอดำเนินการ (฿${Number(
            o.total_amount
          ).toLocaleString("th-TH")})`,
          date: o.created_at,
        });
      }
    }

    for (const c of claims as ClaimRecord[]) {
      if (c.status === "pending") {
        list.push({
          id: `claim-${c.id}`,
          icon: "build",
          iconColor: "#C53030",
          text: `คำขอเคลมใหม่ #${c.id}: ${c.product_name}`,
          date: c.created_at,
        });
      }
    }
  } else {
    const [orders, claims] = await Promise.all([
      fetchMyOrders().catch(() => []),
      fetchMyClaims().catch(() => []),
    ]);

    for (const o of orders as any[]) {
      const makeText = o.status ? MY_ORDER_STATUS_TEXT[o.status] : undefined;
      if (makeText) {
        list.push({
          id: `order-${o.id}`,
          icon: o.status === "delivered" ? "task_alt" : "local_shipping",
          iconColor: o.status === "delivered" ? "#2D6A4F" : "#1A56C4",
          text: makeText(o.id),
          date: o.created_at,
        });
      }
    }

    for (const c of claims as ClaimRecord[]) {
      const makeText = MY_CLAIM_STATUS_TEXT[c.status];
      if (makeText) {
        list.push({
          id: `claim-${c.id}`,
          icon:
            c.status === "approved" || c.status === "completed"
              ? "check_circle"
              : c.status === "rejected"
              ? "cancel"
              : "hourglass_top",
          iconColor:
            c.status === "approved" || c.status === "completed"
              ? "#2D6A4F"
              : c.status === "rejected"
              ? "#C53030"
              : "#D97706",
          text: makeText(c.id),
          date: c.updated_at || c.created_at,
        });
      }
    }
  }

  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return list.slice(0, 30);
}
