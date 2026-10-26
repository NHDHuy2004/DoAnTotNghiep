/**
 * Bảng chú giải thuật ngữ / chỉ số của HAEIM_Damped — NGUỒN DUY NHẤT.
 *
 * Mọi tooltip giải thích công thức trên UI (header cột, ô chú thích, trang
 * Thực thi) đều lấy từ đây để công thức và cách diễn giải không bị lệch nhau.
 *
 * Nguyên tắc: chỉ MÔ TẢ định nghĩa do tài liệu / hợp đồng API quy định.
 * Frontend không tự tính lại bất kỳ đại lượng nào — giá trị hiển thị luôn do
 * backend (hoặc dữ liệu DEMO) trả về.
 */

export interface MetricDef {
  /** Ký hiệu hiển thị. */
  term: string;
  /** Công thức (nếu tài liệu nêu) — hiển thị dạng code. */
  formula?: string;
  /** Diễn giải ngắn gọn, dễ hiểu. */
  description: string;
}

const RAW_METRICS = {
  f: {
    term: "Hệ số suy giảm f",
    formula: "w(t) = f^(Ltid − tid)",
    description:
      "Trọng số suy giảm theo tuổi giao dịch. Giao dịch mới nhất (tid = Ltid) có trọng số 1; giao dịch cũ hơn bị giảm lũy thừa theo f. Tham số bắt buộc, 0 < f < 1.",
  },
  minae: {
    term: "Ngưỡng minae",
    formula: "Sdae(P) ≥ minae → HAEI",
    description:
      "Ngưỡng hiệu suất trung bình suy giảm tối thiểu. Dùng để lọc ứng viên ở pha Restructure (SMDAEUB) và công nhận kết quả ở pha Expansion (Sdae).",
  },
  tu: {
    term: "TU — Transaction Utility",
    description: "Tổng tiện ích của một giao dịch: tổng utility của tất cả mục trong giao dịch.",
  },
  u: {
    term: "u — tiện ích của mục",
    description: "Tiện ích của một mục trong giao dịch cụ thể (do dữ liệu đầu vào cung cấp).",
  },
  inv: {
    term: "inv(i) — chi phí đầu tư",
    description:
      "Chi phí đầu tư đơn vị của mục i trong bảng investmentTable. Tổng inv của một tập mục là Σ inv(i).",
  },
  pi: {
    term: "PI — tiền tố chung",
    description:
      "Chi phí đầu tư của tiền tố chung khi ghép hai DAE-List, tránh cộng trùng phần giao nhau.",
  },
  ae: {
    term: "ae — hiệu suất trung bình thô",
    formula: "ae = u / inv",
    description:
      "Hiệu suất trung bình THÔ tại một giao dịch — CHƯA áp dụng hệ số suy giảm. Được ghi ở pha Construction.",
  },
  maeub: {
    term: "MAEUB — cận trên thô",
    description:
      "Cận trên hiệu suất trung bình thô, tính bằng chiến lược duyệt tham lam trên phần còn lại của giao dịch. Chỉ hiển thị khi backend cung cấp.",
  },
  dae: {
    term: "dae — hiệu suất trung bình suy giảm",
    formula: "dae = ae × f^(Ltid − tid)",
    description:
      "Giá trị ae sau khi nhân trọng số suy giảm theo tuổi giao dịch. Ghi ở pha Restructure.",
  },
  mdaeub: {
    term: "MDAEUB — cận trên suy giảm",
    formula: "MDAEUB = MAEUB × f^(Ltid − tid)",
    description:
      "Cận trên hiệu suất trung bình đã suy giảm tại một giao dịch. Dùng để tổng hợp SMDAEUB ở cấp tập mục.",
  },
  sae: {
    term: "SAE — tổng ae thô",
    formula: "SAE = Σ ae",
    description: "Tổng hiệu suất trung bình thô trên toàn bộ giao dịch chứa tập mục.",
  },
  sdae: {
    term: "Sdae — tổng hiệu suất suy giảm",
    formula: "Sdae = Σ ae · f^(Ltid − tid)",
    description:
      "Tổng hiệu suất trung bình suy giảm của tập mục trên toàn luồng giao dịch. Tập mục đạt HAEI khi Sdae ≥ minae.",
  },
  smdaeub: {
    term: "SMDAEUB — tổng cận trên suy giảm",
    formula: "SMDAEUB = Σ MDAEUB",
    description:
      "Tổng các cận trên MDAEUB. Dùng ở pha Restructure: tập mục có SMDAEUB < minae bị loại sớm.",
  },
  tdaeub: {
    term: "TDAEUB — cận trên cấp giao dịch",
    description:
      "Cận trên tính tại một giao dịch trong bước duyệt ngược (quét từ cuối luồng về), dùng để tổng hợp STDAEUB. Chỉ hiển thị khi backend trả về.",
  },
  stdaeub: {
    term: "STDAEUB — tổng cận trên TDAEUB",
    description:
      "Tổng các TDAEUB của tập mục. Dùng ở pha Expansion để cắt tỉa: STDAEUB < minae → không còn khả năng mở rộng.",
  },
  ltdaeub: {
    term: "LTDAEUB — cận trên cục bộ",
    description:
      "Cận trên cục bộ tại một node trên cây DFS, dùng để dừng sớm khi xét tập mục con.",
  },
  maxru: {
    term: "maxRU — tiện ích còn lại",
    description: "Tiện ích còn lại lớn nhất (max Remaining Utility) trong phần sau của giao dịch.",
  },
  minInv: {
    term: "minInv — chi phí đầu tư còn lại",
    description: "Chi phí đầu tư nhỏ nhất còn lại trong phần sau của giao dịch.",
  },
  pu: {
    term: "PU — tiện ích tiền tố chung",
    description: "Tiện ích của tiền tố chung khi ghép hai DAE-List.",
  },
  k: {
    term: "k — số mục còn lại",
    description: "Số mục còn lại phía sau tập mục trong giao dịch.",
  },
  weight: {
    term: "Trọng số suy giảm",
    formula: "f^(Ltid − tid)",
    description: "Trọng số áp dụng cho một entry theo tuổi giao dịch (tid càng nhỏ → trọng số càng nhỏ).",
  },
  haei: {
    term: "HAEI — tập mục hiệu suất trung bình cao",
    formula: "Sdae ≥ minae",
    description:
      "Tập mục đạt ngưỡng hiệu suất trung bình suy giảm. Đây là kết quả hợp lệ của thuật toán.",
  },
  expandable: {
    term: "Khả năng mở rộng",
    formula: "STDAEUB ≥ minae",
    description:
      "Khác với HAEI: tập mục đạt HAEI khi Sdae ≥ minae, nhưng chỉ tiếp tục mở rộng khi STDAEUB ≥ minae (còn triển vọng). Hai khái niệm độc lập.",
  },
} as const;

/** Khóa tra cứu metric. */
export type MetricKey = keyof typeof RAW_METRICS;

/**
 * Bảng chú giải — kiểu thống nhất `MetricDef` để mọi nơi đọc `formula` /
 * `description` không phải kiểm tra kiểu thủ công.
 */
export const METRICS: Record<MetricKey, MetricDef> = RAW_METRICS;

/** Lấy định nghĩa chỉ số (an toàn nếu truyền nhầm khóa lạ ngoài biên dịch). */
export function metric(key: MetricKey): MetricDef {
  return METRICS[key] ?? { term: String(key), description: "" };
}
