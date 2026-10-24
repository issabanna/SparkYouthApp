"use client";
import { useEffect, useState } from "react";
import {
  reviewReceipt,
  validateCampSettings,
  tentOccupancy,
  tentAvailable,
  eligibleTents,
  normalizeContent,
  contentVersion,
  registrationKey,
  statuses,
  normalizeActivity,
  available,
  changeRegistrationStatus,
  defaultContent,
  storageKey,
} from "../../../packages/shared";
const sections = [
  ["overview", "نظرة عامة"],
  ["announcements", "إعلانات الصفحة الرئيسية"],
  ["activities", "المخيمات والأنشطة"],
  ["registrations", "طلبات التسجيل"],
  ["galleries", "ألبومات الصور"],
  ["journeys", "مسارات التعلّم"],
  ["comments", "تعليقات المسارات"],
];
const emptyItem = (key) => ({
  id: Date.now().toString(),
  title: "",
  text: "",
  published: false,
  ...(key === "galleries"
    ? { images: [] }
    : key === "comments"
      ? {}
      : { image: "/media/camp.png" }),
  ...(key === "activities"
    ? {
        date: "",
        location: "",
        kind: "event",
        capacity: 40,
        seatsTaken: 0,
        minAge: 12,
        maxAge: 25,
        registrationOpen: true,
        allowWaitlist: true,
        terms:
          "ألتزم بتعليمات السلامة واحترام المشاركين. نص تجريبي يحتاج اعتماد الإدارة.",
      }
    : {}),
  ...(key === "journeys" ? { audience: "campers", prompt: "" } : {}),
});
const safeImage = (url) =>
  url.startsWith("/media/") ||
  /^data:image\/(png|jpeg|webp);base64,/.test(url) ||
  /^https:\/\/[^\s]+$/.test(url);
export default function Dashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [tentAssignments, setTentAssignments] = useState({});
  const [content, setContent] = useState(defaultContent),
    [section, setSection] = useState("overview"),
    [draft, setDraft] = useState(null),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(storageKey));
      if (c) {
        const n = normalizeContent(c);
        setContent(n);
        if (c.schemaVersion !== contentVersion)
          localStorage.setItem(storageKey, JSON.stringify(n));
      }
    } catch {}
    try {
      setRegistrations(JSON.parse(localStorage.getItem(registrationKey)) || []);
    } catch {}
    setReady(true);
    const refresh = () => {
      try {
        setRegistrations(
          JSON.parse(localStorage.getItem(registrationKey)) || [],
        );
      } catch {}
      try {
        const c = JSON.parse(localStorage.getItem(storageKey));
        if (c) {
          const n = normalizeContent(c);
          setContent(n);
          if (c.schemaVersion !== contentVersion)
            localStorage.setItem(storageKey, JSON.stringify(n));
        }
      } catch {}
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const persist = (c) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(c));
      setContent(c);
      setMessage("تم الحفظ في هذا المتصفح. افتح معاينة التطبيق لرؤية التعديل.");
      return true;
    } catch {
      setMessage("تعذّر الحفظ. تحقق من مساحة التخزين وإعدادات المتصفح.");
      return false;
    }
  };
  const save = (e) => {
    e.preventDefault();
    if (
      section === "activities" &&
      (!Number.isInteger(Number(draft.capacity)) ||
        Number(draft.capacity) < 1 ||
        !Number.isInteger(Number(draft.seatsTaken)) ||
        Number(draft.seatsTaken) < 0 ||
        Number(draft.seatsTaken) +
          registrations.filter(
            (r) => r.activityId === draft.id && r.status === "Confirmed",
          ).length >
          Number(draft.capacity) ||
        Number(draft.minAge) < 1 ||
        Number(draft.maxAge) > 99 ||
        Number(draft.minAge) > Number(draft.maxAge))
    ) {
      setMessage(
        "تحقق من السعة والأماكن المؤكدة والأعمار. لا يمكن خفض السعة عن عدد المؤكدين.",
      );
      return;
    }
    if (section === "activities") {
      for (const key of [
        "gradeOptions",
        "cityOptions",
        "schoolOptions",
        "shirtOptions",
        "allowedGrades",
      ])
        if (draft[key])
          draft[key] = [
            ...new Set(draft[key].map((v) => v.trim()).filter(Boolean)),
          ];
    }
    if (section === "activities") {
      const error = validateCampSettings(draft, registrations);
      if (error) {
        setMessage(error);
        return;
      }
    }
    if (!draft.title.trim() || !draft.text.trim()) return;
    const images = section === "galleries" ? draft.images : [draft.image];
    if (images.some((url) => !safeImage(url))) {
      setMessage("استخدم رابط صورة HTTPS أو مسارًا يبدأ بـ /media/.");
      return;
    }
    if (section === "galleries" && !images.length) {
      setMessage("أضف صورة واحدة على الأقل.");
      return;
    }
    const list = content[section],
      next = list.some((x) => x.id === draft.id)
        ? list.map((x) => (x.id === draft.id ? draft : x))
        : [...list, draft];
    if (persist({ ...content, [section]: next })) setDraft(null);
  };
  const remove = (id) => {
    if (
      section === "activities" &&
      registrations.some(
        (r) =>
          r.activityId === id &&
          ["Pending", "Confirmed", "Waiting"].includes(r.status),
      )
    ) {
      setMessage(
        "لا يمكن حذف نشاط له طلبات قائمة. أغلق التسجيل أو أخفِ النشاط بدلًا من الحذف.",
      );
      return;
    }
    if (window.confirm("هل تريد حذف هذا المحتوى؟"))
      persist({
        ...content,
        [section]: content[section].filter((x) => x.id !== id),
        ...(section === "journeys"
          ? { comments: content.comments.filter((c) => c.journeyId !== id) }
          : {}),
      });
  };
  const move = (index, delta) => {
    const list = [...content[section]],
      target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    persist({ ...content, [section]: list });
  };
  const change = (key, value) => setDraft({ ...draft, [key]: value });
  const review = (id, status) => {
    try {
      const latest = JSON.parse(localStorage.getItem(registrationKey)) || [];
      const latestContent = normalizeContent(
        JSON.parse(localStorage.getItem(storageKey)) || content,
      );
      const result = changeRegistrationStatus(
        latest,
        id,
        status,
        latestContent.activities,
        tentAssignments[id],
      );
      if (result.error) {
        setMessage(result.error);
        return;
      }
      localStorage.setItem(registrationKey, JSON.stringify(result.records));
      setRegistrations(result.records);
      setMessage("تم تحديث حالة الطلب في المعاينة.");
    } catch {
      setMessage("تعذّر تحديث حالة الطلب.");
    }
  };
  const verifyReceipt = (id, decision) => {
    try {
      const latest = JSON.parse(localStorage.getItem(registrationKey)) || [];
      const result = reviewReceipt(latest, id, decision);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      localStorage.setItem(registrationKey, JSON.stringify(result.records));
      setRegistrations(result.records);
      setMessage(
        decision === "accepted"
          ? "تم قبول الوصل. يمكنك الآن تأكيد الطلب."
          : "تم طلب إعادة رفع الوصل.",
      );
    } catch {
      setMessage("تعذّر حفظ مراجعة الوصل.");
    }
  };
  const uploadActivityImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 500000
    ) {
      setMessage("اختر صورة PNG/JPEG/WebP أقل من 500 كيلوبايت للمعاينة.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => change("image", reader.result);
    reader.onerror = () => setMessage("تعذّر قراءة الصورة.");
    reader.readAsDataURL(file);
  };
  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 500000
    ) {
      setMessage("اختر شعار PNG أو JPEG أو WebP بحجم أقل من 500 كيلوبايت.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      persist({
        ...content,
        branding: { ...content.branding, logo: reader.result },
      });
    reader.onerror = () => setMessage("تعذّر قراءة ملف الشعار.");
    reader.readAsDataURL(file);
  };
  return (
    <div className="shell">
      <aside>
        <div className="logo">
          <img
            src={content.branding?.logo || "/media/spark-logo.png"}
            alt="شعار سبارك"
            className="brandLogo"
          />
          <span>سبارك · مجتمع المخيم</span>
        </div>
        <p className="muted">إدارة مجتمع سبارك</p>
        <nav>
          {sections.map(([id, label]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => {
                setSection(id);
                setDraft(null);
                setMessage("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <small>معاينة محلية · غير متصلة بخادم</small>
      </aside>
      <main>
        <header>
          <span>
            مجتمع سبارك / {sections.find((s) => s[0] === section)?.[1]}
          </span>
          <a
            href="/app/"
            target="_blank"
            rel="noreferrer"
            className="previewLink"
          >
            معاينة تطبيق الجوال ↗
          </a>
        </header>
        <div className="localNotice">
          نسخة للمراجعة: التعديلات تُحفظ في هذا المتصفح وتظهر في معاينة التطبيق
          على نفس الموقع. لا يوجد تسجيل دخول أو اعتماد مرشدين فعلي، ولا مزامنة
          بين الأجهزة بعد.
        </div>
        <section className="intro">
          <p className="eyebrow">مخيم يجمعنا، وتجارب تنمّينا</p>
          <h1>
            {section === "overview"
              ? "مساحة لكل حكاية"
              : sections.find((s) => s[0] === section)?.[1]}
          </h1>
          <p>أعلن عن المغامرة القادمة، شارك لحظاتها، وافتح بابًا للتعلّم.</p>
        </section>
        {message && (
          <p role="status" className="status">
            {message}
          </p>
        )}
        {section === "overview" ? (
          <>
            <div className="cards">
              {[
                [
                  "الأنشطة القادمة",
                  content.activities.filter((x) => x.published).length,
                ],
                [
                  "مسارات التعلّم",
                  content.journeys.filter((x) => x.published).length,
                ],
                [
                  "ألبومات الصور",
                  content.galleries.filter((x) => x.published).length,
                ],
              ].map(([label, n]) => (
                <article key={label}>
                  <p>{label}</p>
                  <strong>{n}</strong>
                  <small>محتوى منشور في المعاينة</small>
                </article>
              ))}
            </div>
            <section className="panel">
              <h2>الصفحة الرئيسية، بروح المخيم</h2>
              <p>
                إعلانات مصوّرة يتنقل بينها المشاركون، أنشطة قادمة، وألبومات تروي
                الحكاية. لم يعد هناك حائط اجتماعي؛ النقاشات أصبحت داخل مسارات
                التعلّم.
              </p>
              <button
                className="primary"
                onClick={() => setSection("announcements")}
              >
                إدارة الإعلانات ←
              </button>
            </section>
            <section className="panel">
              <h2>شعار سبارك</h2>
              <p>
                استخدم نسخة الشعار المخصصة للخلفية البيضاء. ارفع الملف الأصلي
                ليظهر هنا وفي تطبيق المعاينة على المتصفح نفسه.
              </p>
              <label className="logoUpload">
                رفع الشعار الأصلي
                <input
                  aria-label="رفع شعار سبارك"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={uploadLogo}
                />
              </label>
              {content.branding?.logo && (
                <img
                  src={content.branding.logo}
                  alt="معاينة شعار سبارك"
                  className="brandLogo"
                />
              )}
            </section>
            <section className="panel">
              <h2>كيف يُحتسب الإنجاز؟</h2>
              <p>
                يكمل المشارك المسار بعد قراءة النص وكتابة تأمّل شخصي. تُحتسب كل
                مسار مرة واحدة. التعليق العام منفصل عن التأمّل. مسارات المرشدين
                مخصصة للمعتمدين فقط؛ الاعتماد والحماية الفعلية يتطلبان ربط
                الخادم.
              </p>
            </section>
          </>
        ) : section === "registrations" ? (
          <section className="panel">
            <h2>مراجعة طلبات المشاركة</h2>
            <p>
              طلبات محلية في هذا المتصفح فقط. الموافقة تُحسب من السعة؛ الطلبات
              المعلقة لا تحجز مقاعد المخيم العامة، لكنها تحجز أماكن الخيام عند
              تفعيل اختيار الخيمة.
            </p>
            {registrations.map((r) => (
              <article key={r.id} style={{ marginBottom: 18 }}>
                <div className="panelTitle">
                  <h2>
                    {content.activities.find((a) => a.id === r.activityId)
                      ?.title || r.activityTitle}
                  </h2>
                  <span>{statuses[r.status]}</span>
                </div>
                <p>
                  {r.details.firstName} {r.details.lastName} · {r.reference}
                </p>
                {r.submittedBy && <p>مقدّم الطلب: {r.submittedBy}</p>}
                <p>
                  {r.details.email} · {r.details.phone} · العمر: {r.details.age}
                </p>
                <p>
                  {r.details.registrationRole === "leader"
                    ? "طلب مرشد · يحتاج اعتمادًا منفصلًا"
                    : "مشارك"}{" "}
                  · {r.details.meals ? "وجبات مطلوبة" : "بدون وجبات"} ·{" "}
                  {r.details.transport ? "مواصلات مطلوبة" : "بدون مواصلات"}
                </p>
                {r.details.tentNumber != null && (
                  <p>
                    الخيمة المطلوبة: {r.details.tentNumber}
                    {r.status === "Waiting" ? " · تفضيل غير محجوز" : ""}
                  </p>
                )}
                <details>
                  <summary>تفاصيل الطلب</summary>
                  <p>
                    العنوان: {r.details.address} · الجنس: {r.details.gender}
                  </p>
                  <p>الموافقة على التعليمات: {r.consentedAt}</p>
                  {[
                    ["الاسم العربي", r.details.arabicFullName],
                    ["الاسم الإنجليزي", r.details.englishFullName],
                    ["الميلاد", r.details.dob],
                    ["الرقم الوطني", r.details.nationalId],
                    ["الصف", r.details.grade],
                    ["ولي الأمر", r.details.guardianName],
                    ["هاتف ولي الأمر", r.details.guardianPhone],
                    ["صاحب الهاتف", r.details.guardianPhoneOwner],
                    ["المدينة", r.details.city],
                    ["المدرسة", r.details.school],
                    ["مقاس التيشيرت", r.details.shirtSize],
                    ["التوصيات الطبية", r.details.medicalNotes],
                    ["الحساسية", r.details.allergies],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <p key={label}>
                        {label}: {value}
                      </p>
                    ))}
                  {r.details.idDocument?.uri && (
                    <img
                      src={r.details.idDocument.uri}
                      alt="وثيقة المشارك التجريبية"
                      style={{
                        maxWidth: 220,
                        maxHeight: 180,
                        objectFit: "contain",
                      }}
                    />
                  )}
                </details>
                {r.receipt && (
                  <section className="receiptReview">
                    <h3>
                      وصل الإيداع ·{" "}
                      {r.receiptStatus === "accepted"
                        ? "مقبول"
                        : r.receiptStatus === "rejected"
                          ? "مطلوب تصحيحه"
                          : "بانتظار المراجعة"}
                    </h3>
                    <p>
                      المرجع: {r.receiptReference} · المبلغ: {r.feeAmount}{" "}
                      {r.currency}
                    </p>
                    <img
                      src={r.receipt.uri}
                      alt="وصل الإيداع التجريبي"
                      style={{
                        maxWidth: 240,
                        maxHeight: 200,
                        objectFit: "contain",
                      }}
                    />
                    {r.status === "Pending" && (
                      <div className="actions">
                        <button
                          className="plain"
                          onClick={() => verifyReceipt(r.id, "accepted")}
                        >
                          قبول وصل الإيداع
                        </button>
                        <button
                          className="danger"
                          onClick={() => verifyReceipt(r.id, "rejected")}
                        >
                          طلب تصحيح الوصل
                        </button>
                      </div>
                    )}
                  </section>
                )}
                {["Pending", "Waiting"].includes(r.status) && (
                  <div className="actions">
                    {r.status === "Waiting" &&
                      normalizeActivity(
                        content.activities.find((a) => a.id === r.activityId) ||
                          {},
                      ).tentsEnabled && (
                        <label>
                          تعيين خيمة · {r.reference}
                          <select
                            aria-label={`تعيين خيمة ${r.reference}`}
                            value={tentAssignments[r.id] ?? ""}
                            onChange={(e) =>
                              setTentAssignments({
                                ...tentAssignments,
                                [r.id]: e.target.value,
                              })
                            }
                          >
                            <option value="">اختر خيمة متاحة</option>
                            {eligibleTents(
                              normalizeActivity(
                                content.activities.find(
                                  (a) => a.id === r.activityId,
                                ),
                              ),
                              r.details.gender,
                            ).map((t) => (
                              <option
                                key={t.number}
                                value={t.number}
                                disabled={
                                  tentAvailable(
                                    normalizeActivity(
                                      content.activities.find(
                                        (a) => a.id === r.activityId,
                                      ),
                                    ),
                                    t.number,
                                    registrations,
                                  ) === 0
                                }
                              >
                                الخيمة {t.number} ·{" "}
                                {tentAvailable(
                                  normalizeActivity(
                                    content.activities.find(
                                      (a) => a.id === r.activityId,
                                    ),
                                  ),
                                  t.number,
                                  registrations,
                                )}{" "}
                                متاح
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    <button
                      className="primary"
                      onClick={() =>
                        review(
                          r.id,
                          r.status === "Waiting" &&
                            r.campFormVersion === 2 &&
                            r.feeAmount > 0 &&
                            normalizeActivity(
                              content.activities.find(
                                (a) => a.id === r.activityId,
                              ) || {},
                            ).requireReceipt
                            ? "Pending"
                            : "Confirmed",
                        )
                      }
                    >
                      {r.status === "Waiting" &&
                      r.campFormVersion === 2 &&
                      r.feeAmount > 0 &&
                      normalizeActivity(
                        content.activities.find((a) => a.id === r.activityId) ||
                          {},
                      ).requireReceipt
                        ? "تخصيص المقعد وطلب الدفع"
                        : "تأكيد الطلب"}
                    </button>
                    <button
                      className="danger"
                      onClick={() => review(r.id, "Rejected")}
                    >
                      رفض الطلب
                    </button>
                  </div>
                )}
              </article>
            ))}
            {!registrations.length && (
              <p className="empty">لا توجد طلبات تسجيل بعد.</p>
            )}
          </section>
        ) : (
          <>
            {!draft && section !== "comments" && (
              <button
                className="primary"
                disabled={!ready}
                onClick={() => {
                  setDraft(emptyItem(section));
                  setMessage("");
                }}
              >
                + إضافة محتوى
              </button>
            )}
            {draft ? (
              <form className="panel editor" onSubmit={save}>
                <h2>
                  {content[section].some((x) => x.id === draft.id)
                    ? "تعديل المحتوى"
                    : "محتوى جديد"}
                </h2>
                <label>
                  العنوان
                  <input
                    required
                    maxLength={100}
                    value={draft.title}
                    onChange={(e) => change("title", e.target.value)}
                  />
                </label>
                <label>
                  {section === "journeys" ? "النص القصير للقراءة" : "الوصف"}
                  <textarea
                    required
                    maxLength={section === "journeys" ? 1200 : 500}
                    rows={5}
                    value={draft.text}
                    onChange={(e) => change("text", e.target.value)}
                  />
                </label>
                {section === "galleries" ? (
                  <label>
                    روابط الصور · رابط واحد في كل سطر
                    <textarea
                      required
                      rows={4}
                      value={draft.images.join("\n")}
                      onChange={(e) =>
                        change("images", e.target.value.split("\n"))
                      }
                    />
                    <small>
                      استخدم /media/camp.png أو /media/trail.png أو
                      /media/team.png، أو رابط HTTPS لصورتك.
                    </small>
                  </label>
                ) : (
                  <label>
                    رابط الصورة
                    <input
                      required
                      value={draft.image}
                      onChange={(e) => change("image", e.target.value)}
                    />
                    <small>
                      الصور المتاحة: /media/camp.png · /media/trail.png ·
                      /media/team.png أو رابط HTTPS.
                    </small>
                  </label>
                )}
                {section === "activities" && (
                  <>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={!!(draft.inactive ?? draft.preparing)}
                        onChange={(e) => change("inactive", e.target.checked)}
                      />{" "}
                      غير فعّال: عرض التفاصيل دون إجراءات تسجيل
                    </label>
                    <label>
                      رفع صورة النشاط
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={uploadActivityImage}
                      />
                    </label>
                    <label>
                      نوع النشاط
                      <select
                        value={draft.kind || "event"}
                        onChange={(e) => change("kind", e.target.value)}
                      >
                        <option value="camp">مخيم</option>
                        <option value="trip">رحلة</option>
                        <option value="event">فعالية</option>
                      </select>
                    </label>
                    {[
                      ["capacity", "السعة الكلية", 1, 10000],
                      ["seatsTaken", "أماكن مؤكدة خارج المعاينة", 0, 10000],
                      ["minAge", "الحد الأدنى للعمر", 1, 99],
                      ["maxAge", "الحد الأعلى للعمر", 1, 99],
                    ].map(([key, label, min, max]) => (
                      <label key={key}>
                        {label}
                        <input
                          required
                          type="number"
                          min={min}
                          max={max}
                          value={draft[key] ?? normalizeActivity(draft)[key]}
                          onChange={(e) => change(key, Number(e.target.value))}
                        />
                      </label>
                    ))}
                    <label>
                      تعليمات المشاركة
                      <textarea
                        required
                        maxLength={1500}
                        value={draft.terms || normalizeActivity(draft).terms}
                        onChange={(e) => change("terms", e.target.value)}
                      />
                    </label>
                    <label>
                      وضع التسجيل
                      <select
                        aria-label="وضع التسجيل"
                        value={
                          draft.registrationMode ||
                          (draft.registrationOpen === false
                            ? "closed"
                            : "standard")
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            registrationMode: e.target.value,
                            registrationOpen: e.target.value !== "closed",
                            ...(e.target.value === "waitingList"
                              ? { allowWaitlist: true }
                              : {}),
                          })
                        }
                      >
                        <option value="standard">تسجيل عادي</option>
                        {draft.kind === "camp" && (
                          <option value="waitingList">
                            تسجيل في قائمة الانتظار فقط
                          </option>
                        )}
                        <option value="closed">مغلق · غير فعّال</option>
                      </select>
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={draft.allowWaitlist ?? true}
                        onChange={(e) =>
                          change("allowWaitlist", e.target.checked)
                        }
                      />{" "}
                      السماح بقائمة الانتظار
                    </label>
                    <label>
                      التاريخ (اختياري)
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => change("date", e.target.value)}
                      />
                    </label>
                    <fieldset className="campSettings">
                      <legend>تفاصيل المواعيد والمشاركة</legend>
                      {[
                        ["startDate", "تاريخ البداية", "date"],
                        ["endDate", "تاريخ النهاية", "date"],
                        ["departureTime", "وقت المغادرة", "datetime-local"],
                        ["arrivalTime", "وقت الوصول", "datetime-local"],
                      ].map(([key, label, type]) => (
                        <label key={key}>
                          {label}
                          <input
                            type={type}
                            value={draft[key] || ""}
                            onChange={(e) => change(key, e.target.value)}
                          />
                        </label>
                      ))}
                      <label>
                        الرسوم
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.fees ?? 0}
                          onChange={(e) =>
                            change("fees", Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        العملة
                        <input
                          maxLength={12}
                          value={draft.currency || "JOD"}
                          onChange={(e) => change("currency", e.target.value)}
                        />
                      </label>
                      {[
                        ["instructions", "تعليمات التسجيل"],
                        ["startInstructions", "تعليمات قبل البدء"],
                        [
                          "afterRegistrationInstructions",
                          "تعليمات بعد التسجيل",
                        ],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <textarea
                            maxLength={2000}
                            rows={3}
                            value={draft[key] || ""}
                            onChange={(e) => change(key, e.target.value)}
                          />
                        </label>
                      ))}
                    </fieldset>
                    {draft.kind === "camp" && (
                      <fieldset className="campSettings">
                        <legend>إعدادات المخيم والخيام</legend>
                        <label>
                          كلمة هوية المخيم بالإنجليزية
                          <input
                            maxLength={12}
                            value={draft.brandTitle || ""}
                            onChange={(e) =>
                              change("brandTitle", e.target.value.toUpperCase())
                            }
                          />
                        </label>
                        <label>
                          لون هوية المخيم
                          <input
                            type="color"
                            value={draft.brandColor || "#5149ae"}
                            onChange={(e) =>
                              change("brandColor", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          وصف الصفوف على البطاقة
                          <input
                            value={draft.gradeLabel || ""}
                            maxLength={100}
                            onChange={(e) =>
                              change("gradeLabel", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          وصف مواليد المخيم
                          <input
                            value={draft.birthYearLabel || ""}
                            maxLength={100}
                            onChange={(e) =>
                              change("birthYearLabel", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          الصفوف المؤهلة
                          <textarea
                            value={(draft.allowedGrades || []).join("\n")}
                            onChange={(e) =>
                              change(
                                "allowedGrades",
                                e.target.value.split("\n"),
                              )
                            }
                          />
                          <small>
                            خيار في كل سطر، ويجب أن يطابق اسم الصف. اتركه فارغًا
                            لإتاحة جميع الصفوف.
                          </small>
                        </label>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={draft.useAgeLimits ?? true}
                            onChange={(e) =>
                              change("useAgeLimits", e.target.checked)
                            }
                          />{" "}
                          تطبيق حدود العمر إضافةً إلى شروط الصف والميلاد
                        </label>
                        {[
                          ["visitorsDate", "يوم الزيارة"],
                          ["dobMin", "أقدم تاريخ ميلاد مسموح"],
                          ["dobMax", "أحدث تاريخ ميلاد مسموح"],
                        ].map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <input
                              type="date"
                              value={draft[key] || ""}
                              onChange={(e) => change(key, e.target.value)}
                            />
                          </label>
                        ))}
                        {[
                          ["waitlistMale", "قائمة الانتظار للذكور"],
                          ["waitlistFemale", "قائمة الانتظار للإناث"],
                          ["tentsEnabled", "تفعيل اختيار الخيمة أثناء التسجيل"],
                        ].map(([key, label]) => (
                          <label key={key} className="checkbox">
                            <input
                              type="checkbox"
                              checked={draft[key] ?? key !== "tentsEnabled"}
                              onChange={(e) => change(key, e.target.checked)}
                            />
                            {label}
                          </label>
                        ))}
                        {[
                          ["requireNationalId", "طلب الرقم الوطني"],
                          ["requireIdDocument", "طلب صورة الهوية"],
                          ["collectMedical", "جمع التوصيات الطبية والحساسية"],
                          [
                            "requireReceipt",
                            "اشتراط قبول وصل الإيداع قبل تأكيد الطلب المدفوع",
                          ],
                        ].map(([key, label]) => (
                          <label key={key} className="checkbox">
                            <input
                              type="checkbox"
                              checked={draft[key] ?? true}
                              onChange={(e) => change(key, e.target.checked)}
                            />
                            {label}
                          </label>
                        ))}
                        {[
                          ["gradeOptions", "خيارات الصفوف"],
                          ["cityOptions", "خيارات المدن"],
                          ["schoolOptions", "خيارات المدارس"],
                          ["shirtOptions", "مقاسات التيشيرت"],
                        ].map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <textarea
                              value={(
                                draft[key] ?? normalizeActivity(draft)[key]
                              ).join("\n")}
                              onChange={(e) =>
                                change(key, e.target.value.split("\n"))
                              }
                            />
                            <small>
                              خيار واحد في كل سطر. اترك المدن أو المدارس فارغة
                              للسماح بالكتابة الحرة.
                            </small>
                          </label>
                        ))}
                        {draft.tentsEnabled && (
                          <>
                            <p>
                              الخيام 0–6 للذكور، و7–13 للإناث. السعة الافتراضية
                              10 لكل خيمة، ويمكن تعديلها أثناء فتح التسجيل.
                              السعة الكلية للمخيم سقف مستقل.
                            </p>
                            <p>
                              الطلبات قيد المراجعة والمؤكدة تحجز أماكن الخيام؛
                              الإلغاء أو الرفض يحرّر المكان.
                            </p>
                            <div className="tentAdminGrid">
                              {normalizeActivity(draft).tents.map((t) => (
                                <div key={t.number} className="tentAdminCard">
                                  <strong>
                                    الخيمة {t.number} ·{" "}
                                    {t.gender === "male" ? "ذكور" : "إناث"}
                                  </strong>
                                  <small>
                                    {tentOccupancy(
                                      normalizeActivity(draft),
                                      t.number,
                                      registrations,
                                    )}{" "}
                                    أماكن محجوزة الآن
                                  </small>
                                  {[
                                    ["capacity", "السعة"],
                                    ["seatsTaken", "إشغال خارجي"],
                                  ].map(([key, label]) => (
                                    <label key={key}>
                                      {label} · الخيمة {t.number}
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={t[key]}
                                        onChange={(e) =>
                                          change(
                                            "tents",
                                            normalizeActivity(draft).tents.map(
                                              (x) =>
                                                x.number === t.number
                                                  ? {
                                                      ...x,
                                                      [key]: Number(
                                                        e.target.value,
                                                      ),
                                                    }
                                                  : x,
                                            ),
                                          )
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </fieldset>
                    )}
                    <label>
                      المكان
                      <input
                        maxLength={150}
                        value={draft.location}
                        onChange={(e) => change("location", e.target.value)}
                      />
                    </label>
                  </>
                )}
                {section === "journeys" && (
                  <>
                    <label>
                      سؤال التأمّل
                      <textarea
                        required
                        maxLength={300}
                        value={draft.prompt}
                        onChange={(e) => change("prompt", e.target.value)}
                      />
                    </label>
                    <label>
                      جمهور المسار
                      <select
                        value={draft.audience}
                        onChange={(e) => change("audience", e.target.value)}
                      >
                        <option value="campers">
                          جميع المشاركين المسجّلين
                        </option>
                        <option value="leaders">المرشدون المعتمدون فقط</option>
                      </select>
                    </label>
                  </>
                )}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => change("published", e.target.checked)}
                  />{" "}
                  منشور ويظهر في التطبيق
                </label>
                <div className="actions">
                  <button className="primary" type="submit">
                    حفظ المحتوى
                  </button>
                  <button
                    type="button"
                    className="plain"
                    onClick={() => setDraft(null)}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <div className="contentGrid">
                {content[section].map((item, i) => (
                  <article key={item.id} className="contentCard">
                    {section !== "comments" && (
                      <img
                        src={
                          section === "galleries" ? item.images[0] : item.image
                        }
                        alt="صورة توضيحية للمخيم"
                      />
                    )}
                    <div className="cardBody">
                      <span className="contentBadge">
                        {section === "comments"
                          ? "تعليق مسار"
                          : item.published
                            ? "منشور"
                            : "مسودة"}
                        {section === "journeys" &&
                          (item.audience === "leaders"
                            ? " · للمرشدين المعتمدين"
                            : " · لجميع المشاركين")}
                      </span>
                      <h2>{item.title || item.author}</h2>
                      <p>{item.text}</p>
                      {section === "comments" && (
                        <small>
                          {content.journeys.find((j) => j.id === item.journeyId)
                            ?.title || "مسار محذوف"}
                        </small>
                      )}
                      <div className="actions">
                        {section !== "comments" && (
                          <>
                            <button
                              className="plain"
                              onClick={() =>
                                setDraft(
                                  section === "activities"
                                    ? normalizeActivity(item)
                                    : { ...item },
                                )
                              }
                            >
                              تعديل
                            </button>
                            <button
                              className="plain"
                              disabled={i === 0}
                              onClick={() => move(i, -1)}
                            >
                              تقديم ↑
                            </button>
                            <button
                              className="plain"
                              disabled={i === content[section].length - 1}
                              onClick={() => move(i, 1)}
                            >
                              تأخير ↓
                            </button>
                          </>
                        )}
                        <button
                          className="danger"
                          onClick={() => remove(item.id)}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {content[section].length === 0 && (
                  <p className="empty">لا يوجد محتوى بعد.</p>
                )}
              </div>
            )}
          </>
        )}
        <footer>SPARK YOUTH · مخيمنا مساحة للنمو</footer>
      </main>
    </div>
  );
}
