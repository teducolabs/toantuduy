export function getHomePathForRole(role: string): string {
  switch (role) {
    case 'PARENT':
      return '/dashboard'
    case 'TEACHER':
      return '/classes'
    case 'ADMIN':
      return '/admin'
    default:
      return '/login'
  }
}
