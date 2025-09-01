const fetch = require('node-fetch');

// VPN Testing Script for Thawani API
async function testThawaniWithVPN() {
  console.log('🌐 VPN Testing for Thawani API Access\n');
  
  // Test data
  const apiKey = 'rRQ26GcsZzoEhbrP2HZvLYDbn9C9et';
  const baseUrl = 'https://uatcheckout.thawani.om/api/v1';
  
  const testData = {
    "client_reference_id": `vpn_test_${Date.now()}`,
    "mode": "test",
    "products": [
      {
        "name": "VPN Test Product",
        "quantity": 1,
        "unit_amount": 100
      }
    ],
    "success_url": "https://example.com/success",
    "cancel_url": "https://example.com/cancel",
    "metadata": {
      "test_type": "vpn_test",
      "timestamp": new Date().toISOString()
    }
  };

  try {
    // Step 1: Check current IP address
    console.log('🔍 Step 1: Checking current IP address...');
    try {
      const ipResponse = await fetch('https://ipinfo.io/json');
      const ipData = await ipResponse.json();
      console.log('📍 Current IP Info:');
      console.log(`   IP: ${ipData.ip}`);
      console.log(`   Country: ${ipData.country}`);
      console.log(`   Region: ${ipData.region}`);
      console.log(`   City: ${ipData.city}`);
      console.log(`   ISP: ${ipData.org}`);
      console.log('');
    } catch (ipError) {
      console.log('❌ Could not determine IP address');
    }

    // Step 2: Test Thawani API with current IP
    console.log('🧪 Step 2: Testing Thawani API...');
    console.log(`   URL: ${baseUrl}/checkout/session`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
    console.log('');

    const response = await fetch(`${baseUrl}/checkout/session`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'thawani-secret-key': apiKey
      },
      body: JSON.stringify(testData)
    });

    console.log('📥 Response Details:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ SUCCESS! Thawani API is working!');
      console.log('Response:', JSON.stringify(result, null, 2));
      return { success: true, result };
    } else {
      const errorText = await response.text();
      console.log('\n❌ FAILED: Thawani API error');
      console.log('Error Response:', errorText.substring(0, 500));
      
      // Analyze the error
      if (response.status === 403) {
        if (errorText.includes('Cloudflare')) {
          console.log('\n🔍 Analysis: IP Address Blocked by Cloudflare');
          console.log('💡 Solution: Use VPN to change IP address');
        } else {
          console.log('\n🔍 Analysis: Authentication failed');
          console.log('💡 Solution: Check API key validity');
        }
      }
      
      return { success: false, status: response.status, error: errorText };
    }

  } catch (error) {
    console.log('\n❌ Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// VPN Connection Instructions
function showVPNInstructions() {
  console.log('\n📋 VPN Setup Instructions:');
  console.log('==========================');
  console.log('');
  console.log('1️⃣ Install VPN Software:');
  console.log('   - ProtonVPN (Free): https://protonvpn.com/');
  console.log('   - Windscribe (Free): https://windscribe.com/');
  console.log('   - ExpressVPN (Paid): https://expressvpn.com/');
  console.log('');
  console.log('2️⃣ Connect to Different Country:');
  console.log('   - UAE (Dubai)');
  console.log('   - Saudi Arabia');
  console.log('   - Europe (Germany, Netherlands)');
  console.log('   - USA (New York, California)');
  console.log('');
  console.log('3️⃣ Verify IP Change:');
  console.log('   - Visit: https://whatismyipaddress.com/');
  console.log('   - Check if IP is different');
  console.log('');
  console.log('4️⃣ Re-run this test:');
  console.log('   node test-thawani-vpn.js');
  console.log('');
  console.log('5️⃣ Alternative: Use Mobile Hotspot');
  console.log('   - Turn on phone hotspot');
  console.log('   - Connect computer to mobile data');
  console.log('   - This gives you a different IP');
}

// Run the test
async function main() {
  console.log('🚀 Thawani API VPN Test Started\n');
  
  const result = await testThawaniWithVPN();
  
  if (!result.success) {
    showVPNInstructions();
  }
  
  console.log('\n🏁 Test completed!');
}

main().catch(console.error);
