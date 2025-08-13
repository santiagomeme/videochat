// ==========================
// 🔹 VARIABLES GLOBALES
// ==========================
let peerConnection;
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const senderId = urlParams.get("senderId") || `obs_${Math.floor(Math.random() * 10000)}`;
const socket = new WebSocket("wss://e6e14acd-d62c-4d98-b810-643a81d486b5-00-2nju91dv3rww3.worf.replit.dev/");

// ==========================
// 🔹 CARGA DEL DOM
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const remoteVideo = document.getElementById("remoteVideo");

  // ==========================
  // 🔹 VALIDACIÓN DE roomId
  // ==========================
  if (!roomId) {
    mostrarModal("❌ No se proporcionó un ID de sala.");
    window.location.href = "ingreso-observador.html";
    return;
  }


  
  // ==========================
  // 🔹para detectar la llegada de RTCPeerConnection
  // ==========================
// 1️⃣ Observador para detectar cuando RTCPeerConnection es usado
(function() {
    const originalRTCPeerConnection = window.RTCPeerConnection;

    window.RTCPeerConnection = function(...args) {
        console.log("[ObservadorRTC] Se ha creado una conexión RTCPeerConnection con argumentos:", args);
        
        const pc = new originalRTCPeerConnection(...args);

        pc.addEventListener("connectionstatechange", () => {
            console.log("[ObservadorRTC] Estado de conexión:", pc.connectionState);
        });

        return pc;
    };
})();

// 2️⃣ Aquí puedes poner tu lógica normal de WebRTC
// Ejemplo: acceso a cámara/micrófono
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        console.log("[ObservadorRTC] Stream local obtenido", stream);
        const video = document.querySelector("video");
        if (video) {
            video.srcObject = stream;
        }
    })
    .catch(err => {
        console.error("[ObservadorRTC] Error al obtener cámara/micrófono:", err);
    });



  // ==========================
  // 🔹 EVENTO: Conexión WebSocket abierta
  // ==========================
  socket.onopen = () => {
    console.log("👁️ Conectado como Observador");
    socket.send(JSON.stringify({
      type: "watcher",
      roomId,
      senderId
    }));
  };

  // ==========================
  // 🔹 EVENTO: Mensajes recibidos del servidor
  // ==========================
  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("📩 Mensaje recibido:", message);

    switch (message.type) {
      case "offer":
        await handleOffer(message.offer, message.monitorId);
        break;

      case "candidate":
        if (peerConnection) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            console.log("➕ ICE candidate agregado");
          } catch (err) {
            console.warn("⚠️ Error al agregar ICE candidate:", err);
          }
        }
        break;
    }
  };

  // ==========================
  // 🔹 FUNCIÓN: Manejar Offer del monitor
  // ==========================
  async function handleOffer(offer, monitorId) {
    if (peerConnection) {
      peerConnection.close();
    }

    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    // 🔹 Detectar desconexiones y mostrar modal
    peerConnection.addEventListener("connectionstatechange", () => {
      console.log(`📡 Estado de conexión: ${peerConnection.connectionState}`);
      if (["disconnected", "failed", "closed"].includes(peerConnection.connectionState)) {
        mostrarModal("⚠️ El monitor se ha desconectado o la sala fue cerrada.");
      }
    });

    peerConnection.addEventListener("iceconnectionstatechange", () => {
      console.log(`🧊 ICE state: ${peerConnection.iceConnectionState}`);
      if (["disconnected", "failed"].includes(peerConnection.iceConnectionState)) {
        mostrarModal("⚠️ Conexión interrumpida con el monitor.");
      }
    });

    // 🔹 Recibir stream de video
    peerConnection.ontrack = event => {
      console.log("🎥 Recibiendo stream del monitor");
      remoteVideo.srcObject = event.streams[0];
    };

    // 🔹 Enviar ICE candidates al monitor
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
          roomId,
          senderId,
          targetId: monitorId
        }));
      }
    };

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.send(JSON.stringify({
        type: "answer",
        answer,
        roomId,
        senderId,
        targetId: monitorId
      }));

      console.log("✅ Enviada answer al monitor");
    } catch (err) {
      console.error("❌ Error al manejar offer:", err);
    }
  }

  // ==========================
  // 🔹 ACTUALIZAR CONTADOR DE OBSERVADORES EN FIRESTORE
  // ==========================
  if (firebase?.firestore && roomId) {
    const db = firebase.firestore();
    db.collection("salas").doc(roomId).update({
      observadores: firebase.firestore.FieldValue.increment(1)
    }).catch(err => {
      console.warn("⚠️ No se pudo aumentar contador de observadores:", err.message);
    });

    // 🔹 Reducir contador al salir o desconectarse
    const reducirContador = () => {
      db.collection("salas").doc(roomId).update({
        observadores: firebase.firestore.FieldValue.increment(-1)
      }).catch(err => {
        console.warn("⚠️ No se pudo disminuir contador de observadores:", err.message);
      });
    };

    window.addEventListener("beforeunload", reducirContador);
    socket.addEventListener("close", reducirContador);
  }
});

// ==========================
// 🔹 FUNCIÓN: Mostrar modal de error/desconexión
// ==========================
function mostrarModal(mensaje) {
  const modal = document.getElementById("modalError");
  const mensajeTexto = document.getElementById("modalMensaje");
  const btnCerrar = document.getElementById("cerrarModal");

  if (!modal || !mensajeTexto || !btnCerrar) {
    alert(mensaje);
    return;
  }

  mensajeTexto.textContent = mensaje;
  modal.style.display = "block";

  btnCerrar.onclick = () => {
    window.location.href = "ingreso-observador.html";
  };
}
