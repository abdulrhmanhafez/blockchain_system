# InstaPay - Blockchain-Based Payment System

InstaPay is a web-based blockchain payment system that allows users to make secure transactions and miners to validate them. The system implements a simplified version of blockchain technology with features like transaction validation, mining rewards, and real-time transaction history.

## Features

### For Regular Users
- Secure login system
- View account balance
- Send payments to other users
- View personal transaction history
- Real-time transaction status updates

### For Miners
- Validate pending transactions
- Earn mining rewards
- View all network transactions
- Monitor blockchain status

### System Features
- Blockchain-based transaction validation
- Real-time transaction processing
- Secure user authentication
- Mining reward system
- Transaction history tracking
- P2P network support

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Data Storage**: JSON files (blockchain.json, users.json)
- **Cryptography**: SHA-256 for block hashing
- **Network**: WebSocket for P2P communication

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. Access the application at `http://localhost:3000`

## Default Accounts

### Admin Account
- Username: `admin`
- Password: `root`

### Miner Account
- Username: `miner1`
- Password: `minerpass1`

### Regular User Accounts
- Username: `ahmed`, Password: `a123`
- Username: `omar`, Password: `o123`
- Username: `salma`, Password: `s123`

## Project Structure

```
├── server.js              # Main server file
├── blockchain.json        # Blockchain data storage
├── users.json            # User data storage
├── p2p.js               # P2P network implementation
├── public/              # Frontend files
│   ├── index.html      # Main application page
│   ├── login.html      # Login page
│   └── styles/         # CSS styles
└── package.json        # Project dependencies
```

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `GET /api/user-exists/:username` - Check if user exists

### Transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:username` - Get user transactions
- `GET /api/all-transactions` - Get all transactions (miners only)
- `GET /api/validated-transactions` - Get validated transactions

### Mining
- `POST /api/mine` - Mine new block
- `GET /api/pending` - Get pending transactions

### Network
- `POST /api/connect` - Connect to P2P network

## Security Features

- Password hashing
- Session management
- Input validation
- Error handling
- Secure file operations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by Bitcoin's blockchain technology
- Built for educational purposes
- Uses modern web development practices 