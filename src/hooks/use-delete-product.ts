import { useState } from "react";

import { Alert } from "react-native";

import { deleteProduct } from "../api";

interface Product {
  id: number;
  name: string;
}

/**
 * รวมทุกอย่างที่เกี่ยวกับ "การลบสินค้า" ไว้ที่เดียว
 * - เก็บ id ของสินค้าที่กำลังลบอยู่ (ใช้โชว์ loading บนปุ่ม)
 * - เก็บสินค้าที่รอการยืนยัน (เปิด/ปิดกล่องยืนยัน)
 * - เรียก API ลบจริง และแจ้งเตือนถ้า error
 *
 * วิธีใช้ใน component:
 *   const {
 *     deletingId,
 *     deleteTarget,
 *     askDelete,
 *     cancelDelete,
 *     confirmDelete,
 *   } = useDeleteProduct(onDeleted);
 */
export function useDeleteProduct(onDeleted: (id: number) => void) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // เปิดกล่องยืนยันสำหรับสินค้าชิ้นนี้
  const askDelete = (product: Product) => {
    setDeleteTarget(product);
  };

  // ปิดกล่องยืนยันโดยไม่ทำอะไร
  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  // ผู้ใช้กดยืนยัน -> ยิง API ลบจริง
  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const id = deleteTarget.id;
    setDeleteTarget(null);

    try {
      setDeletingId(id);
      await deleteProduct(id);
      onDeleted(id);
    } catch (err: any) {
      console.error("Delete product error:", err);
      Alert.alert("Error", err.message || "ไม่สามารถลบสินค้าได้");
    } finally {
      setDeletingId(null);
    }
  };

  return {
    deletingId,
    deleteTarget,
    askDelete,
    cancelDelete,
    confirmDelete,
  };
}
