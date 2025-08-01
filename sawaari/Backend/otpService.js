// OTP Service for forgot password functionality
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { dbService } = require("./database");
require("dotenv").config();

// Initialize Exotel client for Indian SMS
let exotelConfig = null;
try {
  if (
    process.env.EXOTEL_ACCOUNT_SID &&
    process.env.EXOTEL_API_KEY &&
    process.env.EXOTEL_API_TOKEN
  ) {
    exotelConfig = {
      accountSid: process.env.EXOTEL_ACCOUNT_SID,
      apiKey: process.env.EXOTEL_API_KEY,
      apiToken: process.env.EXOTEL_API_TOKEN,
      subdomain: process.env.EXOTEL_SUBDOMAIN || "api.exotel.com",
      callerId: process.env.EXOTEL_CALLER_ID,
    };
    console.log(
      "📱 Exotel SMS service initialized successfully for Indian numbers"
    );
  } else {
    console.log("⚠️ Exotel credentials not configured, using console logging");
  }
} catch (error) {
  console.error("❌ Failed to initialize Exotel SMS service:", error.message);
}

class OTPService {
  constructor() {
    this.otpStorage = new Map(); // In production, use Redis or database
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes
    this.maxAttempts = 3;
    this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes cooldown after max attempts

    // Initialize email transporter
    this.emailTransporter = null;
    this.initializeEmailService();
  }

  // Initialize email service
  initializeEmailService() {
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.emailTransporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        console.log("📧 Email service initialized successfully");
      } else {
        console.log(
          "⚠️ Email credentials not configured, using console logging"
        );
      }
    } catch (error) {
      console.error("❌ Failed to initialize email service:", error.message);
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate secure token for OTP verification
  generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  // Send SMS OTP via Exotel (for Indian numbers)
  async sendSMSOTP(phone, otp, type = "signup") {
    try {
      if (!exotelConfig) {
        throw new Error("Exotel SMS service not configured");
      }

      // Ensure phone number is in correct format (10 digits for Indian numbers)
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10 || !cleanPhone.match(/^[6-9]/)) {
        throw new Error("Invalid Indian phone number format");
      }

      const messageBody =
        type === "signup"
          ? `Your SAWAARI signup verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`
          : `Your SAWAARI password reset code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;

      // Exotel SMS API call
      const https = require("https");
      const querystring = require("querystring");

      const postData = querystring.stringify({
        From: exotelConfig.callerId,
        To: cleanPhone,
        Body: messageBody,
      });

      const auth = Buffer.from(
        `${exotelConfig.apiKey}:${exotelConfig.apiToken}`
      ).toString("base64");

      const options = {
        hostname: exotelConfig.subdomain,
        port: 443,
        path: `/v1/Accounts/${exotelConfig.accountSid}/Sms/send.json`,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const response = JSON.parse(data);
              if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(
                  `✅ SMS OTP sent to ${phone} via Exotel (SID: ${
                    response.SMSMessage?.Sid || "N/A"
                  })`
                );
                resolve({
                  success: true,
                  messageSid: response.SMSMessage?.Sid,
                });
              } else {
                console.error(`❌ Exotel SMS failed for ${phone}:`, response);
                console.log(
                  `📱 SMS OTP for ${phone}: ${otp} (expires in 10 minutes) - Exotel failed, using console`
                );
                resolve({
                  success: false,
                  error: response.message || "SMS sending failed",
                });
              }
            } catch (parseError) {
              console.error(
                `❌ Failed to parse Exotel response for ${phone}:`,
                parseError.message
              );
              console.log(
                `📱 SMS OTP for ${phone}: ${otp} (expires in 10 minutes) - Parse error, using console`
              );
              resolve({
                success: false,
                error: "Failed to parse SMS response",
              });
            }
          });
        });

        req.on("error", (error) => {
          console.error(
            `❌ Failed to send SMS to ${phone} via Exotel:`,
            error.message
          );
          console.log(
            `📱 SMS OTP for ${phone}: ${otp} (expires in 10 minutes) - Network error, using console`
          );
          resolve({ success: false, error: error.message });
        });

        req.write(postData);
        req.end();
      });
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${phone}:`, error.message);
      // Fallback to console logging
      console.log(
        `📱 SMS OTP for ${phone}: ${otp} (expires in 10 minutes) - SMS failed, using console`
      );
      return { success: false, error: error.message };
    }
  }

  // Send email OTP
  async sendEmailOTP(email, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: "SAWAARI - Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">SAWAARI</h1>
              <p style="color: white; margin: 5px 0;">Your Ride, Your Way</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password. Use the OTP below to proceed:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
                <p style="color: #999; margin: 10px 0 0 0;">This OTP is valid for 10 minutes</p>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. 
                Your account remains secure.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated message from SAWAARI. Please do not reply to this email.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Password reset OTP sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${email}:`, error.message);
      // Fallback to console logging
      console.log(`📧 Email OTP for ${email}: ${otp} (expires in 10 minutes)`);
    }
  }

  // Send OTP for signup verification (doesn't require existing user)
  async sendSignupOTP(phone) {
    try {
      const identifier = phone;
      const key = `signup_otp_${identifier}`;

      // Check if user is in cooldown
      const existingData = this.otpStorage.get(key);
      if (existingData && existingData.attempts >= this.maxAttempts) {
        const timeSinceCooldown = Date.now() - existingData.lastAttempt;
        if (timeSinceCooldown < this.cooldownPeriod) {
          const remainingTime = Math.ceil(
            (this.cooldownPeriod - timeSinceCooldown) / 60000
          );
          throw new Error(
            `Too many attempts. Please try again in ${remainingTime} minutes.`
          );
        }
      }

      const otp = this.generateOTP();
      const token = this.generateToken();
      const expiresAt = Date.now() + this.otpExpiry;

      // Store OTP data
      this.otpStorage.set(key, {
        otp,
        token,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: Date.now(),
        type: "signup",
      });

      // Send actual SMS via Twilio
      const smsResult = await this.sendSMSOTP(phone, otp, "signup");
      if (!smsResult.success) {
        console.log(
          `📱 Signup OTP for ${phone}: ${otp} (expires in 10 minutes) - Fallback to console`
        );
      }

      return {
        success: true,
        token,
        message: `OTP sent to your phone number ending in ${phone.slice(-4)}`,
        expiresIn: this.otpExpiry / 1000, // seconds
      };
    } catch (error) {
      console.error("Error sending signup OTP:", error);
      throw error;
    }
  }

  // Send OTP (mock implementation - in production, integrate with SMS service)
  async sendOTP(phone, email) {
    try {
      const identifier = phone || email;
      const key = `otp_${identifier}`;

      // Check if user is in cooldown
      const existingData = this.otpStorage.get(key);
      if (existingData && existingData.attempts >= this.maxAttempts) {
        const timeSinceCooldown = Date.now() - existingData.lastAttempt;
        if (timeSinceCooldown < this.cooldownPeriod) {
          const remainingTime = Math.ceil(
            (this.cooldownPeriod - timeSinceCooldown) / 60000
          );
          throw new Error(
            `Too many attempts. Please try again in ${remainingTime} minutes.`
          );
        }
      }

      const otp = this.generateOTP();
      const token = this.generateToken();
      const expiresAt = Date.now() + this.otpExpiry;

      // Store OTP data
      this.otpStorage.set(key, {
        otp,
        token,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: Date.now(),
      });

      // Send actual email or fallback to console
      if (email && this.emailTransporter) {
        await this.sendEmailOTP(email, otp);
      } else if (phone) {
        // For phone, we'll log to console (SMS service integration needed)
        console.log(`📱 SMS OTP for ${phone}: ${otp} (expires in 10 minutes)`);
      } else {
        // Fallback to console logging
        console.log(`📱 OTP for ${identifier}: ${otp} (expires in 10 minutes)`);
      }

      return {
        success: true,
        token,
        message: phone
          ? `OTP sent to your phone number ending in ${phone.slice(-4)}`
          : `OTP sent to your email address`,
        expiresIn: this.otpExpiry / 1000, // seconds
      };
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw error;
    }
  }

  // Verify signup OTP
  async verifySignupOTP(identifier, otp, token) {
    try {
      const key = `signup_otp_${identifier}`;
      const otpData = this.otpStorage.get(key);

      if (!otpData) {
        throw new Error("OTP not found or expired. Please request a new one.");
      }

      if (otpData.token !== token) {
        throw new Error("Invalid verification token.");
      }

      if (Date.now() > otpData.expiresAt) {
        this.otpStorage.delete(key);
        throw new Error("OTP has expired. Please request a new one.");
      }

      if (otpData.verified) {
        throw new Error("OTP has already been used.");
      }

      // Increment attempts
      otpData.attempts += 1;
      otpData.lastAttempt = Date.now();

      if (otpData.otp !== otp) {
        if (otpData.attempts >= this.maxAttempts) {
          this.otpStorage.delete(key);
          throw new Error(
            "Maximum verification attempts exceeded. Please request a new OTP."
          );
        }

        const remainingAttempts = this.maxAttempts - otpData.attempts;
        throw new Error(
          `Invalid OTP. ${remainingAttempts} attempts remaining.`
        );
      }

      // Mark as verified
      otpData.verified = true;

      return {
        success: true,
        token: otpData.token,
        message: "Phone number verified successfully",
      };
    } catch (error) {
      console.error("Error verifying signup OTP:", error);
      throw error;
    }
  }

  // Verify OTP
  async verifyOTP(identifier, otp, token) {
    try {
      const key = `otp_${identifier}`;
      const otpData = this.otpStorage.get(key);

      if (!otpData) {
        throw new Error("OTP not found or expired. Please request a new one.");
      }

      if (otpData.token !== token) {
        throw new Error("Invalid verification token.");
      }

      if (Date.now() > otpData.expiresAt) {
        this.otpStorage.delete(key);
        throw new Error("OTP has expired. Please request a new one.");
      }

      if (otpData.verified) {
        throw new Error("OTP has already been used.");
      }

      // Increment attempts
      otpData.attempts += 1;
      otpData.lastAttempt = Date.now();

      if (otpData.otp !== otp) {
        if (otpData.attempts >= this.maxAttempts) {
          this.otpStorage.delete(key);
          throw new Error(
            "Maximum verification attempts exceeded. Please request a new OTP."
          );
        }

        const remainingAttempts = this.maxAttempts - otpData.attempts;
        throw new Error(
          `Invalid OTP. ${remainingAttempts} attempts remaining.`
        );
      }

      // Mark as verified
      otpData.verified = true;

      return {
        success: true,
        token: otpData.token,
        message: "OTP verified successfully",
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      throw error;
    }
  }

  // Clean up expired OTPs (call periodically)
  cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [key, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt || data.verified) {
        this.otpStorage.delete(key);
      }
    }
  }

  // Get OTP status for debugging
  getOTPStatus(identifier) {
    const key = `otp_${identifier}`;
    const otpData = this.otpStorage.get(key);

    if (!otpData) {
      return { exists: false };
    }

    return {
      exists: true,
      attempts: otpData.attempts,
      verified: otpData.verified,
      expiresAt: new Date(otpData.expiresAt),
      timeRemaining: Math.max(0, otpData.expiresAt - Date.now()),
    };
  }
}

// Create singleton instance
const otpService = new OTPService();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

module.exports = otpService;
