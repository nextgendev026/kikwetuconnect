import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

async function login(page: Page) {
  await page.goto('/signup?mode=login')
  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
  await page.getByPlaceholder('Your password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /Log in/ }).click()
  await page.waitForURL(/\/feed|\/messages/, { timeout: 15000 })
}

test('messages page is gated for guests', async ({ page }) => {
  await page.goto('/messages')
  // Guests must never reach the composer. Depending on the environment the app
  // redirects (AppShell/middleware) or sits on a loader, but the messaging UI
  // itself must not be interactive.
  await page.waitForLoadState('load')
  await page.waitForTimeout(3000)
  await expect(page.locator('textarea[aria-label="Message"]')).not.toBeVisible({ timeout: 5000 })
})

test('login page has no critical axe violations', async ({ page }) => {
  await page.goto('/signup?mode=login')
  await page.getByPlaceholder('you@example.com').waitFor()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
})

test.describe('authenticated messaging', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set')

  test('messages page has no critical axe violations', async ({ page }) => {
    await login(page)
    await page.goto('/messages')
    const composer = page.locator('textarea[aria-label="Message"]')
    await composer.waitFor({ timeout: 15000 })
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('composer sends a text message with optimistic ack', async ({ page }) => {
    await login(page)
    await page.goto('/messages')

    const composer = page.locator('textarea[aria-label="Message"]')
    await composer.waitFor({ timeout: 15000 })

    const content = `e2e check ${Date.now()}`
    await composer.fill(content)
    await page.getByRole('button', { name: 'Send message' }).click()

    // Optimistic bubble appears immediately.
    await expect(page.getByText(content).first()).toBeVisible({ timeout: 5000 })
    // Sending state resolves to a delivered/sent timestamp.
    await expect(page.getByText('Sending...').first()).toBeHidden({ timeout: 15000 })
    await expect(page.getByText(content).first()).toBeVisible()
  })

  test('image upload shows a preview and posts a media bubble', async ({ page }) => {
    await login(page)
    await page.goto('/messages')

    const composer = page.locator('textarea[aria-label="Message"]')
    await composer.waitFor({ timeout: 15000 })

    // Attach an image without submitting.
    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    })

    // Preview chip appears above the composer.
    await expect(page.locator('img[alt=""]').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button[aria-label^="Remove"]').first()).toBeVisible()

    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText('Sending...').first()).toBeHidden({ timeout: 15000 })
    // Media bubble with the uploaded image eventually renders.
    const bubble = page.locator('img[alt="pixel.png"]').first()
    await expect(bubble).toBeVisible({ timeout: 15000 })
  })
})
