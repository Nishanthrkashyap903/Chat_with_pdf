# Node.js Backend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
npm start        # Production
npm run dev      # Development with nodemon
```

The server will run on http://localhost:3001

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check

## Environment Variables

Create a `.env` file with:
```
PORT=3001
NODE_ENV=development
```
