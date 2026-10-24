const assert = require("node:assert/strict");
const {
  campTemplates,
  normalizeActivity,
  normalizeContent,
  contentVersion,
  validateDetails,
  validateCampSettings,
} = require("../packages/shared");
const { campDetails } = require("./camp-fixtures.cjs");
assert.equal(campTemplates.length, 6);
assert(
  campTemplates.every(
    (c) => c.inactive && c.registrationMode === "closed" && !c.startDate,
  ),
);
const kids = normalizeActivity(
  campTemplates.find((c) => c.id === "spark-kids"),
);
assert.equal(kids.brandColor, "#5149ae");
const year = new Date().getUTCFullYear();
const d = campDetails({ dob: `${year - 8}-01-01`, age: "8", grade: "الثالث" });
assert(!validateDetails(d, kids).age);
assert(!validateDetails(d, kids).dob);
assert(!validateDetails(d, kids).grade);
assert(validateDetails({ ...d, grade: "العاشر" }, kids).grade);
const sport = normalizeActivity(
  campTemplates.find((c) => c.id === "spark-sport"),
);
assert.equal(sport.dobMin, "2008-01-01");
assert.equal(sport.dobMax, "2012-12-31");
assert(
  validateDetails(
    { ...d, dob: "2013-01-01", age: String(year - 2013), grade: "التاسع" },
    sport,
  ).dob,
);
const legacy = {
  schemaVersion: 2,
  activities: [
    {
      id: "custom-camp",
      title: "عنوان الإدارة",
      kind: "camp",
      brandColor: "#123456",
    },
  ],
  journeys: [],
  announcements: [],
  galleries: [],
  comments: [],
};
const migrated = normalizeContent(legacy);
assert.equal(migrated.schemaVersion, contentVersion);
assert.equal(migrated.activities[0].title, "عنوان الإدارة");
assert.equal(migrated.activities[0].brandColor, "#123456");
assert.equal(migrated.activities.length, 7);
assert.equal(
  normalizeContent({ ...migrated, activities: [] }).activities.length,
  0,
);
assert.equal(validateCampSettings({ ...kids, allowedGrades: ["صف غير موجود"] }, []), null);
assert(validateCampSettings({ ...kids, gradeOptions: [] }, []));
console.log(
  "PASS: school grades are not ages, birth-year eligibility, inactive reference templates, editable branding and preserving legacy content on migration.",
);

const renamed = normalizeContent({
  schemaVersion: 3,
  activities: [
    {
      id: "camp-demo",
      title: "مخيم سبارك · تحت النجوم",
      kind: "camp",
      capacity: 51,
      image: "/media/custom.jpg",
    },
    { id: "spark-kids", title: "اسم خاص بالإدارة", kind: "camp" },
  ],
  announcements: [{ id: "a1", title: "موعدنا تحت النجوم" }],
});
assert.equal(renamed.activities[0].title, "مخيم الشبيبة");
assert.equal(renamed.activities[0].capacity, 51);
assert.equal(renamed.activities[0].image, "/media/custom.jpg");
assert.equal(renamed.activities[1].title, "اسم خاص بالإدارة");
assert.equal(renamed.announcements[0].title, "أخبار المخيم والتسجيل");
assert.equal(
  renamed.activities.length,
  2,
  "Version 3 deletions remain deleted during rename migration",
);
