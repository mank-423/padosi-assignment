import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.from = this.config.getOrThrow<string>('MAIL_FROM');
  }

  async sendOtp(to: string, code: string): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Your PadosiPro verification code',
        html: `
          <div style="font-family: sans-serif; max-width: 480px;">
            <h2>Verify your email</h2>
            <p>Enter this code in the app to finish signing up:</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
            <p>This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend error: ${JSON.stringify(error)}`);
        throw new Error('Failed to send verification email.');
      }

      this.logger.log(`OTP email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Mail send failed: ${(err as Error).message}`);
      throw err;
    }
  }
}