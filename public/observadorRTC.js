let peerConnection;
const roomId = new URLSearchParams(window.location.search).get("roomId");
const senderId = new URLSearchParams(window.location.search).get("senderId"); // Observador
const socket = new WebSocket("wss://shrouded-star-apple.glitch.me");

// Asegúrate de tener <script src="ice.js"></script> incluido antes en el HTML

document.addEventListener("DOMContentLoaded", () => {
  const remoteVideo = document.getElementById("remoteVideo");

  socket.onopen = () => {
    console.log("👁️ Conectado como Observador");
    socket.send(JSON.stringify({
      type: "watcher",
      roomId,
      senderId
    }));
  };

  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("📩 Mensaje recibido:", message);

    if (message.type === "offer") {
      const monitorId = message.monitorId;

      peerConnection = new RTCPeerConnection(servers);

      peerConnection.ontrack = event => {
        console.log("🎥 Recibiendo stream del monitor");
        remoteVideo.srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.send(JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            roomId,
            senderId,
            target: monitorId
          }));
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.send(JSON.stringify({
        type: "answer",
        answer,
        roomId,
        senderId,
        target: monitorId
      }));
    }

    if (message.type === "iceCandidate" && peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      } catch (err) {
        console.error("❌ Error al añadir ICE candidate:", err);
      }
    }
  };
});
