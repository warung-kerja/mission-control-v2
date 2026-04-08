import { test, expect } from '@playwright/test'

const routeChecks = [
  { path: '/', heading: 'Dashboard' },
  { path: '/projects', heading: 'Projects' },
  { path: '/tasks', heading: 'Tasks' },
  { path: '/calendar', heading: 'Calendar' },
  { path: '/team', heading: 'Team' },
  { path: '/office', heading: 'Office' },
  { path: '/memories', heading: 'Memories' },
  { path: '/collaboration', heading: 'Collaboration' },
  { path: '/analytics', heading: 'Analytics' },
]

test.describe('release smoke', () => {
  test('desktop route navigation renders all 9 feature views', async ({ page }) => {
    for (const route of routeChecks) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
    }
  })

  test('mobile sidebar opens and closes via menu + overlay + nav click', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only interaction check')

    await page.goto('/')

    const menuButton = page.locator('header button').first()
    await menuButton.click()

    const mobileSidebar = page.locator('aside.w-72')
    await expect(mobileSidebar).toBeVisible()

    const overlay = page.locator('div.fixed.inset-0.bg-black\/50')
    await expect(overlay).toBeVisible()
    await overlay.click({ position: { x: 10, y: 10 } })
    await expect(mobileSidebar).toBeHidden()

    await menuButton.click()
    await page.getByRole('link', { name: 'Projects' }).last().click()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(mobileSidebar).toBeHidden()
  })

  test('desktop sidebar navigation remains stable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only navigation check')

    await page.goto('/')
    const desktopSidebar = page.locator('div.hidden.lg\\:block')
    await expect(desktopSidebar).toBeVisible()

    await page.getByRole('link', { name: 'Tasks' }).first().click()
    await expect(page).toHaveURL(/\/tasks$/)
    await expect(desktopSidebar).toBeVisible()

    await page.getByRole('link', { name: 'Analytics' }).first().click()
    await expect(page).toHaveURL(/\/analytics$/)
    await expect(desktopSidebar).toBeVisible()
  })
})
