// ESPN API Test Script (Node.js)
const fs = require('fs');

const LEAGUE_ID = '6911200';
const YEAR = '2025';
const ESPN_S2 = 'AEAkOshNXKX4gkLi1laig9GETvLh0ungEYsOmssKNComfC8X0lrCllIORtayg+Va5Sc3FkWzySiTMlAIo5/UTQX6Zx9FWF1X/sLy//5Rbq4XPaS3qZcV5NcJ2wpZzQ4zxN1mJfk4ODWBaHeCTiRGD+om6Pp2MKZKEEmf8mVH78bxDwPOjCdcqdSiMDoOPwGLdlQ7nqZR1yVbYoJ0e37koKkDkzPTnUOpu+6cbhKXlqqNHOIUX8kRa/YnsvWmAzFDEw3AkrB57S5mda5y5gPTbvKy5LrOQZkoicj+EemB7iLexWA==';
const SWID = '{637A7E23-74FD-4BF8-BA7E-2374FD4BF891}';

const BASE_URL = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${YEAR}/segments/0/leagues/${LEAGUE_ID}`;

if (!fs.existsSync('test-data')) {
  fs.mkdirSync('test-data');
}

async function testESPNAPI() {
  console.log(`Testing ESPN Fantasy API for League ${LEAGUE_ID} (${YEAR})...`);
  console.log('');

  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Cookie': `espn_s2=${ESPN_S2}; SWID=${SWID}`
  };

  // Test 1: League Settings
  console.log('1. Fetching league settings...');
  try {
    const response = await fetch(`${BASE_URL}?view=mSettings`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    fs.writeFileSync('test-data/espn-settings.json', JSON.stringify(data, null, 2));
    
    console.log(`✓ Settings fetched successfully`);
    console.log(`  League Name: ${data.settings?.name || 'N/A'}`);
    console.log(`  Size: ${data.settings?.size || 'N/A'} teams`);
    console.log('');
  } catch (error) {
    console.log(`✗ Settings fetch failed: ${error.message}`);
    console.log('');
  }

  // Test 2: Teams
  console.log('2. Fetching teams...');
  try {
    const response = await fetch(`${BASE_URL}?view=mTeam`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    fs.writeFileSync('test-data/espn-teams.json', JSON.stringify(data, null, 2));
    
    console.log(`✓ Teams fetched successfully`);
    console.log(`  Teams found: ${data.teams?.length || 0}`);
    console.log('');
  } catch (error) {
    console.log(`✗ Teams fetch failed: ${error.message}`);
    console.log('');
  }

  // Test 3: Week 1 Scoreboard
  console.log('3. Fetching Week 1 scoreboard...');
  try {
    const response = await fetch(`${BASE_URL}?view=mScoreboard&scoringPeriodId=1`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    fs.writeFileSync('test-data/espn-week1.json', JSON.stringify(data, null, 2));
    
    console.log(`✓ Week 1 fetched successfully`);
    console.log(`  Matchups: ${data.schedule?.filter(m => m.matchupPeriodId === 1).length || 0}`);
    console.log('');
  } catch (error) {
    console.log(`✗ Week 1 fetch failed: ${error.message}`);
    console.log('');
  }

  // Test 4: Standings
  console.log('4. Fetching standings...');
  try {
    const response = await fetch(`${BASE_URL}?view=mStandings`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    fs.writeFileSync('test-data/espn-standings.json', JSON.stringify(data, null, 2));
    
    console.log(`✓ Standings fetched successfully`);
    console.log('');
  } catch (error) {
    console.log(`✗ Standings fetch failed: ${error.message}`);
    console.log('');
  }

  // Test 5: Transactions
  console.log('5. Fetching transactions...');
  try {
    const response = await fetch(`${BASE_URL}?view=mTransactions2`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    fs.writeFileSync('test-data/espn-transactions.json', JSON.stringify(data, null, 2));
    
    console.log(`✓ Transactions fetched successfully`);
    console.log(`  Transactions found: ${data.transactions?.length || 0}`);
    console.log('');
  } catch (error) {
    console.log(`✗ Transactions fetch failed: ${error.message}`);
    console.log('');
  }

  // Test 6: Draft
  console.log('6. Fetching draft results...');
  try {
    const response = await fetch(`${BASE_URL}?view=mDraftDetail`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    fs.writeFileSync('test-data/espn-draft.json', JSON.stringify(data, null, 2));
    
    console.log(`✓ Draft fetched successfully`);
    console.log(`  Draft picks: ${data.draftDetail?.picks?.length || 0}`);
    console.log('');
  } catch (error) {
    console.log(`✗ Draft fetch failed: ${error.message}`);
    console.log('');
  }

  console.log('Test complete. Check test-data/ folder for results.');
}

testESPNAPI().catch(console.error);
