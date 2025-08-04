const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = 8080;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

app.post('/api/createRoom', (req, res) => {
  const { monitor, screenshot } = req.body;

  if (!monitor || !screenshot) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  const roomId = generateRoomId();
  console.log(`Sala creada con ID: ${roomId}`);
  res.json({ success: true, roomId });
});

function generateRoomId() {
  return Math.random().toString(36).substr(2, 8);
}

const rooms = {}; // { roomId: { monitor: { ws, monitorId }, observers: { observerId: ws } } }

wss.on('connection', (ws) => {
  console.log('🔌 Cliente conectado al WebSocket');

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("❌ Error al parsear mensaje:", err);
      return;
    }

    const { type, roomId, senderId, targetId } = data;

    switch (type) {
      case 'joinRoom': {
        // MONITOR se une a una sala
        if (!rooms[roomId]) {
          rooms[roomId] = {
            monitor: { ws, monitorId: senderId },
            observers: {}
          };
          console.log(`🎥 Monitor unido a sala ${roomId}`);
        } else {
          rooms[roomId].monitor = { ws, monitorId: senderId };
          console.log(`🎥 Monitor reemplazado en sala ${roomId}`);
        }
        break;
      }

      case 'watcher': {
        // OBSERVADOR se une a una sala
        const room = rooms[roomId];
        if (room && room.monitor) {
          room.observers[senderId] = ws;

          console.log(`👁️ Observador ${senderId} unido a sala ${roomId}`);

          // Informar al monitor que hay un nuevo observador
          room.monitor.ws.send(JSON.stringify({
            type: 'new-watcher',
            observerId: senderId
          }));
        }
        break;
      }

      case 'offer': {
        // El MONITOR envía una offer al OBSERVADOR
        const room = rooms[roomId];
        const observer = room?.observers?.[targetId];
        if (observer) {
          observer.send(JSON.stringify({
            type: 'offer',
            offer: data.offer,
            monitorId: senderId
          }));
        }
        break;
      }

      case 'answer': {
        // El OBSERVADOR responde con un answer al MONITOR
        const room = rooms[roomId];
        const monitor = room?.monitor?.ws;
        if (monitor) {
          monitor.send(JSON.stringify({
            type: 'answer',
            answer: data.answer,
            senderId
          }));
        }
        break;
      }

      case 'candidate': {
        // ICE candidates entre monitor y observador
        const room = rooms[roomId];
        if (!room) return;

        if (room.monitor.monitorId === targetId) {
          // Enviar del observador al monitor
          room.monitor.ws.send(JSON.stringify({
            type: 'candidate',
            candidate: data.candidate,
            senderId
          }));
        } else {
          // Enviar del monitor al observador
          const observer = room.observers[targetId];
          if (observer) {
            observer.send(JSON.stringify({
              type: 'candidate',
              candidate: data.candidate,
              senderId
            }));
          }
        }
        break;
      }

      default:
        console.warn("⚠️ Mensaje desconocido:", data);
    }
  });

  ws.on('close', () => {
    // Eliminar conexiones cerradas
    for (const roomId in rooms) {
      const room = rooms[roomId];

      if (room.monitor?.ws === ws) {
        console.log(`❌ Monitor desconectado de sala ${roomId}`);
        delete rooms[roomId];
        break;
      }

      for (const [observerId, observerWs] of Object.entries(room.observers)) {
        if (observerWs === ws) {
          console.log(`❌ Observador ${observerId} desconectado de sala ${roomId}`);
          delete room.observers[observerId];
          break;
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
