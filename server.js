const WebSocket = require("ws");
const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

const rooms = {};

app.use(bodyParser.json());

/* ──────────────── RUTAS HTTP ──────────────── */

// Validar una sala por ID
app.get("/api/validateRoom", (req, res) => {
  const roomId = req.query.roomId;
  if (!roomId || !rooms[roomId]) {
    return res
      .status(404)
      .json({ success: false, message: "Sala no encontrada." });
  }
  res.json({ success: true, roomId });
});

// Crear sala desde HTTP (opcional)
app.post("/api/createRoom", (req, res) => {
  const { monitor, screenshot } = req.body;

  if (!monitor || !screenshot) {
    return res
      .status(400)
      .json({ success: false, message: "Faltan datos necesarios." });
  }

  const roomId = uuidv4();
  rooms[roomId] = { monitor, screenshot, clients: [] };
  console.log(`🟢 Sala creada por HTTP: ${roomId} por ${monitor}`);

  res.json({ success: true, roomId });
});

/* ──────────────── WEBSOCKETS ──────────────── */

wss.on("connection", (ws) => {
  console.log("🔌 Cliente WebSocket conectado.");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // Crear sala desde WebSocket
      if (data.type === "createRoom") {
        const { monitor, screenshot } = data;

        if (!monitor || !screenshot) {
          return ws.send(
            JSON.stringify({
              type: "error",
              message: "Faltan datos para crear la sala.",
            })
          );
        }

        const roomId = uuidv4();
        rooms[roomId] = {
          monitor,
          screenshot,
          clients: [ws],
        };

        console.log(`🟢 Sala creada por WebSocket: ${roomId} por ${monitor}`);

        ws.send(
          JSON.stringify({
            type: "roomCreated",
            roomId,
          })
        );
      }

      // Aquí puedes agregar más tipos de mensajes (joinRoom, sendMessage, etc.)
    } catch (err) {
      console.error("❌ Error al procesar mensaje WebSocket:", err);
      ws.send(JSON.stringify({ type: "error", message: "Mensaje inválido." }));
    }
  });

  ws.on("close", () => {
    console.log("🔌 Cliente WebSocket desconectado.");
    // Aquí podrías limpiar la conexión del array clients[] de alguna sala, si quieres
  });

  ws.on("error", (err) => {
    console.error("❌ Error en WebSocket:", err);
  });
});

/* ──────────────── INICIAR SERVIDOR WEBSOKET ──────────────── */



server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
