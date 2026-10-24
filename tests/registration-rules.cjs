const assert = require("node:assert/strict");
const {
  normalizeContent,
  defaultContent,
  submitRegistration,
  changeRegistrationStatus,
  available,
  normalizeActivity,
} = require("../packages/shared");
const user = { name: "مشارك تجريبي" };
const activity = normalizeActivity({
  ...defaultContent.activities[0],
  capacity: 1,
  seatsTaken: 0,
});
const details = {
  firstName: "مشارك",
  lastName: "تجريبي",
  email: "demo@example.com",
  gender: "male",
  age: "16",
  dob: (() => { const date = new Date(activity.startDate || activity.date || new Date().toISOString().slice(0,10)); date.setUTCFullYear(date.getUTCFullYear()-16); return date.toISOString().slice(0,10); })(),
  phone: "0790000000",
  address: "مدينة تجريبية",
  registrationRole: "camper",
  meals: false,
  transport: true,
};
assert(submitRegistration(activity, null, details, [], true).error);
assert(submitRegistration(activity, user, details, [], false).error);
assert(
  submitRegistration(activity, user, { ...details, age: "9" }, [], true).error,
);
assert(
  submitRegistration(activity, user, { ...details, phone: "123" }, [], true)
    .error,
);
assert(
  submitRegistration(
    { ...activity, registrationMode: "closed" },
    user,
    details,
    [],
    true,
  ).error,
);
let records = [submitRegistration(activity, user, details, [], true).record];
assert.equal(records[0].status, "Pending");
assert.equal(
  available(activity, records),
  1,
  "Pending does not reserve capacity",
);
assert(
  submitRegistration(activity, user, details, records, true).error,
  "Duplicate pending request blocked",
);
records.push(
  submitRegistration(activity, { name: "مشارك آخر" }, details, records, true)
    .record,
);
records = changeRegistrationStatus(records, records[0].id, "Confirmed", [
  activity,
]).records;
assert.equal(available(activity, records), 0);
assert(
  changeRegistrationStatus(records, records[1].id, "Confirmed", [activity])
    .error,
  "Approval cannot overbook",
);
assert(
  changeRegistrationStatus(records, records[0].id, "Cancelled", [activity])
    .error,
  "Confirmed request cannot be cancelled",
);
assert(
  submitRegistration(activity, user, details, records, true).error,
  "Duplicate confirmed request blocked",
);
const waiting = submitRegistration(
  activity,
  { name: "ثالث" },
  details,
  records,
  true,
).record;
assert.equal(waiting.status, "Waiting");
assert(
  submitRegistration(
    { ...activity, allowWaitlist: false },
    { name: "رابع" },
    details,
    records,
    true,
  ).error,
);
records.push(waiting);
records = changeRegistrationStatus(records, waiting.id, "Cancelled", [
  activity,
]).records;
assert(
  submitRegistration(activity, { name: "ثالث" }, details, records, true).record,
  "Cancelled applicant can reapply",
);
assert(
  changeRegistrationStatus(records, waiting.id, "Confirmed", [activity]).error,
  "Cancelled request cannot be approved",
);
const existing = {
  activities: [{ id: "e1", title: "عنوان معدّل", capacity: 12 }],
  journeys: [],
  comments: [],
  galleries: [],
  announcements: [],
};
const migrated = normalizeContent(existing);
assert.equal(migrated.activities[0].title, "عنوان معدّل");
assert.equal(migrated.activities[0].capacity, 12);
assert(migrated.activities.some((a) => a.kind === "camp"));
assert(migrated.activities.some((a) => a.kind === "trip"));
assert.equal(
  normalizeContent({ ...migrated, activities: [] }).activities.length,
  0,
  "Deleted samples do not reappear",
);
console.log(
  "PASS: consent, age/phone validation, closed registration, duplicates, capacity on approval, waitlist, cancellation, content migration.",
);
