# Database (MongoDB + Prisma)

Dự án dùng **Prisma Client** kết nối **MongoDB** (không dùng migration SQL truyền thống vì MongoDB là schemaless).

## Cấu trúc
- `prisma/schema.prisma`: khai báo model, đây là nguồn sự thật (source of truth) cho cấu trúc dữ liệu.
- `src/database/prisma/prisma.service.ts`: wrap PrismaClient thành Nest provider (connect/disconnect theo lifecycle).
- `src/database/prisma/prisma.module.ts`: `@Global()` module, inject `PrismaService` ở bất kỳ đâu.
- `src/database/seeds/run-seed.ts`: seed dữ liệu khởi tạo (tài khoản admin mặc định).

## Lệnh thường dùng
```bash
# Sinh Prisma Client sau khi sửa schema.prisma
npm run prisma:generate

# Đồng bộ schema.prisma xuống MongoDB (thay cho "migration:run" vì Mongo schemaless)
npm run prisma:push

# Mở Prisma Studio để xem/sửa dữ liệu trực quan
npm run prisma:studio

# Seed dữ liệu mẫu
npm run seed
```

