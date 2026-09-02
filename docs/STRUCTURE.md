# Cấu trúc thư mục

```
backend/
├── src/
│   ├── main.ts                 # Bootstrap: pipe, filter, interceptor, CORS, Swagger
│   ├── app.module.ts           # Module gốc
│   ├── app.controller.ts       # Route ping kiểm tra service sống
│   ├── config/                 # Đọc & validate biến môi trường
│   │   ├── app.config.ts
│   │   ├── database.config.ts  # URL MongoDB (đọc bởi Prisma)
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   ├── env.validation.ts   # Schema Joi
│   │   └── logger.config.ts    # Cấu hình Winston
│   ├── common/
│   │   ├── decorators/         # @Public, @Roles, @CurrentUser
│   │   ├── filters/            # http-exception.filter.ts
│   │   ├── guards/              # jwt-auth.guard.ts, roles.guard.ts
│   │   ├── interceptors/        # transform.interceptor.ts, logging.interceptor.ts
│   │   ├── middleware/          # correlation-id.middleware.ts
│   │   ├── dto/                 # pagination.dto.ts, base-response.dto.ts
│   │   ├── constants/           # error-code.constant.ts
│   │   ├── exceptions/          # business.exception.ts
│   │   └── base/                # base.service.ts (CRUD generic trên Prisma)
│   ├── database/
│   │   ├── prisma/              # PrismaService + PrismaModule (kết nối MongoDB)
│   │   └── seeds/                # Seed tài khoản admin mặc định
│   ├── health/                   # Health check (k8s probe): mongo, memory, disk
│   ├── modules/
│   │   ├── auth/                 # Login, refresh token, JWT strategies
│   │   └── user/                 # Module mẫu chuẩn cho các domain khác
│   └── shared/                   # mail, storage, cache, queue (đặt chỗ sẵn)
├── prisma/schema.prisma          # Khai báo model MongoDB
├── test/                         # e2e test
├── docs/
├── .env.example / .env.dev / .env.staging / .env.prod
├── Dockerfile
├── docker-compose.yml            # app + mongo (replica set) + redis
└── package.json
```
