import { HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorMessage } from '@common/constants/error-code.constant';
import { BusinessException } from '@common/exceptions/business.exception';
import { PaginatedResult, PaginationQueryDto } from '@common/dto/pagination.dto';

/**
 * Interface tối thiểu mà một Prisma model delegate cần có để dùng với BaseService.
 * Mọi model Prisma (prisma.user, prisma.product, ...) đều tự động thoả interface này.
 */
export interface PrismaDelegate<T> {
  create(args: { data: any }): Promise<T>;
  findMany(args?: any): Promise<T[]>;
  findUnique(args: { where: any }): Promise<T | null>;
  count(args?: any): Promise<number>;
  update(args: { where: any; data: any }): Promise<T>;
  // MongoDB + Prisma dùng updateMany để giả lập soft-delete an toàn (tránh lỗi record-not-found)
  updateMany(args: { where: any; data: any }): Promise<{ count: number }>;
}

/**
 * BaseService<T> cung cấp sẵn CRUD generic dùng chung cho mọi module nghiệp vụ,
 * hoạt động trên nền Prisma + MongoDB (soft-delete bằng field `deletedAt`).
 *
 * Ví dụ:
 *   export class UserService extends BaseService<User> {
 *     constructor(prisma: PrismaService) {
 *       super(prisma.user, ErrorCode.USER_NOT_FOUND);
 *     }
 *   }
 */
export abstract class BaseService<T extends { id: string; deletedAt?: Date | null }> {
  protected constructor(
    protected readonly delegate: PrismaDelegate<T>,
    protected readonly notFoundErrorCode: ErrorCode = ErrorCode.NOT_FOUND,
  ) {}

  async create(data: any): Promise<T> {
    return this.delegate.create({ data });
  }

  async findAll(
    query: PaginationQueryDto,
    where: Record<string, any> = {},
  ): Promise<PaginatedResult<T>> {
    // Loại bản ghi đã xoá mềm ra khỏi mọi truy vấn danh sách
    const finalWhere = { ...where, deletedAt: null };

    const [items, totalItems] = await Promise.all([
      this.delegate.findMany({
        where: finalWhere,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder.toLowerCase() },
      }),
      this.delegate.count({ where: finalWhere }),
    ]);

    return new PaginatedResult(items, totalItems, query);
  }

  async findOneOrFail(id: string): Promise<T> {
    const entity = await this.delegate.findUnique({ where: { id } });

    if (!entity || (entity as any).deletedAt) {
      throw new BusinessException(
        this.notFoundErrorCode,
        HttpStatus.NOT_FOUND,
        ErrorMessage[this.notFoundErrorCode],
      );
    }

    return entity;
  }

  async update(id: string, data: any): Promise<T> {
    await this.findOneOrFail(id);
    return this.delegate.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrFail(id);
    // Soft delete: giữ lại dữ liệu, chỉ đánh dấu deletedAt
    await this.delegate.updateMany({ where: { id }, data: { deletedAt: new Date() } });
  }
}
