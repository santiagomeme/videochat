const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on('connection', (ws) => {
  console.log("🟢 Cliente conectado");

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.error("❌ Mensaje no es JSON:", err);
      return;
    }

    const { roomId, senderId, targetId, type } = data;

    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][senderId] = ws;

    if (targetId && rooms[roomId][targetId]) {
      rooms[roomId][targetId].send(JSON.stringify(data));
    } else {
      Object.entries(rooms[roomId]).forEach(([id, client]) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on('close', () => {
    for (const roomId in rooms) {
      for (const id in rooms[roomId]) {
        if (rooms[roomId][id] === ws) {
          delete rooms[roomId][id];
        }
      }
    }
    console.log("🔴 Cliente desconectado");
  });
});

server.listen(3000, () => {
  console.log("🚀 Servidor WebSocket en puerto 3000");
});
