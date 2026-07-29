import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const server = spawn("npx", ["vite", "--port", "5556"], {
    cwd: path.resolve(__dirname),
    stdio: "pipe",
  });
  await new Promise((r) => {
    server.stdout.on("data", (d) => { if (d.toString().includes("Local")) r(); });
    setTimeout(r, 5000);
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || text.includes("Error") || text.includes("error")) {
      errors.push(`[${msg.type()}] ${text}`);
    }
    console.log(`CONSOLE ${msg.type()}: ${text.substring(0, 150)}`);
  });
  page.on("pageerror", (err) => {
    errors.push("PAGE ERROR: " + err.message);
    console.log("PAGE ERROR:", err.message);
  });

  console.log("\n=== Loading page ===");
  await page.goto("http://localhost:5556", { timeout: 20000 });
  await page.waitForTimeout(4000);

  console.log(`\n=== Canvas exists: ${await page.locator("canvas").count() > 0} ===`);
  console.log(`=== Initial console errors: ${errors.length} ===`);

  // Click the center of the screen where the button should be
  const box = await page.locator("canvas").boundingBox();
  if (box) {
    const btnX = box.x + box.width / 2;
    const btnY = box.y + box.height / 2 + 110;
    console.log(`\n=== Clicking START at (${btnX}, ${btnY}) ===`);
    await page.mouse.click(btnX, btnY);
    await page.waitForTimeout(3000);
  }

  console.log(`\n=== New errors after click: ===`);
  for (const e of errors) console.log("  " + e.substring(0, 200));

  // Try pressing E to interact
  await page.keyboard.press("KeyE");
  await page.waitForTimeout(500);

  // Try pressing 1, 2 to switch weapons
  await page.keyboard.press("Digit1");
  await page.waitForTimeout(300);
  await page.keyboard.press("Digit2");
  await page.waitForTimeout(300);

  // Try shooting
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "/tmp/game-test2.png" });
  console.log("\n=== Screenshot saved ===");

  await browser.close();
  server.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
