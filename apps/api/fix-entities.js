#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix all entities to have explicit column types
const entitiesDir = path.join(__dirname, 'src', 'entities');

const fixes = [
  {
    file: 'project.entity.ts',
    replacements: [
      { from: '@Column()\n  name: string;', to: '@Column({ type: \'varchar\' })\n  name: string;' },
      { from: '@Column()\n  organizationId: string;', to: '@Column({ type: \'uuid\' })\n  organizationId: string;' }
    ]
  },
  {
    file: 'user.entity.ts',
    replacements: [
      { from: '@Column()\n  email: string;', to: '@Column({ type: \'varchar\', unique: true })\n  email: string;' }
    ]
  },
  {
    file: 'session.entity.ts',
    replacements: [
      { from: '@Column()\n  userId: string;', to: '@Column({ type: \'uuid\' })\n  userId: string;' }
    ]
  },
  {
    file: 'activity-period.entity.ts',
    replacements: [
      { from: '@Column()\n  userId: string;', to: '@Column({ type: \'uuid\' })\n  userId: string;' },
      { from: '@Column()\n  sessionId: string;', to: '@Column({ type: \'uuid\' })\n  sessionId: string;' }
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(entitiesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(from, to);
        console.log(`✅ Fixed ${file}: ${from.split('\n')[0]} -> ${to.split('\n')[0]}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
  }
});

console.log('\n✨ All entities fixed with explicit column types!');