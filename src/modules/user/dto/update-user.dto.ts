import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';

// Không cho phép sửa password qua endpoint update thông thường (dùng API đổi mật khẩu riêng)
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;
}
