const path = require('path');

// Plugin to handle TypeORM decorators
const typeormPlugin = {
  name: 'typeorm',
  setup(build) {
    // Mark TypeORM as external but copy entities
    build.onResolve({ filter: /^typeorm$/ }, args => {
      return { path: args.path, external: true };
    });
    
    // Handle reflect-metadata
    build.onResolve({ filter: /^reflect-metadata$/ }, args => {
      return { path: args.path, external: true };
    });
  }
};

module.exports = {
  typeormPlugin
};