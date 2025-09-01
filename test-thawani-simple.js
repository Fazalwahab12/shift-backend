const fetch = require('node-fetch');

// Simple test to verify Thawani API key
async function testThawaniAPI() {
  const apiKey = 'rRQ26GcsZzoEhbrP2HZvLYDbn9C9et';
  const baseUrl = 'https://uatcheckout.thawani.om/api/v1';

  const testData = {
    client_reference_id: `test_${Date.now()}`,
    mode: 'test',
    products: [
      {
        name: 'Test Product',
        quantity: 1,
        unit_amount: 1000 // 1 OMR in baisa
      }
    ],
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel',
    metadata: {
      test: true
    }
  };

  try {
    console.log('🧪 Testing Thawani API...');
    console.log('🔑 API Key:', apiKey);
    console.log('🌐 Base URL:', baseUrl);
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

    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response Body:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
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
    
    // Additional debugging
    if (error.message.includes('403')) {
      console.log('🔍 403 Forbidden usually means:');
      console.log('   - Invalid API key');
      console.log('   - Wrong authentication header name');
      console.log('   - Account suspended or restricted');
      console.log('   - IP address not whitelisted');
    }
  }
}

// Run the test
testThawaniAPI();
