import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Khai báo các role được phép truy cập route.
 * Dùng: @Roles('admin', 'manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
