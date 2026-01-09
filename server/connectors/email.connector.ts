import { Resend } from 'resend';
import { env, features } from '../config/env';

class EmailConnector {
  private resend: Resend | null = null;

  constructor() {
    if (features.email && env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    }
  }

  async sendInvitation(
    to: string,
    organizationName: string,
    inviteUrl: string
  ): Promise<boolean> {
    if (!this.resend) {
      console.log(`[DEV] Invitation email to ${to}:`);
      console.log(`  Organization: ${organizationName}`);
      console.log(`  URL: ${inviteUrl}`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: 'Foundry <noreply@foundry.app>',
        to,
        subject: `You've been invited to join ${organizationName} on Foundry`,
        html: `
          <h1>You're invited!</h1>
          <p>You've been invited to join <strong>${organizationName}</strong> on Foundry.</p>
          <p>Click the button below to accept your invitation:</p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0F172A; color: white; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
          <p style="margin-top: 24px; color: #666;">
            This invitation will expire in 7 days.
          </p>
        `,
      });
      return true;
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      return false;
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<boolean> {
    if (!this.resend) {
      console.log(`[DEV] Password reset email to ${to}:`);
      console.log(`  URL: ${resetUrl}`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: 'Foundry <noreply@foundry.app>',
        to,
        subject: 'Reset your Foundry password',
        html: `
          <h1>Reset your password</h1>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0F172A; color: white; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
          <p style="margin-top: 24px; color: #666;">
            This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
        `,
      });
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
}

export const emailConnector = new EmailConnector();
