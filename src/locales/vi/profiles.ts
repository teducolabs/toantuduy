// Vietnamese locale strings — /profiles page and child-profile-switcher
export const profiles = {
  pageTitle: 'Hồ sơ',
  emptyState: 'Chưa có hồ sơ nào.',
  addProfileCta: 'Thêm hồ sơ',
  renameCta: 'Đổi tên',
  deleteCta: 'Xóa',
  cancelCta: 'Hủy',
  confirmCta: 'Xác nhận',

  createDialogTitle: 'Thêm hồ sơ',
  editDialogTitle: 'Chỉnh sửa hồ sơ',
  nameLabel: 'Tên hiển thị',
  namePlaceholder: 'Ví dụ: Bé An',
  gradeBandLabel: 'Khối lớp',
  gradeBandPlaceholder: 'Chọn khối lớp',

  deleteConfirmTitle: (name: string) => `Xóa hồ sơ ${name}?`,
  deleteConfirmBody: 'Lịch sử sẽ được giữ 30 ngày.',
  deleteToast: 'Hồ sơ đã được xóa. Lịch sử sẽ được giữ 30 ngày.',

  gradeBandLabels: {
    GRADE_1: 'Lớp 1',
    GRADE_2: 'Lớp 2',
    GRADE_3: 'Lớp 3',
  } as const,

  nameRequired: 'Vui lòng nhập tên hiển thị.',
  nameTooLong: 'Tên hiển thị quá dài (tối đa 50 ký tự).',
  gradeBandRequired: 'Vui lòng chọn khối lớp.',
  createFailed: 'Không thể tạo hồ sơ. Vui lòng thử lại.',
  updateFailed: 'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
  deleteFailed: 'Không thể xóa hồ sơ. Vui lòng thử lại.',
  submitting: 'Đang xử lý...',
  saveCta: 'Lưu',

  switcherEmptyLabel: 'Chưa có hồ sơ',
  switcherSheetTitle: 'Hồ sơ của bé',
}
