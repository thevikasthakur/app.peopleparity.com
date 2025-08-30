import Store from 'electron-store';

// The auth token from the login
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiMDkxNDllNi02YmE2LTQ5OGQtYWUzYi1mMzVhMWUxMWY3ZjUiLCJlbWFpbCI6InRlc3RAcGVvcGxlcGFyaXR5LmNvbSIsInJvbGUiOiJkZXZlbG9wZXIiLCJvcmdhbml6YXRpb25JZCI6bnVsbCwiaWF0IjoxNzU2Mzc5NTMwLCJleHAiOjE3NTY5ODQzMzB9.9KLVHTS0B0upm2d57hyWFH5IZmJlBLKSSpTTVu4NVkc';

const store = new Store();

// Set the auth token
store.set('authToken', authToken);

// Also set the user data
const userData = {
  id: 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f5',
  email: 'test@peopleparity.com',
  name: 'Test Developer',
  organizationId: 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f4',
  organizationName: 'Test Organization',
  role: 'developer',
  lastSync: Date.now()
};

store.set('currentUser', userData);

console.log('✅ Auth token and user data set successfully');
console.log('Token:', authToken.substring(0, 50) + '...');
console.log('User:', userData.email);