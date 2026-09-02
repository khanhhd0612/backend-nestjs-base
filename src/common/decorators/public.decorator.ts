import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Đánh dấu route/controller là public, bỏ qua JwtAuthGuard.
 * Dùng: @Public() phía trên handler hoặc controller.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
