import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  ProductReview,
  deleteProductReview,
  fetchProductReviews,
  submitProductReview,
} from "../api";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";

interface Props {
  productId: number;
}

function Stars({
  value,
  size = 16,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Icon
            key={n}
            name="star"
            filled={filled}
            size={size}
            color={filled ? "#F2A93B" : "#D4C3BA"}
            style={{ marginRight: 2 }}
          />
        );

        if (!onChange) return star;

        return (
          <TouchableOpacity key={n} activeOpacity={0.6} onPress={() => onChange(n)}>
            {star}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// กล่องคะแนน + รีวิวสินค้า: สรุปคะแนนเฉลี่ย, เขียน/แก้ไข/ลบรีวิวของตัวเอง, และแสดงรีวิวของคนอื่น
export default function ProductReviews({ productId }: Props) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [myReview, setMyReview] = useState<ProductReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const load = async () => {
    try {
      setError("");
      const data = await fetchProductReviews(productId);
      setReviews(data.reviews);
      setReviewCount(data.review_count);
      setAverageRating(data.average_rating);
      setMyReview(data.my_review);
      setMyRating(data.my_review?.rating || 0);
      setMyComment(data.my_review?.comment || "");
    } catch (err: any) {
      console.error("Load product reviews error:", err);
      setError(err.message || "ไม่สามารถโหลดรีวิวได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // รีเซ็ตฟอร์มเมื่อเปลี่ยนไปดูสินค้าชิ้นอื่น
    setMyRating(0);
    setMyComment("");
  }, [productId]);

  const handleSubmit = async () => {
    if (myRating < 1) {
      setFormError("กรุณาให้คะแนนอย่างน้อย 1 ดาว");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      await submitProductReview(productId, myRating, myComment.trim() || undefined);
      await load();
    } catch (err: any) {
      console.error("Submit review error:", err);
      setFormError(err.message || "บันทึกรีวิวไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmVisible(false);

    try {
      await deleteProductReview(productId);
      setMyReview(null);
      setMyRating(0);
      setMyComment("");
      load();
    } catch (err: any) {
      console.error("Delete review error:", err);
      setFormError(err.message || "ลบรีวิวไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator size="small" color="#3D2619" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>คะแนนและรีวิว</Text>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {/* สรุปคะแนนเฉลี่ย */}
          <View style={styles.summaryRow}>
            <Text style={styles.averageValue}>{averageRating.toFixed(1)}</Text>

            <View>
              <Stars value={averageRating} size={18} />
              <Text style={styles.reviewCountText}>{reviewCount} รีวิว</Text>
            </View>
          </View>

          {/* เขียน/แก้ไขรีวิวของฉัน */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {myReview ? "รีวิวของคุณ" : "ให้คะแนนสินค้านี้"}
            </Text>

            <Stars value={myRating} size={26} onChange={setMyRating} />

            <TextInput
              style={styles.commentInput}
              placeholder="เขียนความคิดเห็นเกี่ยวกับสินค้านี้ (ไม่บังคับ)"
              value={myComment}
              onChangeText={setMyComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                activeOpacity={0.8}
                disabled={submitting}
                onPress={handleSubmit}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {myReview ? "บันทึกการแก้ไข" : "ส่งรีวิว"}
                  </Text>
                )}
              </TouchableOpacity>

              {myReview && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  activeOpacity={0.7}
                  onPress={() => setDeleteConfirmVisible(true)}
                >
                  <Text style={styles.deleteButtonText}>ลบรีวิว</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* รายการรีวิวทั้งหมด */}
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>ยังไม่มีรีวิวสำหรับสินค้านี้ เป็นคนแรกที่รีวิวสิ!</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUsername}>
                    {review.username || "ผู้ใช้"}
                    {myReview && review.id === myReview.id ? " (คุณ)" : ""}
                  </Text>

                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                <Stars value={review.rating} size={14} />

                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </>
      )}

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="ลบรีวิว"
        message="ต้องการลบรีวิวของคุณสำหรับสินค้านี้ใช่หรือไม่?"
        confirmText="ลบ"
        cancelText="ยกเลิก"
        destructive
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E8DFD8",
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 16,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },

  averageValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#3D2619",
  },

  reviewCountText: {
    fontSize: 12,
    color: "#8A7D75",
    marginTop: 4,
  },

  formCard: {
    backgroundColor: "#F0E9DC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD8",
    padding: 16,
    marginBottom: 20,
  },

  formTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3D2619",
    marginBottom: 10,
  },

  commentInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DFD8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#2B2118",
    minHeight: 70,
    marginTop: 12,
  },

  formActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },

  submitButton: {
    backgroundColor: "#3D2619",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  deleteButton: {
    paddingVertical: 6,
  },

  deleteButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#C53030",
  },

  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: "#F0EDE9",
    paddingVertical: 14,
  },

  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  reviewUsername: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3D2619",
  },

  reviewDate: {
    fontSize: 11.5,
    color: "#8A7D75",
  },

  reviewComment: {
    fontSize: 13,
    color: "#4A3B32",
    lineHeight: 19,
    marginTop: 8,
  },

  errorText: {
    fontSize: 12.5,
    color: "#C53030",
    marginTop: 8,
  },

  emptyText: {
    fontSize: 13,
    color: "#8A7D75",
    paddingVertical: 12,
  },
});
