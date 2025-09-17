#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const entitiesDir = path.join(__dirname, 'src', 'entities');

// Fix function to add explicit types to columns
function fixEntity(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix columns without any type specification
  // Match @Column() or @Column({ ... }) without type: property
  
  // Fix simple @Column() for strings
  content = content.replace(/@Column\(\)\s*\n\s*(\w+):\s*string;/g, (match, propName) => {
    changed = true;
    return `@Column({ type: 'varchar' })\n  ${propName}: string;`;
  });
  
  // Fix @Column({ unique: true }) and similar without type
  content = content.replace(/@Column\((\{[^}]*})\)\s*\n\s*(\w+):\s*string;/g, (match, options, propName) => {
    if (!options.includes('type:')) {
      changed = true;
      // Insert type at the beginning of options
      const newOptions = options.replace('{', '{ type: \'varchar\',');
      return `@Column(${newOptions})\n  ${propName}: string;`;
    }
    return match;
  });
  
  // Fix booleans without type
  content = content.replace(/@Column\((\{[^}]*})\)\s*\n\s*(\w+):\s*boolean;/g, (match, options, propName) => {
    if (!options.includes('type:')) {
      changed = true;
      const newOptions = options.replace('{', '{ type: \'boolean\',');
      return `@Column(${newOptions})\n  ${propName}: boolean;`;
    }
    return match;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${path.basename(filePath)}`);
  }
  
  return changed;
}

// Process all entity files
const entityFiles = fs.readdirSync(entitiesDir)
  .filter(file => file.endsWith('.entity.ts'));

let totalFixed = 0;
entityFiles.forEach(file => {
  const filePath = path.join(entitiesDir, file);
  if (fixEntity(filePath)) {
    totalFixed++;
  }
});

console.log(`\n✨ Fixed ${totalFixed} entity files with explicit column types!`);