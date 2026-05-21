# Local Data Templates

These CSV headers are suggested for future manual import flows. The current MVP uses JSON backup/import in `/settings`.

## Events CSV

```csv
id,symbol,name,eventType,eventTitle,eventDate,eventTime,source,sourceUrl,dataSource,sourceNote,confidence,expectedImpact,marketAwareness,relatedThemes
manual-1,2330,TSMC,investorConference,Investor conference,2026-05-25,14:30,Manual,,Manual,Manual local event,70,80,45,"AI server|CoWoS"
```

## Prices CSV

```csv
symbol,name,date,price,previousClose,volumeRatio,rsi14,ma20DistancePct,ma20Slope,sevenDayReturnPct,twentyDayReturnPct,relativeStrengthRank,volatility20d,beta,dataSource,sourceNote
2330,TSMC,2026-05-21,928,920,1.25,61,3.2,1.2,4.1,8.8,94,22,1.1,Manual,Manual local price data
```

## Institutional Flow CSV

```csv
symbol,date,institutionalFlow5d,foreignFlow5d,investmentTrustFlow5d,dealerFlow5d,dataSource,sourceNote
2330,2026-05-21,68,45,18,0,Manual,Manual local flow data
```

## Portfolio CSV

```csv
id,symbol,name,shares,averageCost,currentPrice,tags,strategy,relatedEventId,stopLoss,takeProfit1,takeProfit2,notes,dataSource,sourceNote
pos-1,2330,TSMC,300,880,928,"AI server|CoWoS",Low Base Catalyst,evt-1,884,990,1040,Manual holding,Manual,Manual local position
```

## Journal CSV

```csv
id,date,symbol,name,action,strategy,relatedEventId,eventType,price,shares,reason,eventThesis,eventOutcome,wasEventPricedIn,didChaseNews,planFollowed,emotion,mistakeType,pnl,pnlPct,review,dataSource,sourceNote
journal-1,2026-05-21,2330,TSMC,review,Low Base Catalyst,evt-1,investorConference,928,300,Review event,Thesis text,Outcome,false,false,true,disciplined,,0,0,Review text,Manual,Manual local journal
```
