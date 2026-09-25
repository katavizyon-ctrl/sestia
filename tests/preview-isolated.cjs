// Local UI verification with its own database, no copied secrets or user data.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sestia-ui-preview-'));
for (const name of ['app','lib','components','public','SESTIA_BILGI_KUTUPHANESI','package.json','next.config.mjs','jsconfig.json','proxy.js']) {
  fs.cpSync(path.join(root,name),path.join(directory,name),{recursive:true});
}
fs.symlinkSync(path.join(root,'node_modules'),path.join(directory,'node_modules'),'junction');
const env = {};
for (const key of ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','COMSPEC','ComSpec']) if(process.env[key])env[key]=process.env[key];
Object.assign(env,{NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',AUTH_SECRET:'sestia-isolated-preview-only-not-production',ACCESS_CODE:'preview',ADMIN_ACCESS_CODE:'preview-admin',ANTHROPIC_API_KEY:'isolated-preview-no-real-key'});
console.log(`Isolated preview source: ${directory}`);
console.log('No real database or API credentials copied. Preview: http://127.0.0.1:3001');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','3001'],{cwd:directory,env,stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code||0;});
process.on('SIGINT',()=>child.kill('SIGINT'));
process.on('SIGTERM',()=>child.kill('SIGTERM'));
