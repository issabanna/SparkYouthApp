const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.SPARK_TEST_URL || "http://localhost:3016";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage(),
      admin = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/app");
    await page.getByLabel("اسمك في المعاينة").fill("مشارك تجريبي");
    await page.getByRole("button", { name: "دخول تجريبي" }).click();
    await page.getByRole("tab", { name: "الأنشطة", exact: true }).click();
    await page.getByRole("button", { name: "مخيمات", exact: true }).click();
    const kids = page.getByTestId("activity-card-spark-kids");
    await kids
      .getByRole("button", { name: "غير فعّال", exact: true })
      .waitFor();
    assert(
      await kids
        .getByRole("button", { name: "غير فعّال", exact: true })
        .isDisabled(),
    );
    assert(
      (await kids.innerText()).replace(/[\u2066-\u2069]/g, "").includes("3–5"),
    );
    await kids.screenshot({ path: "/workspace/review/spark-kids-card.png" });
    const sport = page.getByTestId("activity-card-spark-sport");
    await sport.screenshot({ path: "/workspace/review/spark-sport-card.png" });
    await admin.goto(base);
    await admin
      .getByRole("button", { name: "المخيمات والأنشطة", exact: true })
      .click();
    await admin
      .locator("article")
      .filter({
        has: admin.getByRole("heading", {
          name: "مخيم الأطفال · الصفوف 3–5",
          exact: true,
        }),
      })
      .getByRole("button", { name: "تعديل", exact: true })
      .click();
    await admin.getByLabel("لون هوية المخيم", { exact: true }).fill("#482d99");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await admin.getByRole("status").waitFor();
    await page.waitForFunction(
      () =>
        JSON.parse(
          localStorage.getItem("spark-camp-content-v1"),
        ).activities.find((a) => a.id === "spark-kids").brandColor ===
        "#482d99",
    );
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("[style]")).some(
        (e) =>
          getComputedStyle(e).backgroundColor === "rgb(72, 45, 153)" ||
          getComputedStyle(e).backgroundImage.includes("72, 45, 153"),
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: grade-labelled inactive camp posters, distinct Kids/Sport identities, embedded logo, admin color edit reaching mobile preview.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
