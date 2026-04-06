const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json({ limit: "10mb" }));

const SECRET = process.env.SCREENSHOT_SECRET;

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/screenshot", async (req, res) => {
  if (req.headers["x-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { html } = req.body;
  if (!html || typeof html !== "string") {
    return res.status(400).json({ error: "Missing html" });
  }

  // Inject CSS to control image sizing and background
  const cssInjection = `<style>
    img { max-width: 100%; height: auto; }
    body { background: #ffffff; margin: 0; padding: 16px; box-sizing: border-box; }
  </style>`;
  let processedHtml = html;
  if (processedHtml.includes('</head>')) {
    processedHtml = processedHtml.replace('</head>', `${cssInjection}</head>`);
  } else {
    processedHtml = cssInjection + processedHtml;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 700, height: 1000 });

    // Use domcontentloaded instead of networkidle0 — faster and more reliable
    // across all email types including heavy HTML emails with external images
    await page.setContent(processedHtml, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Wait 3s for external images to load where possible
    await new Promise((r) => setTimeout(r, 3000));

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 85,
      fullPage: true,
    });

    res.set("Content-Type", "image/jpeg");
    res.send(screenshot);
  } catch (err) {
    console.error("Screenshot error:", err);
    res.status(500).json({ error: "Screenshot failed", detail: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Screenshot service running on port ${PORT}`));
