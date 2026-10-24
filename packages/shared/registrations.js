const registrationKey = "spark-event-registrations-v1";
const activityDefaults = {
  kind: "event",
  capacity: 40,
  seatsTaken: 0,
  minAge: 12,
  maxAge: 25,
  registrationOpen: true,
  allowWaitlist: true,
  startDate: "",
  endDate: "",
  visitorsDate: "",
  departureTime: "",
  arrivalTime: "",
  fees: 0,
  currency: "JOD",
  instructions: "",
  afterRegistrationInstructions: "",
  startInstructions: "",
  dobMin: "",
  dobMax: "",
  waitlistMale: true,
  waitlistFemale: true,
  tentsEnabled: false,
  inactive: false,
  terms:
    "ألتزم بتعليمات السلامة واحترام المشاركين. هذا نص تجريبي يحتاج اعتماد الإدارة.",
};
const kinds = { camp: "مخيم", trip: "رحلة", event: "فعالية" };
const statuses = {
  Pending: "قيد المراجعة",
  Confirmed: "مؤكد",
  Waiting: "قائمة الانتظار",
  Cancelled: "ملغى",
  Rejected: "مرفوض",
};
const defaultTents = () =>
  Array.from({ length: 14 }, (_, number) => ({
    number,
    gender: number <= 6 ? "male" : "female",
    capacity: 10,
    seatsTaken: 0,
  }));
const normalizeActivity = (a) => {
  const result = { ...activityDefaults, ...a };
  result.inactive = !!(a.inactive ?? a.preparing ?? false);
  result.registrationMode = ["standard", "waitingList", "closed"].includes(
    a.registrationMode,
  )
    ? a.registrationMode
    : a.registrationOpen === false
      ? "closed"
      : "standard";
  if (result.kind !== "camp" && result.registrationMode === "waitingList")
    result.registrationMode = "standard";
  result.registrationOpen = result.registrationMode !== "closed";
  result.tentsEnabled = result.kind === "camp" && !!result.tentsEnabled;
  result.tents = defaultTents().map((t) => ({
    ...t,
    ...a.tents?.find((x) => Number(x.number) === t.number),
    number: t.number,
    gender: t.gender,
  }));
  return result;
};
const tentOccupancy = (a, tentNumber, records, excludeId) => {
  const tent = a.tents.find((t) => t.number === Number(tentNumber));
  return (
    Number(tent?.seatsTaken || 0) +
    records.filter(
      (r) =>
        r.id !== excludeId &&
        r.activityId === a.id &&
        r.details.tentNumber !== "" &&
        r.details.tentNumber != null &&
        Number(r.details.tentNumber) === Number(tentNumber) &&
        ["Confirmed", "Pending"].includes(r.status),
    ).length
  );
};
const tentAvailable = (a, tentNumber, records, excludeId) => {
  const tent = a.tents.find((t) => t.number === Number(tentNumber));
  return tent
    ? Math.max(
        0,
        Number(tent.capacity) -
          tentOccupancy(a, tentNumber, records, excludeId),
      )
    : 0;
};
const eligibleTents = (a, gender) => a.tents.filter((t) => t.gender === gender);
const waitingAllowed = (a, gender) =>
  a.allowWaitlist &&
  (gender !== "male" || a.waitlistMale) &&
  (gender !== "female" || a.waitlistFemale);
const validDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const ageAt = (dob, date) => {
  if (!validDate(dob) || !validDate(date)) return null;
  const b = new Date(dob),
    d = new Date(date);
  return (
    d.getUTCFullYear() -
    b.getUTCFullYear() -
    (d.getUTCMonth() < b.getUTCMonth() ||
    (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())
      ? 1
      : 0)
  );
};
const tentError = (a, d) => {
  if (a.kind === "camp" && a.registrationMode === "waitingList")
    return d.tentNumber === "waitingList" ? null : "اختر قائمة الانتظار.";
  if (!a.tentsEnabled) return null;
  if (!["male", "female"].includes(d.gender))
    return "يرجى التواصل مع الإدارة لترتيب السكن؛ لا توجد خيام مخصصة لهذا الخيار.";
  if (d.tentNumber == null || d.tentNumber === "") return "اختر رقم الخيمة.";
  const tent = a.tents.find((t) => t.number === Number(d.tentNumber));
  return !tent || tent.gender !== d.gender
    ? "الخيمة المختارة لا تناسب بيانات المشارك."
    : null;
};
const ownerKey = (user) => user?.id || user?.name?.trim().toLowerCase();
const occupied = (activity, records) =>
  Number(activity.seatsTaken || 0) +
  records.filter(
    (r) => r.activityId === activity.id && r.status === "Confirmed",
  ).length;
const available = (activity, records) =>
  Math.max(0, Number(activity.capacity) - occupied(activity, records));
const activeRegistration = (records, activityId, user) =>
  records.find(
    (r) =>
      r.activityId === activityId &&
      r.ownerKey === ownerKey(user) &&
      ["Pending", "Confirmed", "Waiting"].includes(r.status),
  );
function validateDetails(d, a) {
  const errors = {};
  if (!d.firstName?.trim() || d.firstName.trim().length > 50)
    errors.firstName = "أدخل الاسم الأول (حتى 50 حرفًا).";
  if (!d.lastName?.trim() || d.lastName.trim().length > 50)
    errors.lastName = "أدخل اسم العائلة (حتى 50 حرفًا).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || ""))
    errors.email = "أدخل بريدًا إلكترونيًا صحيحًا.";
  if (!["male", "female", "other"].includes(d.gender))
    errors.gender = "اختر الجنس.";
  if (!/^\d{10}$/.test(d.phone || ""))
    errors.phone = "أدخل رقم هاتف من 10 أرقام.";
  if (
    !Number.isInteger(Number(d.age)) ||
    !d.age ||
    Number(d.age) < a.minAge ||
    Number(d.age) > a.maxAge
  )
    errors.age = `العمر المسموح من ${a.minAge} إلى ${a.maxAge} سنة.`;
  if (!d.address?.trim()) errors.address = "أدخل المدينة أو العنوان.";
  if (!["camper", "leader"].includes(d.registrationRole))
    errors.registrationRole = "اختر دور المشاركة.";
  const today = new Date().toISOString().slice(0, 10);
  if (a.kind === "camp" && (a.dobMin || a.dobMax || d.dob)) {
    if (!validDate(d.dob || "") || d.dob > today)
      errors.dob = "أدخل تاريخ ميلاد صحيحًا بصيغة YYYY-MM-DD.";
    else if ((a.dobMin && d.dob < a.dobMin) || (a.dobMax && d.dob > a.dobMax))
      errors.dob = "تاريخ الميلاد خارج النطاق المسموح لهذا المخيم.";
    else {
      const age = ageAt(d.dob, a.startDate || a.date || today);
      if (age < a.minAge || age > a.maxAge || age !== Number(d.age))
        errors.dob = "راجع العمر وتاريخ الميلاد وفق تاريخ بدء المخيم.";
    }
  }
  return errors;
}
function submitRegistration(activity, user, details, records, consent) {
  const a = normalizeActivity(activity);
  if (!user) return { error: "سجّل الدخول أولًا." };
  if (!a.published || !a.registrationOpen || a.inactive)
    return { error: "التسجيل مغلق لهذا النشاط." };
  if (activeRegistration(records, a.id, user))
    return { error: "لديك طلب قائم لهذا النشاط." };
  if (Object.keys(validateDetails(details, a)).length)
    return { error: "راجع البيانات المطلوبة قبل الإرسال." };
  if (!consent) return { error: "الموافقة على تعليمات المشاركة مطلوبة." };
  const invalidTent = tentError(a, details);
  if (invalidTent) return { error: invalidTent };
  const queueOnly = a.kind === "camp" && a.registrationMode === "waitingList";
  const full =
    available(a, records) === 0 ||
    (a.tentsEnabled && tentAvailable(a, details.tentNumber, records) === 0);
  if (queueOnly && !waitingAllowed(a, details.gender))
    return { error: "التسجيل في قائمة الانتظار غير متاح لهذا القسم." };
  if (
    !queueOnly &&
    full &&
    (a.kind === "camp" || !waitingAllowed(a, details.gender))
  )
    return {
      error:
        "التسجيل مكتمل. لا يمكن الانضمام للانتظار إلا بعد فتحه من الإدارة.",
    };
  const id =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    record: {
      id,
      reference: "SP-" + id.replaceAll("-", "").slice(0, 10).toUpperCase(),
      activityId: a.id,
      activityTitle: a.title,
      ownerKey: ownerKey(user),
      details: {
        ...details,
        tentNumber:
          !queueOnly && a.tentsEnabled ? Number(details.tentNumber) : null,
      },
      status: queueOnly || full ? "Waiting" : "Pending",
      consentedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  };
}
function changeRegistrationStatus(
  records,
  id,
  status,
  activities,
  assignedTent,
) {
  const current = records.find((r) => r.id === id);
  if (!current) return { error: "الطلب غير موجود." };
  if (
    !["Pending", "Waiting"].includes(current.status) ||
    !["Confirmed", "Cancelled", "Rejected"].includes(status)
  )
    return { error: "لا يمكن إجراء هذا التغيير على حالة الطلب." };
  const a = activities.find((a) => a.id === current.activityId);
  if (
    status === "Confirmed" &&
    (!a || available(normalizeActivity(a), records) === 0)
  )
    return { error: "لا توجد أماكن متاحة لتأكيد الطلب." };
  const updatedDetails = {
    ...current.details,
    ...(status === "Confirmed" &&
    assignedTent !== undefined &&
    assignedTent !== ""
      ? { tentNumber: Number(assignedTent) }
      : {}),
  };
  if (status === "Confirmed" && a) {
    const normalized = normalizeActivity(a);
    const error = tentError(
      { ...normalized, registrationMode: "standard" },
      updatedDetails,
    );
    if (error) return { error };
    if (
      normalized.tentsEnabled &&
      tentAvailable(
        normalized,
        updatedDetails.tentNumber,
        records,
        current.id,
      ) === 0
    )
      return {
        error: "الخيمة ممتلئة. عدّل السعة أو انتظر توفر مكان قبل التأكيد.",
      };
  }
  return {
    records: records.map((r) =>
      r.id === id
        ? {
            ...r,
            details: updatedDetails,
            status,
            updatedAt: new Date().toISOString(),
          }
        : r,
    ),
  };
}
module.exports = {
  defaultTents,
  tentOccupancy,
  tentAvailable,
  eligibleTents,
  waitingAllowed,
  validDate,
  ageAt,
  tentError,
  registrationKey,
  kinds,
  statuses,
  normalizeActivity,
  ownerKey,
  available,
  activeRegistration,
  validateDetails,
  submitRegistration,
  changeRegistrationStatus,
};

module.exports.validateCampSettings = (activity, records) => {
  const a = normalizeActivity(activity);
  if (a.registrationMode === "waitingList" && !a.allowWaitlist)
    return "فعّل السماح بقائمة الانتظار عند اختيار وضع الانتظار.";
  if (!Number.isFinite(Number(a.fees)) || Number(a.fees) < 0)
    return "أدخل رسومًا صحيحة غير سالبة.";
  for (const key of [
    "startDate",
    "endDate",
    "visitorsDate",
    "dobMin",
    "dobMax",
  ])
    if (a[key] && !validDate(a[key])) return "تحقق من صيغة التواريخ.";
  if (a.startDate && a.endDate && a.endDate < a.startDate)
    return "تاريخ النهاية يجب ألا يسبق البداية.";
  if (
    a.visitorsDate &&
    ((a.startDate && a.visitorsDate < a.startDate) ||
      (a.endDate && a.visitorsDate > a.endDate))
  )
    return "يوم الزيارة يجب أن يقع ضمن مدة المخيم.";
  if (a.dobMin && a.dobMax && a.dobMin > a.dobMax)
    return "نطاق تاريخ الميلاد غير صحيح.";
  if (a.departureTime && a.arrivalTime && a.arrivalTime < a.departureTime)
    return "وقت الوصول يجب ألا يسبق وقت المغادرة.";
  if (a.tentsEnabled) {
    for (const t of a.tents) {
      if (
        !Number.isInteger(Number(t.capacity)) ||
        Number(t.capacity) < 0 ||
        !Number.isInteger(Number(t.seatsTaken)) ||
        Number(t.seatsTaken) < 0
      )
        return "سعة كل خيمة وإشغالها الخارجي يجب أن يكونا عددين صحيحين غير سالبين.";
      if (tentOccupancy(a, t.number, records) > Number(t.capacity))
        return `لا يمكن خفض سعة الخيمة ${t.number} عن إشغالها الحالي.`;
    }
  }
  return null;
};
