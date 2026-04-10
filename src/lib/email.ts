// src/lib/email.ts
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
          Questions? Reply to this email or reach us at hello@callietools.com.
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
