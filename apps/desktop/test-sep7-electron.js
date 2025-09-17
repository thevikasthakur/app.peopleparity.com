const { app } = require('electron');
const path = require('path');
const LocalDatabase = require('./src/main/services/localDatabase').LocalDatabase;

app.whenReady().then(() => {
  const db = new LocalDatabase();
  
  // Get the current user
  const users = db.getUsers();
  const user = users[0];
  console.log('User:', user);
  
  // Test date: Sep 7, 2025
  const testDate = new Date('2025-09-07');
  console.log('\n=== Testing Sep 7, 2025 ===');
  console.log('Date:', testDate.toDateString());
  
  // Get stats using the getDateStats method
  const stats = db.getDateStats(user.id, testDate);
  
  console.log('\n=== Results ===');
  console.log('Client hours:', stats.clientHours.toFixed(2));
  console.log('Command hours:', stats.commandHours.toFixed(2));
  console.log('Total hours:', stats.totalHours.toFixed(2));
  
  app.quit();
});