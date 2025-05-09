const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = 8080;

// Configuración del servidor HTTP y WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware para procesar JSON
app.use(express.json());

// Ruta para crear una sala
app.post('/api/createRoom', (req, res) => {
  const { monitor, screenshot } = req.body;

  if (!monitor || !screenshot) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  const roomId = generateRoomId(); // Generar un ID único para la sala
  console.log(`Sala creada con ID: ${roomId}`);
  res.json({ success: true, roomId });
});

function generateRoomId() {
  return Math.random().toString(36).substr(2, 8);
}

// Configuración de WebSocket
wss.on('connection', (ws) => {
  console.log('Cliente conectado a WebSocket');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    // Manejo de señales WebRTC
    if (data.type === 'offer' || data.type === 'answer' || data.type === 'candidate') {
      // Reenvía la señal a todos los clientes conectados excepto al remitente
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }

  
  });

  ws.on('close', () => {
    console.log('Cliente desconectado de WebSocket');
  });
});

// Servir archivos estáticos (opcional)
app.use(express.static('public'));

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});


