const { chromium } = require("playwright");
const { fillCampParticipant, fillCampExtra } = require("./camp-fixtures.cjs");
const assert = require("node:assert/strict");
const base = process.env.SPARK_TEST_URL || "http://localhost:3008";
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
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/app");
    await page.getByLabel("اسمك في المعاينة").fill("مشارك تجريبي");
    await page.getByRole("button", { name: "دخول تجريبي" }).click();
    await page.getByRole("tab", { name: "الأنشطة", exact: true }).click();
    assert.equal(await page.getByRole("tab").count(), 5);
    await page.getByRole("button", { name: "مخيمات", exact: true }).click();
    await page.getByRole("button", { name: "سجّل الآن", exact: false }).click();
    await page
      .getByRole("button", { name: "التالي: ولي الأمر والمعلومات الأخرى" })
      .click();
    await page
      .getByText("أدخل بريدًا إلكترونيًا صحيحًا.", { exact: true })
      .waitFor();
    const fill = async () => {
      await fillCampParticipant(page);
      await fillCampExtra(page);
      await page.getByRole("checkbox", { name: "أحتاج مواصلات" }).click();
      await page.getByRole("button", { name: "التالي: مراجعة الطلب" }).click();
    };
    await fill();
    assert.equal(
      await page
        .getByRole("button", { name: "إرسال طلب التسجيل" })
        .isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "السابق", exact: true }).click();
    await page.getByRole("button", { name: "التالي: مراجعة الطلب" }).click();
    await page
      .getByRole("checkbox", { name: "أوافق على تعليمات المشاركة" })
      .click();
    await page.getByRole("button", { name: "إرسال طلب التسجيل" }).click();
    await page
      .getByRole("button", { name: "عرض تسجيلاتي", exact: true })
      .click();
    await page.getByText("قيد المراجعة", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("spark-event-registrations-v1"))
            .length,
      ),
      1,
    );
    await page.reload();
    await page.getByRole("tab", { name: "الأنشطة", exact: true }).click();
    await page.getByRole("button", { name: "مخيمات", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "سجّل مشاركًا آخر", exact: false })
        .count(),
      1,
    );
    await page
      .getByRole("button", { name: "عرض تسجيلاتي لهذا النشاط", exact: true })
      .click();
    const admin = await context.newPage();
    admin.on("pageerror", (e) => errors.push(e.message));
    await admin.goto(base);
    await admin
      .getByRole("button", { name: "طلبات التسجيل", exact: true })
      .click();
    await admin.getByText("مشارك تجريبي أول ·", { exact: false }).waitFor();
    await admin
      .getByRole("button", { name: "تأكيد الطلب", exact: true })
      .click();
    await page.getByText("مؤكد", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "إلغاء الطلب", exact: true })
        .count(),
      0,
    );
    await admin
      .getByRole("button", { name: "المخيمات والأنشطة", exact: true })
      .click();
    const tripCard = admin.locator("article").filter({
      has: admin.getByRole("heading", {
        name: "رحلة مسار الطبيعة",
        exact: true,
      }),
    });
    await tripCard.getByRole("button", { name: "تعديل", exact: true }).click();
    await admin.getByLabel("السعة الكلية", { exact: true }).fill("20");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await page.getByRole("button", { name: "رحلات", exact: true }).click();
    await page
      .getByRole("button", { name: "انضم إلى قائمة الانتظار", exact: true })
      .click();
    await page.getByLabel("الاسم الأول", { exact: true }).fill("مشارك");
    await page.getByLabel("اسم العائلة", { exact: true }).fill("تجريبي");
    await page
      .getByLabel("البريد الإلكتروني", { exact: true })
      .fill("demo@example.com");
    await page.getByLabel("العمر", { exact: true }).fill("16");
    await page.getByRole("button", { name: "ذكر", exact: true }).click();
    await page.getByLabel("رقم الهاتف", { exact: true }).fill("0790000000");
    await page.getByLabel("المدينة أو العنوان", { exact: true }).fill("مدينة");
    await page
      .getByRole("button", { name: "التالي: الخدمات الاختيارية" })
      .click();
    await page.getByRole("button", { name: "التالي: مراجعة الطلب" }).click();
    await page
      .getByRole("checkbox", { name: "أوافق على تعليمات المشاركة" })
      .click();
    await page.getByRole("button", { name: "إرسال طلب التسجيل" }).click();
    await page
      .getByRole("button", { name: "عرض تسجيلاتي", exact: true })
      .click();
    await page.getByText("قائمة الانتظار", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إلغاء الطلب", exact: true })
      .click();
    await page.getByRole("button", { name: "العودة", exact: true }).click();
    await page.getByText("قائمة الانتظار", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إلغاء الطلب", exact: true })
      .click();
    await page
      .getByRole("button", { name: "نعم، إلغاء الطلب", exact: true })
      .click();
    await page.getByText("ملغى", { exact: true }).waitFor();
    await page.getByRole("button", { name: "فعاليات", exact: true }).click();
    await page.getByRole("button", { name: "سجّل الآن", exact: false }).click();
    await page.getByRole("button", { name: "إغلاق", exact: false }).click();
    await page.getByRole("button", { name: "العودة", exact: true }).click();
    await page.getByLabel("الاسم الأول", { exact: true }).waitFor();
    await page.getByRole("button", { name: "إغلاق", exact: false }).click();
    await page
      .getByRole("button", { name: "الخروج دون إرسال", exact: true })
      .click();
    await page.getByRole("button", { name: "الكل", exact: true }).click();
    await page.screenshot({ path: "/tmp/spark-activities.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: five-tab navigation, filters, form validation, consent/review, pending submission, persistent duplicate prevention, admin approval, confirmed cancellation restriction, waitlist, cancellation and draft exit.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
