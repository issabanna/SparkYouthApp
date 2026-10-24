const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const {
  fillCampParticipant,
  fillCampExtra,
  pickImage,
} = require("./camp-fixtures.cjs");
const base = process.env.SPARK_TEST_URL || "http://localhost:3015";
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
    for (const p of [page, admin])
      p.on("pageerror", (e) => errors.push(e.message));
    await admin.goto(base);
    await admin
      .getByRole("button", { name: "المخيمات والأنشطة", exact: true })
      .click();
    await admin
      .locator("article")
      .filter({
        has: admin.getByRole("heading", {
          name: "مخيم الشبيبة",
          exact: true,
        }),
      })
      .getByRole("button", { name: "تعديل", exact: true })
      .click();
    await admin.getByLabel("تفعيل اختيار الخيمة أثناء التسجيل").check();
    await admin.getByLabel("الرسوم", { exact: true }).fill("25");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await page.goto(base + "/app");
    await page.getByLabel("اسمك في المعاينة").fill("ولي أمر تجريبي");
    await page.getByRole("button", { name: "دخول تجريبي" }).click();
    await page.getByRole("tab", { name: "الأنشطة", exact: true }).click();
    await page.getByRole("button", { name: "مخيمات", exact: true }).click();
    await page.getByRole("button", { name: "سجّل الآن", exact: false }).click();
    const register = async (options, tent) => {
      await fillCampParticipant(page, options);
      await fillCampExtra(page);
      await page
        .getByRole("button", { name: "الخيمة " + tent, exact: true })
        .click();
      await page.getByRole("button", { name: "التالي: مراجعة الطلب" }).click();
      await page
        .getByRole("checkbox", { name: "أوافق على تعليمات المشاركة" })
        .click();
      await page.getByRole("button", { name: "إرسال طلب التسجيل" }).click();
    };
    assert.equal(
      await page.getByText("دور المشاركة", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByRole("button", { name: "طلب مرشد", exact: true }).count(),
      0,
    );
    await register(
      { name: "مشارك تجريبي أول", nationalId: "DEMO-FAMILY-1" },
      0,
    );
    await page
      .getByRole("button", { name: "تسجيل مشارك جديد", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("الاسم الثلاثي باللغة العربية").inputValue(),
      "",
    );
    await register(
      {
        name: "مشاركة تجريبية ثانية",
        nationalId: "DEMO-FAMILY-2",
        gender: "أنثى",
      },
      7,
    );
    await page
      .getByRole("button", { name: "عرض تسجيلاتي", exact: true })
      .click();
    assert.equal(
      await page.getByText("قيد المراجعة", { exact: true }).count(),
      2,
    );
    await page.getByText("مشارك تجريبي أول", { exact: true }).waitFor();
    await page.getByText("مشاركة تجريبية ثانية", { exact: true }).waitFor();
    const first = () =>
      page.getByText("مشارك تجريبي أول", { exact: true }).locator("..");
    const second = () =>
      page.getByText("مشاركة تجريبية ثانية", { exact: true }).locator("..");
    const upload = async (reference) => {
      await first()
        .getByRole("button", { name: /تحميل وصل الإيداع/ })
        .click();
      await pickImage(page, "اختيار صورة الوصل");
      await page.getByLabel("الرقم المرجعي للوصل").fill(reference);
      await page.getByRole("button", { name: "تأكيد رفع الوصل" }).click();
      await first()
        .getByText("تم تحميل الوصل · بانتظار التحقق", { exact: true })
        .waitFor();
    };
    await upload("FICTIONAL-REF-1");
    await admin
      .getByRole("button", { name: "طلبات التسجيل", exact: true })
      .click();
    const row = admin
      .locator("article")
      .filter({ hasText: "مشارك تجريبي أول" });
    await row.getByRole("button", { name: "تأكيد الطلب", exact: true }).click();
    await admin
      .getByRole("status")
      .filter({ hasText: "راجع وصل الإيداع" })
      .waitFor();
    await row
      .getByRole("button", { name: "طلب تصحيح الوصل", exact: true })
      .click();
    await first().getByText("الوصل يحتاج تصحيحًا", { exact: true }).waitFor();
    await upload("FICTIONAL-REF-2");
    await row
      .getByRole("button", { name: "قبول وصل الإيداع", exact: true })
      .click();
    await row.getByRole("button", { name: "تأكيد الطلب", exact: true }).click();
    await first().getByText("مؤكد", { exact: true }).waitFor();
    await second().getByText("قيد المراجعة", { exact: true }).waitFor();
    await second()
      .getByText("بانتظار تحميل وصل الإيداع", { exact: true })
      .waitFor();
    await first()
      .getByRole("button", { name: "عرض بطاقة المشاركة وQR" })
      .click();
    await page.getByText("بطاقة المشاركة", { exact: true }).waitFor();
    assert((await page.locator("svg").count()) > 0);
    await page.screenshot({ path: "/tmp/spark-confirmed-camper-qr.png" });
    await page.getByRole("button", { name: "إغلاق", exact: false }).click();
    await page.reload();
    await page.getByRole("tab", { name: "الأنشطة", exact: true }).click();
    await page.getByRole("button", { name: "تسجيلاتي", exact: true }).click();
    await page.getByText("التسجيلات المؤكدة", { exact: true }).waitFor();
    await page.getByText("بانتظار الدفع أو التأكيد", { exact: true }).waitFor();
    await first().getByText("مؤكد", { exact: true }).waitFor();
    await second().getByText("قيد المراجعة", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: complete legacy camper form, shared parent account, independent campers/tents/payment, ID upload, receipt replacement/review, payment gate, grouped statuses, persisted confirmation and QR preview.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
