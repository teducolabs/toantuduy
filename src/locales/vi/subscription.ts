export const subscription = {
  plansTitle: 'Gói đăng ký',
  monthlyPlanName: 'Gói tháng',
  annualPlanName: 'Gói năm',
  formatVnd: (amount: number) => amount.toLocaleString('en-US'),
  priceMonthly: (amount: number) => `${subscription.formatVnd(amount)} đ / tháng`,
  priceAnnual: (amount: number) => `${subscription.formatVnd(amount)} đ / năm`,
  planBullets: [
    'Không giới hạn buổi luyện tập mỗi ngày',
    'Áp dụng cho tất cả hồ sơ của bé',
    'Hủy bất cứ lúc nào',
  ] as const,
  subscribeCta: 'Đăng ký',
  viewPlansLink: 'Xem gói đăng ký →',
  loadErrorMessage: 'Không tải được dữ liệu.',
}
