import { expect, test } from "@playwright/test";

test.describe("視覺截圖 smoke", () => {
  test("首頁 desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("mobile"), "desktop only");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /台股量化事件研究室/ })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/home-desktop.png", fullPage: true });
  });

  test("事件雷達 desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("mobile"), "desktop only");
    await page.goto("/event-radar");
    await expect(page.getByRole("heading", { name: "事件催化雷達" })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/event-radar-desktop.png", fullPage: true });
  });

  test("交易計畫 desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("mobile"), "desktop only");
    await page.goto("/trade-plan");
    await expect(page.getByRole("heading", { name: "交易計畫產生器" })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/trade-plan-desktop.png", fullPage: true });
  });

  test("即時報價與 K 線 desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("mobile"), "desktop only");
    await page.goto("/market?symbol=2330");
    await expect(page.getByRole("heading", { name: "即時報價與 K 線" })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/market-desktop.png", fullPage: true });
  });

  test("首頁 mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "mobile only");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /台股量化事件研究室/ })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/home-mobile.png", fullPage: true });
  });

  test("事件雷達 mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "mobile only");
    await page.goto("/event-radar");
    await expect(page.getByRole("heading", { name: "事件催化雷達" })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/event-radar-mobile.png", fullPage: true });
  });

  test("即時報價與 K 線 mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "mobile only");
    await page.goto("/market?symbol=2330");
    await expect(page.getByRole("heading", { name: "即時報價與 K 線" })).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/market-mobile.png", fullPage: true });
  });
});
