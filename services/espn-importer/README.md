# ESPN Importer Service

Python FastAPI service for importing ESPN Fantasy Football league data.

## Setup

```bash
pip3 install -r requirements.txt
```

## Run

```bash
# Option 1: Direct
python3 main.py

# Option 2: Via script
./start.sh

# Option 3: With uvicorn (for development)
uvicorn main:app --reload --port 8001
```

## Endpoints

### Health Check
```
GET /
```

### Validate ESPN Auth
```
POST /api/espn/validate
{
  "league_id": 6911200,
  "year": 2024,
  "espn_s2": "YOUR_ESPN_S2_COOKIE",
  "swid": "{YOUR_SWID}"
}
```

### Import League Data
```
POST /api/espn/import
{
  "league_id": 6911200,
  "year": 2024,
  "espn_s2": "YOUR_ESPN_S2_COOKIE",
  "swid": "{YOUR_SWID}"
}
```

### Get Available Years
```
GET /api/espn/available-years/{league_id}
```

## Development

The service runs on port 8001 by default and allows CORS from `http://localhost:3000` (Next.js dev server).

## Dependencies

- **FastAPI**: Web framework
- **uvicorn**: ASGI server
- **espn-api**: ESPN Fantasy API client (handles auth + data fetching)
- **pydantic**: Data validation
