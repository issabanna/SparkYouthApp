const assert = require("node:assert/strict");
const { campDetails, demoImage } = require("./camp-fixtures.cjs");
const {
  normalizeActivity,
  validateDetails,
  submitRegistration,
  saveReceipt,
  reviewReceipt,
  changeRegistrationStatus,
  tentOccupancy,
} = require("../packages/shared");
const a = normalizeActivity({
    id: "family-camp",
    kind: "camp",
    published: true,
    tentsEnabled: true,
    fees: 35,
  }),
  user = { name: "والد تجريبي" };
const first = campDetails({ nationalId: "DEMO-CHILD-1" }),
  second = campDetails({
    firstName: "مشاركة",
    lastName: "تجريبية ثانية",
    arabicFullName: "مشاركة تجريبية ثانية",
    nationalId: "DEMO-CHILD-2",
    gender: "female",
    tentNumber: "7",
  });
assert.deepEqual(validateDetails(first, a), {});
for (const field of [
  "arabicFullName",
  "englishFullName",
  "nationalId",
  "dob",
  "grade",
  "guardianName",
  "guardianPhone",
  "guardianPhoneOwner",
  "city",
  "school",
  "shirtSize",
  "medicalNotes",
  "allergies",
])
  assert(
    Object.keys(validateDetails({ ...first, [field]: "" }, a)).length,
    field + " must be validated",
  );
assert(validateDetails({ ...first, idDocument: null }, a).idDocument);
let records = [submitRegistration(a, user, first, [], true).record];
records.push(submitRegistration(a, user, second, records, true).record);
assert.equal(records.length, 2);
assert.equal(tentOccupancy(a, 0, records), 1);
assert.equal(tentOccupancy(a, 7, records), 1);
assert.equal(records[0].submittedBy, user.name);
assert(submitRegistration(a, user, first, records, true).error);
assert(
  submitRegistration(a, { name: "صديق آخر" }, first, records, true).error,
  "National ID prevents duplicate camper across submitters",
);
assert(
  changeRegistrationStatus(records, records[0].id, "Confirmed", [a]).error,
  "Paid camp requires accepted receipt",
);
assert(
  saveReceipt(
    records,
    records[0].id,
    { name: "حساب آخر" },
    demoImage(),
    "DEMO-REF",
  ).error,
);
records = saveReceipt(
  records,
  records[0].id,
  user,
  demoImage(),
  "DEMO-REF",
).records;
assert.equal(records[0].receiptStatus, "pendingReview");
assert.equal(records[1].receiptStatus, "notSubmitted");
records = reviewReceipt(records, records[0].id, "rejected").records;
assert(
  changeRegistrationStatus(records, records[0].id, "Confirmed", [a]).error,
);
records = saveReceipt(
  records,
  records[0].id,
  user,
  demoImage(),
  "DEMO-REF-2",
).records;
records = reviewReceipt(records, records[0].id, "accepted").records;
records = changeRegistrationStatus(records, records[0].id, "Confirmed", [
  a,
]).records;
assert.equal(records[0].status, "Confirmed");
assert.equal(records[1].status, "Pending");
assert(saveReceipt(records, records[0].id, user, demoImage(), "LATE").error);
const q = { ...a, registrationMode: "waitingList" };
const queued = submitRegistration(
  q,
  user,
  campDetails({ nationalId: "DEMO-CHILD-3", tentNumber: "waitingList" }),
  records,
  true,
).record;
records.push(queued);
assert.equal(queued.status, "Waiting");
assert(saveReceipt(records, queued.id, user, demoImage(), "WAIT").error);
assert(changeRegistrationStatus(records, queued.id, "Confirmed", [q], 1).error);
records = changeRegistrationStatus(
  records,
  queued.id,
  "Pending",
  [q],
  1,
).records;
assert.equal(records[2].status, "Pending");
assert.equal(records[2].details.tentNumber, 1);
assert.equal(tentOccupancy(q, 1, records), 1);
console.log(
  "PASS: legacy camp fields, multi-camper account, duplicate camper ID, separate tent/payment states, receipt validation/re-upload/review and waitlist-to-payment promotion.",
);

assert.equal(
  submitRegistration(
    a,
    { name: "اختبار فصل الأدوار" },
    campDetails({ nationalId: "DEMO-ROLE-ONLY", registrationRole: "leader" }),
    [],
    true,
  ).record.details.registrationRole,
  "camper",
  "Camper form cannot create a leader application",
);
