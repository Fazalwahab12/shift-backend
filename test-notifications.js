/**
 * Test Notification System
 * Run this script to test if notifications are working properly
 * 
 * Usage: node test-notifications.js
 */

require('dotenv').config();
const { databaseService } = require('./src/config/database');
const notificationController = require('./src/controllers/notificationController');

async function testNotifications() {
  console.log('🧪 Testing Notification System...\n');

  try {
    // Initialize database first
    console.log('🔥 Initializing Firebase...');
    await databaseService.initialize();
    console.log('✅ Firebase initialized successfully\n');
    // Test 1: Company Account Created
    console.log('1️⃣  Testing Company Account Created Notification...');
    const companyData = {
      id: 'test_company_123',
      name: 'Test Company Ltd',
      companyName: 'Test Company Ltd',
      email: 'fazalwahabpk111@gmail.com'
    };

    await notificationController.sendCompanyAccountCreated(companyData, ['fazalwahabpk111@gmail.com']);
    console.log('✅ Company notification sent successfully\n');

    // Test 2: Job Seeker Profile Created
    console.log('2️⃣  Testing Job Seeker Profile Created Notification...');
    const seekerData = {
      id: 'test_seeker_123',
      name: 'Fazal Wahab',
      firstName: 'Fazal',
      lastName: 'Wahab',
      email: 'fazalwahabpk111@gmail.com'
    };

    await notificationController.sendJobSeekerProfileCreated(seekerData, ['fazalwahabpk111@gmail.com']);
    console.log('✅ Seeker notification sent successfully\n');

    // Test 3: Application Submitted
    console.log('3️⃣  Testing Application Submitted Notification...');
    const applicationData = {
      jobSeekerName: 'Fazal Wahab',
      jobSeekerEmail: 'fazalwahabpk111@gmail.com',
      jobSeekerId: 'seeker_123',
      companyName: 'Test Company Ltd',
      companyEmail: 'fazalwahabpk111@gmail.com',
      companyId: 'company_123',
      jobTitle: 'Software Developer',
      jobId: 'job_123'
    };

    await notificationController.sendApplicationSubmitted(applicationData);
    console.log('✅ Application notification sent successfully\n');

    // Test 4: Interview Request
    console.log('4️⃣  Testing Interview Request Notification...');
    const interviewData = {
      jobSeekerName: 'Fazal Wahab',
      jobSeekerEmail: 'fazalwahabpk111@gmail.com',
      jobSeekerId: 'seeker_123',
      companyName: 'Test Company Ltd',
      companyId: 'company_123',
      jobTitle: 'Software Developer',
      jobId: 'job_123',
      interviewDate: '2025-09-05 10:00 AM',
      location: 'Test Company Office, Muscat'
    };

    await notificationController.sendInterviewRequest(interviewData);
    console.log('✅ Interview notification sent successfully\n');

    // Test 5: Payment Successful
    console.log('5️⃣  Testing Payment Successful Notification...');
    const paymentData = {
      companyId: 'company_123',
      companyEmail: 'fazalwahabpk111@gmail.com',
      companyName: 'Test Company Ltd',
      amount: '25.000',
      currency: 'OMR',
      planName: 'Premium Plan',
      adminEmails: ['fazalwahabpk111@gmail.com']
    };

    await notificationController.sendPaymentSuccessful(paymentData);
    console.log('✅ Payment notification sent successfully\n');

    console.log('🎉 All notification tests completed successfully!');
    console.log('\n📊 Check your:');
    console.log('   • Email inbox for notifications');
    console.log('   • Firestore "notifications" collection');
    console.log('   • Server logs for any errors\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check your .env file has RESEND API key');
    console.error('   2. Verify Firebase connection');
    console.error('   3. Check notification service initialization');
    console.error('\nError details:', error);
  }
}

// Run tests
testNotifications().then(() => {
  console.log('🏁 Test script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});