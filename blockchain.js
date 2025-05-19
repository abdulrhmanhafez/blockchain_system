const crypto = require('crypto');

// ======= Pending Transactions Queue =======
let pendingTransactions = []; // ستُستخدم في عملية التعدين

// ======= Create Genesis Block =======
function createGenesisBlock() {
    return {
        index: 0,
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'UTC' }),
        sender: "none",
        receiver: "none",
        amount: 0,
        previousHash: "0",
        nonce: 0,
        hash: "genesis"
    };
}

// ======= Hash Calculation =======
function calculateHash(block) {
    const str = `${block.index}${block.timestamp}${block.sender}${block.receiver}${block.amount}${block.previousHash}${block.nonce}`;
    return crypto.createHash('sha256').update(str).digest('hex');
}

// ======= Mining Function (Proof of Work) =======
function minePendingTransactions(minerAddress, blockchain, difficulty = 3) {
    if (pendingTransactions.length === 0) return null;

    const lastBlock = blockchain[blockchain.length - 1];
    const reward = 1;

    // Add reward transaction to the queue
    pendingTransactions.push({
        sender: "system",
        receiver: minerAddress,
        amount: reward
    });

    const block = {
        index: blockchain.length,
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'UTC' }),
        transactions: pendingTransactions,
        previousHash: lastBlock.hash,
        nonce: 0,
        hash: ""
    };

    // Proof of Work
    do {
        block.hash = calculateHash(block);
        block.nonce++;
    } while (!block.hash.startsWith("0".repeat(2)));
    

    // Add mined block to the chain
    blockchain.push(block);
    pendingTransactions = []; // Clear queue after mining

    return block;
}

// ======= Add Transaction =======
function addTransaction(transaction) {
    if (!transaction.sender || !transaction.receiver || typeof transaction.amount !== 'number') {
        throw new Error("Invalid transaction format.");
    }
    pendingTransactions.push(transaction);
}

// ======= Calculate Balance =======
function calculateBalance(user, blockchain) {
    let balance = 0;

    for (const block of blockchain) {
        const transactions = block.transactions || [block]; // handle genesis block
        for (const tx of transactions) {
            if (tx.sender === user) balance -= tx.amount;
            if (tx.receiver === user) balance += tx.amount;
        }
    }

    return balance;
}

// ======= Export Functions =======
module.exports = {
    createGenesisBlock,
    calculateHash,
    calculateBalance,
    minePendingTransactions,
    addTransaction,
    pendingTransactions
};