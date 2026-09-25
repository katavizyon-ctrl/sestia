const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.webp':'image/webp', '.png':'image/png' };
http.createServer((req,res)=>{
 let pathname;
 try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400).end();return;}
 if(pathname==='/'){res.writeHead(302,{Location:'/sestia-prototip/index.html'}).end();return;}
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!mime[path.extname(file)]){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store'});res.end(body);});
}).listen(4173,'127.0.0.1',()=>console.log('SESTIA prototype: http://127.0.0.1:4173'));
