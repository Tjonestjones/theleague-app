import { test, expect } from '@playwright/test';

test.describe('Dashboard (requires auth)', () => {
  test.beforeEach(async ({ page }) => {
    // Note: These tests require Clerk test user credentials
    // Skip in CI unless CLERK_TEST_USER env vars are set
    if (!process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD) {
      test.skip();
    }
  });

  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test.skip('should display dashboard after login', async ({ page }) => {
    // TODO: Implement Clerk auth flow with test user
    // This requires setting up a test user in Clerk and using their credentials
    
    await page.goto('/sign-in');
    
    // Fill in Clerk sign-in form
    await page.fill('[name="identifier"]', process.env.CLERK_TEST_EMAIL!);
    await page.fill('[name="password"]', process.env.CLERK_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Check dashboard content
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });
});
