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

  // Inject CSS to control image sizing — broken images stay small,
  // working images display normally up to full width
  const cssInjection = `<style>
    img { max-width: 100%; height: auto; }
    img:-moz-broken { max-height: 0; opacity: 0; }
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

    // Set content and wait for network to settle
    await page.setContent(processedHtml, { waitUntil: "networkidle0", timeout: 20000 });

    // Wait up to 5s for external images (logos, banners) to load
    await new Promise((r) => setTimeout(r, 5000));

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
