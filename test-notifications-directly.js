// Test notifications by simulating apartment creation
const { storage } = require('./server/storage');
const { createAndBroadcastNotification } = require('./server/notificationService');

async function testNotifications() {
  console.log('Testing notification system...');
  
  try {
    // Get all users
    const users = await storage.getAllUsers();
    console.log('Available users:', users.map(u => ({ id: u.id, email: u.email })));
    
    if (users.length < 2) {
      console.log('Need at least 2 users to test notifications properly');
      return;
    }

    const [user1, user2] = users;
    
    // Simulate user1 creating an apartment
    console.log(`\nSimulating ${user1.email} creating an apartment...`);
    
    await createAndBroadcastNotification(
      'apartment_created',
      user1.id,
      'test-apartment-id',
      'Test Notification',
      `${user1.email} added a test apartment`
    );
    
    // Check notifications in database
    console.log('\nChecking notifications in database...');
    const notifications = await storage.getNotifications(user2.id);
    console.log('Notifications for user2:', notifications);
    
    console.log('\nNotification test completed!');
  } catch (error) {
    console.error('Error testing notifications:', error);
  }
}

testNotifications();