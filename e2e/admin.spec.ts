import { test, expect } from "@playwright/test"

test.describe("Admin", () => {
  test("unauthenticated /admin redirects to login or stays on admin", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveURL(/\/admin(\/login)?$/)
    if (page.url().includes("/admin/login")) {
      await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible()
    }
  })

  test("admin login page has email and password fields", async ({ page }) => {
    await page.goto("/admin/login", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible({ timeout: 15000 })
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })
})
