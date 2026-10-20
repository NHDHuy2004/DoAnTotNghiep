# HAEIM_Damped — Frontend

Giao diện phân tích khai thác tập mục theo thuật toán **HAEIM_Damped** (3 pha:
**Construction → Restructure → Expansion**), xây theo tài liệu
`TongHop_LuongXuLy_HAEIM_Damped.pdf`.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · recharts · lucide-react
- **Chế độ hiện tại:** DEMO — hiển thị bộ dữ liệu minh họa trích từ tài liệu, chờ backend kết nối (hợp đồng API ở [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)).

## 1. Chạy dự án

```bash
npm install        # cài dependency (đã chạy)
npm run dev        # dev server  → http://localhost:3000
npm run build      # build production
npm run start      # chạy bản build production
npm run lint       # ESLint
npx tsc --noEmit   # kiểm tra types
```

## 2. Cấu hình (`.env.local`)

| Biến | Ý nghĩa |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `true` → luôn dùng dữ liệu DEMO. |
| `NEXT_PUBLIC_API_BASE_URL` | URL backend, ví dụ `http://localhost:8080/api` (không có dấu `/` cuối). |

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_BASE_URL=
```

**Chuyển sang backend thật** (không cần sửa code):

1. *Cách nhanh (không rebuild):* trang **Cài đặt → Ghi đè URL backend** → *Lưu*.
   Ghi đè được lưu ở `localStorage` (`haeim.apiBaseUrl`), áp dụng **ngay cho toàn bộ trang**,
   có giá trị cao hơn env. Xóa ô nhập → quay về env.
2. *Cách chuẩn:* đặt `NEXT_PUBLIC_API_BASE_URL` trong `.env.local`
   (và `NEXT_PUBLIC_DEMO_MODE=false` nếu env đang bật) rồi chạy lại `npm run dev`.

Quy tắc DEMO (một hàm dùng chung cho UI và services — `computeDemoMode`):

- Có URL ghi đè từ trang Cài đặt → **dùng backend**.
- Không có override: `NEXT_PUBLIC_DEMO_MODE=true` → DEMO; hoặc chưa có URL nào → DEMO.
- Backend không phản hồi → trang hiển thị trạng thái **lỗi + nút Thử lại**, không có dữ liệu giả.

## 3. Các trang

| # | Đường dẫn | Nội dung |
| --- | --- | --- |
| 1 | `/` | **Tổng quan** — thống kê, thống kê 3 pha (demo), top itemsets, trạng thái backend. |
| 2 | `/transactions` | **Dữ liệu giao dịch** — bảng phân trang, tìm kiếm, thêm/kiểm tra/nhập khẩu giao dịch, xem chi tiết (hỗ trợ `?tid=3`). |
| 3 | `/config` | **Cấu hình thuật toán** — `f`, `minae`, `Ltid`, `constraint`, bảng `cu`/`inv`; xác thực phía client, lưu, khôi phục mặc định, chạy thử 3 pha. |
| 4 | `/execution` | **Thực thi 3 pha** — Construction → Restructure → Expansion: trace từng bước, bảng entry, bảng SMDAEUB, log. |
| 5 | `/dae-list` | **DAE-List Explorer** — lọc/sắp xếp theo `sdae`/`inv`/`pi`/…, mở chi tiết node, nhảy tới giao dịch nguồn. |
| 6 | `/results` | **Kết quả HAEI** — bảng kết quả + cột STT, lọc đủ điều kiện HAEI (`sdae ≥ minae`) tách với khả năng mở rộng, chi tiết node, xuất CSV. |
| 7 | `/history` | **Lịch sử thực thi** — danh sách phiên (DEMO: giữ trong phiên trình duyệt), lọc theo trạng thái. |
| 8 | `/settings` | **Cài đặt** — trạng thái backend, URL hiệu lực, ghi đè URL, giải thích chế độ DEMO. |

**Bố cục:** Sidebar (định tuyến + nhãn DEMO) + Header (trạng thái backend, phiên thực thi đang chạy), responsive, light SaaS Analytics — xanh dương chủ đạo; badge xanh lá/vàng/đỏ/xám.

**States hiển thị ở mọi trang:** `loading` · `empty` · `error (+ Thử lại)` ·
`validation` · `not-runed` (chưa chạy lần nào) · `running` · `completed` · `failed`.

## 4. Cấu trúc thư mục

```
src/
├── app/                  # 8 trang + layout (App Router)
├── components/
│   ├── shared/           # DemoBanner, PageHeader
│   └── ui/               # Card, Badge, StatCard, Controls, DataTable,
│                         # Dialog, States, Sidebar, Header, AppShell, MetricTooltip
├── hooks/useAsync.ts     # loading/error/data — tự hủy request, SUY RA loading (không setState trong effect)
└── lib/
    ├── api/              # endpoints.ts (env + ghi đè URL), client.ts (fetch chung)
    ├── context/          # AppContext (trạng thái toàn app)
    ├── services/         # transaction, config, algorithm, daeList, result,
                          # executionHistory, health — mỗi service: DEMO ? dữ liệu demo : gọi API
    ├── demo/demoData.ts  # DỮ LIỆU DEMO (nhãn "DEMO") — trích từ PDF, không tính toán trong UI
    └── types/            # kiểu TypeScript dùng chung
docs/API_CONTRACT.md      # hợp đồng endpoint chờ backend
```

## 5. Nguyên tắc đã tuân thủ

- **Không hardcode URL** — mọi nơi gọi API đi qua `src/lib/api/endpoints.ts`.
- **Không tính toán thuật toán trong UI** — mọi số hiển thị do service trả về
  (demo: hằng số trong `demoData.ts`; thật: phản hồi backend).
- **Dữ liệu DEMO gắn nhãn** “DEMO” ở banner, badge và trang Cài đặt;
  không có progress bar tự tăng (chỉ hiển thị tiến độ backend trả về).
- **Phân biệt rõ:** “đủ điều kiện HAEI” = `sdae ≥ minae` (badge màu xanh),
  “khả năng mở rộng” = giá trị `STDAEUB` (cột riêng, không đồng nhất với điều kiện HAEI).
- **Không `console.log` thay UI** — mọi trạng thái đều render thành UI.

## 6. Kiểm chứng (đã chạy thật)

| Lệnh | Kết quả |
| --- | --- |
| `npx tsc --noEmit` | ✅ 0 lỗi |
| `npx eslint .` | ✅ 0 lỗi, 0 warning |
| `npm run build` | ✅ Compiled + 8 route tĩnh (`/`, `/transactions`, `/config`, `/execution`, `/dae-list`, `/results`, `/history`, `/settings`) |
| Smoke test `next start` | ✅ 8/8 route HTTP 200, HTML đúng nội dung trang |
