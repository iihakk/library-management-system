const nodemailer = require('nodemailer');

let cachedTestAccount = null;

const createTransporter = async () => {
  const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '').trim();

  const hasValidCredentials = smtpUser && smtpPass && 
                             !smtpUser.includes('YOUR_EMAIL') && 
                             !smtpPass.includes('YOUR_16_CHAR');

  if (!hasValidCredentials) {
    console.log('Using Ethereal Email for development...');
    try {
      if (!cachedTestAccount) {
        cachedTestAccount = await nodemailer.createTestAccount();
        console.log('✅ Test email account created:', cachedTestAccount.user);
        console.log('📬 Test emails will be available at: https://ethereal.email');
      }
      
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: cachedTestAccount.user,
          pass: cachedTestAccount.pass,
        },
      });
    } catch (error) {
      console.error('Failed to create test email account:', error);
      throw new Error('Email service unavailable. Please configure SMTP credentials or check your internet connection.');
    }
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

// Sends verification code email
exports.sendVerificationCode = async (email, code, name) => {
  try {
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const hasValidCredentials = smtpUser && !smtpUser.includes('YOUR_EMAIL');
    
    const transporter = await createTransporter();
    
    let fromEmail;
    if (hasValidCredentials) {
      fromEmail = smtpUser;
    } else {
      if (!cachedTestAccount) {
        cachedTestAccount = await nodemailer.createTestAccount();
      }
      fromEmail = cachedTestAccount.user;
    }

    const mailOptions = {
      from: `"Library Management System" <${fromEmail}>`,
      to: email,
      subject: 'Verify Your Email - Library Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin: 20px 0;
            }
            .header {
              background-color: #3498db;
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .code-box {
              background-color: #ffffff;
              border: 2px dashed #3498db;
              border-radius: 5px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              color: #3498db;
              letter-spacing: 5px;
              font-family: 'Courier New', monospace;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #777;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 Library Management System</h1>
            </div>
            
            <h2>Hello ${name}!</h2>
            
            <p>Thank you for signing up for the University Library Management System.</p>
            
            <p>To complete your registration, please verify your email address by entering the verification code below:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This code will expire in 15 minutes. If you didn't request this code, please ignore this email.
            </div>
            
            <p>Enter this code in the verification page to activate your account.</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} University Library Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name}!
        
        Thank you for signing up for the University Library Management System.
        
        Your email verification code is: ${code}
        
        This code will expire in 15 minutes.
        
        Enter this code in the verification page to activate your account.
        
        If you didn't request this code, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    
    // If using Ethereal Email, get the preview URL
    let previewUrl = null;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Email preview URL:', previewUrl);
      }
    } catch (err) {
      // Not using Ethereal or preview not available
    }
    
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your SMTP credentials in .env file.');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      throw new Error('Could not connect to email server. Please check SMTP_HOST and SMTP_PORT in .env file.');
    } else if (error.message && error.message.includes('not configured')) {
      throw error; // Re-throw configuration errors as-is
    } else {
      throw new Error(`Failed to send verification email: ${error.message || 'Unknown error'}`);
    }
  }
};

// Sends welcome email after email verification
exports.sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Library Management System" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Library Management System!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin: 20px 0;
            }
            .header {
              background-color: #2ecc71;
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #3498db;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Email Verified!</h1>
            </div>
            
            <h2>Welcome, ${name}!</h2>
            
            <p>Your email has been successfully verified. Your account is now active!</p>
            
            <p>You can now:</p>
            <ul>
              <li>Browse the library catalog</li>
              <li>Borrow books</li>
              <li>Place holds on books</li>
              <li>View your loan history</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/catalog" class="button">
                Browse Catalog
              </a>
            </p>
            
            <p>If you have any questions, please contact the library staff.</p>
            
            <p>Happy reading!</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    
    // If using Ethereal Email, show the preview URL
    if (info.messageId && info.response && info.response.includes('ethereal')) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Welcome email preview URL:', previewUrl);
        return { success: true, messageId: info.messageId, previewUrl };
      }
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Sends password reset code email
exports.sendPasswordResetCode = async (email, code, name) => {
  try {
    const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const hasValidCredentials = smtpUser && !smtpUser.includes('YOUR_EMAIL');
    
    const transporter = await createTransporter();
    
    let fromEmail;
    if (hasValidCredentials) {
      fromEmail = smtpUser;
    } else {
      if (!cachedTestAccount) {
        cachedTestAccount = await nodemailer.createTestAccount();
      }
      fromEmail = cachedTestAccount.user;
    }

    const mailOptions = {
      from: `"Library Management System" <${fromEmail}>`,
      to: email,
      subject: 'Password Reset Code - Library Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              margin: 20px 0;
            }
            .header {
              background-color: #e74c3c;
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .code-box {
              background-color: #ffffff;
              border: 2px dashed #e74c3c;
              border-radius: 5px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              color: #e74c3c;
              letter-spacing: 5px;
              font-family: 'Courier New', monospace;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #777;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset</h1>
            </div>
            
            <h2>Hello ${name}!</h2>
            
            <p>We received a request to reset your password for your Library Management System account.</p>
            
            <p>Use the verification code below to reset your password:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This code will expire in 15 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>Enter this code on the password reset page to create a new password.</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} University Library Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name}!
        
        We received a request to reset your password for your Library Management System account.
        
        Your password reset code is: ${code}
        
        This code will expire in 15 minutes.
        
        Enter this code on the password reset page to create a new password.
        
        If you didn't request a password reset, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    
    // If using Ethereal Email, get the preview URL
    let previewUrl = null;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('\n📧 ============================================');
        console.log('📧 PASSWORD RESET EMAIL PREVIEW URL:');
        console.log('📧', previewUrl);
        console.log('📧 ============================================');
        console.log('💡 Open this URL in your browser to see the email!\n');
      }
    } catch (err) {
      // Not using Ethereal or preview not available
    }
    
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your SMTP credentials in .env file.');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      throw new Error('Could not connect to email server. Please check SMTP_HOST and SMTP_PORT in .env file.');
    } else if (error.message && error.message.includes('not configured')) {
      throw error; // Re-throw configuration errors as-is
    } else {
      throw new Error(`Failed to send password reset email: ${error.message || 'Unknown error'}`);
    }
  }
};

// Checks if email is from allowed university domain
exports.validateUniversityEmail = (email, allowedDomains = null) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Invalid email format' };
  }

  const domains = allowedDomains || 
    (process.env.ALLOWED_EMAIL_DOMAINS 
      ? process.env.ALLOWED_EMAIL_DOMAINS.split(',').map(d => d.trim().toLowerCase())
      : ['@aucegypt.edu', '@student.aucegypt.edu']);

  const emailLower = email.toLowerCase();
  const emailDomain = emailLower.substring(emailLower.indexOf('@'));

  if (!domains.includes(emailDomain)) {
    return {
      valid: false,
      reason: `Email must be from one of the following domains: ${domains.join(', ')}`
    };
  }

  return { valid: true };
};

