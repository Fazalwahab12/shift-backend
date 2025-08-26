const express = require('express');
const router = express.Router();

// Omantel webhook endpoint
router.post('/omantel', (req, res) => {
  try {
    console.log('Omantel webhook received:', req.body);
    
    // Optional: Handle different notification types
    const { eventType, data } = req.body || {};
    
    if (eventType) {
      switch(eventType) {
        case 'sms_delivered':
          console.log(`✅ SMS delivered to ${data?.phoneNumber}`);
          break;
        case 'sms_failed':
          console.log(`❌ SMS failed for ${data?.phoneNumber}`);
          break;
        default:
          console.log(`📥 Received: ${eventType}`);
      }
    }
    
    // Always respond with 200 OK
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received successfully' 
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Still return 200 to avoid retries
  }
});

module.exports = router;