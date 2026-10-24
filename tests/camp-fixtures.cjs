const fs = require("node:fs");
const path = require("node:path");
const imagePath = path.join(__dirname, "../apps/admin/public/media/team.png");
const demoImage = () => ({
  uri: "data:image/png;base64," + fs.readFileSync(imagePath).toString("base64"),
  name: "fictional-test-document.png",
  mimeType: "image/png",
});
const campDetails = (overrides = {}) => ({
  firstName: "مشارك",
  lastName: "تجريبي أول",
  arabicFullName: "مشارك تجريبي أول",
  englishFullName: "Demo Camper One",
  nationalId: "DEMO-BASE-001",
  dob: `${new Date().getUTCFullYear() - 16}-01-01`,
  age: "16",
  email: "parent@example.com",
  phone: "0790000000",
  gender: "male",
  registrationRole: "camper",
  grade: "التاسع",
  guardianName: "ولي أمر تجريبي",
  guardianPhone: "0790000000",
  guardianPhoneOwner: "الأب",
  city: "مدينة تجريبية",
  address: "مدينة تجريبية",
  school: "مدرسة تجريبية",
  shirtSize: "M",
  medicalNotes: "لا يوجد",
  allergies: "لا يوجد",
  idDocument: demoImage(),
  tentNumber: "0",
  ...overrides,
});
async function pickImage(page, button) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: button, exact: true }).click();
  await (await chooser).setFiles(imagePath);
}
async function fillCampParticipant(
  page,
  {
    name = "مشارك تجريبي أول",
    nationalId = "DEMO-BROWSER-001",
    dob = `${new Date().getUTCFullYear() - 16}-01-01`,
    gender = "ذكر",
  } = {},
) {
  await page
    .getByLabel("الاسم الثلاثي باللغة العربية", { exact: true })
    .fill(name);
  await page
    .getByLabel("الاسم الكامل باللغة الإنجليزية", { exact: true })
    .fill("Demo Camper Person");
  await page
    .getByLabel("الرقم الوطني (مطلوب)", { exact: true })
    .fill(nationalId);
  await page.getByLabel("صف المشارك", { exact: true }).selectOption("التاسع");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("parent@example.com");
  await page.getByLabel("تاريخ الميلاد (مطلوب)", { exact: true }).fill(dob);
  await page.getByRole("button", { name: gender, exact: true }).click();
  await page.getByLabel("رقم الهاتف", { exact: true }).fill("0790000000");
  await page
    .getByRole("button", { name: "التالي: ولي الأمر والمعلومات الأخرى" })
    .click();
}
async function fillCampExtra(page) {
  await page
    .getByLabel("اسم ولي الأمر", { exact: true })
    .fill("ولي أمر تجريبي");
  await page
    .getByLabel("رقم هاتف ولي الأمر", { exact: true })
    .fill("0790000000");
  await page
    .getByLabel("هاتف ولي الأمر يعود إلى", { exact: true })
    .selectOption("الأب");
  await page.getByLabel("المدينة", { exact: true }).fill("مدينة تجريبية");
  await page.getByLabel("المدرسة", { exact: true }).fill("مدرسة تجريبية");
  await page.getByLabel("مقاس التيشيرت", { exact: true }).selectOption("M");
  await page.getByLabel("التوصيات الطبية", { exact: true }).fill("لا يوجد");
  await page.getByLabel("الحساسية", { exact: true }).fill("لا يوجد");
  await pickImage(page, "اختيار صورة الهوية");
  await page.getByLabel("معاينة صورة الهوية").waitFor();
  await page.getByRole("button", { name: "التالي: الخيمة والخدمات" }).click();
}
module.exports = {
  demoImage,
  campDetails,
  pickImage,
  fillCampParticipant,
  fillCampExtra,
};
