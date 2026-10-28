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

**Bố cục:** Shell mới — Sidebar gom nhóm theo route (Tổng quan · Dữ liệu · Thuật toán · Hệ thống), active indicator gradient có glow + thu gọn có tooltip; Header **kính mờ (glass)** có breadcrumb cấp nhóm và popover trạng thái backend; trang Tổng quan mở đầu bằng **Hero** (nền gradient tối + lưới kỹ thuật + quầng sáng trôi, pipeline 3 pha, CTA); các trang còn lại mở đầu bằng **PageHeader panel** (nền gradient mềm + orb trang trí). Nền canvas `#f4f6fa` có quầng sáng cố định + lớp **grain** mỏng, surface trắng, primary là **MỘT sắc xanh** (`#2a5cc9` — không còn dải xanh→chàm→tím); màu ngữ nghĩa ổn định (success/warning/danger/info, tím riêng cho DEMO). Responsive 1440/1280/768/390px; accessibility: skip-link, focus ring, bàn phím trên bảng/dialog, `aria-*` cho Tabs/tooltip; mọi chuyển động tôn trọng `prefers-reduced-motion`.

**States hiển thị ở mọi trang:** `loading` · `empty` · `error (+ Thử lại)` ·
`validation` · `not-runed` (chưa chạy lần nào) · `running` · `completed` · `failed`.

## 4. Cấu trúc thư mục

```
src/
├── app/                  # 8 trang + layout (App Router) + not-found.tsx (trang 404)
│   └── icon.svg          # favicon SVG (thay icon turbo mặc định)
├── components/
│   ├── shared/           # PageHeader (panel), Hero + HeroAction, DemoBanner
│   ├── layout/           # AppShell, Sidebar, Header
│   └── ui/               # bộ component dùng chung:
│                         #   Card, Badge, StatCard, Controls (Button/Input/Select/Search),
│                         #   DataTable (+Pagination), Dialog/Drawer/ConfirmDialog,
│                         #   Toast (+InlineAlert), Tabs, FilterBar (+SegmentedControl),
│                         #   States (Skeleton/Empty/Error/NotReady), MetricTooltip,
│                         #   Meta (khối "nhãn: giá trị" dùng chung),
│                         #   Sidebar, Header, AppShell
├── hooks/
│   ├── useAsync.ts       # loading/error/data — tự hủy request, SUY RA loading
│   └── useFocusTrap.ts   # focus trap + scroll lock cho Dialog/Drawer
└── lib/
    ├── api/              # endpoints.ts (env + ghi đè URL), client.ts (fetch chung)
    ├── context/          # AppContext (trạng thái toàn app)
    ├── services/         # transaction, config, algorithm, daeList, result,
                          #   executionHistory, health — mỗi service: DEMO ? dữ liệu demo : gọi API
    ├── demo/demoData.ts  # DỮ LIỆU DEMO (nhãn "DEMO") — trích từ PDF, không tính toán trong UI
    ├── metrics.ts        # bảng chú giải công thức — nguồn duy nhất cho tooltip
    ├── nav.ts            # NAV_GROUPS — cấu trúc điều hướng sidebar/breadcrumb
    └── types.ts          # kiểu TypeScript dùng chung
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
| `npm run build` | ✅ Compiled + 8 route tĩnh (`/`, `/transactions`, `/config`, `/execution`, `/dae-list`, `/results`, `/history`, `/settings`) + `/_not-found` + `/icon.svg` |
| Smoke test `next start` | ✅ 8/8 route HTTP 200, SSR HTML đúng nội dung từng trang; `/nope-404` → 404; font Be Vietnam Pro/JetBrains Mono được serve (21 face `.woff2`, `font/woff2` 200) |

> Lưu ý: `skills/` (taste-skill) bị loại khỏi `tsconfig.json` và `eslint.config.mjs` —
> đó là mẫu tham khảo, không thuộc mã nguồn, để tránh báo lỗi sai.

## 7. Design system (tóm tắt)

- **Chữ:** **Be Vietnam Pro** (sans, dựng riêng cho tiếng Việt) + **JetBrains Mono** (số liệu/TID/công thức) — tự dựng qua `@fontsource`, không cần mạng lúc build. Heading weight 700, tracking `-0.02em`, `text-wrap: balance`; số liệu luôn `tabular-nums`; code nội tuyến là chip nền nhẹ có viền.
- **Tokens** (`globals.css` → `@theme`):
  - Màu: `--color-canvas/surface/surface-2/3`, `--color-line/line-2`, `--color-ink/ink-2/3`, `--color-brand/brand-2/brand-soft/brand-line` (**`#2a5cc9` — một sắc xanh duy nhất, không gradient đa sắc**), bộ ngữ nghĩa `success/warning/danger/info` (+ `-soft`/`-line`), `--color-accent` (**tím = chỉ dành cho nhãn DEMO**).
  - Bán kính — thang 4 bậc thống nhất: `--radius-card`/`--radius-lg: 12px` (nút, ô nhập, card nhỏ), `--radius-xl: 16px` (card, panel), `--radius-2xl: 20px` (hero, dialog); badge dùng `rounded-md` kiểu cờ, **không** pill tròn.
  - Bóng: `--shadow-card/pop/lift`, `--shadow-glow` (đổ bóng mang sắc độ nền, không dùng đen tuyền).
  - Gradient (một dải sắc xanh `#3a6ee0 → #2a5cc9 → #1f4496`): `--gradient-brand/brand-soft/success/warning/danger/ink`, **chỉ dùng cho điểm nhấn**, không tô nền trang.
  - Khác: `--glass/-strong/-border`, motion `--ease-out-quart/--ease-spring`, `--dur-fast/base/slow`; thang **z-index** (`:root`): `--z-sticky:30 · rail:40 · drawer:50 · modal:70 · toast:80 · tooltip:90 · skip:100` (dùng qua `z-[var(--z-…)]`, không dùng số tùy tiện); `--maxw-page:1440px`, `--measure:68ch`.
- **Nền canvas:** hai **quầng sáng** cố định cùng sắc xanh (`body::before`, `z-index:-1`, không ảnh hưởng cuộn) + lớp **grain** mỏng phủ toàn khung (`body::after`); khối tối/panel dùng thêm `.grain` riêng (overlay blend, dưới nội dung).
- **Class dùng riêng (không phải Tailwind):** `.bg-grad-brand|-brand-soft|-success|-warning|-danger|-ink|-purple` (ghi rõ `background-image` — vì `bg-[var(--gradient-x)]` bị Tailwind suy luận thành `background-color` → gradient sẽ KHÔNG hiện), `.glass`/`.glass-strong`/`.glass-bar`, `.gradient-panel`, `.gradient-text`, `.card-hover`, `.sheen`, `.grid-pattern`, `.orb`, `.pulse-ring`, `.shimmer`, `.grain`, `.stagger` (stagger entrance), `.page-enter` (chuyển trang).
- **Component chủ đạo:** `Hero` + `HeroAction` (trang Tổng quan), `PageHeader` dạng panel (7 trang còn lại), `Card(interactive)`, `StatCard` (chip icon gradient + thanh accent trên cùng + glow khi hover), `Meta` (khối "nhãn: giá trị" hợp nhất — dùng chung cho transactions/results/dae-list/execution/history), `Button` gradient có sheen + `active:scale-[0.985]`, `Tabs` dạng pill, `Dialog/Drawer` viền gradient trên, `Toast`/`EmptyState`/`NotReadyState` có gradient; `MetricTooltip` popover sáng, tự kẹp trong viewport.
- **Màu ngữ nghĩa cố định:** blue = brand/đang xử lý · green = đạt · amber = cảnh báo · red = lỗi · gray = trung tính · **purple = chỉ dành cho nhãn DEMO**.
- **Nhãn dạng tiêu đề:** bảng/section dùng **sentence case** (`tracking-[0.01em]`), không ALL-CAPS.
- **Tooltip công thức:** `src/lib/metrics.ts` là nguồn duy nhất (ae, dae, maeub, mdaeub, sae, sdae, smdaeub, tdaeub, stdaeub, ltdaeub, haei, expandable, f, minae, …); `MetricTooltip`/`ColumnHeader` render qua **portal** để không bị cắt bởi `overflow-x-auto` của bảng.
- **Không fake data/progress:** mọi giá trị do service trả về; DEMO luôn gắn nhãn; lỗi backend → ErrorState + nút Thử lại. Hero chỉ hiển thị trạng thái pha từ `activeSession`, không bịa số.
