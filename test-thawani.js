const fetch = require('node-fetch');

// Test Thawani API integration
async function testThawaniAPI() {
  const apiKey = 'rRQ26GcsZzoEhbrP2HZvLYDbn9C9et';
  const baseUrl = 'https://uatcheckout.thawani.om/api/v1';

  const testData = {
    client_reference_id: `test_${Date.now()}`,
    mode: 'payment',
    products: [
      {
        name: 'Shift App - Pay As You Go',
        quantity: 1,
        unit_amount: 5000 // 5 OMR in baisa
      }
    ],
    success_url: 'https://shift.om/payment/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://shift.om/payment/cancel',
    metadata: {
      company_id: 'test_company_123',
      company_name: 'Test Company',
      plan_type: 'pay_as_you_go',
      plan_name: 'Pay As You Go - 5 OMR',
      amount_omr: 5,
      user_id: 'test_user_123'
    }
  };

  try {
    console.log('🧪 Testing Thawani API...');
    console.log('📤 Request Data:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${baseUrl}/checkout/session`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'thawani-secret-key': apiKey
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      console.log('✅ Test successful!');
      console.log('🔗 Checkout URL:', `${baseUrl.replace('/api/v1', '')}/pay/${result.data.session_id}`);
      console.log('🆔 Session ID:', result.data.session_id);
    } else {
      console.log('❌ Test failed:', result.description || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testThawaniAPI();
