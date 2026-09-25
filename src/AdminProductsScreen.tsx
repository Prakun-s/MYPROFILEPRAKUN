import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { addProduct, fetchProducts, updateProduct } from "./api";
import Icon from "./components/Icon";
import Toast from "./components/Toast";

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  stock_text: string;
  category: string;
  description?: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

type FilterKey = "all" | "instock" | "low" | "out";
type StockStatus = "instock" | "low" | "out";

const STATUS_META: Record<
  StockStatus,
  { label: string; dot: string; bg: string; fg: string }
> = {
  instock: {
    label: "พร้อมส่ง",
    dot: "#2D6A4F",
    bg: "rgba(45,106,79,0.13)",
    fg: "#2D6A4F",
  },
  low: {
    label: "เหลือน้อย",
    dot: "#D97706",
    bg: "rgba(217,119,6,0.13)",
    fg: "#D97706",
  },
  out: {
    label: "หมดสต็อก",
    dot: "#C53030",
    bg: "rgba(197,48,48,0.13)",
    fg: "#C53030",
  },
};

// สถานะสต๊อกคำนวณจากจำนวนคงเหลือจริงเสมอ (ไม่มีคอลัมน์สถานะแยกใน backend ที่ทุกหน้าจออื่นอ่านตรงกัน)
function statusOf(stock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock < 5) return "low";
  return "instock";
}

// รหัสสินค้าสำหรับแสดงผล/ค้นหา อิงจาก id จริงในฐานข้อมูล (ไม่มีคอลัมน์ SKU แยกต่างหาก)
function productCode(id: number) {
  return `PRK-${String(id).padStart(4, "0")}`;
}

function money(n: number) {
  return `฿${Number(n || 0).toLocaleString("th-TH")}`;
}

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "instock", label: "พร้อมส่ง" },
  { key: "low", label: "เหลือน้อย" },
  { key: "out", label: "หมดสต็อก" },
];

type ModalMode = "add" | "edit";

// หน้าแอดมินจัดการคลังสินค้า: ตรวจสอบสต๊อก ปรับจำนวนแบบเรียลไทม์ เพิ่ม/แก้ไขสินค้า
// หมวดหมู่และหน่วยนับอิงจากข้อมูลจริงใน Inventory (ไม่มีคอลัมน์ SKU/หน่วยแยก จึงคำนวณ/ตั้งค่าเริ่มต้นแบบเดียวกันทั้งร้าน)
export default function AdminProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [adjustingId, setAdjustingId] = useState<number | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState<"info" | "warning">("info");

  const notify = (message: string, tone: "info" | "warning" = "info") => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
  };

  const load = async () => {
    try {
      setError("");
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Load admin products error:", err);
      setError(err.message || "ไม่สามารถโหลดรายการสินค้าได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // หมวดหมู่ที่มีอยู่จริงในร้าน เรียงตามความถี่ ใช้เป็นชิปให้เลือกเร็วๆ ตอนเพิ่ม/แก้ไขสินค้า
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (!p.category) continue;
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return Array.from(counts.keys()).sort(
      (a, b) => (counts.get(b)! - counts.get(a)!)
    );
  }, [products]);

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
    [products]
  );
  const lowCount = useMemo(
    () => products.filter((p) => statusOf(p.stock) === "low").length,
    [products]
  );
  const outCount = useMemo(
    () => products.filter((p) => statusOf(p.stock) === "out").length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesFilter = filter === "all" || statusOf(p.stock) === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        productCode(p.id).toLowerCase().includes(q)
      );
    });
  }, [products, filter, search]);

  const adjustStock = async (product: Product, delta: number, silentLabel?: string) => {
    const next = Math.max(0, (Number(product.stock) || 0) + delta);
    const prevStock = product.stock;

    setAdjustingId(product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: next } : p))
    );

    try {
      await updateProduct(product.id, {
        name: product.name,
        stock: next,
        price: product.price,
        category: product.category,
        description: product.description || "",
        location_text: product.location_text || "",
        image_url: product.image_url || "",
      });

      notify(
        silentLabel ||
          `ปรับสต็อก ${productCode(product.id)} เป็น ${next} ชิ้นแล้ว`
      );
    } catch (err: any) {
      console.error("Adjust stock error:", err);
      // ปรับสต็อกไม่สำเร็จ คืนค่าเดิม
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock: prevStock } : p))
      );
      notify(err.message || "ปรับสต็อกไม่สำเร็จ ลองใหม่อีกครั้ง", "warning");
    } finally {
      setAdjustingId(null);
    }
  };

  const handleQuickRestock = (product: Product) => {
    adjustStock(product, 50, `ส่งคำขอเติมสต็อกด่วน +50 ชิ้นสำเร็จ`);
  };

  const openAddModal = () => {
    setModalMode("add");
    setEditingProduct(null);
    setFormName("");
    setFormCategory(categoryChips[0] || "");
    setFormPrice("");
    setFormStock("10");
    setFormError("");
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode("edit");
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category || "");
    setFormPrice(String(product.price ?? 0));
    setFormStock(String(product.stock ?? 0));
    setFormError("");
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError("กรุณากรอกชื่อสินค้า");
      return;
    }

    const stockNum = Math.max(0, Number(formStock) || 0);
    const priceNum = Math.max(0, Number(formPrice) || 0);
    const categoryValue = formCategory.trim() || "ทั่วไป";

    setSaving(true);
    setFormError("");

    try {
      if (modalMode === "add") {
        await addProduct({
          name: formName.trim(),
          stock: stockNum,
          price: priceNum,
          category: categoryValue,
          description: "",
          location_text: "",
          image_url: "",
        });
        notify(`เพิ่มสินค้า "${formName.trim()}" ลงคลังสำเร็จ`);
      } else if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName.trim(),
          stock: stockNum,
          price: priceNum,
          category: categoryValue,
          description: editingProduct.description || "",
          location_text: editingProduct.location_text || "",
          image_url: editingProduct.image_url || "",
        });
        notify(
          `บันทึกข้อมูลสินค้า "${formName.trim()}" (${productCode(
            editingProduct.id
          )}) สำเร็จ`
        );
      }

      setModalVisible(false);
      await load();
    } catch (err: any) {
      console.error("Save product error:", err);
      setFormError(err.message || "บันทึกข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.list, styles.center]}>
        <ActivityIndicator color="#3D2619" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.list, styles.center]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const previewStatus = statusOf(Math.max(0, Number(formStock) || 0));
  const previewMeta = STATUS_META[previewStatus];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F0E9DC" }} contentContainerStyle={styles.list}>
      {/* หัวข้อหน้า + ปุ่มเพิ่มสินค้า */}
      <View style={styles.pageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>จัดการคลังสินค้า</Text>
          <Text style={styles.pageSubtitle}>
            ตรวจสอบสต็อก ปรับปรุงยอดคงคลัง และอัปเดตราคาแบบทันที
          </Text>
        </View>

        <TouchableOpacity style={styles.createButton} activeOpacity={0.85} onPress={openAddModal}>
          <Text style={styles.createButtonText}>+ เพิ่มสินค้า</Text>
        </TouchableOpacity>
      </View>

      {/* ช่องค้นหา */}
      <View style={styles.searchWrapper}>
        <Icon name="search" size={16} color="#8A7D75" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาชื่อสินค้า หรือ รหัสสินค้า..."
          placeholderTextColor="#8A7D75"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ชิปตัวกรองสถานะ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => setFilter(opt.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {opt.label}
              </Text>

              {opt.key === "all" ? (
                <View style={[styles.filterCountBadge, active && styles.filterCountBadgeActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {products.length}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: STATUS_META[opt.key as StockStatus].dot },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* สถิติสรุป 3 ช่อง */}
      <View style={styles.statBanner}>
        <View style={styles.statCell}>
          <Text style={styles.statCellLabel}>สินค้าในคลัง</Text>
          <View style={styles.statCellValueRow}>
            <Text style={styles.statCellValue}>{totalStock}</Text>
            <Text style={styles.statCellUnit}>หน่วย</Text>
          </View>
        </View>

        <View style={styles.statCell}>
          <Text style={[styles.statCellLabel, { color: "#D97706" }]}>เตือนใกล้หมด</Text>
          <View style={styles.statCellValueRow}>
            <Text style={[styles.statCellValue, { color: "#D97706" }]}>{lowCount}</Text>
            <Text style={styles.statCellUnit}>รายการ</Text>
          </View>
        </View>

        <View style={styles.statCell}>
          <Text style={[styles.statCellLabel, { color: "#C53030" }]}>สินค้าหมด</Text>
          <View style={styles.statCellValueRow}>
            <Text style={[styles.statCellValue, { color: "#C53030" }]}>{outCount}</Text>
            <Text style={styles.statCellUnit}>รายการ</Text>
          </View>
        </View>
      </View>

      {/* รายการสินค้า */}
      {filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {search ? `ไม่พบสินค้าที่ตรงกับ "${search}"` : "ยังไม่มีสินค้าในคลัง"}
          </Text>
        </View>
      ) : (
        filteredProducts.map((product) => {
          const status = statusOf(product.stock);
          const meta = STATUS_META[status];
          const isOut = status === "out";
          const isBusy = adjustingId === product.id;

          return (
            <View key={product.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: product.image_url }}
                    style={[styles.image, isOut && styles.imageGrayscale]}
                  />
                  {isOut && (
                    <View style={styles.outOverlay}>
                      <Text style={styles.outOverlayText}>หมด</Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeText} numberOfLines={1}>
                      {productCode(product.id)}
                    </Text>

                    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
                      <Text style={[styles.statusPillText, { color: meta.fg }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>

                  {!!product.description && (
                    <Text style={styles.productDesc} numberOfLines={1}>
                      {product.description}
                    </Text>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={[styles.priceText, isOut && { color: "#8A7D75" }]}>
                      {money(product.price)}
                    </Text>
                    <Text style={styles.priceUnit}> / ชิ้น</Text>
                  </View>
                </View>
              </View>

              <View style={styles.stockRow}>
                <View>
                  <Text
                    style={[
                      styles.stockLabel,
                      status === "low" && { color: "#D97706", fontWeight: "700" },
                    ]}
                  >
                    {status === "low" ? "คงเหลือวิกฤต" : "คงเหลือ"}
                  </Text>
                  <Text
                    style={[
                      styles.stockValue,
                      status === "low" && { color: "#D97706" },
                      status === "out" && { color: "#C53030" },
                    ]}
                  >
                    {product.stock} <Text style={styles.stockValueUnit}>ชิ้น</Text>
                  </Text>
                </View>

                <View style={styles.stockActions}>
                  {isOut ? (
                    <>
                      <TouchableOpacity
                        style={styles.restockButton}
                        activeOpacity={0.85}
                        disabled={isBusy}
                        onPress={() => handleQuickRestock(product)}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <View style={styles.buttonInlineRow}>
                            <Icon name="local_shipping" size={13} color="#FFFFFF" />
                            <Text style={styles.restockButtonText}>สั่งของด่วน</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editIconButton}
                        activeOpacity={0.8}
                        onPress={() => openEditModal(product)}
                      >
                        <Icon name="edit" size={14} color="#3D2619" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={styles.stepperButton}
                          activeOpacity={0.7}
                          disabled={isBusy}
                          onPress={() => adjustStock(product, -1)}
                        >
                          <Text style={styles.stepperButtonText}>－</Text>
                        </TouchableOpacity>

                        {isBusy ? (
                          <ActivityIndicator size="small" color="#3D2619" style={{ width: 24 }} />
                        ) : (
                          <Text style={styles.stepperValue}>{product.stock}</Text>
                        )}

                        <TouchableOpacity
                          style={styles.stepperButton}
                          activeOpacity={0.7}
                          disabled={isBusy}
                          onPress={() => adjustStock(product, 1)}
                        >
                          <Text style={styles.stepperButtonText}>＋</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.editButton}
                        activeOpacity={0.8}
                        onPress={() => openEditModal(product)}
                      >
                        <View style={styles.buttonInlineRow}>
                          <Icon name="edit" size={13} color="#3D2619" />
                          <Text style={styles.editButtonText}>แก้ไข</Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Modal เพิ่ม/แก้ไขสินค้า แบบ bottom sheet */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />

          <View style={styles.modalSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {modalMode === "add" ? "เพิ่มสินค้าใหม่ลงคลัง" : "แก้ไขข้อมูลสินค้า & สต็อก"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {modalMode === "add"
                    ? "กรอกข้อมูลรายละเอียดสินค้าและกำหนดจำนวนสต็อกแรกเข้า"
                    : `รหัสสินค้า: ${editingProduct ? productCode(editingProduct.id) : ""}`}
                </Text>
              </View>

              <TouchableOpacity style={styles.closeButton} activeOpacity={0.7} onPress={closeModal}>
                <Icon name="close" size={18} color="#3D2619" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
              <Text style={styles.fieldLabel}>ชื่อสินค้า</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="เช่น เมล็ดกาแฟอาราบิก้า 100%"
                placeholderTextColor="#8A7D75"
                value={formName}
                onChangeText={setFormName}
              />

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>หมวดหมู่</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="เช่น อุปกรณ์เสริม"
                    placeholderTextColor="#8A7D75"
                    value={formCategory}
                    onChangeText={setFormCategory}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>ราคาจำหน่าย (฿)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="0"
                    placeholderTextColor="#8A7D75"
                    keyboardType="numeric"
                    value={formPrice}
                    onChangeText={setFormPrice}
                  />
                </View>
              </View>

              {categoryChips.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipRow}
                >
                  {categoryChips.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        formCategory === cat && styles.categoryChipActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          formCategory === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>จำนวนสต็อกคงเหลือ</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="0"
                    placeholderTextColor="#8A7D75"
                    keyboardType="numeric"
                    value={formStock}
                    onChangeText={setFormStock}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>สถานะ (คำนวณอัตโนมัติ)</Text>
                  <View style={[styles.statusPreview, { backgroundColor: previewMeta.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: previewMeta.dot }]} />
                    <Text style={[styles.statusPreviewText, { color: previewMeta.fg }]}>
                      {previewMeta.label}
                    </Text>
                  </View>
                </View>
              </View>

              {!!formError && <Text style={styles.formErrorText}>{formError}</Text>}
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.7 }]}
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonInlineRow}>
                    <Icon name="check" size={14} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>บันทึกข้อมูล</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        tone={toastTone}
        onHide={() => setToastVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },

  list: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#F0E9DC",
  },

  errorText: {
    fontSize: 13,
    color: "#C53030",
    textAlign: "center",
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: "#3D2619",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },

  pageTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#3D2619",
  },

  pageSubtitle: {
    fontSize: 12,
    color: "#8A7D75",
    marginTop: 2,
  },

  createButton: {
    backgroundColor: "#3D2619",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  createButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#3D2619",
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    marginBottom: 12,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    height: 32,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  filterChipActive: {
    backgroundColor: "#3D2619",
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A3B32",
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  filterCountBadge: {
    backgroundColor: "rgba(61,38,25,0.12)",
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  filterCountBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  filterCountText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  filterCountTextActive: {
    color: "#FFFFFF",
  },

  statBanner: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },

  statCell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  statCellLabel: {
    fontSize: 10.5,
    color: "#8A7D75",
    fontWeight: "600",
  },

  statCellValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 2,
  },

  statCellValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B2118",
  },

  statCellUnit: {
    fontSize: 10.5,
    color: "#8A7D75",
  },

  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },

  emptyStateText: {
    fontSize: 13,
    color: "#8A7D75",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  cardTopRow: {
    flexDirection: "row",
    gap: 12,
  },

  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F0EDE9",
    overflow: "hidden",
    flexShrink: 0,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageGrayscale: {
    opacity: 0.55,
  },

  outOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(49,48,45,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  outOverlayText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    backgroundColor: "#C53030",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },

  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },

  codeText: {
    fontSize: 10.5,
    color: "#8A7D75",
    letterSpacing: 0.3,
    flexShrink: 1,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },

  productName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3D2619",
    marginTop: 3,
  },

  productDesc: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: 2,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 5,
  },

  priceText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3D2619",
  },

  priceUnit: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F6F3EE",
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
  },

  stockLabel: {
    fontSize: 10.5,
    color: "#8A7D75",
    fontWeight: "600",
  },

  stockValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3D2619",
    marginTop: 1,
  },

  stockValueUnit: {
    fontSize: 11.5,
    color: "#8A7D75",
    fontWeight: "400",
  },

  stockActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  stepperButton: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },

  stepperButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A3B32",
  },

  stepperValue: {
    width: 24,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#3D2619",
  },

  editButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  editButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#3D2619",
  },

  restockButton: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: "#C53030",
    alignItems: "center",
    justifyContent: "center",
  },

  restockButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  buttonInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  editIconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  editIconText: {
    fontSize: 13,
    color: "#3D2619",
  },

  // ===== MODAL (bottom sheet) =====
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(49,48,45,0.55)",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },

  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    maxHeight: "88%",
  },

  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#E5E2DD",
    alignSelf: "center",
    marginBottom: 10,
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#3D2619",
  },

  modalSubtitle: {
    fontSize: 11.5,
    color: "#8A7D75",
    marginTop: 2,
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    fontSize: 13,
    color: "#4A3B32",
    fontWeight: "700",
  },

  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4A3B32",
    marginBottom: 5,
    marginTop: 10,
  },

  fieldInput: {
    height: 44,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: "#F6F3EE",
    fontSize: 14,
    color: "#2B2118",
  },

  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },

  categoryChipRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },

  categoryChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F0EDE9",
  },

  categoryChipActive: {
    backgroundColor: "#3D2619",
  },

  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A3B32",
  },

  categoryChipTextActive: {
    color: "#FFFFFF",
  },

  statusPreview: {
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  statusPreviewText: {
    fontSize: 12.5,
    fontWeight: "700",
  },

  formErrorText: {
    fontSize: 12,
    color: "#C53030",
    marginTop: 10,
  },

  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F0EDE9",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#4A3B32",
  },

  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#3D2619",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
