import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('feed page loads and shows the Baraza header', async ({ page }) => {
  await page.goto('/feed')
  await expect(page.getByRole('heading', { name: 'Baraza' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
})

test('feed page has no critical axe violations', async ({ page }) => {
  await page.goto('/feed')
  await page.getByRole('heading', { name: 'Baraza' }).waitFor()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
})

test('composer responds to keyboard activation', async ({ page }) => {
  await page.goto('/feed')
  const composer = page.getByRole('button', { name: 'Create a new post' })
  await composer.focus()
  await page.keyboard.press('Enter')
  // Create modal opens via CustomEvent handled by AppShell's CreateModal
  await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
})
