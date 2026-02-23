import { test, expect } from "@playwright/test"

test.describe("Gallery", () => {
  test("home page loads and shows nav", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("link", { name: /photo wall/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("link", { name: /upload/i }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: /admin/i }).first()).toBeVisible()
  })

  test("Upload link goes to upload page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.getByRole("link", { name: /upload/i }).first().click()
    await expect(page).toHaveURL(/\/upload/)
  })

  test("Admin link goes to admin", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.getByRole("link", { name: /admin/i }).first().click()
    await expect(page).toHaveURL(/\/admin/)
  })
})
