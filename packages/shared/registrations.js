const registrationKey = "spark-event-registrations-v1";
const activityDefaults = {
  kind: "event",
  capacity: 40,
  seatsTaken: 0,
  minAge: 12,
  maxAge: 25,
  registrationOpen: true,
  allowWaitlist: true,
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
const normalizeActivity = (a) => ({ ...activityDefaults, ...a });
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
  return errors;
}
function submitRegistration(activity, user, details, records, consent) {
  const a = normalizeActivity(activity);
  if (!user) return { error: "سجّل الدخول أولًا." };
  if (!a.published || !a.registrationOpen)
    return { error: "التسجيل مغلق لهذا النشاط." };
  if (activeRegistration(records, a.id, user))
    return { error: "لديك طلب قائم لهذا النشاط." };
  if (Object.keys(validateDetails(details, a)).length)
    return { error: "راجع البيانات المطلوبة قبل الإرسال." };
  if (!consent) return { error: "الموافقة على تعليمات المشاركة مطلوبة." };
  const full = available(a, records) === 0;
  if (full && !a.allowWaitlist)
    return { error: "النشاط مكتمل العدد والتسجيل مغلق." };
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
      details: { ...details },
      status: full ? "Waiting" : "Pending",
      consentedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  };
}
function changeRegistrationStatus(records, id, status, activities) {
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
  return {
    records: records.map((r) =>
      r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r,
    ),
  };
}
module.exports = {
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
