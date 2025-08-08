import WebSocket from 'ws';

// Simulate multiple users connecting and interacting
const users = [
  { id: 'user1', name: 'Alice Johnson' },
  { id: 'user2', name: 'Bob Smith' },
  { id: 'user3', name: 'Carol Davis' }
];

const connections = new Map();

async function connectUser(user) {
  const ws = new WebSocket('ws://localhost:5000/ws');
  
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log(`${user.name} connected to WebSocket`);
      
      // Authenticate the user
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id
      }));
      
      connections.set(user.id, ws);
      resolve(ws);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`${user.name} received:`, message);
      
      if (message.type === 'notification') {
        console.log(`🔔 NOTIFICATION for ${user.name}:`);
        console.log(`   Title: ${message.data.title}`);
        console.log(`   Message: ${message.data.message}`);
        console.log(`   Apartment: ${message.data.apartmentId}`);
        console.log('');
      }
    });

    ws.on('error', (error) => {
      console.error(`${user.name} WebSocket error:`, error);
      reject(error);
    });

    ws.on('close', () => {
      console.log(`${user.name} disconnected`);
      connections.delete(user.id);
    });
  });
}

async function simulateUserActions() {
  console.log('🎭 Starting Multi-User Notification Simulation\n');
  console.log('This will demonstrate real-time notifications between users...\n');
  
  // Connect all users
  for (const user of users) {
    try {
      await connectUser(user);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between connections
    } catch (error) {
      console.error(`Failed to connect ${user.name}:`, error.message);
    }
  }

  console.log('\n✅ All users connected! Now simulating collaborative actions...\n');
  
  // Simulate some activity
  console.log('📝 Simulation Instructions:');
  console.log('1. Open the HouseHunt app in your browser');
  console.log('2. Log in with any user account');
  console.log('3. Try the following actions to see real-time notifications:');
  console.log('   - Add a new apartment');
  console.log('   - Comment on an existing apartment');
  console.log('   - Mark an apartment as favorite');
  console.log('4. Watch the console output below for real-time notifications\n');
  
  console.log('📊 Connected Users:');
  users.forEach(user => {
    const status = connections.has(user.id) ? '🟢 Online' : '🔴 Offline';
    console.log(`   ${user.name} (${user.id}): ${status}`);
  });
  console.log('\n⏳ Waiting for user interactions...\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down simulation...');
  connections.forEach((ws, userId) => {
    ws.close();
  });
  process.exit(0);
});

// Start the simulation
simulateUserActions().catch(console.error);