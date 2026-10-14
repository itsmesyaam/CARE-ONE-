/**
 * Role-based routing helpers.
 * Maps authenticated user roles to their corresponding landing/home route.
 */
export function getRoleHome(role?: string): string {
  if (!role) return '/';
  if (['patient', 'guardian'].includes(role)) return '/patient';
  if (role === 'admin') return '/admin';
  if (['doctor', 'specialist', 'front_desk', 'staff'].includes(role)) return '/doctor';
  return '/';
}
