const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.SPARK_TEST_URL || "http://localhost:3012";
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const admin = await context.newPage(),
      page = await context.newPage();
    const errors = [];
    for (const p of [admin, page])
      p.on("pageerror", (e) => errors.push(e.message));
    await admin.goto(base);
    const editCamp = async () => {
      await admin
        .getByRole("button", { name: "المخيمات والأنشطة", exact: true })
        .click();
      await admin
        .locator("article")
        .filter({
          has: admin.getByRole("heading", {
            name: "مخيم سبارك · تحت النجوم",
            exact: true,
          }),
        })
        .getByRole("button", { name: "تعديل", exact: true })
        .click();
    };
    await editCamp();
    await admin.getByLabel("تفعيل اختيار الخيمة أثناء التسجيل").check();
    await admin.getByLabel("السعة · الخيمة 0", { exact: true }).fill("1");
    await admin.getByLabel("السعة · الخيمة 7", { exact: true }).fill("1");
    await admin.getByLabel("تاريخ البداية", { exact: true }).fill("2027-07-01");
    await admin.getByLabel("تاريخ النهاية", { exact: true }).fill("2027-07-07");
    await admin
      .getByLabel("أقدم تاريخ ميلاد مسموح", { exact: true })
      .fill("2010-01-01");
    await admin
      .getByLabel("أحدث تاريخ ميلاد مسموح", { exact: true })
      .fill("2014-12-31");
    await admin.getByLabel("الرسوم", { exact: true }).fill("35");
    await admin
      .getByLabel("تعليمات بعد التسجيل", { exact: true })
      .fill("أحضر وثائقك إلى مكتب التسجيل.");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await admin.getByRole("status").waitFor();
    await page.goto(base + "/app");
    await page.getByLabel("اسمك في المعاينة").fill("مشارك أول");
    await page.getByRole("button", { name: "دخول تجريبي" }).click();
    const openCamp = async () => {
      await page.getByRole("tab", { name: "الأنشطة", exact: true }).click();
      await page.getByRole("button", { name: "مخيمات", exact: true }).click();
      await page
        .getByRole("button", { name: "سجّل الآن", exact: false })
        .click();
      await page
        .getByLabel("البريد الإلكتروني", { exact: true })
        .fill("demo@example.com");
      await page
        .getByLabel("تاريخ الميلاد (مطلوب)", { exact: true })
        .fill("2011-02-03");
      await page.getByRole("button", { name: "ذكر", exact: true }).click();
      await page.getByLabel("رقم الهاتف", { exact: true }).fill("0790000000");
      await page
        .getByLabel("المدينة أو العنوان", { exact: true })
        .fill("مدينة تجريبية");
      await page
        .getByRole("button", { name: "التالي: الخدمات الاختيارية" })
        .click();
    };
    await openCamp();
    assert.equal(
      await page.getByRole("button", { name: /^الخيمة \d+$/ }).count(),
      7,
    );
    assert.equal(
      await page.getByRole("button", { name: "الخيمة 7", exact: true }).count(),
      0,
    );
    await page.getByRole("button", { name: "الخيمة 0", exact: true }).click();
    await page.getByRole("button", { name: "السابق", exact: true }).click();
    await page.getByRole("button", { name: "أنثى", exact: true }).click();
    await page
      .getByRole("button", { name: "التالي: الخدمات الاختيارية" })
      .click();
    assert.equal(
      await page.getByRole("button", { name: "الخيمة 0", exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByRole("button", { name: "الخيمة 7", exact: true }).count(),
      1,
    );
    await page.getByRole("button", { name: "السابق", exact: true }).click();
    await page.getByRole("button", { name: "ذكر", exact: true }).click();
    await page
      .getByRole("button", { name: "التالي: الخدمات الاختيارية" })
      .click();
    await page.getByRole("button", { name: "التالي: مراجعة الطلب" }).click();
    await page.getByText("اختر رقم الخيمة.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "الخيمة 0", exact: true }).click();
    await page.screenshot({ path: "/tmp/spark-tent-selection.png" });
    const submit = async () => {
      await page.getByRole("button", { name: "التالي: مراجعة الطلب" }).click();
      await page
        .getByRole("checkbox", { name: "أوافق على تعليمات المشاركة" })
        .click();
      await page.getByRole("button", { name: "إرسال طلب التسجيل" }).click();
      await page
        .getByRole("button", { name: "عرض تسجيلاتي", exact: true })
        .click();
    };
    await submit();
    await page.getByText("قيد المراجعة", { exact: true }).waitFor();
    await page.getByText("الخيمة 0", { exact: true }).waitFor();
    await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem("spark-camp-profile-v1"));
      p.user.name = "مشارك ثاني";
      localStorage.setItem("spark-camp-profile-v1", JSON.stringify(p));
    });
    await page.reload();
    await openCamp();
    assert.equal(
      await page
        .getByRole("button", { name: "الخيمة 0", exact: true })
        .isDisabled(),
      true,
    );
    await editCamp();
    await admin
      .getByLabel("وضع التسجيل", { exact: true })
      .selectOption("waitingList");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await page
      .getByRole("button", { name: "قائمة الانتظار", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: /^الخيمة \d+$/ }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "قائمة الانتظار", exact: true })
      .click();
    await submit();
    await page.getByText("قائمة الانتظار", { exact: true }).waitFor();
    let saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("spark-event-registrations-v1")),
    );
    assert.equal(saved[1].status, "Waiting");
    assert.equal(saved[1].details.tentNumber, null);
    await admin
      .getByRole("button", { name: "طلبات التسجيل", exact: true })
      .click();
    const first = admin.locator("article").filter({ hasText: "مشارك أول" }),
      second = admin.locator("article").filter({ hasText: "مشارك ثاني" });
    await second.getByRole("button", { name: "تأكيد الطلب" }).click();
    await admin
      .getByRole("status")
      .filter({ hasText: "اختر رقم الخيمة" })
      .waitFor();
    await first.getByRole("button", { name: "رفض الطلب" }).click();
    await second.getByRole("combobox").selectOption("0");
    await second.getByRole("button", { name: "تأكيد الطلب" }).click();
    await page.getByText("مؤكد", { exact: true }).waitFor();
    await page.getByText("الخيمة 0", { exact: true }).waitFor();
    await editCamp();
    await admin.getByLabel("السعة · الخيمة 0", { exact: true }).fill("0");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await admin
      .getByRole("status")
      .filter({ hasText: "لا يمكن خفض سعة الخيمة 0" })
      .waitFor();
    await admin.getByLabel("السعة · الخيمة 0", { exact: true }).fill("2");
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await editCamp();
    await admin
      .getByLabel("غير فعّال: عرض التفاصيل دون إجراءات تسجيل", { exact: true })
      .check();
    await admin.getByRole("button", { name: "حفظ المحتوى" }).click();
    await page.getByRole("button", { name: "مخيمات", exact: true }).click();
    await page
      .getByRole("button", { name: "غير فعّال", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "غير فعّال", exact: true })
        .isDisabled(),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: admin camp settings, male/female tents, gender reset, tent 0, DOB, held places, explicit virtual waiting list, admin tent assignment, live capacity guard, inactive camp.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
