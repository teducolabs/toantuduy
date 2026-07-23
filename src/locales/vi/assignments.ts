// Vietnamese locale strings — teacher assignment-set surface (/assignments + builder)
export const assignments = {
  pageTitle: 'Bộ bài tập',
  emptyState: 'Chưa có bộ bài tập nào. Tạo bộ bài tập đầu tiên.',
  builderTrigger: 'Tạo bộ bài tập',

  sheetTitle: 'Tạo bộ bài tập',
  step1Title: 'Thông tin bộ bài tập',
  step2Title: 'Chọn câu hỏi',
  step3Title: 'Xem lại bộ bài tập',

  nameLabel: 'Tên bộ bài tập',
  namePlaceholder: 'Ví dụ: Ôn tập quy luật tuần 3',
  nameRequired: 'Vui lòng nhập tên bộ bài tập.',
  gradeBandLabel: 'Khối lớp',
  gradeBandPlaceholder: 'Chọn khối lớp',
  dueDateLabel: 'Ngày giao (không bắt buộc)',

  skillFilterLabel: 'Kỹ năng',
  allSkillsOption: 'Tất cả kỹ năng',
  difficultyLabel: (level: number) => `Độ khó ${level}`,
  loadingQuestions: 'Đang tải câu hỏi...',
  fetchError: 'Không thể tải câu hỏi. Vui lòng thử lại.',
  retryCta: 'Thử lại',
  noQuestions: 'Không có câu hỏi phù hợp.',
  selectionCount: (count: number, max: number) => `${count} / ${max} câu`,
  continueCta: 'Tiếp tục',
  backCta: 'Quay lại',

  summaryNameLabel: 'Tên',
  summaryGradeBandLabel: 'Khối lớp',
  summaryQuestionCountLabel: 'Số câu hỏi',
  dueDateDisplay: (day: number, month: number) => `Giao ngày: ${day}/${month}`,
  saveDraftCta: 'Lưu nháp',
  submitting: 'Đang xử lý...',
  saveFailed: 'Không thể lưu bộ bài tập. Vui lòng thử lại.',

  draftPill: 'Bản nháp',
  assignedPill: 'Đã giao',
  questionCount: (count: number) => `${count} câu hỏi`,

  errorTooManyQuestions: 'Số câu hỏi vượt quá giới hạn cho phép.',
  errorInvalidQuestions: 'Một số câu hỏi không hợp lệ. Vui lòng chọn lại.',
  errorCreateFailed: 'Không thể lưu bộ bài tập. Vui lòng thử lại.',
}
