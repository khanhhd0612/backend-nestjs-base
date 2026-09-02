import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Lấy user hiện tại đã được JwtStrategy gắn vào request.user
 * Dùng: findMe(@CurrentUser() user: JwtPayload)
 */
export const CurrentUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        return data ? user?.[data] : user;
    },
);
