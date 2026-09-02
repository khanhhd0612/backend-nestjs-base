import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Trang hiện tại' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100, description: 'Số item mỗi trang' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 10;

    @ApiPropertyOptional({ description: 'Từ khoá tìm kiếm' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Trường dùng để sắp xếp', default: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy: string = 'createdAt';

    @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder: 'ASC' | 'DESC' = 'DESC';

    get skip(): number {
        return (this.page - 1) * this.limit;
    }
}

export interface PaginationMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export class PaginatedResult<T> {
    message: string;
    data: T[];
    meta: PaginationMeta;

    constructor(data: T[], totalItems: number, query: PaginationQueryDto, message = 'Thành công') {
        const totalPages = Math.ceil(totalItems / query.limit) || 1;
        this.message = message;
        this.data = data;
        this.meta = {
            page: query.page,
            limit: query.limit,
            totalItems,
            totalPages,
            hasNextPage: query.page < totalPages,
            hasPrevPage: query.page > 1,
        };
    }
}
