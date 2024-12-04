async function startLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error('Error al acceder a la cámara o micrófono:', error);
  }
}


const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};


const callDoc = db.collection('calls').doc(); // Crea un ID único para la llamada
const offerCandidates = callDoc.collection('offerCandidates');
const answerCandidates = callDoc.collection('answerCandidates');



const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

await callDoc.set({ offer: peerConnection.localDescription.toJSON() });


callDoc.onSnapshot(snapshot => {
  const data = snapshot.data();
  if (data?.answer) {
    const remoteDesc = new RTCSessionDescription(data.answer);
    peerConnection.setRemoteDescription(remoteDesc);
  }
});



peerConnection.onicecandidate = event => {
  if (event.candidate) {
    offerCandidates.add(event.candidate.toJSON());
  }
};


answerCandidates.onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const candidate = new RTCIceCandidate(change.doc.data());
      peerConnection.addIceCandidate(candidate);
    }
  });
});


firebase.auth().signInAnonymously()
  .then(() => console.log('Usuario autenticado'))
  .catch(error => console.error('Error de autenticación:', error));



  peerConnection.oniceconnectionstatechange = () => {
    if (peerConnection.iceConnectionState === 'failed') {
      console.error('La conexión ICE falló');
    }
  };
  