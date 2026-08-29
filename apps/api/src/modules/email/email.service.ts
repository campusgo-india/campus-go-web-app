import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { decryptSecret, encryptSecret } from '../../common/crypto';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
}

export interface SendEmailInput {
  // A grouped send (To: coordinators, Cc: officers, Bcc: students) passes
  // arrays; a single-recipient send (e.g. forgot-password) passes a string.
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Outbound notification email. Every send is best-effort — a failed email must
 * never fail (or slow down) the domain action that triggered a notification.
 * Per college: if CollegeEmailSettings is enabled and verified, mail sends under
 * that college's own identity via their SMTP; otherwise it falls back to the
 * platform's default sender — Resend if RESEND_API_KEY is set (preferred: an
 * HTTPS API call, not an SMTP connection, so it isn't affected by outbound
 * SMTP ports being blocked/unreliable on serverless), else the legacy
 * DEFAULT_SMTP_* account (GoDaddy) if that's configured instead. A college's
 * own SMTP failing does NOT fall back to the default — that would send under
 * the wrong sender identity.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private defaultTransport: Transporter | null = null;
  private resendClient: Resend | null = null;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  private getResendClient(): Resend | null {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) return null;
    if (!this.resendClient) this.resendClient = new Resend(apiKey);
    return this.resendClient;
  }

  private async sendViaResend(resend: Resend, input: SendEmailInput): Promise<void> {
    const fromEmail = this.config.get<string>('DEFAULT_FROM_EMAIL') ?? 'onboarding@resend.dev';
    const fromName = this.config.get<string>('DEFAULT_FROM_NAME') ?? 'CampusGO';
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: input.to,
      ...(input.cc?.length ? { cc: input.cc } : {}),
      ...(input.bcc?.length ? { bcc: input.bcc } : {}),
      subject: input.subject,
      html: input.html ?? `<p>${(input.text ?? input.subject).replace(/\n/g, '<br/>')}</p>`,
      text: input.text ?? input.html?.replace(/<[^>]+>/g, ' '),
    });
    if (error) throw new Error(error.message);
  }

  private getDefaultConfig(): SmtpConfig | null {
    const host = this.config.get<string>('DEFAULT_SMTP_HOST');
    const user = this.config.get<string>('DEFAULT_SMTP_USER');
    const pass = this.config.get<string>('DEFAULT_SMTP_PASSWORD');
    const fromEmail = this.config.get<string>('DEFAULT_FROM_EMAIL');
    if (!host || !user || !pass || !fromEmail) return null;
    return {
      host,
      port: Number(this.config.get('DEFAULT_SMTP_PORT')) || 587,
      secure: this.config.get('DEFAULT_SMTP_SECURE') === 'true',
      user,
      pass,
      fromEmail,
      fromName: this.config.get<string>('DEFAULT_FROM_NAME') ?? 'CampusGO',
    };
  }

  private getDefaultTransport(): { transport: Transporter; cfg: SmtpConfig } | null {
    const cfg = this.getDefaultConfig();
    if (!cfg) return null;
    if (!this.defaultTransport) this.defaultTransport = this.buildTransport(cfg);
    return { transport: this.defaultTransport, cfg };
  }

  private buildTransport(cfg: SmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }

  private async send(transport: Transporter, cfg: SmtpConfig, input: SendEmailInput) {
    await transport.sendMail({
      from: cfg.fromName ? `"${cfg.fromName}" <${cfg.fromEmail}>` : cfg.fromEmail,
      replyTo: cfg.replyTo ?? undefined,
      to: input.to,
      cc: input.cc?.length ? input.cc : undefined,
      bcc: input.bcc?.length ? input.bcc : undefined,
      subject: input.subject,
      text: input.text ?? input.html?.replace(/<[^>]+>/g, ' '),
      html: input.html,
    });
  }

  /** Best-effort send for a college's notification email. Never throws. */
  async sendForCollege(collegeId: string | null | undefined, input: SendEmailInput): Promise<void> {
    try {
      const settings = collegeId
        ? await this.prisma.collegeEmailSettings.findUnique({ where: { collegeId } })
        : null;

      if (settings?.enabled && settings.verifiedAt && settings.smtpHost && settings.smtpUser) {
        const cfg: SmtpConfig = {
          host: settings.smtpHost,
          port: settings.smtpPort ?? 587,
          secure: settings.smtpSecure,
          user: settings.smtpUser,
          pass: settings.smtpPasswordEnc ? decryptSecret(settings.smtpPasswordEnc) : '',
          fromEmail: settings.fromEmail ?? settings.smtpUser,
          fromName: settings.fromName,
          replyTo: settings.replyTo,
        };
        // College's own SMTP failing does not fall back to the default sender —
        // that would silently send under the wrong identity.
        await this.send(this.buildTransport(cfg), cfg, input);
        return;
      }

      const resend = this.getResendClient();
      if (resend) {
        await this.sendViaResend(resend, input);
        return;
      }

      const fallback = this.getDefaultTransport();
      if (!fallback) {
        this.logger.warn(
          'No default sender configured (RESEND_API_KEY or DEFAULT_SMTP_*) — email not sent (in-app notification still created).',
        );
        return;
      }
      await this.send(fallback.transport, fallback.cfg, input);
    } catch (err) {
      this.logger.error(`Failed to send email to ${input.to}`, err as Error);
    }
  }

  /**
   * Sends a real test email using a caller-supplied (possibly unsaved) config.
   * Unlike sendForCollege, errors are surfaced — the whole point is showing the
   * admin what's wrong so they can fix it before enabling.
   */
  async sendTest(cfg: SmtpConfig, to: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.send(this.buildTransport(cfg), cfg, {
        to,
        subject: 'CampusGO test email',
        text: 'This is a test email from your CampusGO college email settings. If you received this, your SMTP configuration works.',
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
    }
  }

  encryptPassword(plain: string): string {
    return encryptSecret(plain);
  }
}
