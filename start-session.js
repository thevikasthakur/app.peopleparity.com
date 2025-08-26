#!/usr/bin/env node

/**
 * Script to properly start a tracking session
 */

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const dbPath = process.env.HOME + '/Library/Application Support/Electron/local_tracking.db';
const db = new sqlite3.Database(dbPath);

const userId = 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f5'; // Vikas's user ID
const sessionId = crypto.randomUUID();
const now = Date.now();

console.log('Creating new tracking session...');
console.log('Session ID:', sessionId);

// End all active sessions first
db.run('UPDATE sessions SET isActive = 0, endTime = ? WHERE isActive = 1', [now], (err) => {
  if (err) {
    console.error('Error ending active sessions:', err);
    return;
  }
  
  // Create new session
  db.run(`
    INSERT INTO sessions (id, userId, mode, startTime, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [sessionId, userId, 'command_hours', now, 1, now], (err) => {
    if (err) {
      console.error('Error creating session:', err);
    } else {
      console.log('✅ Session created successfully');
      
      // Add to sync queue
      const syncId = crypto.randomUUID();
      const syncData = JSON.stringify({
        id: sessionId,
        userId: userId,
        mode: 'command_hours',
        startTime: now,
        projectId: null,
        task: 'Development work'
      });
      
      db.run(`
        INSERT INTO sync_queue (id, entityType, entityId, operation, data, attempts, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [syncId, 'session', sessionId, 'create', syncData, 0, now], (err) => {
        if (err) {
          console.error('Error adding to sync queue:', err);
        } else {
          console.log('✅ Added to sync queue');
        }
        
        // Clear old failed sync items
        db.run('DELETE FROM sync_queue WHERE attempts >= 5', [], (err) => {
          if (err) {
            console.error('Error clearing sync queue:', err);
          } else {
            console.log('✅ Cleared failed sync items');
          }
          
          db.close();
        });
      });
    }
  });
});