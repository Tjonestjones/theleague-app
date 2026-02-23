import { test, expect } from '@playwright/test';

// Test Sleeper import with a known public league
const TEST_SLEEPER_LEAGUE_ID = '1046688970247114752'; // Public 2024 league

test.describe('Sleeper Importer', () => {
  test('should validate a public Sleeper league', async ({ page }) => {
    await page.goto('/dashboard/leagues/import-sleeper');
    
    // Fill in league ID
    await page.fill('input[name="leagueId"]', TEST_SLEEPER_LEAGUE_ID);
    await page.fill('input[name="year"]', '2024');
    
    // Click validate button
    await page.click('button:has-text("Validate")');
    
    // Wait for validation result
    await expect(page.getByText(/league found/i)).toBeVisible({ timeout: 10000 });
    
    // Should show league details
    await expect(page.locator('[data-testid="league-name"]')).toBeVisible();
  });

  test.skip('should import a Sleeper league', async ({ page }) => {
    // Skip by default — requires auth and database writes
    // Enable manually when testing full flow
    
    await page.goto('/dashboard/leagues/import-sleeper');
    
    await page.fill('input[name="leagueId"]', TEST_SLEEPER_LEAGUE_ID);
    await page.fill('input[name="year"]', '2024');
    
    await page.click('button:has-text("Validate")');
    await expect(page.getByText(/league found/i)).toBeVisible({ timeout: 10000 });
    
    // Import the league
    await page.click('button:has-text("Import League")');
    
    // Should show success message
    await expect(page.getByText(/import successful/i)).toBeVisible({ timeout: 30000 });
    
    // Should redirect to league dashboard
    await expect(page).toHaveURL(/\/dashboard\/leagues\//);
  });
});
