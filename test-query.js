const { databaseService, COLLECTIONS } = require('./src/config/database');

async function testQuery() {
  try {
    await databaseService.initialize();
    
    console.log('🔍 Testing database query...');
    
    // Test 1: Query with exact values from your database
    const users1 = await databaseService.query(COLLECTIONS.USERS, [
      { field: 'phoneNumber', operator: '==', value: '92345678' },
      { field: 'countryCode', operator: '==', value: '+968' }
    ]);
    
    console.log('🔍 Query 1 result:', users1.length, 'users found');
    users1.forEach(user => {
      console.log('  - User:', {
        id: user.id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        phoneNumberType: typeof user.phoneNumber,
        countryCodeType: typeof user.countryCode,
        userType: user.userType,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt
      });
    });
    
    // Test 2: Query only by phone number to see if there are multiple users
    const users2 = await databaseService.query(COLLECTIONS.USERS, [
      { field: 'phoneNumber', operator: '==', value: '92345678' }
    ]);
    
    console.log('🔍 Query 2 result (phone only):', users2.length, 'users found');
    users2.forEach(user => {
      console.log('  - User:', {
        id: user.id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        userType: user.userType,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt
      });
    });
    
    // Test 3: Get all users to see what's in the database
    const allUsers = await databaseService.query(COLLECTIONS.USERS, []);
    console.log('🔍 All users in database:', allUsers.length);
    allUsers.forEach(user => {
      console.log('  - User:', {
        id: user.id,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        userType: user.userType,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testQuery();
