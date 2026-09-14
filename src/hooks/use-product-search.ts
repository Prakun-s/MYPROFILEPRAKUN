import { useMemo, useState } from "react";

interface Product {
  id: number;
  name: string;
  category: string;
  location_text: string;
}

/**
 * รับลิสต์สินค้าทั้งหมด แล้วกรองตามคำค้นหา
 * ค้นได้ทั้งจากชื่อสินค้า, หมวดหมู่ และตำแหน่งจัดเก็บ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
 *
 * วิธีใช้ใน component:
 *   const { searchText, setSearchText, filteredProducts } =
 *     useProductSearch(products);
 */
export function useProductSearch<T extends Product>(products: T[]) {
  const [searchText, setSearchText] = useState("");

  const filteredProducts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        product.location_text.toLowerCase().includes(keyword)
      );
    });
  }, [products, searchText]);

  return {
    searchText,
    setSearchText,
    filteredProducts,
  };
}
