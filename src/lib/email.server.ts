import nodemailer from "nodemailer";

function getTransporter() {
  const host = (process.env["SMTP_HOST"] || "smtp.gmail.com").trim();
  const port = parseInt(process.env["SMTP_PORT"] || "587", 10);
  const user = (process.env["SMTP_USER"] || "").trim();
  // Strip spaces if user pasted 16-character Google App Password format "xxxx xxxx xxxx xxxx"
  const pass = (process.env["SMTP_PASS"] || "").trim().replace(/\s+/g, "");

  if (!user || !pass) {
    return null;
  }

  const isGmail = host.toLowerCase().includes("gmail") || user.toLowerCase().endsWith("@gmail.com");

  const transportConfig = isGmail
    ? {
        service: "gmail",
        auth: {
          user,
          pass,
        },
      }
    : {
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      };

  return {
    transporter: nodemailer.createTransport(transportConfig),
    sender: user,
  };
}

/**
 * Returns current SMTP configuration status.
 */
export function getSmtpStatus(): {
  configured: boolean;
  senderEmail: string;
  host: string;
  isGmail: boolean;
} {
  const mailer = getTransporter();
  const host = process.env["SMTP_HOST"] || "smtp.gmail.com";
  const user = process.env["SMTP_USER"] || "";

  return {
    configured: Boolean(mailer),
    senderEmail: user ? `${user.slice(0, 4)}***@${user.split("@")[1] || "gmail.com"}` : "",
    host,
    isGmail: host.toLowerCase().includes("gmail") || user.toLowerCase().endsWith("@gmail.com"),
  };
}

/**
 * Sends a password reset OTP code via real SMTP email (Gmail or custom SMTP server).
 * Falls back to logging if SMTP credentials are not configured in .env.
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`[SMTP NOTICE] Real email dispatch for ${toEmail} requires SMTP_USER and SMTP_PASS in .env.`);
    console.log(`[OTP DISPATCH REALTIME LOG] OTP for ${toEmail}: [ ${otp} ]`);
    return { success: true, simulated: true };
  }

  try {
    const mailOptions = {
      from: `"CMADMS Campus Security" <${mailer.sender}>`,
      to: toEmail,
      subject: "CMADMS - Your Password Reset Verification Code",
      text: `Your CMADMS password reset OTP code is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request this password reset, please secure your account immediately.`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
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
            This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            This is an automated security message from CMADMS. Please do not reply directly to this email.
          </p>
        </div>
      `,
    };

    await mailer.transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Real OTP email successfully sent to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[SMTP ERROR] Failed to send email via nodemailer:", err);
    return { success: false, error: err?.message || "Failed to deliver email" };
  }
}

/**
 * Sends a live test OTP email to verify that SMTP/Gmail configuration is functioning properly.
 */
export async function sendTestOtpEmail(toEmail: string): Promise<{ success: boolean; otp?: string; error?: string; simulated?: boolean }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const res = await sendOtpEmail(toEmail, otp);
  return { ...res, otp };
}

/**
 * Sends official account onboarding / credentials email to a newly created user or reset recipient.
 */
export async function sendUserCredentialsEmail(params: {
  toEmail: string;
  name: string;
  role: string;
  loginIdentifier?: string | null | undefined;
  tempPassword: string;
}): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  const { toEmail, name, role, loginIdentifier, tempPassword } = params;
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`[SMTP NOTICE] Real email dispatch for ${toEmail} requires SMTP_USER and SMTP_PASS in .env.`);
    console.log(
      `[CREDENTIALS DISPATCH REALTIME LOG] Credentials for ${name} (${toEmail}) [Role: ${role}, User: ${loginIdentifier || toEmail}, Temp Password: ${tempPassword}]`
    );
    return { success: true, simulated: true };
  }

  try {
    const formattedRole = role.toUpperCase();
    const mailOptions = {
      from: `"CMADMS Institutional Portal" <${mailer.sender}>`,
      to: toEmail,
      subject: `Welcome to CMADMS - Your ${formattedRole} Account Credentials`,
      text: `Hello ${name},\n\nYour ${formattedRole} account has been created on CMADMS (Campus Movement & Absence Detection Management System).\n\nLogin Email / ID: ${loginIdentifier || toEmail}\nTemporary Password: ${tempPassword}\n\nPlease sign in and set your new permanent password on your first login.\n\nThank you,\nCMADMS Administration`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 16px; letter-spacing: 1px; margin-bottom: 10px;">
              CMADMS
            </div>
            <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 700;">Account Credentials</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Campus Movement & Absence Detection Management System</p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Dear <strong>${name}</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Your account has been registered on the <strong>CMADMS Campus Security & Attendance Portal</strong>. You have been assigned the role of <span style="background-color: #eff6ff; color: #1d4ed8; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 12px;">${formattedRole}</span>.
          </p>

          <!-- Credentials Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="margin-bottom: 12px;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Registered Email</span>
              <span style="font-size: 14px; font-weight: 600; color: #0f172a; font-family: monospace;">${toEmail}</span>
            </div>

            ${
              loginIdentifier && loginIdentifier !== toEmail
                ? `
            <div style="margin-bottom: 12px;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Roll Number / Staff Code</span>
              <span style="font-size: 14px; font-weight: 600; color: #0f172a; font-family: monospace;">${loginIdentifier}</span>
            </div>
            `
                : ""
            }

            <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 14px;">
              <span style="display: block; font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Temporary One-Time Password</span>
              <div style="background-color: #ffffff; border: 2px solid #2563eb; border-radius: 8px; padding: 12px 16px; margin-top: 6px; font-size: 20px; font-weight: 800; font-family: monospace; color: #1e3a8a; text-align: center; letter-spacing: 2px;">
                ${tempPassword}
              </div>
            </div>
          </div>

          <!-- Security Callout -->
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 12px; line-height: 1.5; margin: 0;">
              <strong>Security Notice:</strong> For your security, this temporary password will require you to create a new personal permanent password upon your initial sign in.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0; line-height: 1.5;">
            CMADMS Automated System Delivery &bull; Please do not reply directly to this automated email.<br/>
            For account assistance, contact your Campus IT Administrator.
          </p>
        </div>
      `,
    };

    await mailer.transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Real credentials email successfully sent to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[SMTP ERROR] Failed to send credentials email via nodemailer:", err);
    return { success: false, error: err?.message || "Failed to deliver email" };
  }
}

/**
 * Sends credentials emails to a batch of users (for Bulk CSV Import).
 */
export async function sendBulkCredentialsEmails(params: {
  items: Array<{
    email: string;
    name: string;
    role: string;
    loginIdentifier?: string | null | undefined;
    tempPassword: string;
  }>;
}): Promise<{ success: boolean; sentCount: number; failedCount: number; error?: string }> {
  const { items } = params;
  let sentCount = 0;
  let failedCount = 0;

  for (const item of items) {
    if (!item.email || !item.tempPassword) {
      failedCount++;
      continue;
    }
    const res = await sendUserCredentialsEmail({
      toEmail: item.email,
      name: item.name || "Student/Faculty",
      role: item.role || "USER",
      loginIdentifier: item.loginIdentifier,
      tempPassword: item.tempPassword,
    });
    if (res.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return {
    success: true,
    sentCount,
    failedCount,
  };
}
