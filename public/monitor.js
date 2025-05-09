let localStream;
const socket = new WebSocket("wss://shrouded-star-apple.glitch.me");
const roomId = new URLSearchParams(window.location.search).get("roomId");
const monitorId = new URLSearchParams(window.location.search).get("monitorId");

const peerConnections = {}; // clave: observerId, valor: RTCPeerConnection

// Asegúrate de incluir <script src="ice.js"></script> antes en el HTML

document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("localVideo");
  const startButton = document.getElementById("startBroadcast");

  startButton.addEventListener("click", async () => {
    try {
      console.log("🎥 Solicitando acceso a cámara con getUserMedia...");
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      video.srcObject = localStream;

      // Avisar al servidor que el monitor se unió
      socket.send(JSON.stringify({
        type: "joinRoom",
        role: "monitor",
        roomId,
        senderId: monitorId
      }));

    } catch (err) {
      console.error("❌ Error al acceder a la cámara:", err);
    }
  });
});

// Manejo de mensajes entrantes
socket.onmessage = async (event) => {
  const msg = JSON.parse(event.data);
  console.log("📩 Mensaje recibido:", msg);

  if (msg.type === "watcher" && msg.roomId === roomId) {
    const observerId = msg.senderId;

    const peerConnection = new RTCPeerConnection(servers);
    peerConnections[observerId] = peerConnection;

    // Agregar tracks del stream local
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Enviar ICE candidates al servidor
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({
          type: "iceCandidate",
          candidate: event.candidate,
          roomId,
          senderId: monitorId,
          target: observerId
        }));
      }
    };

    // Crear oferta y enviarla al observador
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
      type: "offer",
      offer,
      roomId,
      senderId: monitorId,
      target: observerId
    }));
  }

  if (msg.type === "answer" && msg.roomId === roomId) {
    const observerId = msg.senderId;
    const peerConnection = peerConnections[observerId];
    if (peerConnection) {
      const remoteDesc = new RTCSessionDescription(msg.answer);
      await peerConnection.setRemoteDescription(remoteDesc);
    }
  }

  if (msg.type === "iceCandidate" && msg.roomId === roomId) {
    const observerId = msg.senderId;
    const peerConnection = peerConnections[observerId];
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch (err) {
        console.error("Error al agregar ICE Candidate:", err);
      }
    }
  }
};
