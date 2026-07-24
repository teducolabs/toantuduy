// Vietnamese locale strings — teacher class-report surface (/reports)
export const reports = {
  pageTitle: 'Báo cáo lớp học',
  emptyState: 'Chưa có bộ bài tập nào được giao. Giao bài tập để xem báo cáo.',

  studentColumnLabel: 'Học sinh',
  completionColumnLabel: 'Hoàn thành',
  completedSrLabel: 'Đã hoàn thành',
  notCompletedCell: '—',
  classAverageLabel: 'Trung bình lớp',
  noDataCell: 'Chưa có dữ liệu', // EXACT — AC #3 (UX-DR15)
  noStudents: 'Lớp chưa có học sinh. Chia sẻ mã tham gia để thêm học sinh.',
  viewReportCta: 'Xem báo cáo',

  loadErrorMessage: 'Không tải được dữ liệu.', // retry CTA reuses assignments.retryCta (UX-DR15)

  sortAscending: 'sắp xếp tăng dần',
  sortDescending: 'sắp xếp giảm dần',

  formatPercent: (value: number) => `${Math.round(value * 100)}%`,
}
