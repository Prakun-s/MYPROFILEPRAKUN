import { useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import ConfirmDialog from "./components/ConfirmDialog";
import SkeletonCard from "./components/SkeletonCard";
import Toast from "./components/Toast";
import { addToCart, fetchProducts } from "./api";
import { useCart } from "./context/CartContext";
import { useWishlist } from "./context/WishlistContext";
import { useDeleteProduct } from "./hooks/use-delete-product";
import { useProductSearch } from "./hooks/use-product-search";

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  stock_text: string;
  category: string;
  location_count: number;
  location_text: string;
  badge_status: string;
  image_url: string;
}

type PriceTier = "Low" | "Mid" | "High";

// เกณฑ์ราคาแบบตายตัว อิงมาตรฐานตลาดกล้อง Mirrorless (ปรับตัวเลขตรงนี้ได้ตามต้องการ)
// Low   = กล้องระดับเริ่มต้น (entry-level)   ต่ำกว่า 30,000 บาท
// Mid   = กล้องระดับกลาง (enthusiast/prosumer) 30,000 - 70,000 บาท
// High  = กล้องระดับมืออาชีพ (professional)    มากกว่า 70,000 บาท
const PRICE_TIER_LOW_MAX = 30000; // ต่ำกว่า 30,000 = Low
const PRICE_TIER_MID_MAX = 70000; // 30,000 - 70,000 = Mid, มากกว่า 70,000 = High

// ตัวเลือกแบรนด์สำหรับตัวกรอง (เทียบจากชื่อสินค้าว่ามีคำนี้อยู่มั้ย)
const BRAND_OPTIONS = ["Canon", "Fujifilm", "Sony", "Nikon"] as const;
type BrandOption = (typeof BRAND_OPTIONS)[number];

function getBrand(name: string): BrandOption | null {
  const lower = name.toLowerCase();
  return (
    BRAND_OPTIONS.find((brand) => lower.includes(brand.toLowerCase())) ?? null
  );
}

// ช่วงราคาสำหรับตัวกรอง อิงตัวเลขเบรกพอยต์ 30,000 / 50,000 / 80,000
interface PriceBandOption {
  id: string;
  label: string;
  test: (price: number) => boolean;
}

const PRICE_BAND_OPTIONS: PriceBandOption[] = [
  {
    id: "under-30000",
    label: "ต่ำกว่า ฿30,000",
    test: (price) => price < 30000,
  },
  {
    id: "30000-50000",
    label: "฿30,000 - 50,000",
    test: (price) => price >= 30000 && price <= 50000,
  },
  {
    id: "50000-80000",
    label: "฿50,000 - 80,000",
    test: (price) => price > 50000 && price <= 80000,
  },
  {
    id: "above-80000",
    label: "มากกว่า ฿80,000",
    test: (price) => price > 80000,
  },
];

// ตัวเลือกการเรียงลำดับสินค้า
type SortId = "newest" | "price-asc" | "price-desc";

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "newest", label: "มาใหม่ล่าสุด" },
  { id: "price-asc", label: "ราคา: น้อย → มาก" },
  { id: "price-desc", label: "ราคา: มาก → น้อย" },
];

function sortProducts<T extends { id: number; price: number }>(
  items: T[],
  sortId: SortId
): T[] {
  const copy = [...items];

  if (sortId === "price-asc") {
    return copy.sort((a, b) => Number(a.price) - Number(b.price));
  }

  if (sortId === "price-desc") {
    return copy.sort((a, b) => Number(b.price) - Number(a.price));
  }

  // "มาใหม่ล่าสุด" -> backend ส่งมาเรียง id DESC (ใหม่สุดก่อน) อยู่แล้ว
  // เรียงตาม id DESC ซ้ำอีกชั้นเผื่อลำดับเพี้ยนจากการกรอง/ค้นหา
  return copy.sort((a, b) => b.id - a.id);
}

function getPriceTier(price: number): PriceTier {
  if (price < PRICE_TIER_LOW_MAX) return "Low";
  if (price <= PRICE_TIER_MID_MAX) return "Mid";
  return "High";
}

// แปะป้าย Low / Mid / High ให้สินค้าแต่ละชิ้นตามเกณฑ์ราคาตายตัวด้านบน
function classifyPricesByTier(items: Product[]): Map<number, PriceTier> {
  const tierById = new Map<number, PriceTier>();

  items.forEach((item) => {
    tierById.set(item.id, getPriceTier(Number(item.price) || 0));
  });

  return tierById;
}

// จำนวนคอลัมน์ของกริด: 2 คอลัมน์บนจอมือถือ ไล่ขึ้นไปถึง 4 คอลัมน์บนจอใหญ่
function getColumnCount(width: number) {
  if (width >= 1100) return 4;
  if (width >= 700) return 3;
  return 2;
}

// หั่นลิสต์แบนๆ ให้เป็นแถวๆ ละ `size` ชิ้น สำหรับเรนเดอร์กริดแบบ View ธรรมดา
function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }

  return rows;
}

const CONTAINER_PADDING = 16;
const GRID_GAP = 14;
// จอกว้างพอ (เดสก์ท็อป/แท็บเล็ตแนวนอน) ค่อยโชว์แผงตัวกรองปักซ้ายแบบถาวร
const SIDEBAR_BREAKPOINT = 900;
const FILTER_SIDEBAR_WIDTH = 260;

// แบนเนอร์ใหญ่ด้านบน: เลื่อนรูปสินค้าไปทางขวาเรื่อยๆ แบบวนไม่รู้จบ
const HERO_INTERVAL = 4200; // เว้นระยะก่อนเลื่อนสไลด์ถัดไป (ms)
const HERO_DURATION = 900; // ความเร็วตอนเลื่อน (ms)

function HeroCarousel({
  products,
  containerWidth,
}: {
  products: Product[];
  containerWidth: number;
}) {
  const width = containerWidth;

  // แบนเนอร์เต็มความกว้างของคอลัมน์เนื้อหา (ทะลุขอบ padding ของ list ออกไป)
  const slideWidth = Math.max(width, 1);
  const heroHeight = width >= 1100 ? 640 : width >= 700 ? 480 : 340;

  const total = products.length;
  // ต่อสไลด์แรกไว้ท้ายสุด เพื่อให้เลื่อนขวาต่อเนื่องแล้วค่อยวาร์ปกลับแบบไม่เห็นรอยต่อ
  const slides = total > 0 ? [...products, products[0]] : [];

  const translateX = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // จอเปลี่ยนขนาด ให้ขยับตำแหน่งสไลด์ตามทันที
  useEffect(() => {
    translateX.setValue(-indexRef.current * slideWidth);
  }, [slideWidth]);

  const goTo = (next: number) => {
    indexRef.current = next;
    setActiveIndex(total > 0 ? next % total : 0);

    Animated.timing(translateX, {
      toValue: -next * slideWidth,
      duration: HERO_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // ถึงสไลด์ที่ก๊อปมา (ใบแรก) แล้ว ให้ตัดกลับไปตำแหน่ง 0 ทันที
      if (finished && next === total) {
        indexRef.current = 0;
        setActiveIndex(0);
        translateX.setValue(0);
      }
    });
  };

  // เลื่อนอัตโนมัติ (หยุดชั่วคราวตอนเอาเมาส์ไปชี้)
  useEffect(() => {
    if (total < 2 || paused) return;

    const timer = setInterval(() => {
      goTo(indexRef.current + 1);
    }, HERO_INTERVAL);

    return () => clearInterval(timer);
  }, [total, paused, slideWidth]);

  if (total === 0) {
    return <View style={[styles.hero, { height: heroHeight }]} />;
  }

  return (
    <Animated.View
      style={[styles.hero, { height: heroHeight, opacity: fade }]}
    >
      <Pressable
        style={styles.heroPressArea}
        onHoverIn={() => setPaused(true)}
        onHoverOut={() => setPaused(false)}
        {...({
          onMouseEnter: () => setPaused(true),
          onMouseLeave: () => setPaused(false),
        } as any)}
      >
        <Animated.View
          style={{
            flexDirection: "row",
            width: slideWidth * slides.length,
            height: "100%",
            transform: [{ translateX }],
          }}
        >
          {slides.map((item, i) => (
            <View
              key={`${item.id}-${i}`}
              style={{ width: slideWidth, height: "100%" }}
            >
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.heroSlideImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[styles.heroSlideImage, { backgroundColor: "#2A2A2A" }]}
                />
              )}

              {/* ไล่เฉดมืดจากซ้ายไปขวา ให้ตัวหนังสืออ่านง่าย */}
              <View style={styles.heroScrimFull} />
              <View style={styles.heroScrimMid} />
              <View style={styles.heroScrimLeft} />

              <View style={styles.heroSlideText}>
                <Text style={styles.heroOverline}>NEW ARRIVALS</Text>

                <Text
                  style={[
                    styles.heroTitle,
                    width >= 1100 && { fontSize: 64, lineHeight: 70 },
                    width < 700 && { fontSize: 32, lineHeight: 38 },
                  ]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>

                <Text style={styles.heroPrice}>
                  ฿{Number(item.price).toLocaleString("th-TH")}
                </Text>

                <Text style={styles.heroSubtitle}>
                  {item.category} · {products.length} products available right now
                </Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* จุดบอกสไลด์ */}
        <View style={styles.heroDots}>
          {products.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => goTo(i)}
              style={[
                styles.heroDot,
                i === activeIndex && styles.heroDotActive,
              ]}
            />
          ))}
        </View>

        {/* ปุ่มเลื่อนซ้าย/ขวา */}
        <Pressable
          style={[styles.heroArrow, styles.heroArrowLeft]}
          onPress={() =>
            goTo(indexRef.current === 0 ? total - 1 : indexRef.current - 1)
          }
        >
          <Text style={styles.heroArrowText}>‹</Text>
        </Pressable>

        <Pressable
          style={[styles.heroArrow, styles.heroArrowRight]}
          onPress={() => goTo(indexRef.current + 1)}
        >
          <Text style={styles.heroArrowText}>›</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// แผงตัวกรอง: เลือกแบรนด์ / ช่วงราคาได้หลายอันพร้อมกัน (checkbox)
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <View style={styles.filterSection}>
      <Pressable
        style={styles.filterSectionHeader}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={styles.filterSectionTitle}>{title}</Text>
        <Text style={styles.filterSectionToggle}>{open ? "－" : "+"}</Text>
      </Pressable>

      {open && <View style={styles.filterSectionBody}>{children}</View>}
    </View>
  );
}

function FilterCheckbox({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.filterRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxMark}>✓</Text>}
      </View>
      <Text style={styles.filterLabel}>{label}</Text>
    </Pressable>
  );
}

function FilterPanel({
  selectedBrands,
  onToggleBrand,
  selectedPriceBands,
  onTogglePriceBand,
  onClearAll,
}: {
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  selectedPriceBands: string[];
  onTogglePriceBand: (id: string) => void;
  onClearAll: () => void;
}) {
  const hasActiveFilters =
    selectedBrands.length > 0 || selectedPriceBands.length > 0;

  return (
    <View style={styles.filterPanel}>
      <View style={styles.filterHeaderRow}>
        <Text style={styles.filterHeaderTitle}>ตัวกรอง</Text>

        {hasActiveFilters && (
          <Pressable onPress={onClearAll}>
            <Text style={styles.filterClearAll}>ล้างทั้งหมด</Text>
          </Pressable>
        )}
      </View>

      <FilterSection title="แบรนด์">
        {BRAND_OPTIONS.map((brand) => (
          <FilterCheckbox
            key={brand}
            label={brand}
            checked={selectedBrands.includes(brand)}
            onPress={() => onToggleBrand(brand)}
          />
        ))}
      </FilterSection>

      <FilterSection title="ช่วงราคา">
        {PRICE_BAND_OPTIONS.map((band) => (
          <FilterCheckbox
            key={band.id}
            label={band.label}
            checked={selectedPriceBands.includes(band.id)}
            onPress={() => onTogglePriceBand(band.id)}
          />
        ))}
      </FilterSection>
    </View>
  );
}

// ปุ่ม dropdown เรียงลำดับสินค้า วางข้างๆ ปุ่มตัวกรอง
// ใช้ Modal (ไม่ใช่ position:absolute ธรรมดา) เพื่อให้เมนูลอยอยู่บนสุดเสมอ ไม่โดนการ์ดสินค้าทับ
// และยังทำงานถูกต้องเหมือนกันทั้งเว็บและแอปมือถือจริง (iOS/Android)
function SortDropdown({
  value,
  onChange,
}: {
  value: SortId;
  onChange: (id: SortId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const buttonRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();

  const current = SORT_OPTIONS.find((o) => o.id === value) ?? SORT_OPTIONS[0];
  const MENU_WIDTH = 190;

  const handleOpen = () => {
    // วัดตำแหน่งปุ่มจริงบนจอก่อนเปิดเมนู เพื่อวางเมนูให้ตรงกับปุ่มเป๊ะๆ ไม่ว่าจะเลื่อนหน้าจอไปแค่ไหน
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <View ref={buttonRef} collapsable={false}>
      <TouchableOpacity
        style={styles.sortButton}
        activeOpacity={0.7}
        onPress={handleOpen}
      >
        <Text style={styles.sortButtonText} numberOfLines={1}>
          {current.label}
        </Text>
        <Text style={styles.sortButtonCaret}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.sortOverlay} onPress={() => setOpen(false)}>
          {anchor && (
            <View
              style={[
                styles.sortMenu,
                {
                  position: "absolute",
                  top: anchor.y + anchor.height + 6,
                  left: Math.min(
                    Math.max(8, anchor.x + anchor.width - MENU_WIDTH),
                    screenWidth - MENU_WIDTH - 8
                  ),
                  width: MENU_WIDTH,
                },
              ]}
            >
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.sortMenuItem,
                    option.id === value && styles.sortMenuItemActive,
                  ]}
                  onPress={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortMenuItemText,
                      option.id === value && styles.sortMenuItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>

                  {option.id === value && (
                    <Text style={styles.sortMenuItemCheck}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

// การ์ดสินค้าที่ "ยกตัวขึ้น" ตอนเอาเมาส์ไปชี้ (เว็บ) และยุบลงตอนกด (มือถือ)
function HoverLiftCard({
  width,
  onPress,
  children,
}: {
  width: number;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);

  const animateTo = (toValue: number) => {
    setHovered(toValue === 1);

    Animated.spring(lift, {
      toValue,
      friction: 9,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  return (
    <Pressable
      style={{ width }}
      onPress={onPress}
      onHoverIn={() => animateTo(1)}
      onHoverOut={() => animateTo(0)}
      // เผื่อ react-native-web บาง version ที่ไม่ยิง onHoverIn/onHoverOut
      {...({
        onMouseEnter: () => animateTo(1),
        onMouseLeave: () => animateTo(0),
      } as any)}
    >
      <Animated.View
        style={[
          styles.card,
          hovered && styles.cardHovered,
          { transform: [{ translateY }, { scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface Props {
  onEditProduct?: (product: Product) => void;
  // เปิดหน้ารายละเอียดสินค้า (กดที่การ์ด)
  onOpenProduct?: (product: Product) => void;
  // ควบคุมว่าแสดงปุ่ม "แก้ไข" / "ลบ" หรือไม่ (เฉพาะ admin เท่านั้น)
  canManage?: boolean;
}

export default function ProductListScreen({
  onEditProduct,
  onOpenProduct,
  canManage = false,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const { width } = useWindowDimensions();

  // จอกว้างพอ -> ปักแผงตัวกรองไว้ทางซ้ายแบบถาวร แล้วเหลือพื้นที่ที่เหลือให้กริดสินค้า
  const isWideLayout = width >= SIDEBAR_BREAKPOINT;
  const contentWidth = isWideLayout ? width - FILTER_SIDEBAR_WIDTH : width;

  const numColumns = useMemo(
    () => getColumnCount(contentWidth),
    [contentWidth]
  );
  const cardWidth = useMemo(
    () =>
      (contentWidth - CONTAINER_PADDING * 2 - GRID_GAP * (numColumns - 1)) /
      numColumns,
    [contentWidth, numColumns]
  );

  const {
    deletingId,
    deleteTarget,
    askDelete,
    cancelDelete,
    confirmDelete,
  } = useDeleteProduct((deletedId) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
  });

  const { searchText, setSearchText, filteredProducts: searchedProducts } =
    useProductSearch(products);

  // ===== ตัวกรอง: แบรนด์ + ช่วงราคา =====
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPriceBands, setSelectedPriceBands] = useState<string[]>([]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const togglePriceBand = (id: string) => {
    setSelectedPriceBands((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setSelectedPriceBands([]);
  };

  const hasActiveFilters =
    selectedBrands.length > 0 || selectedPriceBands.length > 0;

  const filteredProducts = useMemo(() => {
    return searchedProducts.filter((product) => {
      const brandMatch =
        selectedBrands.length === 0 ||
        (getBrand(product.name) &&
          selectedBrands.includes(getBrand(product.name) as string));

      const priceMatch =
        selectedPriceBands.length === 0 ||
        selectedPriceBands.some((id) => {
          const band = PRICE_BAND_OPTIONS.find((b) => b.id === id);
          return band ? band.test(Number(product.price) || 0) : false;
        });

      return brandMatch && priceMatch;
    });
  }, [searchedProducts, selectedBrands, selectedPriceBands]);

  // ===== เรียงลำดับสินค้า =====
  const [sortId, setSortId] = useState<SortId>("newest");

  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, sortId),
    [filteredProducts, sortId]
  );

  // แปะป้าย Low / Mid / High ใหม่ทุกครั้งที่รายการสินค้าเปลี่ยน (เกณฑ์ตายตัว)
  const priceTierById = useMemo(
    () => classifyPricesByTier(products),
    [products]
  );

  // ===== แจ้งเตือนสต๊อกต่ำ (เฉพาะ admin) =====
  const [lowStockToastVisible, setLowStockToastVisible] = useState(false);
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock < 5).length,
    [products]
  );

  const loadProducts = async ({ silent = false } = {}) => {
    try {
      setError("");

      const data = await fetchProducts();

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format");
      }

      setProducts(data);

      // เด้ง toast แจ้งเตือนสต๊อกต่ำให้ admin เห็นทันทีตอนโหลด/รีเฟรชข้อมูลใหม่
      if (canManage) {
        const lowCount = data.filter(
          (p: Product) => p.stock > 0 && p.stock < 5
        ).length;

        if (lowCount > 0 && !silent) {
          setLowStockToastVisible(true);
        }
      }
    } catch (err: any) {
      console.error("Fetch products error:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // โหลดสินค้าอัตโนมัติเมื่อเปิดหน้า
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const { refreshCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

  const handleAddToCart = async (product: Product) => {
    setAddingId(product.id);

    try {
      await addToCart(product.id, 1);
      await refreshCart();

      // โชว์ "✓ เพิ่มแล้ว" ชั่วคราวแล้วค่อยเปลี่ยนกลับ
      setAddedId(product.id);
      setTimeout(() => setAddedId(null), 1200);
    } catch (err) {
      console.error("Add to cart error:", err);
    } finally {
      setAddingId(null);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const tier = priceTierById.get(item.id);

    const wishlisted = isWishlisted(item.id);

    return (
      <HoverLiftCard
        width={cardWidth}
        onPress={() => onOpenProduct && onOpenProduct(item)}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image_url }}
            style={[styles.image, { height: cardWidth }]}
            resizeMode="cover"
          />

          <TouchableOpacity
            style={styles.wishlistChip}
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleWishlist({
                id: item.id,
                name: item.name,
                price: item.price,
                image_url: item.image_url,
                category: item.category,
                stock: item.stock,
                badge_status: item.badge_status,
              });
            }}
          >
            <Text
              style={[
                styles.wishlistChipIcon,
                wishlisted && styles.wishlistChipIconActive,
              ]}
            >
              {wishlisted ? "♥" : "♡"}
            </Text>
          </TouchableOpacity>

          {canManage && (
            <TouchableOpacity
              style={styles.editChip}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                onEditProduct && onEditProduct(item);
              }}
            >
              <Text style={styles.editChipText}>แก้ไข</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.category} numberOfLines={1}>
            {item.category}
          </Text>

          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={styles.price}>
            ฿{Number(item.price).toLocaleString("th-TH")}
          </Text>

          <View style={styles.badgeGroup}>
            <Text
              style={[
                styles.badge,
                item.stock < 5 ? styles.badgeStrong : styles.badgeOutline,
              ]}
            >
              {item.badge_status}
            </Text>

            {tier && (
              <Text style={[styles.badge, styles.badgeOutline]}>
                {tier}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.cartButton,
              (item.stock < 1 || addingId === item.id) &&
                styles.cartButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={item.stock < 1 || addingId === item.id}
            onPress={(e) => {
              e.stopPropagation?.();
              handleAddToCart(item);
            }}
          >
            {addingId === item.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.cartButtonText}>
                {item.stock < 1
                  ? "สินค้าหมด"
                  : addedId === item.id
                  ? "✓ เพิ่มแล้ว"
                  : "หยิบใส่ตะกร้า"}
              </Text>
            )}
          </TouchableOpacity>

          {canManage && (
            <TouchableOpacity
              style={styles.deleteLink}
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                askDelete(item);
              }}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color="#111111" />
              ) : (
                <Text style={styles.deleteLinkText}>ลบสินค้า</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </HoverLiftCard>
    );
  };

  if (loading) {
    // จำนวนคอลัมน์เดาจากความกว้างจอปัจจุบัน (ก่อนรู้ข้อมูลสินค้าจริง)
    const skeletonColumns = getColumnCount(
      isWideLayout ? width - FILTER_SIDEBAR_WIDTH : width
    );
    const skeletonWidth =
      ((isWideLayout ? width - FILTER_SIDEBAR_WIDTH : width) -
        CONTAINER_PADDING * 2 -
        GRID_GAP * (skeletonColumns - 1)) /
      skeletonColumns;
    const skeletonRows = chunk(
      Array.from({ length: skeletonColumns * 2 }),
      skeletonColumns
    );

    return (
      <View style={styles.container}>
        <View style={[styles.hero, { height: width >= 1100 ? 640 : width >= 700 ? 480 : 340 }]} />

        <View style={styles.bodyRow}>
          {isWideLayout && <View style={styles.sidebar} />}

          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Products</Text>
            </View>

            <View style={styles.list}>
              {skeletonRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                  {row.map((_, colIndex) => (
                    <SkeletonCard
                      key={colIndex}
                      width={skeletonWidth}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>

        <Text style={styles.error}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.8}
          onPress={() => loadProducts()}
        >
          <Text style={styles.retryText}>
            Retry
          </Text>
        </TouchableOpacity>

      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HERO CAROUSEL: เต็มความกว้างจอ อยู่เหนือแผงตัวกรอง+กริดสินค้า */}
        <HeroCarousel products={products} containerWidth={width} />

        <View style={styles.bodyRow}>
          {/* แผงตัวกรองปักซ้าย โชว์เฉพาะจอกว้างพอ (เดสก์ท็อป/แท็บเล็ต) เลื่อนลงไปพร้อมกับหน้าทั้งหมด */}
          {isWideLayout && (
            <View style={styles.sidebar}>
              <FilterPanel
                selectedBrands={selectedBrands}
                onToggleBrand={toggleBrand}
                selectedPriceBands={selectedPriceBands}
                onTogglePriceBand={togglePriceBand}
                onClearAll={clearAllFilters}
              />
            </View>
          )}

          <View style={styles.content}>
            {/* SEARCH */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Products</Text>

              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <SortDropdown value={sortId} onChange={setSortId} />

                {/* บนจอแคบไม่มีที่พอสำหรับ sidebar เลยใช้ปุ่มเปิด/ปิดแผงตัวกรองแทน */}
                {!isWideLayout && (
                  <TouchableOpacity
                    style={[
                      styles.refreshButton,
                      (filterOpen || hasActiveFilters) &&
                        styles.filterButtonActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setFilterOpen((o) => !o)}
                  >
                    <Text
                      style={[
                        styles.refreshText,
                        (filterOpen || hasActiveFilters) &&
                          styles.filterButtonActiveText,
                      ]}
                    >
                      ตัวกรอง
                      {hasActiveFilters
                        ? ` (${selectedBrands.length + selectedPriceBands.length})`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.refreshButton}
                  activeOpacity={0.7}
                  onPress={() => loadProducts()}
                >
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>

            {canManage && lowStockCount > 0 && (
              <View style={styles.lowStockBanner}>
                <Text style={styles.lowStockBannerIcon}>⚠️</Text>
                <Text style={styles.lowStockBannerText}>
                  มีสินค้าใกล้หมดสต๊อก {lowStockCount} รายการ (เหลือต่ำกว่า 5 ชิ้น)
                </Text>
              </View>
            )}

            <View style={styles.searchWrapper}>
              <TextInput
                style={styles.searchInput}
                placeholder="ค้นหาสินค้า ชื่อ, หมวดหมู่, ตำแหน่ง..."
                placeholderTextColor="#A9A8A2"
                value={searchText}
                onChangeText={setSearchText}
              />

              {searchText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  activeOpacity={0.7}
                  onPress={() => setSearchText("")}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isWideLayout && filterOpen && (
              <View style={{ marginHorizontal: CONTAINER_PADDING }}>
                <FilterPanel
                  selectedBrands={selectedBrands}
                  onToggleBrand={toggleBrand}
                  selectedPriceBands={selectedPriceBands}
                  onTogglePriceBand={togglePriceBand}
                  onClearAll={clearAllFilters}
                />
              </View>
            )}

            <Text style={styles.count}>
              {searchText || hasActiveFilters
                ? `พบ ${sortedProducts.length} จาก ${products.length} รายการ`
                : `${products.length} Products`}
            </Text>

            {/* GRID สินค้า: เรนเดอร์เป็นแถวๆ ธรรมดา ไม่ใช้ FlatList
                เพื่อให้อยู่ใน ScrollView เดียวกับ hero และแผงตัวกรอง เลื่อนไปด้วยกันทั้งหน้า */}
            {sortedProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  ไม่พบสินค้าที่ตรงกับ "{searchText}"
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {chunk(sortedProducts, numColumns).map((rowItems, rowIndex) => (
                  <View key={rowIndex} style={styles.row}>
                    {rowItems.map((item) => (
                      <View key={item.id}>{renderProduct({ item })}</View>
                    ))}

                    {/* เติมช่องว่างในแถวสุดท้ายถ้าสินค้าไม่ครบคอลัมน์ ไม่งั้นการ์ดจะยืดเต็มแถว */}
                    {rowItems.length < numColumns &&
                      Array.from({ length: numColumns - rowItems.length }).map(
                        (_, i) => (
                          <View key={`spacer-${i}`} style={{ width: cardWidth }} />
                        )
                      )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="ลบสินค้า"
        message={
          deleteTarget
            ? `ต้องการลบ "${deleteTarget.name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`
            : ""
        }
        confirmText="ลบ"
        cancelText="ยกเลิก"
        destructive
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      <Toast
        visible={lowStockToastVisible}
        tone="warning"
        message={`มีสินค้าใกล้หมดสต๊อก ${lowStockCount} รายการ (เหลือต่ำกว่า 5 ชิ้น)`}
        onHide={() => setLowStockToastVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FAFAFA",
  },

  // ===== SIDEBAR LAYOUT =====
  bodyRow: {
    flex: 1,
    flexDirection: "row",
  },

  sidebar: {
    width: FILTER_SIDEBAR_WIDTH,
    paddingTop: 14,
    paddingHorizontal: CONTAINER_PADDING,
  },

  content: {
    flex: 1,
  },

  // ===== HERO CAROUSEL =====
  hero: {
    backgroundColor: "#111111",
    marginBottom: 26,
    overflow: "hidden",
  },

  heroPressArea: {
    flex: 1,
  },

  heroSlideImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  heroScrimFull: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },

  heroScrimMid: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "60%",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  heroScrimLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "35%",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  heroSlideText: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    maxWidth: 720,
    paddingHorizontal: 56,
    paddingVertical: 40,
    justifyContent: "center",
  },

  heroOverline: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#D8D8D8",
    marginBottom: 10,
  },

  heroTitle: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 54,
    letterSpacing: -0.5,
    marginBottom: 14,
  },

  heroPrice: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  heroSubtitle: {
    fontSize: 15,
    color: "#C9C9C9",
  },

  heroDots: {
    position: "absolute",
    bottom: 28,
    left: 56,
    flexDirection: "row",
    gap: 10,
  },

  heroDot: {
    width: 34,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },

  heroDotActive: {
    backgroundColor: "#FFFFFF",
  },

  heroArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  heroArrowLeft: {
    left: 20,
  },

  heroArrowRight: {
    right: 20,
  },

  heroArrowText: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "600",
  },

  // ===== SECTION / SEARCH =====
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: CONTAINER_PADDING,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#111111",
  },

  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  refreshText: {
    fontWeight: "500",
    fontSize: 13,
    color: "#111111",
  },

  filterButtonActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  filterButtonActiveText: {
    color: "#FFFFFF",
  },

  // ===== SORT DROPDOWN =====
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxWidth: 200,
  },

  sortButtonText: {
    fontWeight: "500",
    fontSize: 13,
    color: "#111111",
  },

  sortButtonCaret: {
    fontSize: 9,
    color: "#8A8A8A",
  },

  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,17,17,0.12)",
  },

  sortMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EDEDED",
    paddingVertical: 6,
    shadowColor: "#111111",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  sortMenuItemActive: {
    backgroundColor: "#F7F7F7",
  },

  sortMenuItemText: {
    fontSize: 13,
    color: "#333333",
  },

  sortMenuItemTextActive: {
    fontWeight: "700",
    color: "#111111",
  },

  sortMenuItemCheck: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
  },

  // ===== FILTER PANEL =====
  filterPanel: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    backgroundColor: "#FFFFFF",
  },

  filterHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDED",
  },

  filterHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },

  filterClearAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D32F2F",
  },

  filterSection: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  filterSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  filterSectionToggle: {
    fontSize: 16,
    color: "#8A8A8A",
    width: 20,
    textAlign: "center",
  },

  filterSectionBody: {
    marginTop: 12,
    gap: 12,
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#C9C9C9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  checkboxChecked: {
    backgroundColor: "#D32F2F",
    borderColor: "#D32F2F",
  },

  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 13,
  },

  filterLabel: {
    fontSize: 14,
    color: "#333333",
  },

  count: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8A8A8A",
    paddingHorizontal: CONTAINER_PADDING,
    marginBottom: 14,
  },

  lowStockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: CONTAINER_PADDING,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFF3F2",
    borderWidth: 1,
    borderColor: "#F0C4C2",
  },

  lowStockBannerIcon: {
    fontSize: 14,
  },

  lowStockBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B3413E",
    flex: 1,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: CONTAINER_PADDING,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111111",
  },

  clearButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  clearButtonText: {
    fontSize: 14,
    color: "#A9A9A9",
    fontWeight: "600",
  },

  emptyState: {
    paddingTop: 40,
    alignItems: "center",
  },

  emptyStateText: {
    fontSize: 14,
    color: "#8A8A8A",
    textAlign: "center",
  },

  // ===== GRID =====
  list: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingBottom: 24,
  },

  row: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDEDED",
    overflow: "hidden",
  },

  // สไตล์ตอนเอาเมาส์ไปชี้: ขอบเข้มขึ้น + มีเงาลอยขึ้นมา
  cardHovered: {
    borderColor: "#D6D6D6",
    shadowColor: "#111111",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  imageWrapper: {
    position: "relative",
  },

  image: {
    width: "100%",
    backgroundColor: "#F1F1F1",
  },

  editChip: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  editChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111111",
  },

  wishlistChip: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  wishlistChipIcon: {
    fontSize: 16,
    color: "#111111",
  },

  wishlistChipIconActive: {
    color: "#D2585F",
  },

  cardBody: {
    padding: 10,
  },

  category: {
    fontSize: 11,
    color: "#9A9A9A",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 4,
    minHeight: 34,
  },

  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },

  badgeGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    fontSize: 10,
    fontWeight: "600",
    overflow: "hidden",
  },

  badgeOutline: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    color: "#4A4A4A",
    backgroundColor: "transparent",
  },

  badgeStrong: {
    backgroundColor: "#111111",
    color: "#FFFFFF",
  },

  cartButton: {
    marginTop: 8,
    backgroundColor: "#111111",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },

  cartButtonDisabled: {
    opacity: 0.5,
  },

  cartButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  deleteLink: {
    marginTop: 8,
  },

  deleteLinkText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B3413E",
  },

  loadingText: {
    marginTop: 10,
    color: "#8A8A8A",
    fontSize: 14,
  },

  error: {
    color: "#B3413E",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 14,
  },

  retryButton: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },

});
