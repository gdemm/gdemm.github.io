import {fileURLToPath} from 'node:url';
import {createAramServer} from './backend/server/index.js';
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const {server}=createAramServer({staticRoot:fileURLToPath(new URL('./public/',import.meta.url))});
server.listen(port,host,()=>console.log(`ARAM Classic Eight listening on http://${host}:${port}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();});
