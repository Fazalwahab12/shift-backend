const fetch = require('node-fetch');

// Test with exact format provided by user
async function testThawaniExact() {
  const apiKey = 'rRQ26GcsZzoEhbrP2HZvLYDbn9C9et';
  const baseUrl = 'https://uatcheckout.thawani.om/api/v1';

  // Using the exact format from user's message
  const testData = {
    "client_reference_id": "123412",
    "mode": "payment",
    "products": [
      {
        "name": "product 1",
        "quantity": 1,
        "unit_amount": 100
      }
    ],
    "success_url": "https://thw.om/success",
    "cancel_url": "https://thw.om/cancel",
    "metadata": {
      "Customer name": "somename",
      "order id": 0
    }
  };

  // Try different authentication methods
  const authMethods = [
    { 'thawani-secret-key': apiKey },
    { 'thawani-api-key': apiKey },
    { 'Authorization': `Bearer ${apiKey}` },
    { 'X-API-Key': apiKey },
    { 'X-Thawani-Secret-Key': apiKey },
    { 'api-key': apiKey },
    { 'secret-key': apiKey }
  ];

  for (let i = 0; i < authMethods.length; i++) {
    const authHeader = authMethods[i];
    const headerKey = Object.keys(authHeader)[0];
    
    console.log(`\n🧪 Testing Auth Method ${i + 1}: ${headerKey}`);
    console.log('🔑 Value:', authHeader[headerKey]);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...authHeader
    };

    try {
      console.log('📤 Making request to:', `${baseUrl}/checkout/session`);
      
      const response = await fetch(`${baseUrl}/checkout/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      });

      console.log('📥 Status:', response.status, response.statusText);
      console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SUCCESS! Response:', JSON.stringify(result, null, 2));
        console.log('🎯 Working auth method found:', headerKey);
        return { success: true, method: headerKey, result };
      } else {
        const errorText = await response.text();
        console.log('❌ Failed:', errorText.substring(0, 300));
        
        // If it's a Cloudflare error, log the Ray ID
        if (errorText.includes('Cloudflare Ray ID')) {
          const rayIdMatch = errorText.match(/Cloudflare Ray ID: <strong[^>]*>([^<]+)<\/strong>/);
          if (rayIdMatch) {
            console.log('🔍 Cloudflare Ray ID:', rayIdMatch[1]);
          }
        }
      }

    } catch (error) {
      console.log('❌ Network Error:', error.message);
    }
  }

  console.log('\n❌ All authentication methods failed.');
  console.log('\n🔍 Possible issues:');
  console.log('   - API key is invalid or expired');
  console.log('   - IP address is blocked by Thawani');
  console.log('   - UAT endpoint is incorrect');
  console.log('   - Account is suspended');
  console.log('   - Need to whitelist IP address');
  
  return { success: false, method: null };
}

// Run the test
testThawaniExact().then(result => {
  if (result.success) {
    console.log('\n🎉 SUCCESS! Use this auth method:', result.method);
  } else {
    console.log('\n💡 Next steps:');
    console.log('   1. Verify API key with Thawani support');
    console.log('   2. Check if IP needs to be whitelisted');
    console.log('   3. Verify UAT endpoint is correct');
    console.log('   4. Contact Thawani for account status');
  }
});
