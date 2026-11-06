/**
 * Smoke-test tích hợp: chạy THẬT các service của frontend against backend
 * đang chạy (uvicorn app.main:app --port 8000).
 *
 * Chạy:
 *   $env:NEXT_PUBLIC_API_BASE_URL='http://localhost:8000/api'
 *   $env:NEXT_PUBLIC_DEMO_MODE='false'
 *   npx --yes tsx scripts/smoke-services.ts
 *
 * Script này mô phỏng trình duyệt (stub window.localStorage) rồi gọi lần lượt
 * health → config → transactions → execution (POST /api/mine) → traces →
 * history → dae-list → results → CSV.
 */

const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) console.log(`OK   ${msg}`);
  else {
    failures += 1;
    console.error(`FAIL ${msg}`);
  }
}

async function main(): Promise<void> {
  const { checkBackend } = await import("@/lib/services/healthService");
  const config = await import("@/lib/services/configService");
  const tx = await import("@/lib/services/transactionService");
  const algo = await import("@/lib/services/algorithmService");
  const dae = await import("@/lib/services/daeListService");
  const res = await import("@/lib/services/resultService");
  const hist = await import("@/lib/services/executionHistoryService");

  // --- health ---
  const st = await checkBackend(true);
  assert(st === "connected", `health = connected (nhận: ${st})`);

  // --- config ---
  const cfg = (await config.getConfig()).data;
  assert(cfg.f > 0 && cfg.f < 1, `getConfig f=${cfg.f} minae=${cfg.minae}`);
  assert(
    Object.keys(cfg.investmentTable).length >= 6,
    `investmentTable ${Object.keys(cfg.investmentTable).length} mục`,
  );
  assert(
    Object.keys(cfg.unitCostTable).length >= 6,
    `unitCostTable ${Object.keys(cfg.unitCostTable).length} mục`,
  );

  const saved = (await config.saveConfig({ ...cfg, f: 0.75, minae: 0.18 })).data;
  assert(saved.f === 0.75 && saved.minae === 0.18, `saveConfig f=${saved.f} minae=${saved.minae}`);
  const reset = (await config.resetConfig()).data;
  assert(reset.f === cfg.f && reset.minae === cfg.minae, `resetConfig f=${reset.f} minae=${reset.minae}`);

  // --- transactions ---
  const tlist = (await tx.listTransactions({ page: 1, pageSize: 5 })).data;
  assert(tlist.total >= 8 && tlist.items.length === 5, `listTransactions total=${tlist.total} page=${tlist.items.length}`);
  const t1 = (await tx.getTransaction(1)).data;
  assert(t1.tid === 1 && t1.items.length > 0 && t1.processed, `getTransaction T1 tu=${t1.tu}`);

  const created = (
    await tx.createTransaction({ items: [{ item: "smoke-x", quantity: 2, utility: 6 }] })
  ).data;
  assert(
    created.tid > 0 && created.items.some((i) => i.item === "smoke-x"),
    `createTransaction (item mới) → T${created.tid}, items=${created.items.length}`,
  );

  const imp = (await tx.importTransactions("csv", "a,1,4;b,2,6\nc,1,5;bad-line")).data;
  assert(
    imp.imported === 1 && imp.errors.length === 1,
    `import CSV imported=${imp.imported} errors=${imp.errors.length}`,
  );

  // --- execution: chạy thật POST /api/mine ---
  const run = (await algo.startExecution({ ...cfg, f: 0.8, minae: 0.2 })).data;
  assert(
    run.status === "done" && run.haeiCount !== undefined && run.executionTimeMs !== undefined,
    `startExecution ${run.id} haei=${run.haeiCount} ms=${run.executionTimeMs} ltid=${run.ltid}`,
  );

  const construction = (await algo.getConstructionTrace(run.id)).data;
  assert(
    construction.steps.length >= 8 && construction.steps[0].items.length > 0,
    `construction steps=${construction.steps.length}, bước đầu=${construction.steps[0].items.length} mục`,
  );

  const restructure = (await algo.getRestructureTrace(run.id)).data;
  const sortedOk = restructure.kept.every(
    (n, i, a) => i === 0 || a[i - 1].smdaeub <= n.smdaeub,
  );
  assert(
    restructure.kept.length > 0 && restructure.kept[0].entries.length > 0 && sortedOk,
    `restructure kept=${restructure.kept.length} removed=${restructure.removed.length} (sắp xếp ✓=${sortedOk})`,
  );
  assert(
    restructure.kept[0].entries[0].weight > 0 && restructure.kept[0].entries[0].dae > 0,
    `entry weight=${restructure.kept[0].entries[0].weight} dae=${restructure.kept[0].entries[0].dae}`,
  );

  const expansion = (await algo.getExpansionTrace(run.id)).data;
  assert(
    expansion.roots.length > 0 && expansion.results.length === (run.haeiCount ?? -1),
    `expansion roots=${expansion.roots.length} results=${expansion.results.length}`,
  );
  assert(
    expansion.roots.some((r) => r.isHaei) || expansion.roots.some((r) => r.children.length > 0),
    "expansion có node HAEI hoặc node con",
  );

  const logs = (await algo.getLogs(run.id)).data;
  assert(logs.length >= 5 && logs[0].message.length > 0, `logs=${logs.length} dòng`);

  // --- history ---
  const histList = (await hist.listExecutions({ page: 1, pageSize: 10 })).data;
  assert(
    histList.total >= 1 && histList.items[0].id === run.id,
    `history total=${histList.total}, đầu tiên=${histList.items[0].id}`,
  );
  const detail = (await hist.getExecutionDetail(run.id)).data;
  assert(detail.id === run.id && detail.phases.construction === "done", "getExecutionDetail");

  // --- dae-list ---
  const nodes = (await dae.listDaeNodes({ sort: "sdae", order: "desc" })).data;
  assert(
    nodes.length > 0 && typeof nodes[0].pi === "number" && nodes[0].entryCount > 0,
    `dae-list nodes=${nodes.length}, đầu: {${nodes[0].itemset}} pi=${nodes[0].pi} entries=${nodes[0].entryCount} status=${nodes[0].status}`,
  );
  const one = (await dae.getDaeNode(nodes[0].itemset)).data;
  assert(one.itemset.join(",") === nodes[0].itemset.join(","), "getDaeNode tìm thấy node");

  // --- results ---
  const haei = (await res.listResults({ page: 1, pageSize: 20, status: "haei" })).data;
  assert(
    haei.total > 0 && haei.items.every((r) => r.isHaei && r.entryCount > 0),
    `results (HAEI) total=${haei.total}, entryCount ✓`,
  );
  const all = (await res.listResults({ page: 1, pageSize: 50 })).data;
  assert(all.total >= haei.total, `results (all) total=${all.total} ≥ haei=${haei.total}`);
  const csv = await res.exportResultsCsv();
  const lines = csv.content.split("\n");
  assert(lines.length > 1 && lines[0].startsWith("itemset,"), `CSV ${csv.filename}: ${lines.length - 1} dòng`);

  // --- dọn dũu backend về luồng mẫu ---
  await fetch("http://localhost:8000/api/load-example", { method: "POST" });

  if (failures > 0) {
    console.error(`\n${failures} FAIL`);
    process.exit(1);
  }
  console.log("\nALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
