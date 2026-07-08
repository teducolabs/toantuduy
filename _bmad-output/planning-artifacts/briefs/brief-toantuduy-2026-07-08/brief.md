---
title: "ToanTuDuy — Luyện Tư Duy Toán Cho Học Sinh Tiểu Học"
status: done
created: 2026-07-08
updated: 2026-07-08
---

# Product Brief: ToanTuDuy

## Executive Summary

ToanTuDuy là web app giúp học sinh tiểu học Việt Nam (lớp 1–3) luyện tư duy toán học — không phải tính toán cơ học — thông qua câu đố logic và bài toán có ngữ cảnh thực tế. Phụ huynh mua trực tiếp, theo dõi tiến độ và điểm yếu của con; giáo viên giao bài và xem báo cáo lớp miễn phí. Vấn đề không phải thiếu nội dung toán — mà thiếu công cụ luyện *cách nghĩ* ngoài giờ học, có định hướng và đo lường được.

## The Problem

Phụ huynh muốn con giỏi toán thật sự, không chỉ nhớ công thức. "Tư duy toán học" — khả năng đọc hiểu vấn đề, suy luận từng bước, nhận ra quy luật — là thứ khác với tính nhẩm. Nhưng không có công cụ nào để luyện điều đó ở nhà một cách có định hướng: chỉ có bài tập in sẵn hoặc video YouTube thụ động.

Hệ quả: trẻ lên lớp 4–5, khi toán bắt đầu đòi hỏi suy luận, mới lộ ra khoảng trống — nhưng lúc đó đã muộn để xây nền.

## Who This Serves

**Học sinh lớp 1–3 (6–9 tuổi)** — người dùng chính. Cần trải nghiệm đơn giản, phản hồi tức thì, không cảm giác như đang học thêm. Thành công = hoàn thành bài mỗi ngày mà không cần nhắc nhở.

**Phụ huynh** — người trả tiền. Muốn biết con đang tiến bộ thật sự, không chỉ "đã làm xong". Thành công = dashboard cho họ câu trả lời "con tôi đang yếu ở đâu?" trong 30 giây.

**Giáo viên** — người khuếch đại. Không trả tiền. Vấn đề của họ: giáo viên giao bài về nhà — không biết ai làm, ai không làm, ai làm nhưng không hiểu; vòng lặp phản hồi bị đứt từ đầu. Giá trị của ToanTuDuy: báo cáo completion real-time, không tốn thời gian thủ công. Thành công = giáo viên chủ động giới thiệu app cho phụ huynh trong lớp.

## The Solution

ToanTuDuy cung cấp bài luyện tập hàng ngày dưới dạng:
- **Câu đố logic**: nhận diện quy luật, suy luận không gian, phân loại — phù hợp lớp 1–3.
- **Bài toán có ngữ cảnh (word problems)**: yêu cầu đọc hiểu + lập luận từng bước.

Độ khó tự điều chỉnh theo kết quả của học sinh. Giao diện tối giản, không quảng cáo, thiết kế để trẻ 6–9 tuổi tự sử dụng sau khi phụ huynh thiết lập.

Mỗi nhóm người dùng thấy đúng những gì họ cần:

**Phụ huynh** thấy được: bao nhiêu buổi trong tuần, kỹ năng nào tốt, kỹ năng nào cần luyện thêm, con đang ở đâu so với lộ trình lớp tương ứng.

**Giáo viên** (miễn phí, opt-in) có thể: tạo bộ bài tập giao cho lớp, xem ai đã làm, ai chưa, điểm trung bình lớp theo kỹ năng.

## What Makes This Different

| Tiêu chí | ToanTuDuy | App tính nhẩm (Việt Nam) | Prodigy / Khan (quốc tế) |
|---|---|---|---|
| Tư duy toán (không chỉ tính toán) | ✓ | ✗ | Một phần |
| Nội dung phù hợp chương trình VN | ✓ | Thường có | ✗ |
| Phụ huynh thấy được điểm yếu cụ thể | ✓ | Không rõ | Cơ bản |
| Giáo viên giao bài + báo cáo | ✓ | ✗ | ✓ (trả phí) |

Không có rào cản cạnh tranh về công nghệ (moat) — lợi thế là execution speed và focus thị trường.

## V1 Definition

**Thành công khi:**
- **Retention**: ≥ 40% học sinh hoàn thành ít nhất 3 buổi/tuần sau tháng đầu tiên.
- **Parent satisfaction**: Parent NPS ≥ 40 sau 4 tuần sử dụng.
- **Teacher adoption**: ≥ 50% giáo viên đăng ký giao ít nhất 1 bộ bài tập trong tháng đầu.
- **Learning signal**: Học sinh luyện ≥ 2 tuần có cải thiện đo được về word problem accuracy.

**Trong phạm vi:**
- Nội dung lớp 1–3: câu đố logic + word problems
- Giao diện học sinh (web, mobile-responsive)
- Dashboard phụ huynh: tiến độ tuần, breakdown kỹ năng, lịch sử buổi luyện
- Teacher portal: tạo bộ bài tập, giao cho lớp, báo cáo completion + điểm

> [ASSUMPTION: Freemium — truy cập giới hạn miễn phí, phụ huynh trả phí mở toàn bộ nội dung. Cần xác nhận trước khi xây PRD.]

**Ngoài phạm vi:**
- Nội dung lớp 4–5 (v2)
- Native mobile app
- AI sinh đề tự động
- Giao tiếp trực tiếp giáo viên–phụ huynh trong app
- Gamification nâng cao (avatar, bảng xếp hạng toàn quốc)

## Vision

Trong 2–3 năm, ToanTuDuy trở thành công cụ luyện tư duy toán tiêu chuẩn cho tiểu học Việt Nam — từ lớp 1 đến lớp 5, được giáo viên giới thiệu chủ động trong lớp và phụ huynh tìm đến như một lựa chọn mặc định thay cho gia sư tư duy toán.

