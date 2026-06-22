const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT }, () => console.log(`WebSocket server listening on ws://0.0.0.0:${PORT}`));

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (msg) => {
    let data = null;
    try { data = JSON.parse(msg); } catch (e) { return; }
    // Only handle scan messages
    if (data && data.type === 'scan') {
      // Broadcast to all other clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});
