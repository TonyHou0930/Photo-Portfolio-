# Portfolio OS

黑白科技感攝影作品集 + Obsidian 風格知識圖譜。

## 快速開始

```bash
npm install
```

### Step 1 — 放照片

把你的照片丟進 `public/photos/`（用 VS Code 拖就好）

### Step 2 — 掃描

```bash
npm run scan
```

腳本會自動讀 EXIF 填入年份和地點作為預設值。

### Step 3 — 編輯資料

打開 `data/photos.json`，每張照片長這樣：

```json
{
  "file": "tokyo-sunset.jpg",      ← 檔名（不要改）
  "title": "Tokyo Sunset",         ← 你想顯示的標題
  "year": "2024",                  ← 年份（左下角標籤）
  "location": "Tokyo, Japan",      ← 地點（左下角標籤 + 節點圖橘色點）
  "category": "Landscape",         ← 分類（節點圖白色大點）
  "tags": ["sunset", "city"],      ← 標籤（節點圖灰色小點）
  "url": "/photos/tokyo-sunset.jpg",
  "height": 240                    ← 瀑布流高度（180~340）
}
```

你可以自由改 title / year / location / category / tags。

### Step 4 — 啟動

```bash
npm run dev
```

開 http://localhost:3000 就是你的作品集。

## 新增或刪除照片

```
加照片：丟進 public/photos/ → npm run scan → 編輯 JSON
刪照片：從 public/photos/ 刪掉 → npm run scan（會自動移除）
```

`npm run scan` 不會覆蓋你已經編輯過的照片資料。

## 照片顯示

- 照片以原始亮度顯示
- 左下角永久顯示年份 + 地點標籤
- Hover 照片 → 半透明疊加顯示標題和分類
- 同分類/同地點/同標籤的照片會高亮關聯

## 節點圖

```
⬤ 白色大點   → category 欄位（你定義的分類）
◉ 橘色圈點   → location 欄位（拍攝地點）
● 彩色小點   → 每張照片
· 灰色小點   → tags 裡的每個標籤
```

點分類節點 → 跳回 Gallery 並篩選。
