import {writeFile,rename} from 'node:fs/promises';
import {StateWorkerDispatcher} from './state-worker-dispatcher.js';
import {messageBudget,PONG_TIMEOUT_MS} from './connection-policy.js';
import {stateDelta} from '../dist/state-delta.js';
import { createReadStream, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { AramArena, PROTOCOL_VERSION } from './arena.js';
import {PlaytimeMetrics} from './playtime-metrics.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
};

export function originAllowed(origin, host, configured) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === origin && (url.host === host || configured.has(origin));
  } catch {
    return false;
  }
}

export function createAramServer({
  staticRoot = resolve(fileURLToPath(new URL('../dist', import.meta.url))),
  allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  arena = new AramArena(),
  playtimeFile = process.env.PLAYTIME_METRICS_PATH,
} = {}) {
  if(process.env.CONTINUOUS_BOT_ROOM==='1')arena.enableContinuousRoom();
  const codec=new StateWorkerDispatcher({useWorker:process.env.ARAM_STATE_WORKER==='1'});
  const transportMetrics={maxSocketBytes:0,maxCompressionBytes:0,maxBufferedBytes:0,writeErrors:0};
  let metricsBusy=false;const metricsTimer=process.env.ARAM_NETWORK_METRICS_PATH?setInterval(async()=>{if(metricsBusy)return;metricsBusy=true;try{const p=process.env.ARAM_NETWORK_METRICS_PATH;await writeFile(p+'.tmp',JSON.stringify({at:Date.now(),pid:process.pid,...codec.stats(),...transportMetrics}));await rename(p+'.tmp',p);}catch(e){console.warn('network-metrics-write',e.message);}finally{metricsBusy=false;}},5000):null;metricsTimer?.unref();
  const root = resolve(staticRoot);
  // Send each authoritative 30 Hz simulation tick instead of a separate,
  // lower-frequency network timer.
  arena.broadcastFromTick = false;
  const playtime=playtimeFile?new PlaytimeMetrics({game:'lol',file:playtimeFile,activePlayers:()=>{
    const active=[];
    for(const room of arena.rooms.values())if(room.phase==='playing')for(const record of room.players.values()){
      const peer=record.peer;
      if(peer.connected&&peer.roomId===room.id&&record.unit&&!record.spectator&&peer.idleDetachedRound===undefined&&(!peer.loadingIdleGuard||peer.battleReadyKey===`${room.id}:${room.round??0}`))
        active.push({identity:peer.token,roomId:room.id,round:room.round??0});
    }
    return active;
  }}):null;
  const origins = new Set(allowedOrigins.map((value) => new URL(value).origin));
  const server = createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if(pathname==='/api/idle-leave'){
      if(req.method!=='POST'){res.writeHead(405,{Allow:'POST'}).end();return;}
      if(req.headers.origin&&!originAllowed(req.headers.origin,req.headers.host,origins)){res.writeHead(403).end();return;}
      if(req.headers.origin)res.setHeader('Access-Control-Allow-Origin',req.headers.origin);
      res.setHeader('Cache-Control','no-store');
      let body='',bytes=0;
      req.on('data',chunk=>{bytes+=chunk.length;if(bytes>128){res.writeHead(413).end();req.destroy();return;}body+=chunk.toString('utf8');});
      req.on('end',()=>{if(res.writableEnded)return;const immediate=body.startsWith('!');arena.scheduleDetachedLeave(body.slice(immediate?1:0).trim(),immediate?0:10_000);res.writeHead(204).end();});
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method ?? '')) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    if (pathname === '/healthz' || pathname === '/api/rooms') {
      const allowed = originAllowed(req.headers.origin, req.headers.host, origins);
      if (req.headers.origin && !allowed) {
        res.writeHead(403).end();
        return;
      }
      if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(pathname === '/healthz' ? {
        ok: true,
        game: 'howling-abyss',
        simulation: 'server',
        protocol: PROTOCOL_VERSION,
        deployment: process.env.DEPLOYMENT_NAME ?? 'local',
        rooms: arena.rooms.size,
        sessions: arena.peers.size,
      } : arena.list()));
      return;
    }
    const requested = pathname === '/' ? '/index.html' : pathname;
    const target = resolve(root, `.${requested}`);
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    let info;
    try {
      info = statSync(target);
      if (!info.isFile()) throw new Error('not a file');
    } catch {
      res.writeHead(404).end('Not found');
      return;
    }
    res.setHeader('Content-Type', MIME[extname(target).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    res.setHeader('Cache-Control', extname(target) === '.html' ? 'no-cache' : 'public,max-age=3600');
    if (req.method === 'HEAD') res.end();
    else createReadStream(target).on('error', () => res.destroy()).pipe(res);
  });

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 8192,
    perMessageDeflate: {
      threshold: 1024,
      // Battle deltas contain the same field names and similar values every
      // 50 ms. Reusing the server compression dictionary cuts steady-state
      // traffic substantially on lossy mobile and cross-carrier links.
      serverNoContextTakeover: false,
      clientNoContextTakeover: true,
      concurrencyLimit: 8,
      zlibDeflateOptions: { level: 1 },
    },
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws' || !originAllowed(req.headers.origin, req.headers.host, origins)) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    let peer;
    let lastPong=Date.now();
    const budget=messageBudget();
    let lastThrottleNotice=0;
    let deltaEnabled=false,roomDeltaEnabled=false,previousState=null,sequence=0,lastFull=0;
    let lastResync=-Infinity;
    const channel=codec.register((data,done)=>{
      if(ws.readyState!==WebSocket.OPEN)return done(new Error('socket closed'));
      transportMetrics.maxSocketBytes=Math.max(transportMetrics.maxSocketBytes,ws._socket?.writableLength||0);
      transportMetrics.maxCompressionBytes=Math.max(transportMetrics.maxCompressionBytes,ws._sender?._bufferedBytes||0);
      ws.send(data,{binary:false},err=>{if(err)transportMetrics.writeErrors++;done(err);});
      transportMetrics.maxBufferedBytes=Math.max(transportMetrics.maxBufferedBytes,ws.bufferedAmount);
      transportMetrics.maxCompressionBytes=Math.max(transportMetrics.maxCompressionBytes,ws._sender?._bufferedBytes||0);
      transportMetrics.maxSocketBytes=Math.max(transportMetrics.maxSocketBytes,ws._socket?.writableLength||0);
    },()=>ws.close(1011,'State encoder unavailable'),{awaitWrite:true,onDelivered:(message,meta)=>{
      if(!meta||!peer||peer.send!==send||peer.roomId!==meta.roomId)return;
      const room=arena.rooms.get(peer.roomId),record=room?.players.get(peer.id);
      if(!room||room.round!==meta.round||record?.team!==meta.team||(record.unit?.classicRealmId||0)!==meta.realmId)return;
      if(Number.isSafeInteger(meta.nativeEffectCursor))peer.nativeEffectCursor=Math.max(peer.nativeEffectCursor??0,meta.nativeEffectCursor);
    }});
    const send = (message,meta=null) => {
      if(ws.readyState!==WebSocket.OPEN)return false;
      if(ws.bufferedAmount>2_000_000){ws.close(1013,'Slow connection');return false;}
      const accepted=codec.enqueue(channel,message,{delta:deltaEnabled,roomDelta:roomDeltaEnabled,meta});
      // Native-event acknowledgement occurs on write completion, never on enqueue.
      return message.type==='state'?false:accepted;
    };
    const helloTimeout = setTimeout(() => {
      if (!peer) ws.close(1008, 'Hello required');
    }, 10_000);
    helloTimeout.unref();
    const heartbeat = setInterval(() => {
      if (Date.now()-lastPong>PONG_TIMEOUT_MS) {console.warn(JSON.stringify({event:"ws-heartbeat-timeout",peerId:peer?.id}));return ws.terminate();}
      ws.ping();
    }, 10_000);
    heartbeat.unref();
    ws.on('pong', () => { lastPong=Date.now(); });
    ws.on('message', (data) => {
      try {
        const now = Date.now();
        const message = JSON.parse(Buffer.from(data).toString('utf8'));
        if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('消息格式无效');
        if(peer&&peer.send!==send)return ws.close(4001,'Session replaced');
        const decision=budget(message.type,now);
        if(decision==='flood')return ws.close(1008,'Message flood');
        if(decision==='throttle'){
          if(now-lastThrottleNotice>1000){send({type:'error',message:'操作过快，请稍候'});lastThrottleNotice=now;}
          return;
        }
        if (!peer) {
          if (message.type !== 'hello') throw new Error('请先连接大厅');
          if (message.protocol !== PROTOCOL_VERSION) {
            send({ type: 'error', message: '页面版本已更新，请刷新后重试' });
            ws.close(4002, 'Update required');
            return;
          }
          deltaEnabled=message.deltaState===1;
          roomDeltaEnabled=deltaEnabled&&message.roomDelta===1;
          peer = arena.hello(message.name, message.token, send);
          peer.loadingIdleGuard=message.loadingIdleGuard===1;
          peer.battleReadyKey=null;
          playtime?.visit(peer.token);
          peer.idleDialog=message.idleDialog===1;
          peer.closeIdle=code=>ws.close(code,'Idle detached');
          clearTimeout(helloTimeout);
          return;
        }
        if (message.type === 'stateAck') return;
        if (message.type === 'stateResync') {
          if (deltaEnabled && now-lastResync>=500) {
            // The browser discarded a broken delta chain. Send a complete,
            // current frame on the next tick instead of waiting two seconds.
            previousState=null;peer.nativeEffectCursor=undefined;codec.reset(channel);
            lastResync=now;
            arena.resendEndedState(peer);
          }
          return;
        }
        arena.command(peer, message);
      } catch (error) {
        send({ type: 'error', message: error instanceof Error ? error.message : '操作失败' });
      }
    });
    ws.on('error', () => {});
    ws.on('close', (code) => {
      codec?.unregister(channel);
      console.info(JSON.stringify({event:'ws-close',peerId:peer?.id,code,replaced:Boolean(peer&&peer.send!==send)}));
      clearTimeout(helloTimeout);
      clearInterval(heartbeat);
      if (peer && peer.send===send) arena.disconnect(peer);
    });
  });

  let previous = performance.now();
  let accumulator = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    accumulator += Math.min(0.25, (now - previous) / 1000);
    previous = now;
    let stepped=false;
    while (accumulator >= 1 / 30) {
      stepped=true;
      arena.tick(1 / 30);
      accumulator -= 1 / 30;
    }
    if(stepped)arena.broadcastPlaying();
  }, 16);
  timer.unref();
  server.on('close', () => {
    clearInterval(metricsTimer);codec.close();playtime?.close();
    clearInterval(timer);
    for (const client of wss.clients) client.terminate();
    wss.close();
  });
  return { server, arena, wss, playtime, codec };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const port = Number(process.env.PORT) || 18100;
  const host = process.env.HOST || '127.0.0.1';
  const { server } = createAramServer({ staticRoot: process.env.STATIC_ROOT });
  server.listen(port, host, () => console.log(`Howling Abyss server listening on ${host}:${port}`));
}
