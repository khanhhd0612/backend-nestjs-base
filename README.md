# Backend Service — NestJS + MongoDB (Prisma)

NestJS chuẩn production: cấu trúc module/domain, ConfigModule + validate env,
response chuẩn hoá, global exception filter, ValidationPipe, logger tập trung (pino),
Swagger, health check, rate limit, Docker hoá, CI/CD, code convention.

## Bắt đầu nhanh

```bash
cp .env.example .env.dev      # rồi chỉnh DATABASE_URL, JWT secrets...
npm install                   # sẽ tự chạy `prisma generate` qua postinstall
npm run prisma:push           # đồng bộ schema.prisma xuống MongoDB
npm run seed                  # tạo tài khoản admin mặc định
npm run start:dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs
- Health check: http://localhost:3000/api/v1/health

## Database: MongoDB qua Prisma

Xem chi tiết tại `src/database/README.md`. Tóm tắt:
- `prisma/schema.prisma`: khai báo model (nguồn sự thật của schema).

## Cấu trúc thư mục

Xem chi tiết cây thư mục và vai trò từng phần trong `docs/STRUCTURE.md`.

## Script chính

| Script | Mô tả |
|---|---|
| `npm run start:dev` | Chạy dev với hot-reload |
| `npm run build` | Build production |
| `npm run lint` | ESLint + tự fix |
| `npm run test` / `test:e2e` | Unit test / e2e test |
| `npm run prisma:generate` | Sinh lại Prisma Client sau khi sửa schema |
| `npm run prisma:push` | Đồng bộ schema xuống MongoDB |
| `npm run prisma:studio` | Mở giao diện xem/sửa dữ liệu |
| `npm run seed` | Seed tài khoản admin mặc định (admin@example.com / Admin@123) |

## Quy ước code & git
- ESLint + Prettier bắt buộc pass trước khi commit (husky pre-commit + lint-staged).
- Commit message theo Conventional Commits (`feat:`, `fix:`, `chore:` ...), enforce bằng commitlint.
- Nhánh: `dev` -> `staging` -> `main`, CI chạy lint -> test -> build trên mỗi push/PR.

## Mã lỗi
Bảng mã lỗi thống nhất dùng chung với FE nằm ở `src/common/constants/error-code.constant.ts`.
Mọi response lỗi có dạng:
```json
{
    "success": false,
    "statusCode": 401,
    "errorCode": "AUTH_INVALID_CREDENTIALS",
    "message": "Tài khoản hoặc mật khẩu không đúng",
    "details": null,
    "timestamp": "2026-09-02T05:26:00.236Z",
    "path": "/api/v1/auth/login",
    "requestId": "067170f1-995d-4804-9564-131a84507f5b"
}
```

Response thành công có dạng:
```json
{
    "success": true,
    "statusCode": 201,
    "data": {
    },
    "meta": null,
    "timestamp": "2026-09-02T05:23:54.825Z",
    "path": "/api/v1/auth/login",
    "requestId": "a9dc0cb7-8463-4660-917a-fb3e99506781"
}
```
