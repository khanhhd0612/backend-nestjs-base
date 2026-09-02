import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global() để mọi module (user, auth, ...) đều có thể inject PrismaService
 * mà không cần import PrismaModule lặp lại ở từng module con.
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }
