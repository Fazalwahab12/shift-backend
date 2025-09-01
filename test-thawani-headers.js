const fetch = require('node-fetch');

// Test different header variations for Thawani
async function testThawaniHeaders() {
  const apiKey = 'rRQ26GcsZzoEhbrP2HZvLYDbn9C9et';
  const baseUrl = 'https://uatcheckout.thawani.om/api/v1';

  const testData = {
    client_reference_id: `test_${Date.now()}`,
    mode: 'test',
    products: [
      {
        name: 'Test Product',
        quantity: 1,
        unit_amount: 1000
      }
    ],
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/cancel'
  };

  const headerVariations = [
    { 'thawani-secret-key': apiKey },
    { 'thawani-api-key': apiKey },
    { 'Authorization': `Bearer ${apiKey}` },
    { 'X-API-Key': apiKey },
    { 'X-Thawani-Secret-Key': apiKey }
  ];

  for (let i = 0; i < headerVariations.length; i++) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headerVariations[i]
    };

    console.log(`\n🧪 Testing Header Variation ${i + 1}:`, Object.keys(headers).find(key => key.includes('key') || key.includes('auth')));
    console.log('🔑 Headers:', JSON.stringify(headers, null, 2));

    try {
      const response = await fetch(`${baseUrl}/checkout/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      });

      console.log('📥 Status:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SUCCESS! Response:', JSON.stringify(result, null, 2));
        console.log('🎯 Working header found!');
        return headers;
      } else {
        const errorText = await response.text();
        console.log('❌ Failed:', errorText.substring(0, 200));
      }

    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n❌ No working header found. All variations failed.');
  return null;
}

// Run the test
testThawaniHeaders();
