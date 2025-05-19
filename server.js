const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initP2PServer, broadcastBlock, broadcastTransaction } = require('./p2p');

const app = express();
const PORT = process.env.PORT || 3000;

// طباعة المسار الكامل للملفات
const blockchainFile = path.join(__dirname, 'blockchain.json');
const usersFile = path.join(__dirname, 'users.json');

console.log('Blockchain file path:', blockchainFile);
console.log('Users file path:', usersFile);

let users = {};
let blockchain = [];
let pendingTransactions = [];
let validatedTransactions = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware للتحقق من الأخطاء
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// إضافة دالة للتأكد من وجود الملفات
function ensureFilesExist() {
    console.log('Checking if files exist...');
    
    if (!fs.existsSync(blockchainFile)) {
        console.log('Creating new blockchain file at:', blockchainFile);
        const genesisBlock = createGenesisBlock();
        fs.writeFileSync(blockchainFile, JSON.stringify([genesisBlock], null, 4));
        console.log('Blockchain file created successfully');
    } else {
        console.log('Blockchain file exists at:', blockchainFile);
    }

    if (!fs.existsSync(usersFile)) {
        console.log('Creating new users file at:', usersFile);
        fs.writeFileSync(usersFile, JSON.stringify({
            "admin": {
                "password": "root",
                "isAdmin": true
            },
            "miner1": {
                "password": "minerpass1",
                "balance": 10,
                "isMiner": true
            }
        }, null, 4));
        console.log('Users file created successfully');
    } else {
        console.log('Users file exists at:', usersFile);
    }
}

// تحميل البيانات عند بدء التشغيل
async function initializeServer() {
    try {
        ensureFilesExist(); // التأكد من وجود الملفات
        await loadUsers();
        await loadBlockchain();
        console.log('✅ Server initialized successfully');
    } catch (err) {
        console.error('❌ Error during initialization:', err);
        process.exit(1);
    }
}

// Helper Functions
async function loadUsers() {
    try {
        if (fs.existsSync(usersFile)) {
            const data = await fs.promises.readFile(usersFile, 'utf8');
            users = JSON.parse(data);
            console.log('✅ Users loaded successfully');
        } else {
            throw new Error("Users file not found!");
        }
    } catch (err) {
        console.error("❌ Error loading users:", err);
        throw err;
    }
}

async function loadBlockchain() {
    try {
        if (fs.existsSync(blockchainFile)) {
            const data = await fs.promises.readFile(blockchainFile, 'utf8');
            blockchain = JSON.parse(data);
            console.log('✅ Blockchain loaded successfully');
        } else {
            blockchain = [createGenesisBlock()];
            await saveBlockchain();
            console.log('✅ New blockchain created');
        }
    } catch (err) {
        console.error("❌ Error loading blockchain:", err);
        blockchain = [createGenesisBlock()];
        await saveBlockchain();
    }
}

async function saveBlockchain() {
    try {
        await fs.promises.writeFile(blockchainFile, JSON.stringify(blockchain, null, 4));
        console.log('✅ Blockchain saved successfully');
    } catch (err) {
        console.error("❌ Error saving blockchain:", err);
        throw err;
    }
}

function createGenesisBlock() {
    return {
        index: 0,
        timestamp: new Date().toISOString(),
        sender: "system",
        receiver: "genesis",
        amount: 0,
        previousHash: "0",
        hash: calculateHash({
            index: 0,
            timestamp: new Date().toISOString(),
            sender: "system",
            receiver: "genesis",
            amount: 0,
            previousHash: "0"
        })
    };
}

function calculateHash(block) {
    const txData = block.transactions ? JSON.stringify(block.transactions) : '';
    const str = `${block.index}${block.timestamp}${txData}${block.sender || ''}${block.receiver || ''}${block.amount || ''}${block.previousHash}`;
    return crypto.createHash('sha256').update(str).digest('hex');
}

function calculateBalance(username, chain) {
    let balance = 0;
    for (const block of chain) {
        if (block.sender === username) balance -= block.amount || 0;
        if (block.receiver === username) balance += block.amount || 0;

        if (Array.isArray(block.transactions)) {
            for (const tx of block.transactions) {
                if (tx.sender === username) balance -= tx.amount || 0;
                if (tx.receiver === username) balance += tx.amount || 0;
            }
        }
    }
    return balance;
}

// API Routes
app.post('/api/login', (req, res) => {
    console.log('Login attempt received:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Missing credentials');
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    try {
        console.log('Reading users file from:', usersFile);
        
        // التحقق من وجود الملف
        if (!fs.existsSync(usersFile)) {
            console.error('Users file does not exist at:', usersFile);
            return res.status(500).json({
                success: false,
                message: 'System configuration error'
            });
        }

        // قراءة ملف المستخدمين
        const usersData = fs.readFileSync(usersFile, 'utf8');
        console.log('Raw users data:', usersData);
        
        let users;
        try {
            users = JSON.parse(usersData);
            console.log('Parsed users data:', users);
        } catch (parseError) {
            console.error('Error parsing users file:', parseError);
            return res.status(500).json({
                success: false,
                message: 'System configuration error'
            });
        }

        // التحقق من وجود المستخدم
        if (!users[username]) {
            console.log('User not found:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        console.log('Found user:', users[username]);

        // التحقق من كلمة المرور
        if (users[username].password !== password) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        console.log('Login successful for user:', username);
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                username: username,
                isMiner: users[username].isMiner || false
            }
        });
    } catch (error) {
        console.error('Login error details:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

app.get('/api/user-exists/:username', (req, res) => {
    res.json({ exists: !!users[req.params.username] });
});

app.get('/api/balance/:username', (req, res) => {
    const username = req.params.username;
    if (!users[username]) return res.status(404).json({ error: "User not found" });
    res.json({ balance: calculateBalance(username, blockchain) });
});

app.get('/api/balance', (req, res) => {
    const username = req.query.user;
    if (!username || !users[username]) return res.status(404).json({ error: "User not found" });
    res.json({ balance: calculateBalance(username, blockchain) });
});

app.get('/api/transactions/:username', (req, res) => {
    const username = req.params.username;
    const transactions = [];

    for (const block of blockchain) {
        if (block.sender === username || block.receiver === username) {
            transactions.push({ ...block, status: 'Completed' });
        }

        if (Array.isArray(block.transactions)) {
            for (const tx of block.transactions) {
                if (tx.sender === username || tx.receiver === username) {
                    transactions.push({ ...tx, status: 'Completed', blockIndex: block.index });
                }
            }
        }
    }

    res.json(transactions);
});

app.get('/api/users', (req, res) => {
    const { admin } = req.query;
    if (!users[admin]?.isAdmin) return res.status(403).json({ error: "Unauthorized" });

    const result = {};
    for (const [u, data] of Object.entries(users)) {
        result[u] = { ...data };
        delete result[u].password;
    }
    res.json(result);
});

app.post('/api/transactions', (req, res) => {
    const { sender, receiver, amount } = req.body;
    if (!users[sender] || !users[receiver]) return res.status(400).json({ error: "Invalid sender or receiver" });

    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }

    if (calculateBalance(sender, blockchain) < floatAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
    }

    const tx = {
        sender,
        receiver,
        amount: floatAmount,
        timestamp: new Date().toISOString()
    };
    pendingTransactions.push(tx);
    broadcastTransaction(tx);
    res.json({ success: true, message: "Transaction added to pending queue", tx });
});

app.post('/api/mine', (req, res) => {
    const { miner } = req.body;
    if (!users[miner]) return res.status(400).json({ error: "Invalid miner" });
    if (pendingTransactions.length === 0) return res.status(400).json({ error: "No pending transactions" });

    const previousBlock = blockchain[blockchain.length - 1];
    const block = {
        index: blockchain.length,
        timestamp: new Date().toISOString(),
        transactions: [...pendingTransactions],
        previousHash: previousBlock.hash
    };
    block.hash = calculateHash(block);
    blockchain.push(block);

    // إضافة المعاملات المصدقة إلى مصفوفة validatedTransactions
    const validatedTxs = pendingTransactions.map(tx => ({
        ...tx,
        type: 'Transfer',
        status: 'confirmed',
        blockIndex: block.index,
        hash: block.hash,
        timestamp: new Date().toISOString(),
        validatedBy: miner
    }));
    validatedTransactions.push(...validatedTxs);

    broadcastBlock(block);
    pendingTransactions = [];

    const rewardBlock = {
        index: blockchain.length,
        timestamp: new Date().toISOString(),
        sender: "system",
        receiver: miner,
        amount: 10,
        previousHash: block.hash
    };
    rewardBlock.hash = calculateHash(rewardBlock);
    blockchain.push(rewardBlock);
    broadcastBlock(rewardBlock);

    saveBlockchain();
    res.json({ success: true, minedBlock: block, rewardBlock });
});

app.get('/api/pending', (req, res) => {
    res.json(pendingTransactions);
});

app.post('/api/connect', (req, res) => {
    const { peer } = req.body;
    if (!peer) return res.status(400).json({ error: "Peer URL is required" });
    require('./p2p').connectToPeer(peer, blockchain, pendingTransactions);
    res.json({ message: `Connecting to peer: ${peer}` });
});

// إضافة نقطة نهاية جديدة لعرض سجل المعاملات
app.get('/api/transactions', (req, res) => {
    console.log('Received request for transactions');
    try {
        // التأكد من وجود الملف
        if (!fs.existsSync(blockchainFile)) {
            console.error('Blockchain file not found at:', blockchainFile);
            console.log('Attempting to create blockchain file...');
            ensureFilesExist();
            console.log('Returning empty array as blockchain file was just created');
            return res.json([]);
        }

        console.log('Reading blockchain file...');
        // قراءة الملف مع معالجة الأخطاء
        let blockchainData;
        try {
            const fileContent = fs.readFileSync(blockchainFile, 'utf8');
            console.log('File content length:', fileContent.length);
            blockchainData = JSON.parse(fileContent);
            console.log('Successfully parsed blockchain data');
        } catch (readError) {
            console.error('Error reading blockchain file:', readError);
            console.log('Returning empty array due to read error');
            return res.json([]);
        }

        // التحقق من صحة البيانات
        if (!Array.isArray(blockchainData)) {
            console.error('Invalid blockchain data format. Data type:', typeof blockchainData);
            console.log('Returning empty array due to invalid data format');
            return res.json([]);
        }

        console.log('Processing transactions...');
        // جمع جميع المعاملات من البلوكتشين
        const allTransactions = blockchainData.flatMap(block => {
            const transactions = [];
            // إضافة المعاملة الرئيسية للبلوك
            if (block.sender && block.receiver) {
                transactions.push({
                    ...block,
                    type: 'Transfer',
                    status: 'confirmed',
                    blockIndex: block.index
                });
            }
            // إضافة المعاملات الإضافية في البلوكتشين
            if (Array.isArray(block.transactions)) {
                transactions.push(...block.transactions.map(tx => ({
                    ...tx,
                    type: 'Transfer',
                    status: 'confirmed',
                    blockIndex: block.index
                })));
            }
            return transactions;
        });

        console.log('Found', allTransactions.length, 'confirmed transactions');
        
        // جمع المعاملات المعلقة
        const pendingTransactions = pendingTransactions.map(tx => ({
            ...tx,
            type: 'Transfer',
            status: 'pending',
            blockIndex: null
        }));

        console.log('Found', pendingTransactions.length, 'pending transactions');

        // دمج وترتيب جميع المعاملات
        const allTransactionsSorted = [...allTransactions, ...pendingTransactions]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // إضافة معلومات إضافية لكل معاملة
        const enrichedTransactions = allTransactionsSorted.map(tx => ({
            ...tx,
            hash: tx.hash || 'N/A',
            timestamp: tx.timestamp || new Date().toISOString(),
            amount: tx.amount || 0,
            sender: tx.sender || 'Unknown',
            receiver: tx.receiver || 'Unknown'
        }));

        console.log(`Successfully processed ${enrichedTransactions.length} total transactions`);
        res.json(enrichedTransactions);
    } catch (error) {
        console.error('Error in /api/transactions:', error);
        console.log('Returning empty array due to general error');
        res.json([]);
    }
});

// Frontend routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/client', (req, res) => res.sendFile(path.join(__dirname, 'public', 'client.html')));
app.get('/miner', (req, res) => res.sendFile(path.join(__dirname, 'public', 'miner.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// إضافة نقطة نهاية جديدة للحصول على معاملات مستخدم معين
app.get('/api/user-transactions/:username', (req, res) => {
    try {
        const username = req.params.username;
        console.log(`Fetching transactions for user: ${username}`);

        // تصفية المعاملات المصدقة للمستخدم
        const userTransactions = validatedTransactions.filter(tx => 
            tx.sender === username || tx.receiver === username
        );

        // ترتيب المعاملات حسب التاريخ (الأحدث أولاً)
        const sortedTransactions = userTransactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`Found ${sortedTransactions.length} transactions for user ${username}`);
        res.json(sortedTransactions);
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        res.status(500).json({ error: 'Failed to fetch user transactions' });
    }
});

// إضافة نقطة نهاية جديدة لعرض جميع المعاملات للمعدن
app.get('/api/all-transactions', (req, res) => {
    try {
        console.log('Fetching all transactions');
        const blockchainData = JSON.parse(fs.readFileSync(blockchainFile, 'utf8'));
        
        // جمع جميع المعاملات من البلوكتشين
        const allTransactions = blockchainData.flatMap(block => {
            const transactions = [];
            if (block.sender && block.receiver) {
                transactions.push({
                    ...block,
                    type: 'Transfer',
                    status: 'confirmed',
                    blockIndex: block.index
                });
            }
            if (Array.isArray(block.transactions)) {
                transactions.push(...block.transactions.map(tx => ({
                    ...tx,
                    type: 'Transfer',
                    status: 'confirmed',
                    blockIndex: block.index
                })));
            }
            return transactions;
        });

        // إضافة المعاملات المعلقة
        const pendingTransactions = pendingTransactions.map(tx => ({
            ...tx,
            type: 'Transfer',
            status: 'pending',
            blockIndex: null
        }));

        // دمج وترتيب جميع المعاملات
        const allTransactionsSorted = [...allTransactions, ...pendingTransactions]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // إضافة معلومات إضافية لكل معاملة
        const enrichedTransactions = allTransactionsSorted.map(tx => ({
            ...tx,
            hash: tx.hash || 'N/A',
            timestamp: tx.timestamp || new Date().toISOString(),
            amount: tx.amount || 0,
            sender: tx.sender || 'Unknown',
            receiver: tx.receiver || 'Unknown'
        }));

        console.log(`Found ${enrichedTransactions.length} total transactions`);
        res.json(enrichedTransactions);
    } catch (error) {
        console.error('Error fetching all transactions:', error);
        res.status(500).json({ error: 'Failed to fetch all transactions' });
    }
});

// تعديل نقطة النهاية لعرض المعاملات المصدقة
app.get('/api/validated-transactions', (req, res) => {
    try {
        console.log('Fetching validated transactions...');
        console.log('Number of validated transactions:', validatedTransactions.length);
        
        // ترتيب المعاملات حسب التاريخ (الأحدث أولاً)
        const sortedTransactions = [...validatedTransactions]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log('Sending response with', sortedTransactions.length, 'transactions');
        res.json(sortedTransactions);
    } catch (error) {
        console.error('Error fetching validated transactions:', error);
        res.status(500).json({ error: 'Failed to fetch validated transactions' });
    }
});

// Start server
initializeServer().then(() => {
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
