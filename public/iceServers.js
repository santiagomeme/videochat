const servers = {
  iceServers: [
    {
      urls: ["stun:us-turn4.xirsys.com"]
    },
    {
      username: "5Puc5190jowTXs4JVauIncEqZtscY6TmaI11CKPWLJfML-GAuHcVGW9QWs0QNLtqAAAAAGdPNExzYW50aWFnbw==",
      credential: "3103762c-b195-11ef-9520-0242ac140004",
      urls: [
        "turn:us-turn4.xirsys.com:80?transport=udp",
        "turn:us-turn4.xirsys.com:3478?transport=udp",
        "turn:us-turn4.xirsys.com:80?transport=tcp",
        "turn:us-turn4.xirsys.com:3478?transport=tcp",
        "turns:us-turn4.xirsys.com:443?transport=tcp",
        "turns:us-turn4.xirsys.com:5349?transport=tcp"
      ]
    }
  ]
};
