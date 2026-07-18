// Vietnamese locale strings — student surface
export const student = {
  greeting: (name: string) => `Xin chào ${name}! 👋`,
  startSessionCta: 'Luyện tập hôm nay',
  resumeSessionCta: 'Tiếp tục buổi luyện',
  allotmentExhaustedError: 'Hôm nay đã luyện đủ rồi, quay lại vào ngày mai nhé!',
  unauthorizedError: 'Không tìm thấy hồ sơ học sinh, vui lòng thử lại.',
  genericStartError: 'Không thể bắt đầu buổi luyện, vui lòng thử lại.',
  freeTierGateTitle: (name: string) => `Hôm nay ${name} đã luyện đủ rồi 🌟`,
  freeTierGateSubtitle: (tomorrowLabel: string) => `Quay lại luyện tiếp vào ngày ${tomorrowLabel} nhé!`,
  sessionProgressLabel: (current: number, total: number) => `${current} / ${total}`,
  noQuestionsAvailableError: 'Chưa có câu hỏi phù hợp cho buổi luyện này, vui lòng quay lại sau nhé.',
}
