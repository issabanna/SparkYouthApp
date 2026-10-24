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
  useAgeLimits: true,
  allowedGrades: [],
  brandColor: "#5149ae",
  brandTitle: "",
  gradeLabel: "",
  birthYearLabel: "",
  requireNationalId: true,
  requireIdDocument: true,
  requireReceipt: true,
  collectMedical: true,
  gradeOptions: [
    "الثالث",
    "الرابع",
    "الخامس",
    "السادس",
    "السابع",
    "الثامن",
    "التاسع",
    "العاشر",
    "الحادي عشر",
    "الثاني عشر",
    "الثاني عشر+",
    "جامعي",
    "آخر",
  ],
  cityOptions: [],
  schoolOptions: [],
  shirtOptions: ["XS", "S", "M", "L", "XL", "XXL"],
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
  result.gradeOptions = a.gradeOptions ?? (a.allowedGrades?.length ? a.allowedGrades : activityDefaults.gradeOptions);
  result.allowedGrades = [];
  result.useAgeLimits = false;
  result.idImageCheckPolicy = a.idImageCheckPolicy === "reject" ? "reject" : "warn";
  result.collectCity = a.collectCity ?? true;
  result.collectSchool = a.collectSchool ?? result.kind === "camp";
  result.collectShirtSize = a.collectShirtSize ?? result.kind === "camp";
  result.gradeLabel = result.kind === "camp" ? `الصفوف: ${result.gradeOptions.filter(Boolean).join("، ")}` : "";
  result.birthYearLabel = [result.dobMin, result.dobMax].filter(Boolean).map(date => date.slice(0,4)).join("–");
  // All occupancy comes from app registrations; ignore legacy manual counts.
  result.seatsTaken = 0;
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
    seatsTaken: 0,
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
const cleanName = (value) =>
  (value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const duplicateParticipant = (records, activityId, user, details) =>
  records.find((r) => {
    if (
      r.activityId !== activityId ||
      !["Pending", "Confirmed", "Waiting"].includes(r.status)
    )
      return false;
    const id1 = (r.details.nationalId || "")
        .replace(/[\s-]/g, "")
        .toUpperCase(),
      id2 = (details.nationalId || "").replace(/[\s-]/g, "").toUpperCase();
    if (id1 && id2) return id1 === id2;
    return (
      r.ownerKey === ownerKey(user) &&
      cleanName(r.details.firstName) === cleanName(details.firstName) &&
      cleanName(r.details.lastName) === cleanName(details.lastName) &&
      (r.details.dob && details.dob
        ? r.details.dob === details.dob
        : String(r.details.age) === String(details.age) &&
          r.details.gender === details.gender)
    );
  });
function validateDetails(d, a, stage = "all") {
  const errors = {};
  if (a.kind === "camp" && stage !== "participant" && d.idDocument && a.idImageCheckPolicy === "reject" &&
      !(d.idDocument.aiCheck?.status === "checked" && d.idDocument.aiCheck.accepted === true))
    errors.idDocument = "اختر صورة هوية أو صورة شخصية واضحة واجتز فحص الصورة قبل المتابعة.";
  if (a.registrationTestMode === true) {
    if (stage !== "extra" &&
        (a.tentsEnabled || a.registrationMode === "waitingList") &&
        !["male", "female"].includes(d.gender))
      errors.gender = "اختر الجنس لعرض الخيام المناسبة.";
    if (d.dob && (!validDate(d.dob) || d.dob > new Date().toISOString().slice(0,10) ||
      (a.dobMin && d.dob < a.dobMin) || (a.dobMax && d.dob > a.dobMax)))
      errors.dob = "تاريخ الميلاد خارج النطاق المسموح.";
    return errors;
  }
  if (
    a.kind !== "camp" &&
    (!d.firstName?.trim() || d.firstName.trim().length > 50)
  )
    errors.firstName = "أدخل الاسم الأول (حتى 50 حرفًا).";
  if (
    a.kind !== "camp" &&
    (!d.lastName?.trim() || d.lastName.trim().length > 50)
  )
    errors.lastName = "أدخل اسم العائلة (حتى 50 حرفًا).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || ""))
    errors.email = "أدخل بريدًا إلكترونيًا صحيحًا.";
  if (!["male", "female"].includes(d.gender))
    errors.gender = "اختر الجنس.";
  if (!/^\d{10}$/.test(d.phone || ""))
    errors.phone = "أدخل رقم هاتف من 10 أرقام.";
  if (
    !Number.isInteger(Number(d.age)) ||
    !d.age
  )
    errors.dob = "اختر تاريخ الميلاد لحساب العمر.";
  const today = new Date().toISOString().slice(0, 10);
  {
    if (!validDate(d.dob || "") || d.dob > today)
      errors.dob = "أدخل تاريخ ميلاد صحيحًا بصيغة YYYY-MM-DD.";
    else if ((a.dobMin && d.dob < a.dobMin) || (a.dobMax && d.dob > a.dobMax))
      errors.dob = "تاريخ الميلاد خارج النطاق المسموح لهذا المخيم.";
    else {
      const age = ageAt(d.dob, a.startDate || a.date || today);
      if (
        age !== Number(d.age)
      )
        errors.dob = "راجع العمر وتاريخ الميلاد وفق تاريخ بدء المخيم.";
    }
  }
  if (a.kind !== "camp" || stage !== "participant") {
    if (a.collectCity !== false && (!(d.city || (a.kind !== "camp" ? d.address : ""))?.trim() ||
      (a.cityOptions.length && !a.cityOptions.includes(d.city)))) errors.city = "أدخل المدينة أو اخترها.";
    if (a.collectSchool && (!d.school?.trim() || (a.schoolOptions.length && !a.schoolOptions.includes(d.school)))) errors.school = "أدخل المدرسة أو اخترها.";
    if (a.collectShirtSize && !a.shirtOptions.includes(d.shirtSize)) errors.shirtSize = "اختر مقاس التيشيرت.";
  }
  if (a.kind === "camp") {
    if ((d.arabicFullName || "").trim().split(/\s+/).length < 3)
      errors.arabicFullName = "أدخل الاسم الثلاثي للمشارك.";
    if ((d.englishFullName || "").trim().split(/\s+/).length < 2)
      errors.englishFullName = "أدخل الاسم الكامل باللغة الإنجليزية.";
    if (a.requireNationalId && !/^[A-Za-z0-9-]{4,30}$/.test(d.nationalId || ""))
      errors.nationalId = "أدخل الرقم الوطني أو رقم الوثيقة الصحيح.";
    if (
      !a.gradeOptions.includes(d.grade)
    )
      errors.grade = "اختر صف المشارك.";
    if (stage !== "participant") {
      if (!d.guardianName?.trim()) errors.guardianName = "أدخل اسم ولي الأمر.";
      if (!/^\d{10}$/.test(d.guardianPhone || ""))
        errors.guardianPhone = "أدخل رقم هاتف ولي الأمر من 10 أرقام.";
      if (
        !["الأب", "الأم", "الوصي", "قريب", "آخر"].includes(d.guardianPhoneOwner)
      )
        errors.guardianPhoneOwner = "اختر صاحب رقم الهاتف.";
      if (a.collectMedical && !d.medicalNotes?.trim())
        errors.medicalNotes = "اذكر التوصيات الطبية، أو اكتب لا يوجد.";
      if (a.collectMedical && !d.allergies?.trim())
        errors.allergies = "اذكر الحساسية، أو اكتب لا يوجد.";
      if (
        (a.requireIdDocument || d.idDocument) &&
        !validPreviewImage(d.idDocument)
      )
        errors.idDocument = "أرفق صورة هوية تجريبية صالحة.";
    }
  }
  if (stage === "extra")
    return Object.fromEntries(
      Object.entries(errors).filter(([key]) =>
        [
          "guardianName",
          "guardianPhone",
          "guardianPhoneOwner",
          "city",
          "school",
          "shirtSize",
          "medicalNotes",
          "allergies",
          "idDocument",
        ].includes(key),
      ),
    );
  return errors;
}
function submitRegistration(activity, user, details, records, consent) {
  const a = normalizeActivity(activity);
  details = { ...details, registrationRole: "camper" };
  if (a.registrationTestMode === true &&
      !(a.kind === "camp" ? details.arabicFullName?.trim() :
        (details.firstName?.trim() && details.lastName?.trim()))) {
    const count = records.filter(r => r.activityId === a.id && r.ownerKey === ownerKey(user)).length + 1;
    details = { ...details, arabicFullName: `مشارك تجريبي ${count}`,
      firstName: "مشارك", lastName: `تجريبي ${count}` };
  }
  if (a.kind === "camp") {
    const names = (details.arabicFullName || "").trim().split(/\s+/);
    details = {
      ...details,
      firstName: names[0] || "",
      lastName: names.slice(1).join(" "),
    };
  }
  if (!user) return { error: "سجّل الدخول أولًا." };
  if (!a.published || !a.registrationOpen || a.inactive)
    return { error: "التسجيل مغلق لهذا النشاط." };
  if (duplicateParticipant(records, a.id, user, details))
    return {
      error:
        "لديك طلب قائم لهذا المشارك في هذا النشاط. يمكنك تسجيل مشارك آخر ببياناته.",
    };
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
      submittedBy: user.name,
      campFormVersion: a.kind === "camp" ? 2 : null,
      testRegistration: a.registrationTestMode === true,
      feeAmount: Number(a.fees || 0),
      currency: a.currency,
      receiptStatus: "notSubmitted",
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
    !["Pending", "Confirmed", "Cancelled", "Rejected"].includes(status)
  )
    return { error: "لا يمكن إجراء هذا التغيير على حالة الطلب." };
  if (status === "Pending" && current.status !== "Waiting")
    return { error: "يمكن نقل طلب الانتظار فقط إلى قيد المراجعة." };
  const a = activities.find((a) => a.id === current.activityId);
  if (
    ["Confirmed", "Pending"].includes(status) &&
    (!a || available(normalizeActivity(a), records) === 0)
  )
    return { error: "لا توجد أماكن متاحة لتأكيد الطلب." };
  const updatedDetails = {
    ...current.details,
    ...(["Confirmed", "Pending"].includes(status) &&
    assignedTent !== undefined &&
    assignedTent !== ""
      ? { tentNumber: Number(assignedTent) }
      : {}),
  };
  if (["Confirmed", "Pending"].includes(status) && a) {
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
  if (
    status === "Confirmed" &&
    current.campFormVersion === 2 &&
    a?.requireReceipt &&
    Number(current.feeAmount) > 0 &&
    current.receiptStatus !== "accepted"
  )
    return {
      error:
        "راجع وصل الإيداع واقبله قبل تأكيد المشاركة، أو انقل المنتظر إلى قيد المراجعة لطلب الوصل.",
    };
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
  duplicateParticipant,
  validateDetails,
  submitRegistration,
  changeRegistrationStatus,
};

module.exports.validateCampSettings = (activity, records) => {
  const a = normalizeActivity(activity);
  if (
    a.kind === "camp" &&
    (!a.gradeOptions.filter(Boolean).length ||
      (a.collectShirtSize && !a.shirtOptions.filter(Boolean).length))
  )
    return "أضف خيارات الصفوف ومقاسات التيشيرت.";
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

const validPreviewImage = (image) =>
  !!image &&
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(
    image.uri || "",
  ) &&
  (image.uri || "").length < 700000;
module.exports.validPreviewImage = validPreviewImage;
module.exports.saveReceipt = (records, id, user, image, reference) => {
  const r = records.find((r) => r.id === id && r.ownerKey === ownerKey(user));
  if (!r || r.status !== "Pending")
    return { error: "يمكن رفع الوصل لطلبك قيد المراجعة فقط." };
  if (!validPreviewImage(image) || !reference?.trim() || reference.length > 100)
    return { error: "أرفق صورة وصل صالحة ورقمًا مرجعيًا." };
  return {
    records: records.map((x) =>
      x.id === id
        ? {
            ...x,
            receipt: image,
            receiptReference: reference.trim(),
            receiptStatus: "pendingReview",
            receiptNote: "",
            receiptUploadedAt: new Date().toISOString(),
          }
        : x,
    ),
  };
};
module.exports.reviewReceipt = (records, id, decision, note = "") => {
  const r = records.find((r) => r.id === id);
  if (
    !r ||
    r.status !== "Pending" ||
    !r.receipt ||
    !["accepted", "rejected"].includes(decision)
  )
    return { error: "لا يوجد وصل متاح للمراجعة لهذا الطلب." };
  return {
    records: records.map((x) =>
      x.id === id
        ? {
            ...x,
            receiptStatus: decision,
            receiptNote:
              note ||
              (decision === "rejected"
                ? "يرجى إعادة رفع صورة واضحة مع الرقم المرجعي الصحيح."
                : ""),
            receiptReviewedAt: new Date().toISOString(),
          }
        : x,
    ),
  };
};
