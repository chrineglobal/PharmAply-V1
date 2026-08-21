const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');
if (!server.includes('dotenv')) {
  server = 'import "dotenv/config";\n' + server;
  fs.writeFileSync('server.ts', server);
}
