const fs=require('node:fs');
const path=require('node:path');
const source=path.resolve(__dirname,'..','src');
const output=path.resolve(__dirname,'..','dist');
fs.mkdirSync(output,{recursive:true});
for(const file of ['main.cjs','preload.cjs'])fs.copyFileSync(path.join(source,file),path.join(output,file));
