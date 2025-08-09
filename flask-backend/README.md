# Flask Backend

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The server will run on http://localhost:5000

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET/POST /api/test` - Test endpoint
