# IFC Delta — Implementation Plan

> Nguồn: *IFCDelta — Báo cáo tiến độ dự án* (PDF) + tái cấu trúc mã nguồn.
> Cập nhật: 2026-06-04. File này là kế hoạch sống — chỉnh theo trạng thái thực tế.

Công cụ BIM nội bộ chạy web (xem · so sánh · clash · validate · AI), Three.js + web-ifc,
deploy Vercel + Firebase Hosting: https://ifc.t3lab.space — phục vụ team BIM (~20 người).

---

## 0. Tình trạng hiện tại (từ báo cáo)

**Đã hoàn thành:** viewer 3D + Walk + ViewCube · Section box/plane · lọc category/storey ·
2D plan overlay · Field mode · Compare engine (GlobalId + smart match + geometry hash) ·
Clash detection (Navisworks-style, mesh-BVH) · Properties/Psets · đo đạc · screenshot ·
Colorize · export BCF/CSV · context menu · CORENET X Validator (Phase 1 ~35 rule + Phase 2
JSON ~100 rule) · N-file federation · Google Drive · Firebase Auth · giao diện tiếng Việt.

**Vừa xong (chưa mở cho team):** Trợ lý AI — data index (đã verify 1.379 cấu kiện, phủ
khối lượng ~99%), query tools `countElements`/`sumQuantity` (verify Cột→54, L3→225), chat
UI (Claude Haiku). Kiến trúc chống "bịa số" bằng Tool Use: AI gọi hàm JS để tính, không tự đếm.

---

## Giai đoạn 0 — Tái cấu trúc mã nguồn ✅ (đã làm trong lần này)

Trực tiếp giải quyết rủi ro "phụ thuộc một developer / nên ghi tài liệu mã nguồn" (báo cáo §6).

- [x] Tách `index.html` (13.559 dòng) → `css/styles.css`, `js/auth.js`, và 22 file
      tính năng trong `src/app/*.js` ghép thành `js/app.js` qua `build.mjs`.
- [x] Phép tách **byte-identical** — hành vi runtime không đổi (đã chứng minh).
- [x] Tài liệu: `ARCHITECTURE.md`, `REFACTOR_MAP.md`, `CLAUDE.md`.
- [x] Script kiểm chứng `scripts/verify-build.mjs`.

**Quy trình làm việc mới:** sửa file trong `src/app/`, chạy `node build.mjs`, rồi commit.
Xem `ARCHITECTURE.md` cho bản đồ module.

---

## Giai đoạn 1 — Ưu tiên cao (báo cáo §4 + §7)

### 1.1 Proxy bảo mật API key ✅ Đã xong (serverless Vercel + Express, không qua Cloudflare Worker)
Khoá API key ở server trước khi mở AI cho team. Không bao giờ deploy file kèm API key (§6).

> ⚠️ **Hai proxy song song — phân biệt cái nào đang chạy production:**
> - **`api/ai/chat.js` (Vercel serverless) — ĐANG DEPLOY.** Provider **DeepSeek**
>   (`DEEPSEEK_API_KEY`). Đây là endpoint `/api/ai/chat` mà bản `src/app/` (production)
>   thực sự gọi. Client gửi `provider` rỗng + `model` rỗng → proxy luôn dùng DeepSeek.
> - **`backend/src/routes/ai.ts` (Express) — CHƯA DEPLOY.** Đa provider
>   (anthropic mặc định / openai / deepseek / google), có UI chọn `⚙` ở bản `frontend/`
>   (Vite). Dùng cho dev/thử nghiệm; chỉ lên production khi cắt deploy sang `frontend/`
>   (Giai đoạn R) hoặc host backend riêng. **Lưu ý:** "Haiku/Anthropic" trong báo cáo gốc
>   là ý định ban đầu — bản đang chạy production là **DeepSeek**, không phải Anthropic.

- [x] Xác thực Firebase ID token qua REST `accounts:lookup` (không cần Admin SDK/service-account
      — Web API key vốn công khai). Từ chối 401 nếu thiếu/sai token hoặc email chưa xác minh.
      Áp dụng ở **cả hai** proxy: `api/ai/chat.js` (production, thêm 2026-06-30) và
      `backend/src/routes/ai.ts` (`requireAuth()`).
- [x] Rate-limit 20 yêu cầu/10 phút theo uid (in-memory; cấu hình qua
      `AI_RATE_LIMIT_MAX`/`AI_RATE_LIMIT_WINDOW_MS`). Ở Express là middleware ổn định;
      ở serverless là **best-effort** (mỗi instance có Map riêng, bị reclaim khi rảnh) —
      lớp bảo vệ chính ở serverless là auth, không phải rate-limit toàn cục.
- [x] Audit log tối thiểu: mỗi request `/chat` ghi 1 dòng JSON (uid, email, provider, model,
      status, usage) ra stdout — không ghi nội dung câu hỏi/trả lời. Đủ để tra cứu chi
      phí/lạm dụng qua log hosting (Vercel/Firebase), không cần DB riêng. Có ở cả hai proxy.
- [x] Client (`src/app/22-ai.ts` + `frontend/.../integrations/ai.ts`): gửi kèm header
      `Authorization: Bearer <Firebase ID token>` qua `window.getAuthToken()`
      (thêm trong `frontend/src/lib/auth.ts`, dùng chung cho cả 2 codebase qua `js/auth.js`).
- [ ] (Còn thiếu so với phương án Cloudflare ban đầu) prompt caching phía provider, giới hạn
      chi tiêu cứng trên Console nhà cung cấp — cân nhắc nếu chi phí thực tế vượt ước tính.
      Đặc biệt nên đặt **hard cap chi tiêu trên Console DeepSeek** vì rate-limit serverless
      chỉ là best-effort.
- **Done khi:** không còn secret nào trong bundle; AI chạy qua proxy có xác thực + rate-limit.
  ✅ Đạt — proxy production (`api/ai/chat.js`) đã có auth + rate-limit + audit từ 2026-06-30;
  chỉ còn giới hạn chi tiêu ở Console provider là tuỳ chọn bổ sung.

### 1.2 Mở rộng tool AI
- [ ] `frontend/src/components/integrations/ai.ts`: thêm lọc đa điều kiện (category + tầng + vật liệu + lớp IFC).
- [ ] Tool liệt kê cấu kiện (trả danh sách, không chỉ con số).
- [ ] Tool xuất bảng khối lượng (quantity takeoff) → CSV/markdown.
- **Done khi:** trả lời được "liệt kê cột tầng L3 kèm khối lượng" và xuất bảng.

---

## Giai đoạn 2 — Trung bình (báo cáo §4)

### 2.1 Cross-discipline checks
- [ ] Căn chỉnh geo-reference giữa các bộ môn (so IfcSite/MapConversion).
- [ ] Kiểm tra quy ước đặt tên tầng (storey) nhất quán giữa file.
- [ ] Phát hiện xung đột GUID trùng giữa các bộ môn.
- Liên quan: `frontend/src/components/compare/federation-load.ts`, `compare/compare.ts`.

### 2.2 BCF export cho Validator ✅ Đã xong (không còn là stub)
- [x] `src/app/18-validator-export.ts:110-324`: export BCF 2.1 (zip) đầy đủ — markup/
      viewpoint/snapshot theo từng lỗi, màu theo mức độ nghiêm trọng, giới hạn 200 issue.
      PDF export (`:27-108`, qua jsPDF) cũng đã đầy đủ. Mục này từng bị ghi nhầm là "stub" —
      đã rà soát lại code thực tế (2026-06-30) và xác nhận hoàn thiện.

### 2.3 Đào sâu thuộc tính vật liệu
- [ ] `frontend/src/components/inspect/properties.ts`: đọc `IfcMaterialLayerSet`, hiển thị cấp độ/lớp vật liệu.

### 2.4 Snapshot kiểm tra theo thời gian
- [ ] Lưu kết quả validate/clash theo mốc thời gian để theo dõi thay đổi.

---

## Giai đoạn 3 — Khi có thời gian (báo cáo §4)

- [ ] Chế độ so sánh dạng thanh trượt side-by-side (`frontend/src/components/compare/compare.ts`).
- [x] Phân quyền tối thiểu (2026-06-30): app không có Firestore/DB nên không có tài
      nguyên dùng chung để bảo vệ bằng RBAC đầy đủ — mọi thao tác export/delete chỉ tác
      động dữ liệu cục bộ của chính người dùng. Tài nguyên dùng chung thật sự duy nhất là
      proxy AI (chi phí), nên chỉ phần đó được gate: ô chọn provider/model trong AI chat
      (`⚙`) chỉ hiện cho admin (`window.isAdmin`, allowlist email trong
      `frontend/src/lib/auth.ts`, dùng chung cho cả 2 codebase). Nếu sau này có dữ liệu
      dùng chung qua backend/Firestore, cần thiết kế RBAC đầy đủ hơn lúc đó.
- [ ] Tối ưu hiệu năng mô hình lớn; responsive di động (đã làm Field Mode — xem mục dưới); tinh chỉnh UI.

---

## Bug đang theo dõi (báo cáo §5)

- [ ] Chọn cấu kiện sau khi chạy Compare đôi khi không nhận → `frontend/src/components/compare/compare.ts` + `tools/focus-highlight.ts`.
- [ ] Xoay theo TrueNorth cho mặt bằng 2D → `frontend/src/components/tools/plan-overlay.ts`.
- [x] (Đã sửa) Crash listener phím ở Walk mode.

---

## Rủi ro & lưu ý (báo cáo §6)

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Phụ thuộc một developer | **Giai đoạn 0 đã tách module + viết tài liệu**; đào tạo người thứ hai |
| Trần bộ nhớ trình duyệt (file >200 MB hiếm) | Có phương án dự phòng bằng công cụ khác |
| Bảo mật AI | ✅ Proxy có xác thực + rate-limit (1.1) đã xong; không deploy kèm API key |
| Chi phí AI (~$70–100/tháng) | Haiku + prompt caching + giới hạn chi tiêu trên Console |

---

## Giai đoạn R — Hợp nhất về một codebase `frontend/` ✅ ĐÃ XONG

**Hoàn tất (2026-06-30):** dự án chưa release nên đã quyết định hợp nhất **một lần duy nhất**
(big-bang) thay vì migrate từng module qua nhiều PR. Trạng thái cuối:

- **Codebase duy nhất: `frontend/` (Vite + TypeScript, ESM thật).** Production build trực
  tiếp từ đây — `vercel.json` (`buildCommand: npm run build --workspace=frontend`,
  `outputDirectory: frontend/dist`) và `firebase.json` (`public: frontend/dist`, predeploy
  build) **đã trỏ sẵn vào `frontend/`** từ trước; bản standalone thực chất đã là code chết.
- **Đã xoá hẳn bản standalone:** `src/app/`, `build.ts`, root `index.html`/`js/`/`css/`/
  `icons/`/`vendor/`, `scripts/*` (fetch-vendor/verify-build/typecheck-standalone), root
  `tsconfig.json`, `.gitattributes`, CI `verify-standalone.yml`, và `.claude/REFACTOR_MAP.md`.
- **Dọn root `package.json`:** bỏ script `fetch:vendor`/`build:standalone`/`verify:standalone`/
  `typecheck:standalone` và devDep chỉ phục vụ standalone (`esbuild`, `tsx`, `typescript`,
  `@types/node`) — giữ `concurrently` cho script `dev`.
- **Đối chiếu hành vi:** `frontend/` đã là bản đang được deploy + sửa lỗi gần đây (các commit
  web-ifc WASM, fix auth AI `getAuthToken`/`Authorization: Bearer` đã có trong `frontend/`),
  nên nó là nguồn sự thật. Lịch sử git còn giữ `src/app/` nếu cần tra cứu hành vi cũ.

> ⚠️ **Còn lại (kiểm chứng thủ công, vì chưa có test tự động đầy đủ):** chạy smoke-test toàn bộ
> tính năng trên build production `frontend/` (`npm run build` + serve `dist/`) theo từng route
> (viewer/compare/clash/validate/field) trước lần deploy production kế tiếp. Nếu phát hiện tính
> năng nào ở bản standalone cũ tốt hơn, tra `git show <commit>:src/app/NN-x.ts` để port lại.

---

## Đề xuất bước tiếp theo (báo cáo §7)

1. ~~Dựng Cloudflare Worker proxy (1.1)~~ → **đã làm bằng cách khác**: khoá ngay trong
   backend Express hiện có (Firebase ID-token REST verify + rate-limit theo uid), không
   cần hạ tầng Cloudflare mới. Xem 1.1. AI đã có thể mở cho team.
2. Thu thập phản hồi → mở rộng tool AI (1.2) theo nhu cầu thực (khối lượng, thống kê).
3. Song song: cross-discipline checks (2.1); ~~wiring BCF cho validator (2.2)~~ đã xong.
