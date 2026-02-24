import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check hero heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your League');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Forever');
    
    // Check CTA buttons are visible (use .first() since there are multiple on page)
    await expect(page.getByRole('link', { name: /start free trial/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
    
    // Check pricing text
    await expect(page.getByText(/7-day free trial/i).first()).toBeVisible();
    await expect(page.getByText(/\$36\/year/i).first()).toBeVisible();
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
    
    // Check feature cards by looking for h3 headings specifically
    for (const title of featureTitles) {
      await expect(page.getByRole('heading', { name: title, level: 3 })).toBeVisible();
    }
  });

  test('should display supported platforms', async ({ page }) => {
    await page.goto('/');
    
    // Look for platform names as exact paragraph text in the platforms section
    await expect(page.getByText('ESPN', { exact: true })).toBeVisible();
    await expect(page.getByText('Sleeper', { exact: true })).toBeVisible();
    await expect(page.getByText('Yahoo', { exact: true })).toBeVisible();
    await expect(page.getByText('Fleaflicker', { exact: true })).toBeVisible();
  });

  test('should navigate to sign up', async ({ page }) => {
    await page.goto('/');
    
    // Click the first "Start Free Trial" button (hero section)
    await page.getByRole('link', { name: /start free trial/i }).first().click();
    
    // Should redirect to Clerk sign-up
    await expect(page).toHaveURL(/sign-up/);
  });
});
