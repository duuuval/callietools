// Thin Resend wrapper — transactional email for Callie
// Sends from noreply@callietools.com


import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY_CALLIE);

// ─── Send manage link after calendar creation ─────────────────

export async function sendManageLink({
  to,
  calendarName,
  calendarUrl,
  manageUrl,
}: {
  to: string;
  calendarName: string;
  calendarUrl: string;
  manageUrl: string;
}): Promise<void> {
  await resend.emails.send({
    from: "Callie <noreply@callietools.com>",
    to,
    subject: `Your calendar is live — "${calendarName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Your calendar is live! 🎉</p>

        <p style="margin-bottom: 24px;">
          <strong>${calendarName}</strong> is ready to share. When your people open the link,
          they can subscribe and every event will show up on their phone automatically.
        </p>

        <p style="margin-bottom: 8px;">
          <strong>Your shareable calendar link:</strong>
        </p>
        <p style="margin-bottom: 24px;">
          <a href="${calendarUrl}" style="color: #4F6BED;">${calendarUrl}</a>
        </p>

        <p style="margin-bottom: 8px;">
          <strong>Your private manage link:</strong>
        </p>
        <p style="margin-bottom: 8px;">
          <a href="${manageUrl}" style="color: #4F6BED;">${manageUrl}</a>
        </p>
        <p style="font-size: 13px; color: #666; margin-bottom: 32px;">
          Bookmark this link — it's your private way to add, edit, or remove events.
          Anyone with this link can manage your calendar, so keep it safe.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;" />

        <p style="font-size: 12px; color: #999;">
          You're receiving this because you created a calendar at callietools.com.
          Questions? Reach us at hello@callietools.com.
        </p>
      </div>
    `,
  });
}

// ─── Send recovery email (one or more manage links) ──────────

export async function sendRecoveryEmail({
  to,
  calendars,
}: {
  to: string;
  calendars: { name: string; manageUrl: string }[];
}): Promise<void> {
  const calendarList = calendars
    .map(
      (c) =>
        `<li style="margin-bottom: 12px;">
          <strong>${c.name}</strong><br />
          <a href="${c.manageUrl}" style="color: #4F6BED;">${c.manageUrl}</a>
        </li>`
    )
    .join("");

  await resend.emails.send({
    from: "Callie <noreply@callietools.com>",
    to,
    subject: "Your Callie manage link(s)",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Here are your manage links</p>

        <p style="margin-bottom: 24px;">
          We found the following calendar(s) linked to this email address:
        </p>

        <ul style="padding-left: 20px; margin-bottom: 32px;">
          ${calendarList}
        </ul>

        <p style="font-size: 13px; color: #666; margin-bottom: 32px;">
          Bookmark your manage link — anyone with it can edit your calendar, so keep it safe.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;" />

        <p style="font-size: 12px; color: #999;">
          You're receiving this because someone requested manage links for this email at callietools.com.
          If that wasn't you, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ─── Send /my-calendars magic link email ─────────────────────

export async function sendMyCalendarsEmail(
  email: string,
  dashboardToken: string,
  calendars: Array<{ name: string; manage_token: string; slug: string }>
): Promise<void> {
  const dashboardUrl = `https://callietools.com/my-calendars/${dashboardToken}`;

  const calendarLinks = calendars
    .map(
      (c) =>
        `<li style="margin-bottom: 8px;">
          <a href="https://callietools.com/${c.slug}" style="color: #4F6BED; font-weight: 600;">${c.name}</a>
          &mdash; <a href="https://callietools.com/manage/${c.manage_token}" style="color: #4F6BED;">Manage</a>
        </li>`
    )
    .join("");

  await resend.emails.send({
    from: "Callie <noreply@callietools.com>",
    to: email,
    subject: "Your Callie calendars",
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <p>Hey &mdash;</p>
        <p>Here's a link to view and manage all your calendars:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${dashboardUrl}"
             style="display: inline-block; padding: 14px 28px; background: #4F6BED; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
            View My Calendars
          </a>
        </p>
        <p style="font-size: 13px; color: #666;">
          This link expires in 30 minutes. You can always request a new one
          at <a href="https://callietools.com/my-calendars" style="color: #4F6BED;">callietools.com/my-calendars</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p><strong>Your calendars:</strong></p>
        <ul style="padding-left: 0; list-style: none; margin-bottom: 16px;">${calendarLinks}</ul>
        <p style="font-size: 13px; color: #666; margin-bottom: 24px;">
          Each manage link is permanent &mdash; bookmark any of them for quick access.
        </p>
        <p style="font-size: 13px; color: #666; text-align: center; margin-bottom: 32px;">
          Want your logo and colors on your calendar page?<br />
          <a href="https://callietools.com/upgrade" style="color: #D4775B; font-weight: 600; text-decoration: none;">Make it yours &mdash; $10/month</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999;">
          You're receiving this because someone requested calendar access for this email
          at callietools.com. If that wasn't you, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
