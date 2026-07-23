// Vietnamese locale strings — outbound email templates (teacher notifications)
export const emails = {
  greeting: (name: string) => `Chào thầy/cô ${name},`,
  greetingFallback: 'Chào thầy/cô,',
  signOff: 'Trân trọng,',
  signOffTeam: 'Đội ngũ ToanTuDuy',

  teacherApprovalSubject: 'Tài khoản giáo viên của bạn đã được phê duyệt',
  teacherApprovalBody: 'Tài khoản giáo viên của bạn trên ToanTuDuy đã được phê duyệt. Bạn có thể đăng nhập ngay bây giờ để bắt đầu sử dụng.',
  teacherApprovalCta: 'Đăng nhập',

  teacherRejectionSubject: 'Đăng ký tài khoản giáo viên không được phê duyệt',
  teacherRejectionBody: 'Rất tiếc, đăng ký tài khoản giáo viên của bạn trên ToanTuDuy không được phê duyệt.',
  teacherRejectionReason: (reason: string) => `Lý do: ${reason}`,
}
