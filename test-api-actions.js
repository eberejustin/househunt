const fetch = require('node-fetch');

// Test API endpoints to trigger notifications
const baseUrl = 'http://localhost:5000';

// Mock session cookie (in real scenario, you'd get this from login)
const mockCookie = 'session=mock-session-id';

async function createTestApartment() {
  console.log('🏠 Creating test apartment...');
  
  const apartmentData = {
    label: 'Beautiful Downtown Loft',
    address: '123 Main Street, San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
    rent: '2800',
    bedrooms: '2',
    bathrooms: '2',
    notes: 'Great location near public transport!'
  };

  try {
    const response = await fetch(`${baseUrl}/api/apartments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': mockCookie
      },
      body: JSON.stringify(apartmentData)
    });

    if (response.ok) {
      const apartment = await response.json();
      console.log('✅ Test apartment created:', apartment.id);
      return apartment.id;
    } else {
      console.log('❌ Failed to create apartment:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error creating apartment:', error.message);
  }
}

async function createTestComment(apartmentId) {
  console.log('💬 Creating test comment...');
  
  const commentData = {
    content: 'This place looks amazing! The location is perfect for commuting.'
  };

  try {
    const response = await fetch(`${baseUrl}/api/apartments/${apartmentId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': mockCookie
      },
      body: JSON.stringify(commentData)
    });

    if (response.ok) {
      const comment = await response.json();
      console.log('✅ Test comment created:', comment.id);
      return comment.id;
    } else {
      console.log('❌ Failed to create comment:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error creating comment:', error.message);
  }
}

async function runApiTests() {
  console.log('\n🧪 Running API notification tests...\n');
  
  // Wait a moment for the server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Note: These API calls will fail with 401 Unauthorized since we need proper authentication.');
  console.log('The WebSocket simulation above is the main demonstration.\n');
  
  const apartmentId = await createTestApartment();
  
  if (apartmentId) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await createTestComment(apartmentId);
  }
  
  console.log('\n✨ API test completed. Check the WebSocket simulation output above for notifications.\n');
}

// Run tests after a delay
setTimeout(runApiTests, 3000);