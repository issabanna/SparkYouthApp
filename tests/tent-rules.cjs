const assert = require("node:assert/strict");
const {
  normalizeActivity,
  defaultTents,
  eligibleTents,
  tentAvailable,
  tentOccupancy,
  submitRegistration,
  changeRegistrationStatus,
  validateCampSettings,
  validateDetails,
  ageAt,
} = require("../packages/shared");
const a = normalizeActivity({
  id: "c1",
  kind: "camp",
  title: "Camp",
  published: true,
  capacity: 100,
  tentsEnabled: true,
});
assert.equal(a.tents.length, 14);
assert(a.tents.every((t) => t.capacity === 10));
assert.deepEqual(
  eligibleTents(a, "male").map((t) => t.number),
  [0, 1, 2, 3, 4, 5, 6],
);
assert.deepEqual(
  eligibleTents(a, "female").map((t) => t.number),
  [7, 8, 9, 10, 11, 12, 13],
);
const d = {
  firstName: "أول",
  lastName: "عائلة",
  email: "demo@example.com",
  gender: "male",
  age: "16",
  phone: "0790000000",
  address: "مدينة",
  registrationRole: "camper",
  tentNumber: "0",
};
assert(
  submitRegistration(a, { name: "a" }, { ...d, tentNumber: "" }, [], true)
    .error,
);
assert(
  submitRegistration(a, { name: "a" }, { ...d, tentNumber: "7" }, [], true)
    .error,
);
assert(
  submitRegistration(
    a,
    { name: "a" },
    { ...d, gender: "female", tentNumber: "6" },
    [],
    true,
  ).error,
);
assert(
  submitRegistration(a, { name: "a" }, { ...d, gender: "other" }, [], true)
    .error,
);
let records = [];
for (let i = 0; i < 10; i++)
  records.push(
    submitRegistration(a, { name: "u" + i }, d, records, true).record,
  );
assert(records.every((r) => r.status === "Pending"));
assert.equal(tentAvailable(a, 0, records), 0);
assert(
  submitRegistration(a, { name: "full" }, d, records, true).error,
  "Standard camp does not automatically open waiting list",
);
const queueCamp = { ...a, registrationMode: "waitingList" };
const waiting = submitRegistration(
  queueCamp,
  { name: "wait" },
  { ...d, tentNumber: "waitingList" },
  records,
  true,
).record;
assert.equal(waiting.status, "Waiting");
assert.equal(waiting.details.tentNumber, null);
records.push(waiting);
assert.equal(tentOccupancy(a, 0, records), 10);
assert(
  submitRegistration(
    { ...queueCamp, waitlistMale: false },
    { name: "no" },
    { ...d, tentNumber: "waitingList" },
    records,
    true,
  ).error,
);
records = changeRegistrationStatus(records, records[0].id, "Confirmed", [
  a,
]).records;
assert.equal(
  tentOccupancy(a, 0, records),
  10,
  "Own reservation excluded when confirming",
);
assert(changeRegistrationStatus(records, waiting.id, "Confirmed", [a]).error);
assert(
  validateCampSettings(
    {
      ...a,
      tents: a.tents.map((t) => (t.number === 0 ? { ...t, capacity: 9 } : t)),
    },
    records,
  ),
);
const increased = {
  ...a,
  tents: a.tents.map((t) => (t.number === 0 ? { ...t, capacity: 11 } : t)),
};
assert.equal(validateCampSettings(increased, records), null);
assert.equal(tentAvailable(increased, 0, records), 1);
records = changeRegistrationStatus(
  records,
  waiting.id,
  "Confirmed",
  [increased],
  0,
).records;
assert.equal(tentOccupancy(increased, 0, records), 11);
records = changeRegistrationStatus(records, records[1].id, "Cancelled", [
  increased,
]).records;
assert.equal(tentAvailable(increased, 0, records), 1);
records = changeRegistrationStatus(records, records[2].id, "Rejected", [
  increased,
]).records;
assert.equal(tentAvailable(increased, 0, records), 2);
assert.equal(
  submitRegistration(
    a,
    { name: "female" },
    { ...d, gender: "female", tentNumber: "7" },
    records,
    true,
  ).record.status,
  "Pending",
);
const event = normalizeActivity({ ...a, kind: "event", tentsEnabled: true });
assert.equal(event.tentsEnabled, false);
assert.equal(
  submitRegistration(
    event,
    { name: "event" },
    { ...d, tentNumber: "" },
    [],
    true,
  ).record.details.tentNumber,
  null,
);
assert(
  submitRegistration({ ...a, inactive: true }, { name: "soon" }, d, [], true)
    .error,
);
assert.equal(ageAt("2011-02-03", "2027-07-01"), 16);
const birthCamp = {
  ...a,
  startDate: "2027-07-01",
  dobMin: "2010-01-01",
  dobMax: "2014-12-31",
};
assert(validateDetails({ ...d, dob: "" }, birthCamp).dob);
assert(validateDetails({ ...d, dob: "2011-02-30" }, birthCamp).dob);
assert(validateDetails({ ...d, dob: "2008-02-01" }, birthCamp).dob);
assert(!validateDetails({ ...d, dob: "2011-02-03" }, birthCamp).dob);
assert(
  validateCampSettings(
    { ...a, startDate: "2027-07-07", endDate: "2027-07-01" },
    [],
  ),
);
console.log(
  "PASS: tent zero, gender ranges, pending reservations, waiting, approval capacity, cancellation/rejection release, live per-tent capacity, DOB, inactive and event exclusion.",
);

const queueWithSpace = submitRegistration(
  queueCamp,
  { name: "space-queue" },
  { ...d, tentNumber: "waitingList" },
  [],
  true,
);
assert.equal(queueWithSpace.record.status, "Waiting");
assert.equal(queueWithSpace.record.details.tentNumber, null);
assert(
  changeRegistrationStatus(
    [queueWithSpace.record],
    queueWithSpace.record.id,
    "Confirmed",
    [queueCamp],
  ).error,
);
assert(
  changeRegistrationStatus(
    [queueWithSpace.record],
    queueWithSpace.record.id,
    "Confirmed",
    [queueCamp],
    7,
  ).error,
);
assert.equal(
  changeRegistrationStatus(
    [queueWithSpace.record],
    queueWithSpace.record.id,
    "Confirmed",
    [queueCamp],
    0,
  ).records[0].status,
  "Confirmed",
);
