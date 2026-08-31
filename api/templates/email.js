// templates/emailtemplates.js

export const EmailVerification = (verificationToken) => `
<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /><title>Verify your Email</title></head>
  <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background: white; padding: 30px; border-radius: 8px;">
      <h2 style="color: #333;">Verify your Email Address</h2>
      <p>Use this code to verify your account:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5; margin: 20px 0;">
        ${verificationToken}
      </div>
      <p>Or click the link below:</p>
      <a href="http://localhost:3000/verify?token=${verificationToken}" style="color: #4F46E5;">
        Click here to verify
      </a>
      <p style="color: #999; margin-top: 20px;">This code expires in 1 hour.</p>
    </div>
  </body>
</html>
`;

export const WelcomeEmail = (name, email, dashboardUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome Email</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background-color:#0b0f1a;font-family:'DM Sans',sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0f1a;padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;background-color:#111827;border:1px solid #1f2d45;">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f2942 0%,#0a3d62 50%,#1a5276 100%);padding:56px 48px 48px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:10px 22px;margin-bottom:32px;">
                <span style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:13px;letter-spacing:3px;color:#93c5e8;text-transform:uppercase;">YourBrand</span>
              </div>
              <div style="font-size:42px;margin-bottom:16px;">✦</div>
              <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:40px;font-weight:700;color:#ffffff;margin:0 0 12px;line-height:1.2;letter-spacing:-0.5px;">
                Welcome aboard,<br/><span style="color:#7dd3f7;">${name}</span>
              </h1>
              <p style="font-family:'DM Sans',sans-serif;font-size:16px;color:#93c5e8;margin:0;font-weight:300;letter-spacing:0.3px;">
                Your account is ready. Let's get started.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,#1f3a5f,transparent);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 36px;">
              <p style="font-size:15px;color:#94a3b8;line-height:1.8;margin:0 0 28px;font-weight:300;">
                We're genuinely thrilled to have you with us. Your account has been created and you're all set to explore everything we've built for you.
              </p>

              <!-- Feature tiles -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td style="padding:0 8px 0 0;" width="33%">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#0f1e30;border:1px solid #1e3a5a;border-radius:12px;padding:20px 16px;text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">🚀</div>
                          <p style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#7dd3f7;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Quick Start</p>
                          <p style="font-size:11px;color:#64748b;margin:0;line-height:1.5;">Get up and running in minutes</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:0 4px;" width="33%">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#0f1e30;border:1px solid #1e3a5a;border-radius:12px;padding:20px 16px;text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">📊</div>
                          <p style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#7dd3f7;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Dashboard</p>
                          <p style="font-size:11px;color:#64748b;margin:0;line-height:1.5;">Your command center awaits</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:0 0 0 8px;" width="33%">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#0f1e30;border:1px solid #1e3a5a;border-radius:12px;padding:20px 16px;text-align:center;">
                          <div style="font-size:24px;margin-bottom:10px;">💬</div>
                          <p style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#7dd3f7;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Support</p>
                          <p style="font-size:11px;color:#64748b;margin:0;line-height:1.5;">We're here whenever you need</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#1a6fa8,#0e4d7a);color:#ffffff;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;text-decoration:none;padding:16px 48px;border-radius:50px;letter-spacing:0.5px;border:1px solid #2980b9;">
                      Go to Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Account info strip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#0c1928;border:1px solid #1a3049;border-radius:10px;padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:11px;color:#4a6785;margin:0 0 2px;text-transform:uppercase;letter-spacing:1px;">Registered Email</p>
                          <p style="font-size:14px;color:#7dd3f7;margin:0;font-weight:400;">${email}</p>
                        </td>
                        <td align="right">
                          <span style="display:inline-block;background:#0a3d5e;border:1px solid #1a6fa8;border-radius:20px;padding:4px 12px;font-size:11px;color:#7dd3f7;letter-spacing:1px;text-transform:uppercase;">Active</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="height:1px;background:linear-gradient(90deg,transparent,#1f3a5f,transparent);"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 48px 36px;text-align:center;">
              <p style="font-size:12px;color:#334155;margin:0 0 12px;line-height:1.7;">
                You're receiving this because you signed up at <span style="color:#4a7fa5;">yourbrand.com</span>.<br/>
                If this wasn't you, you can safely ignore this email.
              </p>
              <p style="font-size:11px;color:#263345;margin:0;letter-spacing:0.5px;">
                © 2025 YourBrand · All rights reserved
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

export const ResetPassword = (name, email, resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2f66d0 0%,#1c3b8a 100%);padding:38px 48px;text-align:center;color:#ffffff;">
              <h1 style="margin:0;font-size:28px;letter-spacing:-0.5px;">Reset your password</h1>
              <p style="margin:16px 0 0;font-size:16px;color:rgba(255,255,255,0.85);">A password reset request was received for your account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px 32px;color:#334155;">
              <p style="font-size:16px;line-height:1.8;margin:0 0 24px;">Hi ${name || 'there'},</p>
              <p style="font-size:15px;line-height:1.8;margin:0 0 24px;">We received a request to reset the password for <strong>${email}</strong>. Click the button below to choose a new password. This link is valid for 1 hour.</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;padding:16px 32px;font-size:16px;color:#ffffff;background:#2f66d0;border-radius:999px;text-decoration:none;">Reset password</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;line-height:1.8;margin:0 0 20px;color:#64748b;">If the button above does not work, copy and paste this link into your browser:</p>
              <p style="font-size:13px;line-height:1.6;word-break:break-all;color:#475569;margin:0 0 28px;"><a href="${resetUrl}" style="color:#2f66d0;text-decoration:none;">${resetUrl}</a></p>
              <p style="font-size:14px;line-height:1.8;margin:0;color:#64748b;">If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:28px 48px 32px;color:#64748b;font-size:13px;line-height:1.7;">
              <p style="margin:0;">Need help? Reply to this email and we'll be happy to assist.</p>
              <p style="margin:12px 0 0;">Thanks,<br/>The YourBrand Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const ResetPasswordSuccess = (name, email, loginUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Successfully Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#10b981 0%,#047857 100%);padding:38px 48px;text-align:center;color:#ffffff;">
              <h1 style="margin:0;font-size:28px;letter-spacing:-0.5px;">Password Reset Successful</h1>
              <p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.95);">Your password has been updated.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px 32px;color:#334155;">
              <p style="font-size:16px;line-height:1.8;margin:0 0 24px;">Hi ${name || 'there'},</p>
              <p style="font-size:15px;line-height:1.8;margin:0 0 20px;">This is a confirmation that the password for the account <strong>${email}</strong> has been changed successfully.</p>
              <p style="font-size:15px;line-height:1.8;margin:0 0 24px;color:#475569;">If you initiated this change, you can sign in using your new password by clicking the button below.</p>

              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 30px;font-size:16px;color:#ffffff;background:#10b981;border-radius:999px;text-decoration:none;">Sign in to your account</a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;line-height:1.8;margin:0 0 20px;color:#64748b;">If you did not change your password, please contact our support team immediately or reset your password again to secure your account.</p>
              <p style="font-size:13px;line-height:1.6;word-break:break-all;color:#475569;margin:0 0 28px;">If the button doesn't work, copy and paste this link into your browser: <a href="${loginUrl}" style="color:#10b981;text-decoration:none;">${loginUrl}</a></p>

              <p style="font-size:14px;line-height:1.8;margin:0;color:#64748b;">Thanks,<br/>The YourBrand Team</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 48px 28px;color:#64748b;font-size:13px;line-height:1.7;">
              <p style="margin:0;">If you have any concerns, reply to this email and we'll help secure your account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;