import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: 'Thành công' })
    message: string;

    @ApiProperty()
    data: T;

    @ApiProperty({ required: false, nullable: true })
    meta?: Record<string, any> | null;
}
