// Vietnamese locale strings — admin surface
export const admin = {
  title: 'Bảng quản trị',
  homeDescription: 'Quản lý xét duyệt giáo viên, cấu hình buổi học và thư viện câu hỏi.',

  navTeachers: 'Duyệt giáo viên',
  navConfig: 'Cấu hình buổi học',
  navQuestions: 'Thư viện câu hỏi',

  navTeachersDescription: 'Xét duyệt tài khoản giáo viên đang chờ.',
  navConfigDescription: 'Điều chỉnh số câu hỏi và hạn mức mỗi buổi học.',
  navQuestionsDescription: 'Thêm, sửa và quản lý câu hỏi luyện tập.',

  questionsComingSoon: 'Thư viện câu hỏi — sắp ra mắt',

  // Session configuration panel (7.3)
  configHeading: 'Cấu hình buổi học',
  questionCountLabel: 'Số câu hỏi mỗi buổi',
  questionCountHint: 'Từ 5 đến 30 câu.',
  questionCountInvalid: 'Số câu hỏi phải từ 5 đến 30.',
  timeLimitToggleLabel: 'Giới hạn thời gian mỗi buổi',
  timeLimitMinutesLabel: 'Thời gian (phút)',
  timeLimitInvalid: 'Thời gian phải từ 1 đến 180 phút.',
  saveCta: 'Lưu',
  configSavedToast: 'Đã lưu. Cài đặt mới áp dụng cho buổi tiếp theo.',
  configSaveFailed: 'Lưu không thành công. Thử lại.',
  configLoadFailed: 'Không thể tải cấu hình. Vui lòng thử lại.',

  // Teacher approval queue (7.2)
  teachersHeading: 'Duyệt giáo viên',
  teachersEmptyState: 'Không có đơn đăng ký nào đang chờ.',
  teachersLoadFailed: 'Không thể tải danh sách đơn đăng ký. Vui lòng thử lại.',
  applicantNameFallback: 'Giáo viên',
  submittedOn: (date: string) => `Gửi ngày ${date}`,
  gradeBandLabels: {
    GRADE_1: 'Lớp 1',
    GRADE_2: 'Lớp 2',
    GRADE_3: 'Lớp 3',
  } as const,
  approveCta: 'Duyệt',
  rejectCta: 'Từ chối',
  approveConfirmTitle: (name: string) => `Duyệt tài khoản ${name}?`,
  approveConfirmBody: 'Giáo viên sẽ được cấp quyền truy cập Cổng giáo viên ngay lập tức và nhận email thông báo.',
  approveConfirmCta: 'Duyệt',
  rejectConfirmTitle: (name: string) => `Từ chối tài khoản ${name}?`,
  rejectConfirmBody: 'Giáo viên sẽ nhận email thông báo kèm lý do (nếu có).',
  rejectConfirmCta: 'Từ chối',
  rejectReasonLabel: 'Lý do từ chối',
  rejectReasonPlaceholder: 'Không bắt buộc',
  cancelCta: 'Hủy',
  submitting: 'Đang xử lý...',
  approveSuccessToast: 'Đã duyệt tài khoản giáo viên.',
  rejectSuccessToast: 'Đã từ chối đơn đăng ký.',
  actionFailedToast: 'Không thể xử lý yêu cầu. Vui lòng thử lại.',
  alreadyProcessedToast: 'Đơn đăng ký này đã được xử lý.',
  offlineToast: 'Không có kết nối.',
}
