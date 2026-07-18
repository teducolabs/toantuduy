# ToanTuDuy — Luyện Tư Duy Toán Cho Học Sinh Tiểu Học

Web app giúp học sinh tiểu học Việt Nam (lớp 1–3) luyện **tư duy toán học** — không phải tính toán cơ học — thông qua câu đố logic và bài toán có ngữ cảnh thực tế (word problems). Phụ huynh theo dõi tiến độ và điểm yếu của con; giáo viên giao bài và xem báo cáo lớp miễn phí.

> Vấn đề không phải thiếu nội dung toán — mà thiếu công cụ luyện *cách nghĩ* ngoài giờ học, có định hướng và đo lường được.

## Mục lục

- [Giới thiệu sản phẩm](#giới-thiệu-sản-phẩm)
- [Đối tượng người dùng](#đối-tượng-người-dùng)
- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc & Công nghệ](#kiến-trúc--công-nghệ)
- [Cấu trúc project](#cấu-trúc-project)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
- [Các lệnh sẵn có](#các-lệnh-sẵn-có)
- [Kiểm thử & Chất lượng code](#kiểm-thử--chất-lượng-code)
- [Trạng thái phát triển](#trạng-thái-phát-triển)

## Giới thiệu sản phẩm

ToanTuDuy cung cấp bài luyện tập hàng ngày dưới hai dạng:

- **Câu đố logic**: nhận diện quy luật, suy luận không gian, phân loại — phù hợp lớp 1–3.
- **Bài toán có ngữ cảnh (word problems)**: yêu cầu đọc hiểu + lập luận từng bước.

Độ khó của câu hỏi **tự điều chỉnh** theo kết quả gần nhất của học sinh (adaptive difficulty). Giao diện tối giản, không quảng cáo, thiết kế để trẻ 6–9 tuổi có thể tự sử dụng sau khi phụ huynh thiết lập ban đầu.

## Đối tượng người dùng

| Vai trò | Nhu cầu | Thành công là gì |
|---|---|---|
| **Học sinh (lớp 1–3)** | Trải nghiệm đơn giản, phản hồi tức thì, không cảm giác "học thêm" | Hoàn thành bài mỗi ngày mà không cần nhắc |
| **Phụ huynh** (trả phí) | Biết con đang tiến bộ thật sự, không chỉ "đã làm xong" | Trả lời được "con tôi yếu ở đâu?" trong 30 giây qua dashboard |
| **Giáo viên** (miễn phí) | Giao bài về nhà và biết ai làm/chưa làm/làm nhưng không hiểu | Báo cáo completion real-time theo lớp, theo kỹ năng |

## Tính năng chính

**Trải nghiệm học sinh**
- Bắt đầu buổi luyện (Session) với số câu hỏi cấu hình được, hiển thị tuần tự
- Trả lời tức thì (tap = submit, không cần xác nhận), phản hồi đúng/sai trong &lt;500ms
- Tóm tắt kết quả cuối buổi theo từng kỹ năng (Skill)
- Free Tier: giới hạn số câu/ngày (mặc định 5, admin cấu hình được), không hiển thị quảng cáo/upsell trong giao diện học sinh
- Độ khó câu hỏi tự điều chỉnh theo độ chính xác gần nhất của từng kỹ năng (sliding window), có trọng số ưu tiên kỹ năng còn yếu

**Dashboard phụ huynh**
- Hoạt động tuần (số buổi, streak liên tục)
- Breakdown theo kỹ năng: "Tốt" (≥70%) / "Cần luyện" (&lt;70%)
- Chỉ số tiến độ trong Khối lớp (Grade Band): đầu kỳ / giữa kỳ / cuối kỳ
- Lịch sử buổi luyện, gợi ý nâng cấp gói khi hết lượt miễn phí

**Teacher Portal (miễn phí)**
- Đăng ký giáo viên (cần admin duyệt), quản lý lớp qua mã tham gia (join code)
- Tạo bộ bài tập (Assignment Set) theo Khối lớp/Kỹ năng, giao cho lớp
- Báo cáo lớp: ai đã làm/chưa làm, điểm trung bình lớp theo kỹ năng (không hiển thị điểm cá nhân)

**Thanh toán & Admin**
- Gói thuê bao qua MoMo (cổng thanh toán PayOS), quản lý gói (huỷ/kích hoạt lại)
- Trang quản trị: duyệt giáo viên, cấu hình Session, quản lý ngân hàng câu hỏi

## Kiến trúc & Công nghệ

**Stack chính**

| Thành phần | Công nghệ |
|---|---|
| Framework | [Next.js](https://nextjs.org) 15 (App Router) — monorepo, không có backend service riêng |
| Ngôn ngữ | TypeScript (strict mode) |
| Database | PostgreSQL (Supabase) qua Prisma ORM |
| Xác thực | NextAuth v5 (Credentials + Google OAuth cho Phụ huynh) |
| UI | Tailwind CSS v4, Base UI, Baloo 2 / Be Vietnam Pro |
| Thanh toán | PayOS (webhook, xác thực HMAC-SHA256) |
| Lưu trữ file | Supabase Storage (CDN công khai cho hình ảnh câu hỏi) |
| Email | Resend |
| Kiểm thử | Vitest |
| Package manager | pnpm |
| Deployment | Vercel (region `sin1` — Singapore) |

**Nguyên tắc kiến trúc**

Ứng dụng theo 4 lớp, chỉ được phép phụ thuộc một chiều:

```
Presentation → Application (server actions) → Domain → Infrastructure
```

- **Presentation** (`src/app/`, `src/components/`) — chỉ gọi server actions và dùng type từ Domain, không import trực tiếp `src/domain/` hay `src/infrastructure/`.
- **Application** (`src/app/**/actions.ts`) — server actions, cổng duy nhất từ Presentation vào business logic. Luôn kiểm tra session đầu tiên, không bao giờ throw — luôn trả về `{ data } | { error }`.
- **Domain** (`src/domain/`) — business logic thuần (pure functions), **không import bất kỳ SDK ngoài nào** (Prisma, Next.js...). Ví dụ: thuật toán adaptive difficulty tại [`src/domain/use-cases/adaptive-difficulty.ts`](src/domain/use-cases/adaptive-difficulty.ts).
- **Infrastructure** (`src/infrastructure/`) — kết nối DB, storage, email, payment.

ID dùng `cuid2` (không dùng UUID). Toàn bộ chuỗi giao diện tiếng Việt đặt trong `src/locales/vi/`, không hard-code trong component.

## Cấu trúc project

```
toantuduy/
├── prisma/                  # Schema, migrations, seed data
├── src/
│   ├── app/                 # Next.js App Router — routes & server actions
│   ├── components/          # UI components (Presentation layer)
│   ├── domain/               # Business logic thuần (entities, use-cases, constants)
│   ├── infrastructure/       # DB / Storage / Email / Payment adapters
│   ├── lib/                  # Cấu hình dùng chung (auth, env, ...)
│   └── locales/vi/           # Chuỗi tiếng Việt cho UI
├── _bmad-output/              # Tài liệu planning & implementation (PRD, architecture, story files)
└── vitest.config.ts
```

## Yêu cầu môi trường

- **Node.js** ≥ 20
- **pnpm** ≥ 10
- Tài khoản **Supabase** (Postgres + Storage)
- (Tùy chọn khi phát triển đầy đủ tính năng) tài khoản **Resend**, **PayOS**, **Google OAuth Client**

## Hướng dẫn cài đặt

1. **Clone & cài dependencies**

   ```bash
   git clone <repo-url>
   cd toantuduy
   pnpm install
   ```

2. **Cấu hình biến môi trường**

   Copy file mẫu và điền giá trị thật:

   ```bash
   cp .env.example .env.local
   ```

   Các biến cần thiết (xem chi tiết trong [`.env.example`](.env.example)):

   | Biến | Mục đích |
   |---|---|
   | `DATABASE_URL` | Kết nối trực tiếp — **chỉ dùng cho** `prisma migrate` / `prisma db seed` |
   | `DATABASE_URL_POOLED` | Kết nối qua Supabase PgBouncer — dùng cho toàn bộ runtime |
   | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Cấu hình NextAuth v5 |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth (chỉ dùng cho tài khoản Phụ huynh) |
   | `RESEND_API_KEY` | Gửi email xác thực/thông báo |
   | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Cổng thanh toán PayOS/MoMo |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Storage (server-side only — **không** để lộ ở client) |

3. **Khởi tạo database**

   ```bash
   npx prisma migrate deploy   # áp dụng migrations
   pnpm db:seed                # (tùy chọn) nạp dữ liệu mẫu: skills, câu hỏi mẫu...
   ```

4. **Chạy dev server**

   ```bash
   pnpm dev
   ```

   Ứng dụng chạy tại [http://localhost:4200](http://localhost:4200).

## Các lệnh sẵn có

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` | Chạy dev server (Next.js + Turbopack), port `4200` |
| `pnpm build` | Chạy `prisma migrate deploy` rồi build production |
| `pnpm start` | Chạy server production (sau khi build) |
| `pnpm lint` | Kiểm tra code bằng ESLint |
| `pnpm test` | Chạy unit test bằng Vitest |
| `pnpm db:seed` | Nạp dữ liệu mẫu vào database |

## Kiểm thử & Chất lượng code

- Domain layer (`src/domain/`) được kiểm thử bằng **Vitest**, không phụ thuộc DB/framework — chạy nhanh và cách ly hoàn toàn khỏi hạ tầng.
- Trước khi tạo pull request, nên chạy:

  ```bash
  pnpm lint
  npx tsc --noEmit
  pnpm test
  ```

## Trạng thái phát triển

Dự án được phát triển theo phương pháp BMAD (Business-Method-Agile-Development) — toàn bộ tài liệu planning (Product Brief, PRD, Architecture Spine, UX Design) và tiến độ từng story nằm trong [`_bmad-output/`](_bmad-output/).

- ✅ **Epic 1 — Nền tảng & Xác thực phụ huynh**: hoàn thành
- ✅ **Epic 2 — Quản lý hồ sơ học sinh (Child Profile)**: hoàn thành
- 🚧 **Epic 3 — Giao diện luyện tập & Độ khó tự điều chỉnh**: đang triển khai
- ⏳ **Epic 4–7 — Dashboard phụ huynh, Teacher Portal, Thanh toán, Admin**: chưa bắt đầu

Xem chi tiết tiến độ tại [`_bmad-output/implementation-artifacts/sprint-status.yaml`](_bmad-output/implementation-artifacts/sprint-status.yaml).
