import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
  apiKey: "AIzaSyAORIZUCS_YSQ_KVYo5zHN1KR-Q7E5NvXg",
  authDomain: "seguridad-local.firebaseapp.com",
  databaseURL: "https://seguridad-local-default-rtdb.firebaseio.com",
  projectId: "seguridad-local",
  storageBucket: "seguridad-local.firebasestorage.app",
  messagingSenderId: "970137896310",
  appId: "1:970137896310:web:bcb2e58f84ba82872c6657",
  measurementId: "G-T9P73LW23Z"
};


// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Autenticación anónima
auth.signInAnonymously()
  .then(() => {
    console.log('Usuario autenticado de forma anónima');
  })
  .catch(error => {
    console.error('Error de autenticación:', error);
  });

// Elementos del DOM
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const createRoomBtn = document.getElementById('createRoom');
const joinRoomBtn = document.getElementById('joinRoom');
const roomIdInput = document.getElementById('roomIdInput');
const startCallBtn = document.getElementById('startCall');
const endCallBtn = document.getElementById('endCall');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const callControls = document.getElementById('callControls');

// Variables globales
let localStream;
let peerConnection;
let roomId;
let callDoc;
let offerCandidates;
let answerCandidates;

// Configuración STUN/TURN
const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // Puedes añadir tu propio servidor TURN aquí si lo configuras
  ]
};

// Función para iniciar la transmisión local
async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error('Error al acceder a la cámara o micrófono:', error);
  }
}

// Crear una nueva sala
createRoomBtn.addEventListener('click', async () => {
  await startLocalStream();
  
  // Crear un documento para la llamada
  callDoc = db.collection('calls').doc();
  roomId = callDoc.id;
  
  // Añadir la sala al input para que pueda ser compartida
  roomIdInput.value = roomId;
  
  offerCandidates = callDoc.collection('offerCandidates');
  answerCandidates = callDoc.collection('answerCandidates');
  
  // Crear Peer Connection
  peerConnection = new RTCPeerConnection(servers);
  
  // Añadir tracks locales a la conexión
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  
  // Manejar candidatos ICE
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      offerCandidates.add(event.candidate.toJSON());
    }
  };
  
  // Manejar stream remoto
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };
  
  // Crear oferta
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  // Guardar oferta en Firestore
  const roomWithOffer = {
    offer: {
      type: offer.type,
      sdp: offer.sdp,
    }
  };
  await callDoc.set(roomWithOffer);
  
  // Escuchar la respuesta
  callDoc.onSnapshot(snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const answer = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answer);
    }
  });
  
  // Escuchar candidatos ICE del otro peer
  answerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });
  
  // Mostrar controles de llamada
  callControls.style.display = 'block';
});

// Unirse a una sala existente
joinRoomBtn.addEventListener('click', async () => {
  roomId = roomIdInput.value;
  if (!roomId) {
    alert('Por favor, introduce un ID de sala válido');
    return;
  }
  
  await startLocalStream();
  
  callDoc = db.collection('calls').doc(roomId);
  const callData = await callDoc.get();
  if (!callData.exists) {
    alert('La sala no existe');
    return;
  }
  
  offerCandidates = callDoc.collection('offerCandidates');
  answerCandidates = callDoc.collection('answerCandidates');
  
  // Crear Peer Connection
  peerConnection = new RTCPeerConnection(servers);
  
  // Añadir tracks locales a la conexión
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  
  // Manejar candidatos ICE
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      answerCandidates.add(event.candidate.toJSON());
    }
  };
  
  // Manejar stream remoto
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };
  
  // Obtener oferta y establecer como remote description
  const call = callData.data();
  const offer = call.offer;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  
  // Crear respuesta
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  // Guardar respuesta en Firestore
  const roomWithAnswer = {
    answer: {
      type: answer.type,
      sdp: answer.sdp,
    }
  };
  await callDoc.update(roomWithAnswer);
  
  // Escuchar candidatos ICE del otro peer
  offerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });
  
  // Mostrar controles de llamada
  callControls.style.display = 'block';
});

// Iniciar la llamada (solo para el creador de la sala)
startCallBtn.addEventListener('click', () => {
  console.log('Llamada iniciada');
  // Puedes añadir lógica adicional si es necesario
});

// Finalizar la llamada
endCallBtn.addEventListener('click', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
  }
  // Opcional: eliminar la sala de Firestore
  if (roomId) {
    db.collection('calls').doc(roomId).delete()
      .then(() => console.log('Sala eliminada'))
      .catch(error => console.error('Error al eliminar la sala:', error));
  }
  callControls.style.display = 'none';
});

// Enviar mensaje al chat
sendMessageBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    db.collection('messages').add({
      text: message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      roomId: roomId || '',
      uid: auth.currentUser.uid
    });
    messageInput.value = '';
  }
});

// Mostrar mensajes en tiempo real
db.collection('messages')
  .where('roomId', '==', roomId)
  .orderBy('timestamp')
  .onSnapshot(snapshot => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const message = doc.data();
      const div = document.createElement('div');
      div.textContent = message.text;
      messagesDiv.appendChild(div);
    });
  });

// Manejar cambios en el ID de la sala para el chat
roomIdInput.addEventListener('input', () => {
  const currentRoomId = roomIdInput.value;
  db.collection('messages')
    .where('roomId', '==', currentRoomId)
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const message = doc.data();
        const div = document.createElement('div');
        div.textContent = message.text;
        messagesDiv.appendChild(div);
      });
    });
});
