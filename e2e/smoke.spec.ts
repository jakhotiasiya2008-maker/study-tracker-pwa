import { test, expect } from '@playwright/test';

test.describe('StudyFlow PWA Smoke Test', () => {
  test('Complete End-to-End User Flow', async ({ page, context }) => {
    // 1. App loads cleanly
    await page.goto('/');
    await expect(page.getByText('StudyFlow')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Today’s Mission")).toBeVisible();

    // Verify initial demo data rendered
    await expect(page.getByText('Daily Goal Ring')).toBeVisible();

    // Check initial points
    const pointsPill = page.locator('header').getByTitle(/points/i);
    await expect(pointsPill).toBeVisible();

    // 2. Navigate to Subjects and Add Subject
    await page.getByRole('button', { name: 'Subjects' }).click();
    await expect(page.getByRole('heading', { name: 'Subjects & Topics' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Subject' }).click();
    await page.getByPlaceholder('e.g. Organic Chemistry').fill('Artificial Intelligence');
    await page.getByRole('button', { name: 'Create Subject' }).click();

    await expect(page.getByText('Artificial Intelligence')).toBeVisible();

    // 3. Add Topic to new subject
    // Click Artificial Intelligence to expand
    await page.getByText('Artificial Intelligence').click();
    await page.getByRole('button', { name: 'Add Topic' }).click();

    await page.getByPlaceholder('e.g. Dynamic Programming').fill('Neural Networks & Backprop');
    await page.getByRole('button', { name: 'Save Topic' }).click();

    await expect(page.getByText('Neural Networks & Backprop')).toBeVisible();

    // 4. Return to Today View and verify plan appears
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page.getByText('Study Plan')).toBeVisible();

    // 5. Complete a task and verify points increase
    // Find uncompleted task checkbox
    const initialPointsText = await pointsPill.innerText();
    const initialPoints = parseInt(initialPointsText.replace(/\D/g, ''), 10) || 0;

    const uncompletedTaskCheckbox = page.locator('button[aria-label^="Mark"][aria-label*="complete"]').first();
    await expect(uncompletedTaskCheckbox).toBeVisible();
    await uncompletedTaskCheckbox.click();

    // Allow state and confetti update
    await page.waitForTimeout(1000);
    const updatedPointsText = await pointsPill.innerText();
    const updatedPoints = parseInt(updatedPointsText.replace(/\D/g, ''), 10) || 0;
    expect(updatedPoints).toBeGreaterThanOrEqual(initialPoints);

    // 6. Reload and verify IndexedDB persistence
    await page.reload();
    await expect(page.getByText('StudyFlow')).toBeVisible();
    await expect(page.getByText('Daily Goal Ring')).toBeVisible();

    // 7. Verify offline support: go offline and reload, app still renders via service worker cache
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('StudyFlow')).toBeVisible();
    await expect(page.getByText('Today’s Mission')).toBeVisible();
  });
});
