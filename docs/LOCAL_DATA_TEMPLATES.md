# 本機資料匯入模板

目前 MVP 主要使用 `/settings` 的完整 JSON 備份 / 匯入。以下 CSV 欄位可作為未來手動匯入流程參考。

## 事件 CSV

```csv
id,symbol,name,eventType,eventTitle,eventDate,eventTime,source,sourceUrl,dataSource,sourceNote,confidence,expectedImpact,marketAwareness,relatedThemes
manual-1,2330,台積電,investorConference,季度法說會與 CoWoS 產能更新,2026-05-25,14:30,手動輸入,,Manual,手動建立事件,70,80,45,"AI server|CoWoS"
```

## 股價 CSV

```csv
symbol,name,date,price,previousClose,volumeRatio,rsi14,ma20DistancePct,ma20Slope,sevenDayReturnPct,twentyDayReturnPct,relativeStrengthRank,volatility20d,beta,dataSource,sourceNote
2330,台積電,2026-05-21,928,920,1.25,61,3.2,1.2,4.1,8.8,94,22,1.1,Manual,手動股價資料
```

## 法人籌碼 CSV

```csv
symbol,date,institutionalFlow5d,foreignFlow5d,investmentTrustFlow5d,dealerFlow5d,dataSource,sourceNote
2330,2026-05-21,68,45,18,0,Manual,手動籌碼資料
```

## 投組 CSV

```csv
id,symbol,name,shares,averageCost,currentPrice,tags,strategy,relatedEventId,stopLoss,takeProfit1,takeProfit2,notes,dataSource,sourceNote
pos-1,2330,台積電,300,880,928,"AI server|CoWoS",Low Base Catalyst,evt-1,884,990,1040,手動持股,Manual,手動本機持股
```

## 交易日誌 CSV

```csv
id,date,symbol,name,action,strategy,relatedEventId,eventType,price,shares,reason,eventThesis,eventOutcome,wasEventPricedIn,didChaseNews,planFollowed,emotion,mistakeType,pnl,pnlPct,review,dataSource,sourceNote
journal-1,2026-05-21,2330,台積電,review,Low Base Catalyst,evt-1,investorConference,928,300,事件研究檢查,事件假設,事件後仍有延續,false,false,true,disciplined,,0,0,手動檢討,Manual,手動本機日誌
```
