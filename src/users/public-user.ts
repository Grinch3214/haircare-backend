import type { User } from '../database/schema';

export type PublicUser = Pick<
  User,
  'id' | 'email' | 'name' | 'phone' | 'avatarUrl' | 'role'
>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}
