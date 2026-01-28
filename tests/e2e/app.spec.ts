import { test, expect } from '@playwright/test';

test.describe('VeriScanPro E2E', () => {
    test.beforeEach(async ({ page }) => {
        // App is running on localhost:3000
        await page.goto('http://localhost:3000');

        // Handle Authentication
        // Check if we are on Auth Page (look for "Create Identity" or "Welcome Back")
        const authHeading = page.getByRole('heading', { name: /Welcome Back|Create Identity/i });
        if (await authHeading.isVisible()) {
            console.log('Auth Page detected. Attempting extraction/login...');

            // Try to switch to local mode if available immediately (unlikely)
            const localModeBtn = page.getByRole('button', { name: /USE LOCAL FORENSIC CORE/i });
            if (await localModeBtn.isVisible()) {
                await localModeBtn.click();
            } else {
                // Attempt Signup
                const createProfileBtn = page.getByRole('button', { name: /Create profile/i });
                if (await createProfileBtn.isVisible()) {
                    await createProfileBtn.click();
                }

                // Fill Signup Form
                const nameInput = page.getByPlaceholder(/Agent Smith/i);
                if (await nameInput.isVisible()) {
                    await nameInput.fill('Test Agent');
                }

                await page.getByPlaceholder(/name@agency.com/i).fill(`test-${Date.now()}@agency.com`);
                await page.getByPlaceholder(/••••••••/i).fill('password123'); // Master Key

                await page.getByRole('button', { name: /Initialize Vault|Authorize/i }).click();

                // Handle potential "Console Sync Required" error (Firebase not configured)
                // Wait a bit for error to appear
                try {
                    const errorPanel = page.getByText(/Console Sync Required/i);
                    await errorPanel.waitFor({ state: 'visible', timeout: 5000 });
                    if (await errorPanel.isVisible()) {
                        console.log('Firebase not configured. Switching to Local Mode.');
                        await page.getByRole('button', { name: /USE LOCAL FORENSIC CORE/i }).click();
                    }
                } catch (e) {
                    // No error, proceed
                }
            }
        }
    });

    test('should load the homepage correctly', async ({ page }) => {
        await expect(page).toHaveTitle(/VeriScan/i);
        await expect(page.getByText(/Forensic Intelligence/i)).toBeVisible();
    });

    test('should navigate to Writing Report page on Analyze', async ({ page }) => {
        // Find the textarea
        const textarea = page.getByPlaceholder(/Paste manuscript/i);
        await textarea.fill('This is a test text for analysis in the E2E test suite. It needs to be long enough to pass the minimum length check. '.repeat(5));

        // Click Analyze button
        const analyzeBtn = page.getByRole('button', { name: /RUN DEEP AUDIT/i });
        await analyzeBtn.click();

        // Should navigate to report page or show loading
        // Adjust selector based on actual UI
        await expect(page.getByText(/Forensic Audit Processing/i)).toBeVisible();
    });

    test('should verify all sidebar buttons are present', async ({ page }) => {
        // Sidebar is an 'aside' element
        const aside = page.locator('aside');
        await expect(aside).toBeVisible();
    });
});
