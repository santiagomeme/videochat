document.addEventListener("DOMContentLoaded", () => {
  const socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("roomId");
  let senderId = urlParams.get("senderId") || `obs_${Math.floor(Math.random() * 10000)}`;
  let nombre = urlParams.get("nombre") || "Observador";

  // Guardar senderId en localStorage para reconexiones
  const savedId = localStorage.getItem("senderId");
  if (!savedId) {
    localStorage.setItem("senderId", senderId);
  } else {
    senderId = savedId;
  }

  // Mostrar el nombre del observador en pantalla
  const nombreSpan = document.getElementById("observerName");
  if (nombreSpan) {
    nombreSpan.textContent = decodeURIComponent(nombre);
  }

  // Mostrar el nombre del monitor desde Firestore
  if (firebase && firebase.firestore && roomId) {
    const db = firebase.firestore();
    db.collection("salas").doc(roomId).get()
      .then(doc => {
        if (doc.exists) {
          const data = doc.data();
          const monitorText = document.getElementById("monitorName");
          if (monitorText) monitorText.textContent = data.monitor || "Desconocido";
        } else {
          console.warn("⚠️ Sala no encontrada en Firestore");
        }
      })
      .catch(err => {
        console.error("❌ Error al leer el nombre del monitor:", err);
      });
  }

  // WebSocket abierto
  socket.addEventListener("open", () => {
    console.log("👁️ Conectado al servidor WebSocket");

    const joinMsg = {
      type: "joinRoom",
      role: "observer",
      roomId,
      senderId,
      nombre // 👈 Enviar nombre del observador
    };

    socket.send(JSON.stringify(joinMsg));
    console.log("✅ Enviada solicitud para unirse:", joinMsg);
  });

  // Mensajes entrantes
  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📩 Mensaje recibido:", data);

      const roomIdText = document.getElementById("roomIdText");
      if (roomIdText && roomId) roomIdText.textContent = roomId;

      if (data.screenshot) {
        const screenshotImg = document.getElementById("monitorScreenshot");
        if (screenshotImg) {
          screenshotImg.src = data.screenshot;
        }
      }

    } catch (err) {
      console.error("❌ Error procesando mensaje:", err);
    }
  });

  socket.addEventListener("close", () => {
    console.log("🔌 WebSocket cerrado");
  });

  socket.addEventListener("error", (err) => {
    console.error("⚠️ Error en WebSocket:", err);
  });

  // Mostrar nombre autenticado si existe
  firebase.auth().onAuthStateChanged(user => {
    const estadoSesion = document.getElementById("estadoSesion");
    if (estadoSesion) {
      if (user) {
        nombre = user.displayName || nombre;
        estadoSesion.textContent = `✅ Autenticado como: ${nombre} (UID: ${user.uid})`;
        estadoSesion.style.color = "green";
      } else {
        estadoSesion.textContent = "❌ No autenticado. Es necesario iniciar sesión.";
        estadoSesion.style.color = "red";
      }
    }
  });

  console.log("🧪 ID del observador:", senderId);
});
