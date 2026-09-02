/**
 * Bảng mã lỗi thống nhất toàn hệ thống, dùng chung giữa Backend Frontend.
 * Quy ước:
 *  - Không được đổi giá trị code đã public cho FE, chỉ được thêm mới
 */
export enum ErrorCode {
    // Common
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    BAD_REQUEST = 'BAD_REQUEST',
    NOT_FOUND = 'NOT_FOUND',
    FORBIDDEN = 'FORBIDDEN',
    UNAUTHORIZED = 'UNAUTHORIZED',
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

    // Validation
    VALIDATION_ERROR = 'VALIDATION_ERROR',

    // Auth
    AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
    AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
    AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
    AUTH_REFRESH_TOKEN_INVALID = 'AUTH_REFRESH_TOKEN_INVALID',
    AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
    AUTH_ACCOUNT_NOT_VERIFIED = 'AUTH_ACCOUNT_NOT_VERIFIED',
    INVALID_OLD_PASSWORD = 'INVALID_OLD_PASSWORD',

    // User
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
    USER_EMAIL_ALREADY_EXISTS = 'USER_EMAIL_ALREADY_EXISTS',
}

/**
 * Map mã lỗi trả về cho FE khi không truyền message riêng.
 */
export const ErrorMessage: Record<ErrorCode, string> = {
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau',
    [ErrorCode.BAD_REQUEST]: 'Yêu cầu không hợp lệ',
    [ErrorCode.NOT_FOUND]: 'Không tìm thấy dữ liệu',
    [ErrorCode.FORBIDDEN]: 'Bạn không có quyền thực hiện hành động này',
    [ErrorCode.UNAUTHORIZED]: 'Bạn cần đăng nhập để thực hiện hành động này',
    [ErrorCode.TOO_MANY_REQUESTS]: 'Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Dịch vụ tạm thời không khả dụng',
    [ErrorCode.VALIDATION_ERROR]: 'Dữ liệu đầu vào không hợp lệ',
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Tài khoản hoặc mật khẩu không đúng',
    [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Phiên đăng nhập đã hết hạn',
    [ErrorCode.AUTH_TOKEN_INVALID]: 'Token không hợp lệ',
    [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: 'Refresh token không hợp lệ hoặc đã hết hạn',
    [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'Tài khoản đã bị khoá',
    [ErrorCode.AUTH_ACCOUNT_NOT_VERIFIED]: 'Tài khoản chưa được xác thực',
    [ErrorCode.USER_NOT_FOUND]: 'Không tìm thấy người dùng',
    [ErrorCode.USER_ALREADY_EXISTS]: 'Người dùng đã tồn tại',
    [ErrorCode.USER_EMAIL_ALREADY_EXISTS]: 'Email đã được sử dụng',
    [ErrorCode.INVALID_OLD_PASSWORD]: 'Mật khẩu cũ không hợp lệ',
};
