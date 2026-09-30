import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should filter the game list by category and publisher', async ({ page }) => {
    await expect(page.getByTestId('game-filter-form')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Strategy' })).toBeVisible();
    await expect(page.getByTestId('game-publisher-filter')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await expect(page.getByRole('link', { name: /DevOps Dominion/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Code Puzzle Chronicles/i })).toBeHidden();

    await page.getByTestId('game-publisher-filter').selectOption({ label: 'CodeForge Studios' });
    await expect(page.getByRole('link', { name: /DevOps Dominion/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pipeline Conquest/i })).toBeHidden();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('link', { name: /Code Puzzle Chronicles/i })).toBeVisible();
  });

  test('should show games from every selected category', async ({ page }) => {
    await test.step('Select two categories', async () => {
      await page.getByRole('checkbox', { name: 'Strategy' }).check();
      await page.getByRole('checkbox', { name: 'Puzzle' }).check();
    });

    await test.step('Verify results include both categories', async () => {
      await expect(page.getByRole('link', { name: /DevOps Dominion/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Code Puzzle Chronicles/i })).toBeVisible();
      await expect(page.getByTestId('game-results-count')).toHaveText('8 games shown');
    });
  });
});
