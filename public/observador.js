document.addEventListener("DOMContentLoaded", () => {
  // Crear conexión WebSocket
  const socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

  // Obtener parámetros desde la URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("roomId");
  const senderId = urlParams.get("senderId") || `observer_${Math.floor(Math.random() * 10000)}`;
  const observerId = senderId; // ✅ ya puedes usarlo después de declararlo


// Mostrar el nombre del monitor desde Firestore
if (firebase && firebase.firestore && roomId) {
  const db = firebase.firestore();
  db.collection("salas").doc(roomId).get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const monitorText = document.getElementById("monitorName");
        if (monitorText) {
          monitorText.textContent = data.monitor || "Desconocido";
        }
      } else {
        console.warn("⚠️ Sala no encontrada en Firestore");
      }
    })
    .catch(err => {
      console.error("❌ Error al leer el nombre del monitor:", err);
    });
}



  // Cuando se abre la conexión
  socket.addEventListener("open", () => {
    console.log("👁️ Conectado al servidor WebSocket");

    const joinMsg = {
      type: "joinRoom",
      roomId: roomId,
      senderId: senderId,
    };

    socket.send(JSON.stringify(joinMsg));
    console.log("✅ Solicitud enviada para unirse a la sala:", joinMsg);
  });

  // Manejo de mensajes entrantes
  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📩 Mensaje recibido:", data);

      const roomIdText = document.getElementById("roomIdText");
      if (roomIdText) {
        roomIdText.textContent = roomId;
      }

      const monitorText = document.getElementById("monitorName");
      if (monitorText && data.senderId) {
        monitorText.textContent = data.senderId;
      }

      if (data.screenshot) {
        const screenshotImg = document.getElementById("monitorScreenshot");
        if (screenshotImg) {
          screenshotImg.src = data.screenshot;
        }
      }

    } catch (err) {
      console.error("❌ Error al procesar mensaje:", err);
    }
  });

const roomIdText = document.getElementById("roomIdText");
if (roomIdText && roomId) {
  roomIdText.textContent = roomId;
}


  socket.addEventListener("close", () => {
    console.log("🔌 Conexión cerrada");
  });

  socket.addEventListener("error", (err) => {
    console.error("⚠️ Error de WebSocket:", err);
  });

  console.log("🧪 ID del observador:", senderId);
});
