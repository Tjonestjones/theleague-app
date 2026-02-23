import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check hero heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your League');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Forever');
    
    // Check CTA buttons are visible
    await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    
    // Check pricing text
    await expect(page.getByText(/7-day free trial/i)).toBeVisible();
    await expect(page.getByText(/\$36\/year/i)).toBeVisible();
  });

  test('should display all feature cards', async ({ page }) => {
    await page.goto('/');
    
    const featureTitles = [
      'One-Click Import',
      'Record Book',
      'All-Time Standings',
      'Charts & Analytics',
      'Public League Page',
      'Finances & Dues',
      'Weekly Newsletters',
      'Member Management',
      'Your Data, Forever',
    ];
    
    for (const title of featureTitles) {
      await expect(page.getByText(title)).toBeVisible();
    }
  });

  test('should display supported platforms', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText(/ESPN/i)).toBeVisible();
    await expect(page.getByText(/Sleeper/i)).toBeVisible();
    await expect(page.getByText(/Yahoo/i)).toBeVisible();
    await expect(page.getByText(/Fleaflicker/i)).toBeVisible();
  });

  test('should navigate to sign up', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('link', { name: /start free trial/i }).click();
    
    // Should redirect to Clerk sign-up
    await expect(page).toHaveURL(/sign-up/);
  });
});
