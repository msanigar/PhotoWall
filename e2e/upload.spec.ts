import { test, expect } from "@playwright/test"

test.describe("Upload page", () => {
  test("upload page loads and shows capture UI", async ({ page }) => {
    await page.goto("/upload")
    await expect(page.getByRole("heading", { name: /take a photo/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("button", { name: /take a photo/i })).toBeVisible()
  })

  test("has link back to gallery", async ({ page }) => {
    await page.goto("/upload")
    const home = page.getByRole("link", { name: /photo wall/i }).first()
    await expect(home).toBeVisible()
    await home.click()
    await expect(page).toHaveURL("/")
  })
})
