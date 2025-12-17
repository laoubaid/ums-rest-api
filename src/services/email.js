import nodemailer from 'nodemailer'

// Create transporter (email sender)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Send password reset email
async function sendPasswordResetEmail(email, token, username) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #007bff;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 12px;
                    color: #666;
                }
                </style>
            </head>
            <body>
                <div class="container">
                <h2>Password Reset Request</h2>
                
                <p>Hi ${username},</p>
                
                <p>You requested to reset your password. Click the button below to reset it:</p>
                
                <a href="${resetUrl}" class="button">Reset Password</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                
                <p><strong>This link will expire in 1 hour.</strong></p>
                
                <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
                
                <div class="footer">
                    <p>This is an automated message, please do not reply.</p>
                    <p>&copy; ${new Date().getFullYear()} User Management System</p>
                </div>
                </div>
            </body>
            </html>
        `,
        // Plain text version (fallback)
        text: `
            Hi ${username},
            
            You requested to reset your password. 
            
            Click this link to reset it: ${resetUrl}
            
            This link will expire in 1 hour.
            
            If you didn't request this, please ignore this email.
        `
    }
    
    const info = await transporter.sendMail(mailOptions)
    
    console.log('Password reset email sent:', info.messageId)
    
    // For Ethereal, log the preview URL
    if (process.env.EMAIL_HOST === 'smtp.ethereal.email') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info))
    }
    
    return info
}

// Test email connection
async function testEmailConnection() {
    try {
        await transporter.verify()
        console.log('✓ Email service is ready')
        return true
    } catch (error) {
        console.error('✗ Email service error:', error.message)
        return false
    }
}

export {
    sendPasswordResetEmail,
    testEmailConnection
}