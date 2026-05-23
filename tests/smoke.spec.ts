import { expect, test } from "@playwright/test";

const banned = [["必", "買"], ["必", "賣"], ["明", "牌"], ["保證", "獲利"], ["強烈", "買進"], ["跟", "單"], ["老師", "喊單"], ["無腦", "買"]].map((parts) => parts.join(""));

test("核心頁面可載入", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /台股量化事件研究室/ })).toBeVisible();

  await page.goto("/event-radar");
  await expect(page.getByRole("heading", { name: "事件催化雷達" })).toBeVisible();
  await expect(page.getByText("研究詳情").first()).toBeVisible();
  await expect(page.getByText("查看 K 線").first()).toBeVisible();

  await page.goto("/market?symbol=2330");
  await expect(page.getByRole("heading", { name: "即時報價與 K 線" })).toBeVisible();
  await expect(page.getByText("最新報價")).toBeVisible();
  await expect(page.getByText("K 線圖")).toBeVisible();
  await page.getByRole("button", { name: "3個月" }).click();
  await page.getByRole("button", { name: "1年" }).click();

  await page.goto("/data-center");
  await expect(page.getByRole("heading", { name: "資料狀態中心" })).toBeVisible();
  await expect(page.getByText("CSV 模板下載")).toBeVisible();
  await expect(page.getByText("報價與 K 線資料源")).toBeVisible();

  await page.goto("/trade-plan");
  await expect(page.getByRole("heading", { name: "交易計畫產生器" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "設定與備份" })).toBeVisible();
  await expect(page.getByText("匯出全部資料 JSON")).toBeVisible();
});

test("事件雷達可串到交易計畫", async ({ page }) => {
  await page.goto("/event-radar");
  await page.getByText("查看 K 線").first().click();
  await expect(page).toHaveURL(/\/market\?symbol=/);
  await page.goto("/event-radar");
  await page.getByText("建立交易計畫").first().click();
  await expect(page).toHaveURL(/\/trade-plan/);
  await expect(page.getByText(/已從事件催化雷達帶入/)).toBeVisible();
});

test("交易計畫可帶入最新價", async ({ page }) => {
  await page.goto("/trade-plan?symbol=2330&from=market");
  await page.getByRole("button", { name: "帶入最新價作為研究進場價" }).click();
  await expect(page.getByText(/已帶入 2330/)).toBeVisible();
});

test("資料中心支援模板、匯入與資料模式", async ({ page }) => {
  await page.goto("/data-center");
  await expect(page.getByText("TWSE OpenAPI")).toBeVisible();
  await expect(page.getByText("套用匯入")).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByText("Demo only")).toBeVisible();
  await expect(page.getByText("Hybrid").first()).toBeVisible();
  await expect(page.getByText("Real / Imported only")).toBeVisible();
});

test("頁面不出現投顧禁用字眼", async ({ page }) => {
  for (const path of ["/", "/event-radar", "/market", "/data-center", "/settings"]) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    for (const word of banned) await expect(text).not.toContain(word);
  }
});
