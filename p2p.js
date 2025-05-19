const WebSocket = require('ws');
const peers = [];

const MESSAGE_TYPES = {
  CHAIN: 'CHAIN',
  TRANSACTION: 'TRANSACTION',
  BLOCK: 'BLOCK'
};

function initP2PServer(blockchain, pendingTransactions, port = 6001) {
  const server = new WebSocket.Server({ port });

  server.on('connection', (ws) => {
    peers.push(ws);
    console.log("🔗 New peer connected");

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      handleMessage(ws, data, blockchain, pendingTransactions);
    });

    ws.send(JSON.stringify({ type: MESSAGE_TYPES.CHAIN, data: blockchain }));
  });

  console.log(`🟢 P2P Server running on ws://localhost:${port}`);
}

function connectToPeer(address, blockchain, pendingTransactions) {
  const ws = new WebSocket(address);
  ws.on('open', () => {
    peers.push(ws);
    console.log(`✅ Connected to peer: ${address}`);

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      handleMessage(ws, data, blockchain, pendingTransactions);
    });

    ws.send(JSON.stringify({ type: MESSAGE_TYPES.CHAIN, data: blockchain }));
  });

  ws.on('error', (err) => {
    console.error(`❌ Failed to connect to peer: ${address}`, err.message);
  });
}

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  peers.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

function handleMessage(ws, message, blockchain, pendingTransactions) {
  switch (message.type) {
    case MESSAGE_TYPES.CHAIN:
      if (message.data.length > blockchain.length) {
        console.log("⛓️ Received longer chain, syncing...");
        blockchain.splice(0, blockchain.length, ...message.data);
      }
      break;
    case MESSAGE_TYPES.TRANSACTION:
      pendingTransactions.push(message.data);
      broadcast(MESSAGE_TYPES.TRANSACTION, message.data);
      break;
    case MESSAGE_TYPES.BLOCK:
      blockchain.push(message.data);
      broadcast(MESSAGE_TYPES.BLOCK, message.data);
      break;
  }
}

// ✅ تصدير دوال مخصصة
module.exports = {
  initP2PServer,
  connectToPeer,
  broadcastBlock: (block) => broadcast(MESSAGE_TYPES.BLOCK, block),
  broadcastTransaction: (tx) => broadcast(MESSAGE_TYPES.TRANSACTION, tx)
};