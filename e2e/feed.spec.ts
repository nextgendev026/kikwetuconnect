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

test('feed page is gated for guests', async ({ page }) => {
  await page.goto('/feed')
  await page.waitForLoadState('load')
  await page.waitForTimeout(3000)
  await expect(page.getByRole('heading', { name: 'Baraza' })).not.toBeVisible({ timeout: 5000 })
})

test('login page has no critical axe violations', async ({ page }) => {
  await page.goto('/signup?mode=login')
  await page.getByPlaceholder('you@example.com').waitFor()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
})

test.describe('authenticated feed', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set')

  test('feed page loads and shows the Baraza header', async ({ page }) => {
    await login(page)
    await page.goto('/feed')
    await expect(page.getByRole('heading', { name: 'Baraza' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
  })

  test('feed page has no critical axe violations', async ({ page }) => {
    await login(page)
    await page.goto('/feed')
    await page.getByRole('heading', { name: 'Baraza' }).waitFor()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  })

  test('composer responds to keyboard activation', async ({ page }) => {
    await login(page)
    await page.goto('/feed')
    const composer = page.getByRole('button', { name: 'Create a new post' })
    await composer.focus()
    await page.keyboard.press('Enter')
    // Create modal opens via CustomEvent handled by AppShell's CreateModal
    await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
  })
})
