import { expect, test } from "@playwright/test";

test("核心頁面可載入", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "台股量化事件研究室" })).toBeVisible();

  await page.goto("/event-radar");
  await expect(page.getByRole("heading", { name: "事件催化雷達" })).toBeVisible();
  await expect(page.getByText("展開詳情").first()).toBeVisible();

  await page.goto("/trade-plan");
  await expect(page.getByRole("heading", { name: "交易計畫產生器" })).toBeVisible();
  await expect(page.getByText("Step 1 選股票與事件")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "設定與備份" })).toBeVisible();
  await expect(page.getByText("匯出全部資料 JSON")).toBeVisible();
});

test("事件雷達可串到交易計畫", async ({ page }) => {
  await page.goto("/event-radar");
  await page.getByText("建立交易計畫").first().click();
  await expect(page).toHaveURL(/\/trade-plan/);
  await expect(page.getByText("已從事件催化雷達帶入")).toBeVisible();
});

test("資料中心可顯示 CSV 模板與匯入表單", async ({ page }) => {
  await page.goto("/data-center");
  await expect(page.getByRole("heading", { name: "資料狀態中心" })).toBeVisible();
  await expect(page.getByText("CSV 模板下載")).toBeVisible();
  await expect(page.getByText("匯入 CSV")).toBeVisible();
});
