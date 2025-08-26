const axios = require('axios');
const logger = require('../utils/logger');

class OmantelOTPService {
  constructor() {
    this.clientId = process.env.OMANTEL_CLIENT_ID;
    this.clientSecret = process.env.OMANTEL_CLIENT_SECRET;
    this.baseURL = 'https://apigw.omantel.om/v1/otp';
    this.authURL = 'https://apigw.omantel.om/oauth2/accesstoken';
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.tokenCache && this.tokenExpiry > Date.now()) {
      return this.tokenCache;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(this.authURL, 
        'grant_type=client_credentials&scope=one-time-password-sms:send-validate',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.tokenCache = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 30000;
      
      logger.info('Omantel access token obtained');
      return this.tokenCache;
    } catch (error) {
      logger.error('Failed to get Omantel access token', { error: error.message });
      throw new Error('Failed to authenticate with Omantel');
    }
  }

  async sendOTP(phoneNumber, countryCode = '+968') {
    try {
      const token = await this.getAccessToken();
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      
      const response = await axios.post(`${this.baseURL}/send-code`, {
        phoneNumber: fullPhoneNumber,
        message: "Your Shift verification code is {{code}}. Valid for 5 minutes."
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info('OTP sent via Omantel', { phoneNumber: fullPhoneNumber });
      
      return {
        success: true,
        authenticationId: response.data.authenticationId,
        phoneNumber: fullPhoneNumber
      };

    } catch (error) {
      logger.error('Omantel OTP send failed', { 
        error: error.response?.data || error.message,
        phoneNumber: `${countryCode}${phoneNumber}`
      });
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send OTP'
      };
    }
  }

  async verifyOTP(authenticationId, code) {
    try {
      const token = await this.getAccessToken();
      
      await axios.post(`${this.baseURL}/validate-code`, {
        authenticationId: authenticationId,
        code: code
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      logger.info('OTP verified via Omantel', { authenticationId });
      
      return {
        valid: true,
        success: true
      };

    } catch (error) {
      logger.error('Omantel OTP verification failed', { 
        error: error.response?.data || error.message,
        authenticationId
      });
      
      return {
        valid: false,
        success: false,
        error: this.parseOTPError(error.response?.data)
      };
    }
  }

  parseOTPError(errorData) {
    if (!errorData) return 'OTP verification failed';
    
    const errorMap = {
      'VERIFICATION_EXPIRED': 'OTP code has expired',
      'VERIFICATION_FAILED': 'Invalid OTP code',
      'INVALID_OTP': 'OTP format is incorrect',
      'MAX_OTP_CODES_EXCEEDED': 'Too many OTP attempts'
    };
    
    return errorMap[errorData.code] || errorData.message || 'OTP verification failed';
  }
}

module.exports = new OmantelOTPService();