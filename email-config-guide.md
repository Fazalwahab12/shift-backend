# 📧 Email Configuration Guide for Shift Backend

## 🔐 Professional Email Setup

Your system now uses **professional SMTP email only** - production ready!

## 🎯 Current Setup Status
- ✅ **Email History Tracking** - All emails are logged
- ✅ **Professional SMTP Only** - No external dependencies
- ✅ **Production Ready** - Clean, reliable email system
- ✅ **Complete Email Tracking** - Full audit trail

---

## 📝 Environment Variables to Add

Add these to your `.env` file:

```bash
# ===========================================
# PROFESSIONAL EMAIL SETUP (REQUIRED)
# ===========================================
SMTP_HOST=mail.hireshift.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=team@hireshift.com
SMTP_PASSWORD=your_email_password_from_cpanel
SMTP_REJECT_UNAUTHORIZED=false

# Email branding
EMAIL_SENDER_NAME=Shift

# ===========================================
# WHATSAPP (WHEN READY)
# ===========================================
WHATSAPP_ENABLED=false
# WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
# WHATSAPP_API_KEY=your_twilio_auth_token

# ===========================================
# ADMIN & FRONTEND
# ===========================================
ADMIN_EMAILS=admin@hireshift.com,support@hireshift.com
FRONTEND_URL=https://your-frontend-domain.com
```

---

## 🔧 cPanel Email Settings (From Your Screenshot)

Based on your cPanel configuration:

### ✅ SSL/TLS Settings (Recommended):
```bash
SMTP_HOST=mail.hireshift.com
SMTP_PORT=465
SMTP_SECURE=true
```

### 🔄 Alternative (Non-SSL) Settings:
```bash
SMTP_HOST=mail.hireshift.com
SMTP_PORT=587
SMTP_SECURE=false
```

---

## 🚀 Setup Steps

### Step 1: Add Required Variables
```bash
# Add to your .env file
SMTP_HOST=mail.hireshift.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=team@hireshift.com
SMTP_PASSWORD=your_cpanel_password
EMAIL_SENDER_NAME=Shift
```

### Step 2: Restart Server
```bash
npm restart
# or
pm2 restart your-app
```

### Step 3: Check Logs
- ✅ Look for: `"📧 Professional SMTP configured: mail.hireshift.com (team@hireshift.com)"`
- ❌ Error: `"❌ Missing required SMTP configuration"` means variables not set

### Step 4: Test Production Email
- System now uses only your professional email
- All emails sent from `team@hireshift.com`
- Complete email tracking and history

---

## 🧪 Testing Email Configuration

### Test Endpoint (Development):
```javascript
// You can test with this API call
POST /api/notifications/send
{
  "type": "test_email",
  "receivers": [{"id": "test", "type": "admin", "email": "your-test@email.com"}],
  "channels": ["email"],
  "content": {
    "message": "Test email from Shift",
    "subject": "Email Configuration Test"
  }
}
```

---

## 📊 Email System

- **🎯 Production Email**: Your cPanel email (`team@hireshift.com`)
- **📧 Professional Branding**: All emails from your domain
- **🔍 Full Tracking**: Complete email history and status

---

## 🔍 Monitoring Email Status

All emails are tracked in the `EmailHistory` model:
- ✅ Success/failure status
- 📧 Professional SMTP service tracking
- 🕐 Send attempts and timestamps
- 📋 Full email content for debugging

---

## ⚠️ Important Notes

- **Production Ready**: Uses only professional SMTP email
- **Required Configuration**: SMTP variables must be set or emails won't send
- **Email History**: All emails are logged for auditing
- **Professional Branding**: All emails from `team@hireshift.com`
- **Clean Architecture**: No external email dependencies

---

## 🛠️ Troubleshooting

### Issue: SMTP Connection Failed
```bash
# Check logs for:
❌ SMTP configuration failed: [error details]
❌ Missing required SMTP configuration
```
**Solution**: Verify SMTP credentials and port settings

### Issue: Authentication Failed
```bash
# Common fixes:
1. Double-check password from cPanel
2. Ensure email account is active
3. Try port 587 instead of 465
4. Set SMTP_REJECT_UNAUTHORIZED=false
```

### Issue: Emails Not Sending
```bash
# Check email history in database:
- Status: 'sent', 'failed', 'pending'
- Error messages in 'error' field
- Service used: 'smtp' (professional email)
```

---

## 📞 Next Steps

1. **Add SMTP variables** to your `.env` file
2. **Remove any old Gmail variables** (GMAIL_USER, GMAIL_PASSWORD)
3. **Restart the server**
4. **Check logs** for successful SMTP connection
5. **Send test email** to verify professional email works
6. **Monitor email history** for any issues

Your email system is now 100% professional and production-ready! 🎉
