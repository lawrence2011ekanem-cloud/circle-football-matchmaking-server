const http = require('http');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 3000);
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'circle-football-matchmaking' }));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('Circle Football matchmaking server is running.');
});
const wss = new WebSocket.Server({ server });
let waitingPlayer = null;
const sessions = new Map();

function send(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}
function removeWaiting(ws) {
  if (waitingPlayer && waitingPlayer.ws === ws) waitingPlayer = null;
}
function removeSession(ws) {
  const session = sessions.get(ws);
  if (!session) return;
  sessions.delete(ws);
  const other = session.other;
  if (other && sessions.has(other)) {
    const otherSession = sessions.get(other);
    if (otherSession) otherSession.other = null;
    send(other, { type: 'opponent-left', message: 'The other player left matchmaking.' });
  }
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (_) { send(ws, { type: 'error', message: 'Invalid request.' }); return; }
    if (msg.type !== 'queue') return;
    if (typeof msg.peerId !== 'string' || msg.peerId.length < 1 || msg.peerId.length > 128) {
      send(ws, { type: 'error', message: 'Invalid PeerJS ID.' });
      return;
    }
    if (ws.queued || sessions.has(ws)) return;
    ws.peerId = msg.peerId;
    ws.queued = true;

    if (!waitingPlayer || waitingPlayer.ws === ws || waitingPlayer.ws.readyState !== WebSocket.OPEN) {
      waitingPlayer = { ws, peerId: msg.peerId, since: Date.now() };
      send(ws, { type: 'waiting' });
      return;
    }

    const first = waitingPlayer;
    waitingPlayer = null;
    first.ws.queued = false;
    ws.queued = false;
    sessions.set(first.ws, { other: ws, peerId: first.peerId });
    sessions.set(ws, { other: first.ws, peerId: msg.peerId });
    // First queued player is host; second queued player connects as guest.
    send(first.ws, { type: 'matched', peerId: msg.peerId, role: 'host' });
    send(ws, { type: 'matched', peerId: first.peerId, role: 'guest' });
  });

  ws.on('close', () => {
    removeWaiting(ws);
    removeSession(ws);
  });
  ws.on('error', () => {
    removeWaiting(ws);
    removeSession(ws);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
wss.on('close', () => clearInterval(heartbeat));
server.listen(PORT, '0.0.0.0', () => console.log(`Circle Football matchmaking listening on ${PORT}`));
