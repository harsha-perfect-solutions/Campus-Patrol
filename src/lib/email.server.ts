import nodemailer from "nodemailer";

/**
 * Sends a password reset OTP code via real SMTP email (Gmail or custom SMTP server).
 * Falls back to logging if SMTP credentials are not configured in .env.
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const host = process.env["SMTP_HOST"] || "smtp.gmail.com";
  const port = parseInt(process.env["SMTP_PORT"] || "587", 10);
  const user = process.env["SMTP_USER"] || "";
  const pass = process.env["SMTP_PASS"] || "";

  if (!user || !pass) {
    console.log(`[SMTP NOTICE] Real email dispatch for ${toEmail} requires SMTP_USER and SMTP_PASS in .env.`);
    console.log(`[OTP DISPATCH REALTIME LOG] OTP for ${toEmail}: [ ${otp} ]`);
    return { success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: `"CMADMS Campus Security" <${user}>`,
      to: toEmail,
      subject: "CMADMS - Your Password Reset Verification Code",
      text: `Your CMADMS password reset OTP code is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request this password reset, please secure your account immediately.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 22px;">CMADMS Campus Guard</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Campus Movement & Absence Detection Management System</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <h3 style="color: #1e293b; font-size: 18px; margin-top: 0;">Password Reset Request</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            We received a request to reset the password for your college account (<strong>${toEmail}</strong>).
          </p>
          <p style="color: #475569; font-size: 14px;">Your 6-digit verification code is:</p>
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 18px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            ⏱️ This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            This is an automated security message from CMADMS. Please do not reply directly to this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Real OTP email successfully sent to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[SMTP ERROR] Failed to send email via nodemailer:", err);
    return { success: false, error: err?.message || "Failed to deliver email" };
  }
}
