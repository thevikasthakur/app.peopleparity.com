#!/usr/bin/env node

const Database = require('better-sqlite3');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();
// Database is now in project root
const dbPath = path.join(__dirname, '..', 'local_tracking.db');
const db = new Database(dbPath);

const token = store.get('authToken');
console.log('Auth token exists:', !!token);

// Get unsynced screenshots
const unsyncedScreenshots = db.prepare(`
  SELECT * FROM sync_queue 
  WHERE entityType = 'screenshot' 
  AND attempts < 5
  ORDER BY createdAt ASC
  LIMIT 1
`).all();

console.log(`Found ${unsyncedScreenshots.length} unsynced screenshots`);

if (unsyncedScreenshots.length > 0) {
  const item = unsyncedScreenshots[0];
  const data = JSON.parse(item.data);
  
  console.log('\nTesting sync for screenshot:', item.entityId);
  console.log('Local path:', data.localPath);
  console.log('File exists:', fs.existsSync(data.localPath));
  
  // Try to upload
  const FormData = require('form-data');
  const formData = new FormData();
  
  if (fs.existsSync(data.localPath)) {
    const fileStream = fs.createReadStream(data.localPath);
    formData.append('screenshot', fileStream, {
      filename: path.basename(data.localPath),
      contentType: 'image/jpeg'
    });
    formData.append('id', item.entityId);
    formData.append('capturedAt', new Date(data.capturedAt).toISOString());
    formData.append('sessionId', data.sessionId);
    formData.append('mode', data.mode || 'command_hours');
    formData.append('userId', data.userId);
    
    console.log('\nAttempting upload to API...');
    
    axios.post('http://127.0.0.1:3001/api/screenshots/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      console.log('✅ Upload successful!');
      console.log('Response:', response.data);
    })
    .catch(error => {
      console.error('❌ Upload failed!');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    });
  } else {
    console.error('Screenshot file not found!');
  }
}

db.close();