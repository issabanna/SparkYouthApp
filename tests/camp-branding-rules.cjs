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
assert(validateCampSettings({ ...kids, allowedGrades: ["صف غير موجود"] }, []));
console.log(
  "PASS: school grades are not ages, birth-year eligibility, inactive reference templates, editable branding and preserving legacy content on migration.",
);
