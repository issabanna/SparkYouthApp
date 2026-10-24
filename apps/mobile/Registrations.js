import React, { useEffect, useState } from "react";
import {
  View,
  Text as NativeText,
  Pressable,
  Image,
  TextInput,
  ScrollView,
  Modal,
  SafeAreaView,
  Platform,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  tentError,
  tentAvailable,
  eligibleTents,
  waitingAllowed,
  ageAt,
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
} from "@spark/shared";
let nativeRecords = [];
const read = () => {
  try {
    return Platform.OS === "web"
      ? JSON.parse(localStorage.getItem(registrationKey)) || []
      : nativeRecords;
  } catch {
    return [];
  }
};
const uri = (p) =>
  /^(https?:|data:)/.test(p) || Platform.OS === "web"
    ? p
    : "https://sparkyouth.vercel.app" + p;
function Text({ style, ...props }) {
  return (
    <NativeText
      {...props}
      style={[
        { fontFamily: "Tajawal", textAlign: "right", color: "#171717" },
        style,
      ]}
    />
  );
}
function Action({ children, onPress, disabled, secondary }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.action, secondary && s.secondary, disabled && { opacity: 0.4 }]}
    >
      <Text style={s.actionText}>{children}</Text>
    </Pressable>
  );
}
const blank = (user) => ({
  firstName: user.name.split(" ")[0] || "",
  lastName: user.name.split(" ").slice(1).join(" "),
  email: "",
  gender: "",
  age: "",
  phone: "",
  address: "",
  registrationRole: "camper",
  meals: false,
  transport: false,
  tentNumber: "",
  dob: "",
});
export default function Registrations({ content, user, onDone }) {
  const [records, setRecords] = useState(read),
    [filter, setFilter] = useState("all"),
    [activityId, setActivityId] = useState(null),
    [step, setStep] = useState(0),
    [details, setDetails] = useState(() => blank(user)),
    [consent, setConsent] = useState(false),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState(""),
    [cancelId, setCancelId] = useState(null),
    [success, setSuccess] = useState(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const refresh = () => setRecords(read());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const activities = content.activities.map(normalizeActivity),
    activity = activities.find((a) => a.id === activityId);
  const ownRecords = records.filter((r) => r.ownerKey === ownerKey(user));
  const persist = (next) => {
    try {
      if (Platform.OS === "web")
        localStorage.setItem(registrationKey, JSON.stringify(next));
      else nativeRecords = next;
      setRecords(next);
      return true;
    } catch {
      setMessage("تعذّر الحفظ في المتصفح. حاول مجددًا.");
      return false;
    }
  };
  const open = (a) => {
    setActivityId(a.id);
    setStep(0);
    setDetails(blank(user));
    setConsent(false);
    setErrors({});
    setMessage("");
    setSuccess(null);
  };
  const update = (key, value) =>
    setDetails((current) => ({
      ...current,
      [key]: value,
      ...(key === "gender" ? { tentNumber: "" } : {}),
      ...(key === "dob" &&
      ageAt(
        value,
        activity.startDate ||
          activity.date ||
          new Date().toISOString().slice(0, 10),
      ) != null
        ? {
            age: String(
              ageAt(
                value,
                activity.startDate ||
                  activity.date ||
                  new Date().toISOString().slice(0, 10),
              ),
            ),
          }
        : {}),
    }));
  const reviewStep = () => {
    if (
      activity.registrationMode === "waitingList" &&
      !waitingAllowed(activity, details.gender)
    ) {
      setErrors({
        tentNumber: "التسجيل في قائمة الانتظار غير متاح لهذا القسم.",
      });
      return;
    }
    const error = tentError(activity, details);
    if (error) {
      setErrors({ tentNumber: error });
      return;
    }
    if (
      activity.registrationMode !== "waitingList" &&
      activity.tentsEnabled &&
      tentAvailable(activity, details.tentNumber, records) === 0
    ) {
      setErrors({
        tentNumber:
          "الخيمة ممتلئة. اختر خيمة متاحة أو انتظر فتح قائمة الانتظار من الإدارة.",
      });
      return;
    }
    setErrors({});
    setStep(2);
  };
  const next = () => {
    const e = validateDetails(details, activity);
    setErrors(e);
    if (!Object.keys(e).length) setStep(1);
  };
  const submit = () => {
    const latest = Platform.OS === "web" ? read() : records;
    const result = submitRegistration(activity, user, details, latest, consent);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (persist([...latest, result.record])) {
      setSuccess(result.record);
      setStep(3);
    }
  };
  const cancel = () => {
    const latest = Platform.OS === "web" ? read() : records;
    const r = changeRegistrationStatus(
      latest,
      cancelId,
      "Cancelled",
      activities,
    );
    if (r.error) setMessage(r.error);
    else persist(r.records);
    setCancelId(null);
  };
  const field = (key, label, props = {}) => (
    <View key={key}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={details[key]}
        onChangeText={(v) => update(key, v)}
        style={[s.input, errors[key] && s.errorInput]}
        {...props}
      />
      {errors[key] && (
        <Text accessibilityRole="alert" style={s.error}>
          {errors[key]}
        </Text>
      )}
    </View>
  );
  return (
    <>
      <Text style={s.eyebrow}>مخيمات. رحلات. فعاليات.</Text>
      <Text style={s.heading}>الأنشطة والتسجيل</Text>
      <Text style={s.body}>اختر مغامرتك، قدّم طلبك، وتابع حالته من هنا.</Text>
      <View style={s.filters}>
        {[
          ["all", "الكل"],
          ["camp", "مخيمات"],
          ["trip", "رحلات"],
          ["event", "فعاليات"],
          ["mine", "تسجيلاتي"],
        ].map(([id, label]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === id }}
            key={id}
            onPress={() => setFilter(id)}
            style={[s.filter, filter === id && s.filterActive]}
          >
            <Text style={[s.filterText, filter === id && { color: "#111" }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {message && !activity && (
        <Text accessibilityRole="alert" style={s.info}>
          {message}
        </Text>
      )}
      {filter === "mine" ? (
        <>
          {ownRecords.map((r) => (
            <View key={r.id} style={s.registration}>
              <View style={s.status}>
                <Ionicons
                  name={
                    r.status === "Confirmed"
                      ? "checkmark-circle-outline"
                      : "time-outline"
                  }
                  size={18}
                />
                <Text>{statuses[r.status]}</Text>
              </View>
              <Text style={s.title}>{r.activityTitle}</Text>
              <Text style={s.body}>رقم الطلب: {r.reference}</Text>
              {r.details.tentNumber != null && (
                <Text style={s.body}>
                  الخيمة {r.details.tentNumber}
                  {r.status === "Waiting" ? " · تفضيل غير محجوز" : ""}
                </Text>
              )}
              {!!activities.find((a) => a.id === r.activityId)
                ?.afterRegistrationInstructions && (
                <Text style={s.info}>
                  {
                    activities.find((a) => a.id === r.activityId)
                      .afterRegistrationInstructions
                  }
                </Text>
              )}
              <Text style={s.body}>
                {r.status === "Pending"
                  ? "طلبك بانتظار مراجعة الإدارة؛ لا يعني تأكيد المشاركة."
                  : r.status === "Waiting"
                    ? "سننتظر توفر مكان وموافقة الإدارة."
                    : r.status === "Confirmed"
                      ? "تمت الموافقة على طلبك في المعاينة."
                      : ""}
              </Text>
              {["Pending", "Waiting"].includes(r.status) && (
                <Action secondary onPress={() => setCancelId(r.id)}>
                  إلغاء الطلب
                </Action>
              )}
            </View>
          ))}
          {!ownRecords.length && (
            <Text style={s.info}>لم تقدّم أي طلب تسجيل بعد.</Text>
          )}
        </>
      ) : (
        <>
          {activities
            .filter(
              (a) => a.published && (filter === "all" || a.kind === filter),
            )
            .map((a) => {
              const registration = activeRegistration(records, a.id, user),
                slots = available(a, records);
              return (
                <View key={a.id} style={s.card}>
                  <Image source={{ uri: uri(a.image) }} style={s.photo} />
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <Text style={s.kind}>{kinds[a.kind]}</Text>
                      <Text style={s.slot}>
                        {a.registrationMode === "waitingList"
                          ? "قائمة انتظار فقط"
                          : slots
                            ? `${slots} مكانًا متاحًا`
                            : a.allowWaitlist
                              ? "قائمة انتظار"
                              : "مكتمل العدد"}
                      </Text>
                    </View>
                    <Text style={s.title}>{a.title}</Text>
                    <Text style={s.body}>{a.text}</Text>
                    <Text style={s.body}>
                      {a.date || "الموعد يُعلن قريبًا"} · {a.location}
                    </Text>
                    <Text style={s.meta}>
                      الرسوم:{" "}
                      {Number(a.fees) > 0
                        ? `${a.fees} ${a.currency}`
                        : "مجانًا"}
                    </Text>
                    {!!a.startDate && (
                      <Text style={s.meta}>
                        البداية: {a.startDate}
                        {a.endDate ? ` · النهاية: ${a.endDate}` : ""}
                      </Text>
                    )}
                    <Text style={s.meta}>
                      العمر: {a.minAge}–{a.maxAge} سنة
                    </Text>
                    {a.inactive ? (
                      <Action disabled>غير فعّال</Action>
                    ) : registration ? (
                      <Action secondary onPress={() => setFilter("mine")}>
                        {statuses[registration.status]} · عرض طلبي
                      </Action>
                    ) : (
                      <Action
                        disabled={
                          !a.registrationOpen ||
                          (!slots &&
                            a.registrationMode !== "waitingList" &&
                            (a.kind === "camp" || !a.allowWaitlist))
                        }
                        onPress={() => open(a)}
                      >
                        {!a.registrationOpen
                          ? "غير فعّال"
                          : a.registrationMode === "waitingList"
                            ? "سجّل في قائمة الانتظار"
                            : slots
                              ? "سجّل الآن ←"
                              : "انضم إلى قائمة الانتظار"}
                      </Action>
                    )}
                  </View>
                </View>
              );
            })}
        </>
      )}
      <Text style={s.note}>
        طلبات تجريبية محفوظة في هذا المتصفح. لا تُرسل إلى فريق المخيم ولا تحجز
        أماكن فعلية.
      </Text>
      <Modal
        visible={!!activity}
        onRequestClose={() =>
          step === 3 ? setActivityId(null) : setCancelId("draft")
        }
        animationType="slide"
      >
        <SafeAreaView style={s.modal}>
          <ScrollView contentContainerStyle={s.modalContent}>
            {activity && (
              <>
                <View style={s.modalBar}>
                  <Action
                    secondary
                    onPress={() =>
                      step === 3 ? setActivityId(null) : setCancelId("draft")
                    }
                  >
                    إغلاق ×
                  </Action>
                  <Text style={s.kind}>
                    {step === 3 ? "تم إرسال الطلب" : `الخطوة ${step + 1} من 3`}
                  </Text>
                </View>
                <Text style={s.heading}>{activity.title}</Text>
                {!!activity.instructions && (
                  <Text style={s.info}>{activity.instructions}</Text>
                )}
                {step === 0 && (
                  <>
                    {!!activity.startInstructions && (
                      <Text style={s.info}>{activity.startInstructions}</Text>
                    )}
                    {!!activity.visitorsDate && (
                      <Text style={s.meta}>
                        يوم الزيارة: {activity.visitorsDate}
                      </Text>
                    )}
                    {!!activity.departureTime && (
                      <Text style={s.meta}>
                        المغادرة: {activity.departureTime.replace("T", " ")}
                      </Text>
                    )}
                    {!!activity.arrivalTime && (
                      <Text style={s.meta}>
                        الوصول: {activity.arrivalTime.replace("T", " ")}
                      </Text>
                    )}
                  </>
                )}
                <View style={s.progress}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[s.progressPart, i <= step && s.progressActive]}
                    />
                  ))}
                </View>
                {step === 0 && (
                  <>
                    <Text style={s.title}>بيانات المشارك</Text>
                    <Text style={s.meta}>
                      العمر المسموح {activity.minAge}–{activity.maxAge} سنة. طلب
                      المرشد يحتاج موافقة مستقلة ولا يمنح صلاحيات.
                    </Text>
                    {field("firstName", "الاسم الأول", { maxLength: 50 })}
                    {field("lastName", "اسم العائلة", { maxLength: 50 })}
                    {field("email", "البريد الإلكتروني", {
                      keyboardType: "email-address",
                      autoCapitalize: "none",
                      maxLength: 120,
                    })}
                    {field("age", "العمر", {
                      keyboardType: "number-pad",
                      maxLength: 2,
                    })}
                    {activity.kind === "camp" && (
                      <>
                        {field(
                          "dob",
                          `تاريخ الميلاد${activity.dobMin || activity.dobMax ? " (مطلوب)" : " (اختياري)"}`,
                          { placeholder: "YYYY-MM-DD", maxLength: 10 },
                        )}
                        {(activity.dobMin || activity.dobMax) && (
                          <Text style={s.meta}>
                            الميلاد المسموح: {activity.dobMin || "غير محدد"} —{" "}
                            {activity.dobMax || "غير محدد"}
                          </Text>
                        )}
                      </>
                    )}
                    <Text style={s.label}>الجنس</Text>
                    <View style={s.choices}>
                      {[
                        ["male", "ذكر"],
                        ["female", "أنثى"],
                        ["other", "آخر"],
                      ].map(([v, t]) => (
                        <Pressable
                          accessibilityRole="button"
                          key={v}
                          onPress={() => update("gender", v)}
                          style={[
                            s.choice,
                            details.gender === v && s.choiceActive,
                          ]}
                        >
                          <Text>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {errors.gender && (
                      <Text style={s.error}>{errors.gender}</Text>
                    )}
                    {field("phone", "رقم الهاتف", {
                      keyboardType: "phone-pad",
                      maxLength: 10,
                    })}
                    {field("address", "المدينة أو العنوان", { maxLength: 200 })}
                    <Text style={s.label}>دور المشاركة</Text>
                    <View style={s.choices}>
                      {[
                        ["camper", "مشارك"],
                        ["leader", "طلب مرشد"],
                      ].map(([v, t]) => (
                        <Pressable
                          accessibilityRole="button"
                          key={v}
                          onPress={() => update("registrationRole", v)}
                          style={[
                            s.choice,
                            details.registrationRole === v && s.choiceActive,
                          ]}
                        >
                          <Text>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Action onPress={next}>التالي: الخدمات الاختيارية</Action>
                  </>
                )}
                {step === 1 && (
                  <>
                    {activity.registrationMode === "waitingList" ? (
                      <>
                        <Text style={s.title}>التسجيل في قائمة الانتظار</Text>
                        <Text style={s.body}>
                          الخيام المرقمة غير متاحة للاختيار في هذا الوضع. لن
                          يُحجز أي مكان؛ تعيّن الإدارة خيمة مناسبة عند توفر مكان
                          والموافقة على طلبك.
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="قائمة الانتظار"
                          accessibilityState={{
                            selected: details.tentNumber === "waitingList",
                          }}
                          onPress={() => update("tentNumber", "waitingList")}
                          style={[
                            s.tentTile,
                            details.tentNumber === "waitingList" &&
                              s.tentSelected,
                          ]}
                        >
                          <Ionicons name="list-outline" size={28} />
                          <Text>قائمة الانتظار</Text>
                        </Pressable>
                        {!waitingAllowed(activity, details.gender) && (
                          <Text style={s.error}>
                            قائمة الانتظار غير مفتوحة لهذا القسم.
                          </Text>
                        )}
                        {errors.tentNumber && (
                          <Text style={s.error}>{errors.tentNumber}</Text>
                        )}
                      </>
                    ) : (
                      activity.tentsEnabled && (
                        <>
                          <Text style={s.title}>اختر خيمتك</Text>
                          <Text style={s.body}>
                            الخيام 0–6 للذكور، و7–13 للإناث. الطلب المعلق يحجز
                            مكانًا في الخيمة؛ المشاركة تبقى بانتظار الموافقة.
                          </Text>
                          <View style={s.tentGrid}>
                            {eligibleTents(activity, details.gender).map(
                              (t) => {
                                const free = tentAvailable(
                                  activity,
                                  t.number,
                                  records,
                                );
                                return (
                                  <Pressable
                                    key={t.number}
                                    accessibilityRole="button"
                                    accessibilityLabel={`الخيمة ${t.number}`}
                                    accessibilityState={{
                                      selected:
                                        Number(details.tentNumber) ===
                                          t.number && details.tentNumber !== "",
                                      disabled: free === 0,
                                    }}
                                    disabled={free === 0}
                                    onPress={() =>
                                      update("tentNumber", String(t.number))
                                    }
                                    style={[
                                      s.tentTile,
                                      details.tentNumber === String(t.number) &&
                                        s.tentSelected,
                                      free === 0 && { opacity: 0.4 },
                                    ]}
                                  >
                                    <Ionicons
                                      name="triangle-outline"
                                      size={25}
                                    />
                                    <Text style={s.tentNumber}>{t.number}</Text>
                                    <Text style={s.tentMeta}>
                                      {free
                                        ? `${free} / ${t.capacity} متاح`
                                        : "ممتلئة"}
                                    </Text>
                                  </Pressable>
                                );
                              },
                            )}
                          </View>
                          {!eligibleTents(activity, details.gender).length && (
                            <Text style={s.info}>
                              يرجى التواصل مع الإدارة لترتيب السكن؛ لا توجد خيام
                              مخصصة لهذا الخيار.
                            </Text>
                          )}
                          {details.tentNumber !== "" &&
                            tentAvailable(
                              activity,
                              details.tentNumber,
                              records,
                            ) === 0 && (
                              <Text style={s.info}>
                                الخيمة ممتلئة. اختر خيمة أخرى متاحة. التسجيل في
                                قائمة الانتظار يتطلب فتحه من الإدارة.
                              </Text>
                            )}
                          {errors.tentNumber && (
                            <Text accessibilityRole="alert" style={s.error}>
                              {errors.tentNumber}
                            </Text>
                          )}
                        </>
                      )
                    )}
                    <Text style={s.title}>خدمات اختيارية</Text>
                    <Text style={s.body}>
                      حدّد احتياجاتك للمراجعة مع الإدارة. اختيار الخدمة لا يعني
                      تأكيد توفرها.
                    </Text>
                    {[
                      ["meals", "أحتاج وجبات"],
                      ["transport", "أحتاج مواصلات"],
                    ].map(([key, label]) => (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={label}
                        accessibilityState={{ checked: details[key] }}
                        key={key}
                        onPress={() => update(key, !details[key])}
                        style={s.checkRow}
                      >
                        <Ionicons
                          name={details[key] ? "checkbox" : "square-outline"}
                          size={24}
                          color={details[key] ? "#171717" : "#999"}
                        />
                        <Text>{label}</Text>
                      </Pressable>
                    ))}
                    <Action onPress={reviewStep}>التالي: مراجعة الطلب</Action>
                    <Action secondary onPress={() => setStep(0)}>
                      السابق
                    </Action>
                  </>
                )}
                {step === 2 && (
                  <>
                    <Text style={s.title}>راجع طلبك</Text>
                    {[
                      ["المشارك", `${details.firstName} ${details.lastName}`],
                      ["البريد", details.email],
                      ["الهاتف", details.phone],
                      ["العمر", details.age],
                      ...(details.dob ? [["تاريخ الميلاد", details.dob]] : []),
                      ...(activity.registrationMode === "waitingList"
                        ? [["التسجيل", "قائمة الانتظار"]]
                        : activity.tentsEnabled
                          ? [["الخيمة", details.tentNumber]]
                          : []),
                      [
                        "الرسوم",
                        Number(activity.fees) > 0
                          ? `${activity.fees} ${activity.currency}`
                          : "مجانًا",
                      ],
                      ["العنوان", details.address],
                      [
                        "الدور",
                        details.registrationRole === "leader"
                          ? "طلب مرشد"
                          : "مشارك",
                      ],
                      ["الوجبات", details.meals ? "مطلوبة" : "غير مطلوبة"],
                      [
                        "المواصلات",
                        details.transport ? "مطلوبة" : "غير مطلوبة",
                      ],
                    ].map(([k, v]) => (
                      <View key={k} style={s.summaryRow}>
                        <Text style={s.meta}>{k}</Text>
                        <Text style={s.summaryValue}>{v}</Text>
                      </View>
                    ))}
                    <Text style={s.title}>تعليمات المشاركة</Text>
                    <Text style={s.info}>{activity.terms}</Text>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="أوافق على تعليمات المشاركة"
                      accessibilityState={{ checked: consent }}
                      onPress={() => setConsent(!consent)}
                      style={s.checkRow}
                    >
                      <Ionicons
                        name={consent ? "checkbox" : "square-outline"}
                        size={24}
                      />
                      <Text>أوافق على تعليمات المشاركة</Text>
                    </Pressable>
                    <Text style={s.note}>
                      بيانات تجريبية فقط؛ لا تدخل معلومات حساسة أو بيانات حقيقية
                      لقاصرين.
                    </Text>
                    <Action disabled={!consent} onPress={submit}>
                      إرسال طلب التسجيل
                    </Action>
                    <Action secondary onPress={() => setStep(1)}>
                      السابق
                    </Action>
                  </>
                )}
                {message && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {message}
                  </Text>
                )}
                {step === 3 && success && (
                  <>
                    <View style={s.success}>
                      <Ionicons name="checkmark-circle" size={64} />
                      <Text style={s.heading}>{statuses[success.status]}</Text>
                      <Text style={s.body}>
                        {success.status === "Waiting"
                          ? "أضفناك إلى قائمة الانتظار في المعاينة دون حجز مكان أو خيمة."
                          : "تم حفظ طلبك للمراجعة في المعاينة. المشاركة غير مؤكدة حتى الموافقة."}
                      </Text>
                      {!!activity.afterRegistrationInstructions && (
                        <Text style={s.info}>
                          {activity.afterRegistrationInstructions}
                        </Text>
                      )}
                      {success.details.tentNumber != null && (
                        <Text style={s.body}>
                          الخيمة {success.details.tentNumber}
                          {success.status === "Waiting"
                            ? " · غير محجوزة بعد"
                            : ""}
                        </Text>
                      )}
                      <Text selectable style={s.reference}>
                        {success.reference}
                      </Text>
                    </View>
                    <Action
                      onPress={() => {
                        setActivityId(null);
                        setFilter("mine");
                        onDone?.();
                      }}
                    >
                      عرض تسجيلاتي
                    </Action>
                  </>
                )}
              </>
            )}
          </ScrollView>
          {cancelId === "draft" && (
            <View style={[s.overlay, s.draftOverlay]}>
              <View style={s.dialog}>
                <Text style={s.title}>الخروج من التسجيل؟</Text>
                <Text style={s.body}>ستفقد البيانات التي لم ترسلها.</Text>
                <Action
                  onPress={() => {
                    setActivityId(null);
                    setCancelId(null);
                  }}
                >
                  الخروج دون إرسال
                </Action>
                <Action secondary onPress={() => setCancelId(null)}>
                  العودة
                </Action>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!cancelId && cancelId !== "draft"}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelId(null)}
      >
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.title}>
              {cancelId === "draft" ? "الخروج من التسجيل؟" : "إلغاء طلبك؟"}
            </Text>
            <Text style={s.body}>
              {cancelId === "draft"
                ? "ستفقد البيانات التي لم ترسلها."
                : "يمكن إلغاء الطلب قيد المراجعة أو الانتظار فقط."}
            </Text>
            <Action
              onPress={() => {
                if (cancelId === "draft") {
                  setActivityId(null);
                  setCancelId(null);
                } else cancel();
              }}
            >
              {cancelId === "draft" ? "الخروج دون إرسال" : "نعم، إلغاء الطلب"}
            </Action>
            <Action secondary onPress={() => setCancelId(null)}>
              العودة
            </Action>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  tentGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 9,
    marginVertical: 16,
  },
  tentTile: {
    width: "30%",
    minHeight: 105,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 15,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  tentSelected: { backgroundColor: "#ffda00", borderColor: "#ffda00" },
  tentNumber: { fontSize: 23, fontFamily: "TajawalBold" },
  tentMeta: { fontSize: 10, color: "#666" },
  draftOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  eyebrow: { fontSize: 13, color: "#777", marginTop: 12 },
  heading: { fontSize: 29, fontFamily: "TajawalBold", marginVertical: 12 },
  body: { fontSize: 14, lineHeight: 25, color: "#646464", marginBottom: 10 },
  filters: {
    flexDirection: "row-reverse",
    gap: 5,
    flexWrap: "wrap",
    marginVertical: 15,
  },
  filter: {
    paddingHorizontal: 11,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#f3f3f3",
  },
  filterActive: { backgroundColor: "#ffda00" },
  filterText: { fontSize: 11, color: "#666" },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
  },
  photo: { width: "100%", height: 175 },
  cardBody: { padding: 18 },
  cardTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  kind: { fontSize: 12, fontFamily: "TajawalBold", color: "#8c7100" },
  slot: { fontSize: 11, color: "#666" },
  title: { fontSize: 20, fontFamily: "TajawalBold", marginVertical: 10 },
  meta: { fontSize: 12, color: "#777", lineHeight: 22 },
  action: {
    padding: 15,
    borderRadius: 13,
    backgroundColor: "#ffda00",
    marginVertical: 7,
  },
  secondary: { backgroundColor: "#f1f1f1" },
  actionText: { textAlign: "center", fontSize: 14, fontFamily: "TajawalBold" },
  registration: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#e9e9e9",
    borderRadius: 20,
    marginBottom: 16,
  },
  status: {
    flexDirection: "row-reverse",
    gap: 7,
    alignItems: "center",
    backgroundColor: "#fff5bb",
    alignSelf: "flex-end",
    padding: 8,
    borderRadius: 10,
  },
  note: {
    fontSize: 11,
    color: "#888",
    lineHeight: 21,
    marginVertical: 18,
    textAlign: "center",
  },
  modal: {
    flex: 1,
    backgroundColor: "#fff",
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
  },
  modalContent: { padding: 22, paddingBottom: 50 },
  modalBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progress: { flexDirection: "row-reverse", gap: 6, marginBottom: 24 },
  progressPart: {
    flex: 1,
    height: 5,
    backgroundColor: "#eee",
    borderRadius: 3,
  },
  progressActive: { backgroundColor: "#ffda00" },
  label: { fontSize: 13, fontFamily: "TajawalBold", marginTop: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    textAlign: "right",
    fontFamily: "Tajawal",
    fontSize: 15,
    marginTop: 7,
    color: "#171717",
  },
  errorInput: { borderColor: "#ad3224" },
  error: { fontSize: 12, lineHeight: 22, color: "#ad3224", marginTop: 7 },
  choices: { flexDirection: "row-reverse", gap: 9, marginVertical: 12 },
  choice: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 12,
  },
  choiceActive: { backgroundColor: "#ffda00", borderColor: "#ffda00" },
  checkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 17,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 18,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 13,
  },
  summaryValue: { flex: 1, fontSize: 14 },
  info: {
    backgroundColor: "#f5f5f5",
    padding: 17,
    borderRadius: 13,
    fontSize: 13,
    lineHeight: 24,
    marginVertical: 15,
  },
  success: { alignItems: "center", paddingVertical: 30 },
  reference: {
    fontSize: 21,
    fontFamily: "TajawalBold",
    padding: 18,
    backgroundColor: "#fff4b7",
    borderRadius: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,.5)",
  },
  dialog: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
});
