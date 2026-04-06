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
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });

    // Wait 2s for external images like logos to load
    await new Promise((r) => setTimeout(r, 2000));

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
