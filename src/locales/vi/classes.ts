// Vietnamese locale strings — teacher /classes surface and parent join-class flow
export const classes = {
  pageTitle: 'Lớp học',
  emptyState: 'Tạo lớp học đầu tiên để bắt đầu.',
  createClassCta: 'Tạo lớp học',

  createDialogTitle: 'Tạo lớp học',
  nameLabel: 'Tên lớp',
  namePlaceholder: 'Ví dụ: Lớp 1A',
  gradeBandLabel: 'Khối lớp',
  gradeBandPlaceholder: 'Chọn khối lớp',
  createCta: 'Tạo lớp',
  submitting: 'Đang xử lý...',
  nameRequired: 'Vui lòng nhập tên lớp.',
  nameTooLong: 'Tên lớp quá dài (tối đa 50 ký tự).',
  gradeBandRequired: 'Vui lòng chọn khối lớp.',
  createFailed: 'Không thể tạo lớp học. Vui lòng thử lại.',

  studentCount: (count: number) => `${count} học sinh`,
  noAssignmentPill: 'Chưa có bài tập',

  detailNotFound: 'Không tìm thấy lớp học.',
  noStudents: 'Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh.',
  rosterTitle: 'Học sinh',
  joinCodeLabel: 'Mã tham gia',
  copyCta: 'Sao chép',
  copiedCta: 'Đã sao chép ✓',

  joinClassCta: 'Tham gia lớp học',
  joinDialogTitle: 'Tham gia lớp học',
  joinCodeInputLabel: 'Mã tham gia',
  joinCodeInputPlaceholder: 'Ví dụ: ABC234',
  joinCodeRequired: 'Vui lòng nhập mã tham gia.',
  joinSubmitCta: 'Tham gia',
  joinSuccess: (className: string) => `Đã tham gia lớp ${className}`,
  joinInvalidCode: 'Mã tham gia không hợp lệ. Vui lòng kiểm tra lại.',
  joinAlreadyInClass: 'Bé đã tham gia một lớp của giáo viên này.',
  joinFailed: 'Không thể tham gia lớp học. Vui lòng thử lại.',
}
