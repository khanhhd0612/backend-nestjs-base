import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailjet from 'node-mailjet';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly mailjet: Mailjet;


    constructor(private readonly configService: ConfigService) {
        this.mailjet = new Mailjet({
            apiKey: this.configService.get<string>('app.mailjet.apiKey'),
            apiSecret: this.configService.get<string>('app.mailjet.secretKey'),
        });
    }

    async sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {

        const resetUrl = `${this.configService.get<string>('app.frontendUrl')}/reset-password?token=${rawToken}`;

        try {
            await this.mailjet.post('send', { version: 'v3.1' }).request({
                Messages: [
                    {
                        From: {
                            Email: this.configService.get<string>('app.mailjet.fromEmail'),
                            Name: this.configService.get<string>('app.mailjet.fromName'),
                        },
                        To: [{ Email: to }],
                        Subject: 'Yêu cầu đặt lại mật khẩu',
                        HTMLPart: `
                            <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
                            <p>Nhấn vào link sau (hết hạn sau 15 phút): <a href="${resetUrl}">${resetUrl}</a></p>
                            <p>Nếu không phải bạn, hãy bỏ qua email này.</p>
                        `,
                        TextPart: `Đặt lại mật khẩu tại: ${resetUrl} (hết hạn sau 15 phút)`,
                    },
                ],
            });
        } catch (err) {
            this.logger.error(
                {
                    err,
                },
                'Gửi email đặt lại mật khẩu thất bại',
            );
        }
    }
}