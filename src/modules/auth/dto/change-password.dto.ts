import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        example: 'OldPassword123',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    oldPassword: string;

    @ApiProperty({
        example: 'NewPassword123',
        minLength: 6,
    })
    @IsString()
    @MinLength(6)
    newPassword: string;
}