#!/bin/bash

# ESPN API Test Script
# Usage: ./test-espn-api.sh

LEAGUE_ID="6911200"
YEAR="2023"
ESPN_S2="AECY9fkU1AxoPMkch0RzZtnKwi8Q2QMTN0VtQqvQ2ZoO+QA73nfdWolNOdBOSPhVkqKuwY8mVmLyWZd9cW3HBSRUVgZVC721kg+pKJ7umvILyaBYwBUGWEflHUuEm8k38bGr83sRr4VCSTEX++t2SUEz+wNGR2WwJMSWYDU5IVb0xI+NtAs3tiL34YHlz5EKRnRk7kOTlR8ABS9sgFD5iziXQwd4HfkbXLEPx3p/5B0aq2QckbB7ILuRjbnjzXvY+eZ6C8PtRCsv9AsjY8P3yYI4zyzgezVFzQf2DRZpTgwFZw=="
SWID="{637A7E23-74FD-4BF8-BA7E-2374FD4BF891}"

BASE_URL="https://fantasy.espn.com/apis/v3/games/ffl/seasons/${YEAR}/segments/0/leagues/${LEAGUE_ID}"

echo "Testing ESPN Fantasy API for League ${LEAGUE_ID} (${YEAR})..."
echo ""

# Test 1: League Settings
echo "1. Fetching league settings..."
curl -s "${BASE_URL}?view=mSettings" \
  -H "User-Agent: Mozilla/5.0" \
  -b "espn_s2=${ESPN_S2}; SWID=${SWID}" \
  | python3 -m json.tool > test-data/espn-settings.json 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Settings fetched successfully"
else
  echo "✗ Settings fetch failed - check cookies"
  cat test-data/espn-settings.json | head -10
fi

echo ""

# Test 2: Teams
echo "2. Fetching teams..."
curl -s "${BASE_URL}?view=mTeam" \
  -H "User-Agent: Mozilla/5.0" \
  -b "espn_s2=${ESPN_S2}; SWID=${SWID}" \
  | python3 -m json.tool > test-data/espn-teams.json 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Teams fetched successfully"
else
  echo "✗ Teams fetch failed"
fi

echo ""

# Test 3: Scoreboard (Week 1)
echo "3. Fetching Week 1 scoreboard..."
curl -s "${BASE_URL}?view=mScoreboard&scoringPeriodId=1" \
  -H "User-Agent: Mozilla/5.0" \
  -b "espn_s2=${ESPN_S2}; SWID=${SWID}" \
  | python3 -m json.tool > test-data/espn-week1.json 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Week 1 fetched successfully"
else
  echo "✗ Week 1 fetch failed"
fi

echo ""
echo "Test complete. Check test-data/ folder for results."
