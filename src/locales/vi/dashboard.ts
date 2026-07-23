export const dashboard = {
  weeklySummary: (n: number) => `${n} buổi tuần này`,
  streakLabel: (n: number) => `${n} ngày`,
  noActiveProfile: 'Chưa có hồ sơ nào được chọn. Chọn hồ sơ để xem tổng quan.',
  skillSectionTitle: 'Kỹ năng',
  skillGroupWeak: 'Cần luyện thêm',
  skillGroupStrong: 'Tốt',
  skillBadgeStrong: 'Tốt',
  skillBadgeWeak: 'Cần luyện',
  skillInsufficientData: 'Chưa đủ dữ liệu',
  noSkillDataEver: 'Chưa có dữ liệu kỹ năng. Bắt đầu luyện tập để xem kết quả.',
  skillDetailSessionAccuracy: (correct: number, total: number) => `${correct}/${total} câu đúng`,
}
