# API Contract — HAEIM_Damped Frontend ⇄ Backend

> Trạng thái: **CHƯA CÓ BACKEND**. Frontend khởi động ở DEMO mode
> (`NEXT_PUBLIC_DEMO_MODE=true`) dùng bộ dữ liệu 8 giao dịch + các giá trị
> minh họa trích từ tài liệu `TongHop_LuongXuLy_HAEIM_Damped.pdf`.
> Khi backend sẵn sàng, đặt `NEXT_PUBLIC_API_BASE_URL` và tắt demo mode.

Tất cả endpoint đều **chưa tồn tại** — đây là hợp đồng đề xuất để backend
triển khai. Khi một endpoint được cung cấp, chỉ cần set env, không sửa component.

## Tổng quát

- Base URL: `NEXT_PUBLIC_API_BASE_URL` (vd: `http://localhost:8080/api`)
- Tất cả response JSON. Lỗi HTTP → frontend hiển thị `ErrorState` kèm status + message.
- Định dạng ngày giờ: ISO 8601 string.
- Số thực (utility, Sdae, MDAEUB, …): `number` (JSON double).

## Endpoint

### Health
- `GET /health` → `204 No Content` hoặc `{ "status": "ok" }`
  - Dùng cho chỉ báo "Kết nối backend" ở Header.

### Transactions
- `GET /transactions?page=1&pageSize=20&search=&status=`
  → `{ items: Transaction[], total: number, page: number, pageSize: number }`
  - `search`: khớp theo **tên item** hoặc **mã giao dịch** (cho phép nhập `T3` → `3`).
  - `status`: `processed` | `unprocessed` (lọc theo cờ `processed`).
- `GET /transactions/{tid}` → `Transaction`
- `POST /transactions` body `TransactionInput` → `201 Transaction`
- `POST /transactions/import` body `{ format: "csv"|"json", content: string }`
  → `{ imported: number, errors: { line: number, message: string }[] }`
- `GET /transactions/latest?limit=10` → `Transaction[]`

```ts
interface Transaction {
  tid: number;
  items: { item: string; quantity: number; utility: number }[];
  tu: number;                 // tổng tiện ích giao dịch
  processed: boolean;         // đã được đưa vào DAE-List chưa
}
```

### Config
- `GET /config` → `AlgorithmConfig`
- `PUT /config` body `AlgorithmConfig` → `200 AlgorithmConfig`
- `POST /config/reset` → `AlgorithmConfig` (cấu hình mặc định do backend định nghĩa)

```ts
interface AlgorithmConfig {
  f: number;                  // hệ số suy giảm, 0 < f < 1
  minae: number;              // ngưỡng hiệu suất trung bình tối thiểu
  investmentTable: Record<string, number>;   // inv(i) theo item
  unitCostTable?: Record<string, number>;    // cu(i) — nếu thuật toán yêu cầu
  runMode: "full" | "phase";  // chạy toàn bộ hoặc từng pha
}
```

### Execution
- `POST /executions` body `{ config }` → `200 ExecutionSession`
- `POST /executions/{id}/stop` → `200 ExecutionSession`
- `POST /executions/{id}/pause` · `POST /executions/{id}/resume` → `200 ExecutionSession`
  *(chỉ cần nếu backend hỗ trợ)*
- `GET /executions/{id}` → `ExecutionSession`
- `GET /executions/{id}/phases/construction` → `ConstructionTrace`
- `GET /executions/{id}/phases/restructure` → `RestructureTrace`
- `GET /executions/{id}/phases/expansion` → `ExpansionTrace`
- `GET /executions/{id}/logs?after=<offset>` → `{ entries: LogEntry[], nextOffset: number }`
  - Con trỏ phân đoạn: `after` là `nextOffset` của lần gọi trước (mặc định `0`),
    response trả về **entry mới từ sau offset đó** kèm `nextOffset` mới.
    Frontend poll mỗi 5 giây chỉ gửi `after` đã nhận → không tải lại toàn bộ log.

```ts
type PhaseStatus = "pending" | "running" | "done" | "error" | "stopped";

interface ExecutionSession {
  id: string;
  status: "running" | "done" | "error" | "stopped";
  startedAt: string;
  finishedAt?: string;
  ltid: number;                       // mã giao dịch mới nhất đã xử lý
  transactionCount: number;
  config: AlgorithmConfig;
  phases: { construction: PhaseStatus; restructure: PhaseStatus; expansion: PhaseStatus };
  haeiCount?: number;
  executionTimeMs?: number;
  error?: string;
}
```

#### ConstructionTrace
```ts
interface ConstructionStep {
  tid: number;
  items: {
    item: string;
    u: number;            // tiện ích của mục trong giao dịch
    inv: number;          // chi phí đầu tư đơn vị (investmentTable)
    aeRaw: number;        // hiệu suất trung bình THÔ (chưa suy giảm)
    maeubRaw?: number;    // cận trên MAEUB thô
  }[];
  newNodes: string[];                 // itemset node mới tạo trong DAE-List
  entriesAdded: { itemset: string[]; tid: number; u: number; aeRaw: number; maeubRaw?: number }[];
}
interface ConstructionTrace { steps: ConstructionStep[]; }
```

#### RestructureTrace
```ts
interface RestructureEntry {
  itemset: string[];
  tid: number;
  weight: number;   // f^(Ltid - tid)
  dae: number;      // ae đã nhân trọng số suy giảm
  mdaeub: number;   // MAEUB thô × weight
  maxru?: number;
  minInv?: number;
  k?: number;
  pu?: number;
}
interface RestructureNode {
  itemset: string[];
  entries: RestructureEntry[];
  sae?: number;       // Σ ae thô (nếu backend cung cấp)
  sdae: number;       // Σ dae
  smdaeub: number;    // Σ mdaeub
  stdaeub: number;    // Σ tdaeub (tính ở bước duyệt ngược)
  kept: boolean;      // false = bị loại do smdaeub < minae
  removeReason?: string;
}
interface RestructureTrace {
  ltid: number;
  minae: number;
  nodes: RestructureNode[];   // TẤT CẢ node, phân biệt bằng cờ kept;
                              // mảng kept giữ nguyên thứ tự tăng dần smdaeub
}
```

> **Tương thích phía frontend** (`algorithmService.getRestructureTrace`):
> tách `nodes` theo cờ `kept` thành `kept`/`removed` (sắp lại `kept` tăng dần
> smdaeub); chấp nhận thêm dạng cũ `{ kept, removed }` và trường phụ `f`;
> entry có thể thiếu `u`/`aeRaw` (UI hiện "—" thay vì crash).

#### ExpansionTrace
```ts
interface ExpansionNode {
  id: string;
  itemset: string[];
  sdae?: number;
  stdaeub?: number;
  ltdaeub?: number;               // cận trên cục bộ dùng để dừng sớm
  isHaei: boolean;                // Sdae >= minae
  canExpand: boolean;             // STDAEUB >= minae → còn triển vọng
  pruneReason?: string;
  merge?: {
    left: string[]; right: string[];
    coOccurTids: number[];
    utilities: number[];          // u({b,c}, t) theo thứ tự tid đồng xuất hiện
    sdae?: number; stdaeub?: number; ltdaeub?: number;
  };
  children: ExpansionNode[];
}
interface ExpansionTrace { roots: ExpansionNode[]; results: string[][]; }
```

### DAE-List
- `GET /dae-list?search=&status=&sort=&order=` → `{ nodes: DaeListNode[] }`
  - `status`: `candidate` | `eliminated` | `haei`
  - `sort`: `itemset` | `inv` | `pi` | `sdae` | `smdaeub` | `stdaeub` | `entries`
- `GET /dae-list/{itemset}` → `DaeListNode` (kèm entries)
  - `{itemset}` encode dạng `a,b,c`

```ts
interface DaeListNode {
  itemset: string[];
  inv: number;          // Σ inv(i) của tập mục
  pi: number;           // chi phí đầu tư tiền tố chung
  sdae: number;
  smdaeub: number;
  stdaeub: number;
  entryCount: number;
  status: "candidate" | "eliminated" | "haei";
  entries: DaeListEntry[];
}
interface DaeListEntry {
  tid: number;
  u: number;
  dae: number;          // hoặc aeRaw nếu ở pha Construction
  phase: "construction" | "restructure";
  maxru?: number;
  minInv?: number;
  pu?: number;
  mdaeub?: number;
  k?: number;
  tdaeub?: number;
}
```

> **Ghi chú frontend:** `dae` (hợp đồng) được chuẩn hoá thành trường `value`
> trong UI (`daeListService.normalizeEntry`) — backend chỉ cần trả `dae`;
> `entries` có thể vắng (trả `entryCount: 0`) sẽ thành `[]`.

### Results (HAEI)
- `GET /results?search=&size=&status=&sort=&order=` → `{ items: HaeiResult[], total: number }`
- `GET /results/{itemset}` → `HaeiResult` (chi tiết, gồm trace tóm tắt)
- `GET /results/export?format=csv` → `text/csv`

```ts
interface HaeiResult {
  itemset: string[];
  size: number;
  sdae: number;
  minae: number;
  isHaei: boolean;          // Sdae >= minae
  expandable: boolean;      // còn khả năng mở rộng theo STDAEUB
  entryCount: number;
}
```

### History
- `GET /executions?status=&page=&pageSize=` → `{ items: ExecutionSession[], total, page, pageSize }`
- `GET /executions/{id}` → chi tiết (reuse `ExecutionSession`)
- `GET /executions/{id}/config` → `AlgorithmConfig` của phiên

## Điểm còn thiếu / chưa xác định

1. **Chưa có backend** → toàn bộ endpoint ở trên đều chờ backend.
2. **Công thức TDAEUB (3 trường hợp) và LTDAEUB** trong tài liệu trích xuất không
   đủ ký hiệu để frontend tự tính — frontend **không tự tính** các trường này,
   chỉ hiển thị nếu backend trả về.
3. **Thứ tự toàn cục của mục** (dùng ở Construction) do backend định nghĩa.
4. **Chiến lược lưu lịch sử** (in-memory vs DB) do backend quyết định; nếu
   backend không lưu, trang Lịch sử hiển thị empty state.
