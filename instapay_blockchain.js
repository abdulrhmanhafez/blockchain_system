const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');

const blockchainFile = 'blockchain.json';
const usersFile = 'users.json';

let users = {};
let blockchain = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// تحميل بيانات المستخدمين
function loadUsers() {
    try {
        if (fs.existsSync(usersFile)) {
            const data = fs.readFileSync(usersFile, 'utf8');
            users = JSON.parse(data);
        } else {
            console.log("Creating new users file...");
            users = {
                admin: {
                    password: crypto.createHash('sha256').update('admin123').digest('hex'),
                    balance: 1000,
                    isAdmin: true
                },
                user1: {
                    password: crypto.createHash('sha256').update('pass123').digest('hex'),
                    balance: 500,
                    isAdmin: false
                }
            };
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 4));
        }
    } catch (err) {
        console.error("Error loading users:", err);
        process.exit(1);
    }
}

// تحميل البلوك تشين من الملف
function loadBlockchain() {
    try {
        if (fs.existsSync(blockchainFile)) {
            const data = fs.readFileSync(blockchainFile, 'utf8');
            blockchain = JSON.parse(data);
        } else {
            const genesis = createGenesisBlock();
            blockchain = [genesis];
            saveBlockchain();
        }
    } catch (err) {
        console.error("Error loading blockchain:", err);
        process.exit(1);
    }
}

// حفظ البلوك تشين
function saveBlockchain() {
    try {
        fs.writeFileSync(blockchainFile, JSON.stringify(blockchain, null, 4));
    } catch (err) {
        console.error("Error saving blockchain:", err);
    }
}

// إنشاء أول بلوك
function createGenesisBlock() {
    return {
        index: 0,
        timestamp: new Date().toISOString(),
        sender: "system",
        receiver: "admin",
        amount: 1000,
        previousHash: "0",
        hash: crypto.createHash('sha256').update("genesis").digest('hex')
    };
}

// حساب الهاش
function calculateHash(block) {
    const str = `${block.index}${block.timestamp}${block.sender}${block.receiver}${block.amount}${block.previousHash}`;
    return crypto.createHash('sha256').update(str).digest('hex');
}

// إنشاء بلوك جديد
function createBlock(sender, receiver, amount) {
    if (amount <= 0) {
        console.log("❌ Amount must be positive");
        return false;
    }

    const previousBlock = blockchain[blockchain.length - 1];
    const block = {
        index: blockchain.length,
        timestamp: new Date().toISOString(),
        sender,
        receiver,
        amount,
        previousHash: previousBlock.hash
    };
    block.hash = calculateHash(block);
    blockchain.push(block);
    saveBlockchain();
    return true;
}

// حساب الرصيد
function calculateBalance(user) {
    if (!users[user]) return 0;
    
    let balance = users[user].balance || 0;
    for (const block of blockchain) {
        if (block.sender === user) balance -= block.amount;
        if (block.receiver === user) balance += block.amount;
    }
    return balance;
}

// عرض البلوك تشين
function showBlockchain(user) {
    console.log("\n=== Blockchain ===");
    blockchain.forEach(block => {
        if (user === 'admin') {
            console.log(JSON.stringify(block, null, 4));
        } else {
            const { hash, previousHash, ...blockWithoutHashes } = block;
            console.log(JSON.stringify(blockWithoutHashes, null, 4));
        }
    });
}

// تسجيل الدخول
function login(callback) {
    rl.question("Username: ", username => {
        rl.question("Password: ", password => {
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            if (users[username] && users[username].password === hashedPassword) {
                if (users[username].isAdmin) {
                    adminDashboard();
                } else {
                    callback(username);
                }
            } else {
                console.log("❌ Invalid credentials.");
                login(callback);
            }
        });
    });
}

// تحويل الأموال
function sendMoney(sender, callback) {
    rl.question("Send to: ", receiver => {
        if (!users[receiver]) {
            console.log("❌ User not found.");
            return callback();
        }
        if (sender === receiver) {
            console.log("❌ Cannot send to yourself.");
            return callback();
        }
        rl.question("Amount: ", amt => {
            const amount = parseFloat(amt);
            if (isNaN(amount) || amount <= 0) {
                console.log("❌ Invalid amount.");
                return callback();
            }
            const senderBalance = calculateBalance(sender);
            if (amount > senderBalance) {
                console.log("❌ Insufficient balance.");
            } else {
                if (createBlock(sender, receiver, amount)) {
                    console.log("✅ Transaction successful!");
                }
            }
            callback();
        });
    });
}

// سحب الأموال
function withdrawMoney(user, callback) {
    rl.question("Withdraw amount: ", amt => {
        const amount = parseFloat(amt);
        if (isNaN(amount) || amount <= 0) {
            console.log("❌ Invalid amount.");
            return callback();
        }
        const balance = calculateBalance(user);
        if (amount > balance) {
            console.log("❌ Insufficient funds.");
        } else {
            if (createBlock(user, "ATM", amount)) {
                console.log(`💸 Withdrawal of ${amount} successful.`);
            }
        }
        callback();
    });
}

// واجهة المستخدم
function dashboard(user) {
    console.log(`\n👤 Logged in as: ${user}`);
    console.log("1. Send Money");
    console.log("2. View Balance");
    console.log("3. View Blockchain");
    console.log("4. Withdraw Money");
    console.log("5. Exit");

    rl.question("Choose: ", choice => {
        switch (choice) {
            case "1":
                sendMoney(user, () => dashboard(user));
                break;
            case "2":
                const bal = calculateBalance(user);
                console.log(`💰 Your balance: ${bal}`);
                dashboard(user);
                break;
            case "3":
                showBlockchain(user);
                dashboard(user);
                break;
            case "4":
                withdrawMoney(user, () => dashboard(user));
                break;
            case "5":
                console.log("👋 Goodbye!");
                rl.close();
                break;
            default:
                console.log("❌ Invalid choice.");
                dashboard(user);
        }
    });
}

// لوحة تحكم الأدمن
function adminDashboard() {
    console.log("\n🛠 Admin Panel");
    console.log("1. View all users");
    console.log("2. Edit user balance");
    console.log("3. View blockchain (with hashes)");
    console.log("4. Exit");

    rl.question("Choose: ", choice => {
        switch (choice) {
            case "1":
                console.log("\n📋 Users:");
                console.log(JSON.stringify(users, null, 4));
                adminDashboard();
                break;
            case "2":
                rl.question("Enter username to edit: ", uname => {
                    if (users[uname]) {
                        rl.question("New balance: ", bal => {
                            const newBalance = parseFloat(bal);
                            if (isNaN(newBalance)) {
                                console.log("❌ Invalid amount.");
                            } else {
                                users[uname].balance = newBalance;
                                fs.writeFileSync(usersFile, JSON.stringify(users, null, 4));
                                console.log("✅ Balance updated.");
                            }
                            adminDashboard();
                        });
                    } else {
                        console.log("❌ User not found.");
                        adminDashboard();
                    }
                });
                break;
            case "3":
                showBlockchain('admin');
                adminDashboard();
                break;
            case "4":
                console.log("👋 Goodbye, admin!");
                rl.close();
                break;
            default:
                console.log("❌ Invalid choice.");
                adminDashboard();
        }
    });
}

// البداية
function main() {
    loadUsers();
    loadBlockchain();
    console.log("🚀 Welcome to Secure Blockchain System");
    login(dashboard);
}

main();
