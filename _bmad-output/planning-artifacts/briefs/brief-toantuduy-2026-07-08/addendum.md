---
title: "ToanTuDuy — Addendum"
updated: 2026-07-08
---

# Addendum

## Technical Context

- **Stack**: Next.js (user-specified). Lựa chọn phù hợp cho web app B2C: SSR tốt cho SEO, ecosystem React đủ mạnh cho dashboard interactive.
- **Platform**: Web-first, mobile-responsive. Native app nằm ngoài scope v1.

## Scope Expansion: Lớp 4–5

Lớp 4–5 được đề cập như expansion sau. Lý do tách ra:
- Nội dung tư duy lớp 4–5 phức tạp hơn đáng kể (phân số, tỷ lệ, bài toán nhiều bước).
- Cần validate product-market fit ở lớp 1–3 trước khi đầu tư curriculum mới.
- Rủi ro: nếu mở rộng sớm, UX cho 2 nhóm tuổi rất khác nhau sẽ làm loãng focus.

## Competitive Landscape (từ research)

**Đối thủ quốc tế:**
- Prodigy Math: game RPG, ~1M giáo viên dùng, nhưng hi sinh chiều sâu tư duy để lấy engagement.
- ST Math: tư duy không gian, mastery-based — gần nhất về triết lý nhưng không có phiên bản tiếng Việt và thiếu teacher-parent loop.
- Brilliant: AI tutor, scaffolded problem-solving — targeting older learners.

**Việt Nam:** Hocmai (lớp 6–12, luyện thi), Monkey Junior (early childhood, không tập trung toán tư duy). Không có đối thủ trực tiếp rõ ràng ở phân khúc này.

**Ẩn số cần xác nhận:** Phụ huynh VN có sẵn trả tiền cho "tư duy" hay chỉ trả tiền khi thấy liên hệ trực tiếp đến điểm số? Đây là giả định lớn nhất của brief. Nếu sai, messaging cần pivot sang "con sẽ giải được các bài toán khó trong kỳ thi" thay vì thuần "phát triển tư duy".

## Monetization Options (chưa quyết định)

Ba hướng khả thi:
1. **Freemium**: 5–10 bài/tuần miễn phí, trả phí để mở toàn bộ. Dễ acquire, thấp friction.
2. **Subscription thuần**: ~50k–100k VNĐ/tháng. Cần trust trước khi convert — cần trial period.
3. **Pay-per-term**: ~300k–500k VNĐ/học kỳ. Quen thuộc với phụ huynh VN (pattern của lớp học thêm).

Brief hiện gắn `[ASSUMPTION: Freemium]` — cần quyết định trước khi xây PRD.

## Parked Ideas (không vào v1)

- Gamification: streak, badge, bảng xếp hạng — tăng retention nhưng thêm phức tạp về design và có thể distract khỏi tư duy thật.
- AI sinh đề: tiết kiệm chi phí curriculum về dài hạn, nhưng cần lượng dữ liệu đủ lớn để validate chất lượng đề.
- Teacher-parent messaging trong app: tăng giá trị ecosystem nhưng biến app thành communication platform — ngoài focus.
