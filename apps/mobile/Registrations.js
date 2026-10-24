import React, { useEffect, useState, useRef } from "react";
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
import BirthDatePicker from "./BirthDatePicker";
import CampPoster from "./CampPoster";
import MediaImage from "./MediaImage";
import QRCode from "react-native-qrcode-svg";
import { CampIdentity, CampExtra, RegistrationChoices, pickPreviewImage } from "./CampFields";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  displayRange,
  saveReceipt,
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
function Text({ style, ...props }) {
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: "Tajawal",
          textAlign: "right",
          color: "#171717",
        },
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
      style={[
        s.action,
        secondary && s.secondary,
        disabled && {
          opacity: 0.4,
        },
      ]}
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
  tentNumber: "",
  dob: "",
  arabicFullName: "",
  englishFullName: "",
  nationalId: "",
  grade: "",
  guardianName: "",
  guardianPhone: "",
  guardianPhoneOwner: "",
  city: "",
  school: "",
  shirtSize: "",
  medicalNotes: "",
  allergies: "",
  idDocument: null,
});
export default function Registrations({ content, user, onDone }) {
  const imageCheckRequest = useRef(0);
  useEffect(() => () => { imageCheckRequest.current++; }, []);
  const [records, setRecords] = useState(read),
    [filter, setFilter] = useState("all"),
    [activityId, setActivityId] = useState(null),
    [step, setStep] = useState(-1),
    [instructionsAccepted, setInstructionsAccepted] = useState(false),
    [details, setDetails] = useState(() => blank(user)),
    [consent, setConsent] = useState(false),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState(""),
    [cancelId, setCancelId] = useState(null),
    [success, setSuccess] = useState(null),
    [idChecking, setIdChecking] = useState(false),
    [receiptId, setReceiptId] = useState(null),
    [receiptImage, setReceiptImage] = useState(null),
    [receiptReference, setReceiptReference] = useState(""),
    [ticketId, setTicketId] = useState(null);
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
  const activities = content.activities.map(a => normalizeActivity({
    ...a, registrationTestMode: content.registrationTestMode === true,
  })),
    activity = activities.find((a) => a.id === activityId);
  const isCamp = activity?.kind === "camp",
    hasTentStep = isCamp && (activity.tentsEnabled || activity.registrationMode === "waitingList"),
    servicesStep = 2,
    reviewIndex = isCamp ? (hasTentStep ? 3 : 2) : 1,
    successStep = reviewIndex + 1;
  const ownRecords = records.filter((r) => r.ownerKey === ownerKey(user));
  const registrationGroup = (r) =>
    r.status === "Confirmed"
      ? "التسجيلات المؤكدة"
      : ["Pending", "Waiting"].includes(r.status)
        ? "بانتظار الدفع أو التأكيد"
        : "الطلبات الملغاة أو المرفوضة";
  const groupedRecords = [...ownRecords].sort(
    (a, b) =>
      (a.status === "Confirmed"
        ? 0
        : ["Pending", "Waiting"].includes(a.status)
          ? 1
          : 2) -
      (b.status === "Confirmed"
        ? 0
        : ["Pending", "Waiting"].includes(b.status)
          ? 1
          : 2),
  );
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
    imageCheckRequest.current++;
    setIdChecking(false);
    setActivityId(a.id);
    setStep(-1);
    setInstructionsAccepted(false);
    setDetails({
      ...blank(user),
      ...(ownRecords.some((r) => r.activityId === a.id)
        ? {
            firstName: "",
            lastName: "",
          }
        : {}),
    });
    setConsent(false);
    setErrors({});
    setMessage("");
    setSuccess(null);
  };
  const update = (key, value) =>
    setDetails((current) => ({
      ...current,
      [key]: value,
      ...(key === "arabicFullName"
        ? {
            firstName: value.trim().split(/\s+/)[0] || "",
            lastName: value.trim().split(/\s+/).slice(1).join(" "),
          }
        : {}),
      ...(key === "city"
        ? {
            address: value,
          }
        : {}),
      ...(key === "gender"
        ? {
            tentNumber: "",
          }
        : {}),
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
      setErrors({
        tentNumber: error,
      });
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
    setStep(reviewIndex);
  };
  const next = () => {
    const e = validateDetails(details, activity, "participant");
    setErrors(e);
    if (!Object.keys(e).length) setStep(1);
  };
  const submit = () => {
    if (idChecking) return;
    const latest = Platform.OS === "web" ? read() : records;
    const result = submitRegistration(activity, user, details, latest, consent);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (persist([...latest, result.record])) {
      setSuccess(result.record);
      setStep(successStep);
    }
  };
  const nextCampExtra = () => {
    if (idChecking) return;
    const e = validateDetails(details, activity, "extra");
    setErrors(e);
    if (!Object.keys(e).length) setStep(hasTentStep ? servicesStep : reviewIndex);
  };
  const chooseId = async () => {
    if (idChecking) return;
    const requestId = ++imageCheckRequest.current;
    try {
      const image = await pickPreviewImage();
      if (!image || requestId !== imageCheckRequest.current) return;
      update("idDocument", {...image,aiCheck:{status:"checking"}});
      setIdChecking(true);
      let check;
      const checkController = new AbortController();
      const checkTimeout = setTimeout(() => checkController.abort(),25000);
      try {
        const origin=Platform.OS==='web'?'':'https://sparkyouth.vercel.app';
        const response=await fetch(origin+'/api/registration-image-check',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({activityId:activity.id,image:image.uri}),signal:checkController.signal,
        });
        check=await response.json();
        if(!response.ok||check.status!=='checked')check={status:'unavailable',accepted:false,message:check.message||'تعذّر فحص الصورة الآن.'};
      } catch {check={status:'unavailable',accepted:false,message:'تعذّر فحص الصورة الآن. حاول مجددًا.'};}
      clearTimeout(checkTimeout);
      if (requestId === imageCheckRequest.current) update("idDocument",{...image,aiCheck:check});
    } catch (error) { setMessage(error.message); }
    finally {if (requestId === imageCheckRequest.current) setIdChecking(false);}
  };
  const uploadReceipt = () => {
    const latest = Platform.OS === "web" ? read() : records;
    const result = saveReceipt(
      latest,
      receiptId,
      user,
      receiptImage,
      receiptReference,
    );
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (persist(result.records)) {
      setReceiptId(null);
      setMessage("تم حفظ الوصل. بانتظار مراجعة الإدارة في المعاينة.");
    }
  };
  const chooseReceipt = async () => {
    try {
      const image = await pickPreviewImage();
      if (image) setReceiptImage(image);
    } catch (error) {
      setMessage(error.message);
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
            accessibilityState={{
              selected: filter === id,
            }}
            key={id}
            onPress={() => setFilter(id)}
            style={[s.filter, filter === id && s.filterActive]}
          >
            <Text
              style={[
                s.filterText,
                filter === id && {
                  color: "#111",
                },
              ]}
            >
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
          {groupedRecords.map((r, index) => (
            <React.Fragment key={r.id}>
              {(index === 0 ||
                registrationGroup(groupedRecords[index - 1]) !==
                  registrationGroup(r)) && (
                <Text style={s.groupHeading}>{registrationGroup(r)}</Text>
              )}
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
                <Text style={s.title}>
                  {activities.find((a) => a.id === r.activityId)?.title ||
                    r.activityTitle}
                </Text>
                <Text style={s.participantName}>
                  {r.details.firstName} {r.details.lastName}
                </Text>
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
                {!!r.feeAmount && (
                  <Text style={s.body}>
                    المبلغ المطلوب: {r.feeAmount} {r.currency}
                  </Text>
                )}
                {r.status === "Pending" && (r.feeAmount > 0 || r.receipt) && (
                  <>
                    <Text style={s.meta}>
                      {r.receiptStatus === "accepted"
                        ? "تم قبول الوصل · بانتظار تأكيد التسجيل"
                        : r.receiptStatus === "pendingReview"
                          ? "تم تحميل الوصل · بانتظار التحقق"
                          : r.receiptStatus === "rejected"
                            ? "الوصل يحتاج تصحيحًا"
                            : "بانتظار تحميل وصل الإيداع"}
                    </Text>
                    {!!r.receiptNote && (
                      <Text style={s.info}>{r.receiptNote}</Text>
                    )}
                    <Action
                      secondary
                      onPress={() => {
                        setReceiptId(r.id);
                        setReceiptImage(null);
                        setReceiptReference(r.receiptReference || "");
                        setMessage("");
                      }}
                    >
                      {r.receipt
                        ? "إعادة تحميل وصل الإيداع"
                        : "تحميل وصل الإيداع"}
                    </Action>
                  </>
                )}
                {r.status === "Confirmed" && (
                  <Action onPress={() => setTicketId(r.id)}>
                    عرض بطاقة المشاركة وQR
                  </Action>
                )}
                {["Pending", "Waiting"].includes(r.status) && (
                  <Action secondary onPress={() => setCancelId(r.id)}>
                    إلغاء الطلب
                  </Action>
                )}
              </View>
            </React.Fragment>
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
                <View
                  key={a.id}
                  testID={`activity-card-${a.id}`}
                  style={[s.card, a.kind === "camp" && s.campCard]}
                >
                  {a.kind === "camp" ? (
                    <CampPoster
                      activity={a}
                      logo={content.branding?.logo}
                      compact
                    />
                  ) : (
                    <MediaImage
                      path={a.image}
                      style={s.photo}
                    />
                  )}
                  <View
                    style={[s.cardBody, a.kind === "camp" && s.campCardBody]}
                  >
                    <View style={s.cardTop}>
                      <Text style={s.kind}>{kinds[a.kind]}</Text>
                      <Text style={s.slot}>
                        {a.inactive || !a.registrationOpen
                          ? `السعة: ${a.capacity}`
                          : a.registrationMode === "waitingList"
                            ? "قائمة انتظار فقط"
                            : slots
                              ? `${slots} مكانًا متاحًا`
                              : a.allowWaitlist
                                ? "قائمة انتظار"
                                : "مكتمل العدد"}
                      </Text>
                    </View>
                    {a.kind !== "camp" && (
                      <Text style={s.title}>{a.title}</Text>
                    )}
                    {(a.kind !== "camp" ||
                      (!a.inactive && a.registrationOpen)) && (
                      <Text
                        style={s.body}
                        numberOfLines={a.kind === "camp" ? 2 : undefined}
                      >
                        {a.text}
                      </Text>
                    )}
                    <Text style={s.body}>
                      {a.date || "الموعد غير محدد"} · {a.location}
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
                    {a.kind !== "camp" && a.gradeLabel && (
                      <Text style={s.meta}>{displayRange(a.gradeLabel)}</Text>
                    )}
                    {a.kind !== "camp" && a.useAgeLimits && (
                      <Text style={s.meta}>
                        العمر: {a.minAge}–{a.maxAge} سنة
                      </Text>
                    )}
                    {a.inactive || !a.registrationOpen ? (
                      <Pressable
                        disabled
                        accessibilityRole="button"
                        accessibilityLabel="غير فعّال"
                        style={s.inactiveCamp}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={13}
                          color="#555"
                        />
                        <Text style={s.inactiveLabel}>غير فعّال</Text>
                      </Pressable>
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
                          : registration &&
                              slots > 0 &&
                              a.registrationMode !== "waitingList"
                            ? "سجّل مشاركًا آخر ←"
                            : a.registrationMode === "waitingList"
                              ? "سجّل في قائمة الانتظار"
                              : slots
                                ? "سجّل الآن ←"
                                : "انضم إلى قائمة الانتظار"}
                      </Action>
                    )}
                    {registration && !a.inactive && a.registrationOpen && (
                      <Action secondary onPress={() => setFilter("mine")}>
                        عرض تسجيلاتي لهذا النشاط
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
          step === successStep ? setActivityId(null) : setCancelId("draft")
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
                      step === successStep
                        ? setActivityId(null)
                        : setCancelId("draft")
                    }
                  >
                    إغلاق ×
                  </Action>
                  <Text style={s.kind}>
                    {step === successStep
                      ? "تم إرسال الطلب"
                      : `الخطوة ${step + 2} من ${successStep + 1}`}
                  </Text>
                </View>
                <Text style={s.heading}>{activity.title}</Text>
                {step === -1 && (
                  <>
                    <Text style={s.title}>تعليمات قبل التسجيل</Text>
                    <Text style={s.info}>{activity.startInstructions || "يرجى مراجعة بيانات النشاط قبل بدء التسجيل."}</Text>
                  </>
                )}
                <View style={s.progress}>
                  {Array.from(
                    {
                      length: successStep + 1,
                    },
                    (_, i) => i,
                  ).map((i) => (
                    <View
                      key={i}
                      style={[s.progressPart, i <= step + 1 && s.progressActive]}
                    />
                  ))}
                </View>
                {step === -1 && (
                  <>
                    <Pressable accessibilityRole="checkbox" accessibilityState={{checked: instructionsAccepted}}
                      onPress={() => setInstructionsAccepted(!instructionsAccepted)} style={s.checkRow}>
                      <Ionicons name={instructionsAccepted ? "checkbox" : "square-outline"} size={25} color="#151515" />
                      <Text style={s.body}>قرأت التعليمات وأوافق عليها</Text>
                    </Pressable>
                    <Action disabled={!instructionsAccepted} onPress={() => { if (instructionsAccepted) setStep(0); }}>بدء التسجيل</Action>
                  </>
                )}
                {step === 0 && (
                  <>
                    <Text style={s.title}>بيانات المشارك</Text>
                    <Text style={s.info}>
                      اكتب بيانات الشخص الذي سيشارك في المخيم أو النشاط، وليس
                      بيانات مقدّم الطلب. يمكنك تسجيل أكثر من مشارك من الحساب
                      نفسه؛ لكل شخص طلب وخيمة وحالة مستقلة.
                    </Text>
                    <Text style={s.meta}>
                      {activity.useAgeLimits
                        ? `العمر المسموح ${activity.minAge}–${activity.maxAge} سنة. `
                        : ""}
                      {displayRange(activity.gradeLabel)}
                    </Text>
                    {isCamp ? (
                      <CampIdentity
                        {...{
                          activity,
                          details,
                          update,
                          errors,
                          field,
                        }}
                      />
                    ) : (
                      <>
                        {field("firstName", "الاسم الأول", {
                          maxLength: 50,
                        })}
                        {field("lastName", "اسم العائلة", {
                          maxLength: 50,
                        })}
                      </>
                    )}
                    {field("email", "البريد الإلكتروني", {
                      keyboardType: "email-address",
                      autoCapitalize: "none",
                      maxLength: 120,
                    })}
                    <BirthDatePicker value={details.dob} minimum={activity.dobMin} maximum={activity.dobMax}
                      onChange={date => update("dob", date)} error={errors.dob} />
                    {!!details.dob && <Text style={s.meta}>العمر: {details.age} سنة</Text>}
                    {(activity.dobMin || activity.dobMax) && <Text style={s.meta}>
                      الميلاد المسموح: {activity.dobMin || "غير محدد"} — {activity.dobMax || "غير محدد"}
                    </Text>}
                    <Text style={s.label}>الجنس</Text>
                    <View style={s.choices}>
                      {[
                        ["male", "ذكر"],
                        ["female", "أنثى"],
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
                    {!isCamp && <RegistrationChoices {...{activity, details, update, errors, field}} />}
                    <Action secondary onPress={() => setStep(-1)}>السابق: التعليمات</Action>
                    <Action onPress={next}>
                      {isCamp
                        ? "التالي: ولي الأمر والمعلومات الأخرى"
                        : "التالي: مراجعة الطلب"}
                    </Action>
                  </>
                )}
                {isCamp && step === 1 && (
                  <>
                    <CampExtra
                      {...{
                        activity,
                        details,
                        update,
                        errors,
                        field,
                      }}
                      onImage={chooseId}
                    />
                    <Action disabled={idChecking} onPress={nextCampExtra}>
                      {hasTentStep ? "التالي: اختيار الخيمة" : "التالي: مراجعة الطلب"}
                    </Action>
                    <Action secondary onPress={() => setStep(0)}>
                      السابق
                    </Action>
                  </>
                )}
                {hasTentStep && step === servicesStep && (
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
                                      free === 0 && {
                                        opacity: 0.4,
                                      },
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
                    <Action onPress={reviewStep}>التالي: مراجعة الطلب</Action>
                    <Action secondary onPress={() => setStep(isCamp ? 1 : 0)}>
                      السابق
                    </Action>
                  </>
                )}
                {step === reviewIndex && (
                  <>
                    <Text style={s.title}>راجع طلبك</Text>
                    {[
                      [
                        "المشارك",
                        details.arabicFullName ||
                          `${details.firstName} ${details.lastName}`,
                      ],
                      ...(isCamp
                        ? [
                            ["الاسم الإنجليزي", details.englishFullName],
                            ["الرقم الوطني", details.nationalId],
                            ["الصف", details.grade],
                            ["ولي الأمر", details.guardianName],
                            ["هاتف ولي الأمر", details.guardianPhone],
                            ["صاحب هاتف ولي الأمر", details.guardianPhoneOwner],
                            [
                              "التوصيات الطبية",
                              activity.collectMedical
                                ? details.medicalNotes || "لا يوجد"
                                : "لم تُطلب هذه البيانات",
                            ],
                            [
                              "الحساسية",
                              activity.collectMedical
                                ? details.allergies || "لا يوجد"
                                : "لم تُطلب هذه البيانات",
                            ],
                          ]
                        : []),
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
                      ...(activity.collectCity ? [["المدينة", details.city]] : []),
                      ...(activity.collectSchool ? [["المدرسة", details.school]] : []),
                      ...(activity.collectShirtSize ? [["التيشيرت", details.shirtSize]] : []),
                    ].map(([k, v]) => (
                      <View key={k} style={s.summaryRow}>
                        <Text style={s.meta}>{k}</Text>
                        <Text style={s.summaryValue}>{v}</Text>
                      </View>
                    ))}
                    <Text style={s.title}>تعليمات المشاركة</Text>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="أوافق على تعليمات المشاركة"
                      accessibilityState={{
                        checked: consent,
                      }}
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
                    <Action secondary onPress={() => setStep(hasTentStep ? servicesStep : isCamp ? 1 : 0)}>
                      السابق
                    </Action>
                  </>
                )}
                {message && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {message}
                  </Text>
                )}
                {step === successStep && success && (
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
                    {success.status === "Pending" && success.feeAmount > 0 && (
                      <Action
                        onPress={() => {
                          setReceiptId(success.id);
                          setReceiptImage(null);
                          setReceiptReference("");
                          setActivityId(null);
                          setFilter("mine");
                        }}
                      >
                        تحميل وصل الإيداع
                      </Action>
                    )}
                    <Action secondary onPress={() => open(activity)}>
                      تسجيل مشارك جديد
                    </Action>
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
        visible={!!receiptId}
        animationType="slide"
        onRequestClose={() => setReceiptId(null)}
      >
        <SafeAreaView style={s.modal}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Action secondary onPress={() => setReceiptId(null)}>
              إغلاق ×
            </Action>
            <Text style={s.heading}>وصل الإيداع</Text>
            <Text style={s.body}>
              {records.find((r) => r.id === receiptId)?.details
                .arabicFullName ||
                records.find((r) => r.id === receiptId)?.activityTitle}
            </Text>
            <Text style={s.note}>
              معاينة محلية: استخدم صورة وصل وهمية فقط. لا يتم إرسال المال أو
              التحقق المصرفي هنا.
            </Text>
            <Action onPress={chooseReceipt}>اختيار صورة الوصل</Action>
            {receiptImage && (
              <Image
                source={{
                  uri: receiptImage.uri,
                }}
                accessibilityLabel="معاينة وصل الإيداع"
                style={s.documentPreview}
              />
            )}
            <Text style={s.label}>الرقم المرجعي للوصل</Text>
            <TextInput
              accessibilityLabel="الرقم المرجعي للوصل"
              style={s.input}
              value={receiptReference}
              maxLength={100}
              onChangeText={setReceiptReference}
            />
            {!!message && <Text style={s.error}>{message}</Text>}
            <Action
              disabled={!receiptImage || !receiptReference.trim()}
              onPress={uploadReceipt}
            >
              تأكيد رفع الوصل
            </Action>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!ticketId}
        animationType="slide"
        onRequestClose={() => setTicketId(null)}
      >
        <SafeAreaView style={s.modal}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Action secondary onPress={() => setTicketId(null)}>
              إغلاق ×
            </Action>
            {(() => {
              const r = records.find((r) => r.id === ticketId);
              if (!r || r.status !== "Confirmed")
                return <Text>لا توجد بطاقة مؤكدة.</Text>;
              return (
                <>
                  <Text style={s.heading}>بطاقة المشاركة</Text>
                  <Text style={s.title}>
                    {r.details.arabicFullName ||
                      `${r.details.firstName} ${r.details.lastName}`}
                  </Text>
                  <Text style={s.body}>
                    {activities.find((a) => a.id === r.activityId)?.title ||
                      r.activityTitle}
                  </Text>
                  <View style={s.qr}>
                    <QRCode
                      value={JSON.stringify({
                        type: "spark-preview",
                        registration: r.id,
                        activity: r.activityId,
                      })}
                      size={210}
                    />
                  </View>
                  <Text selectable style={s.reference}>
                    {r.reference}
                  </Text>
                  {r.details.tentNumber != null && (
                    <Text style={s.title}>الخيمة {r.details.tentNumber}</Text>
                  )}
                  <Text style={s.info}>
                    {activities.find((a) => a.id === r.activityId)
                      ?.afterRegistrationInstructions ||
                      "أبرز البطاقة عند الوصول بعد تفعيل نظام التحقق."}
                  </Text>
                  <Text style={s.note}>
                    QR تجريبي؛ لا يحتوي رقم الهوية أو المعلومات الطبية، ولا يعمل
                    كتذكرة موثقة دون نظام تحقق خلفي.
                  </Text>
                </>
              );
            })()}
          </ScrollView>
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
  campCard: {
    borderRadius: 25,
  },
  campCardBody: {
    padding: 17,
  },
  inactiveCamp: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#F7F5EF",
    marginTop: 10,
  },
  inactiveLabel: {
    fontFamily: "TajawalBold",
    fontSize: 11,
    color: "#A49A88",
  },
  groupHeading: {
    fontFamily: "TajawalBold",
    fontSize: 18,
    textAlign: "right",
    marginTop: 20,
    marginBottom: 14,
  },
  documentPreview: {
    width: "100%",
    height: 220,
    resizeMode: "contain",
    marginVertical: 16,
  },
  qr: {
    alignSelf: "center",
    padding: 24,
    backgroundColor: "#fff",
    marginVertical: 24,
  },
  participantName: {
    fontSize: 17,
    fontFamily: "TajawalBold",
    marginBottom: 12,
    color: "#514C41",
  },
  tentGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 9,
    marginVertical: 16,
  },
  tentTile: {
    width: "30%",
    minHeight: 106,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E7E0D2",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  tentSelected: {
    backgroundColor: "#FFE79A",
    borderColor: "#EBC862",
  },
  tentNumber: {
    fontSize: 23,
    fontFamily: "TajawalBold",
  },
  tentMeta: {
    fontSize: 10,
    color: "#666",
  },
  draftOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  eyebrow: {
    fontSize: 12,
    color: "#A09A8E",
    marginBottom: 3,
  },
  heading: {
    fontSize: 27,
    fontFamily: "TajawalBold",
    marginTop: 6,
    marginBottom: 12,
    color: "#35332C",
  },
  body: {
    fontSize: 13,
    lineHeight: 24,
    color: "#928B7E",
    marginBottom: 9,
  },
  filters: {
    flexDirection: "row-reverse",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 20,
  },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  filterActive: {
    backgroundColor: "#FFE58D",
  },
  filterText: {
    fontSize: 11,
    color: "#9B9589",
  },
  card: {
    borderRadius: 25,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#fff",
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  photo: {
    width: "100%",
    height: 175,
  },
  cardBody: {
    padding: 17,
  },
  cardTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  kind: {
    fontSize: 11,
    fontFamily: "TajawalBold",
    color: "#C28F44",
  },
  slot: {
    fontSize: 10,
    color: "#A49C8D",
  },
  title: {
    fontSize: 18,
    fontFamily: "TajawalBold",
    marginVertical: 10,
    color: "#3C3931",
  },
  meta: {
    fontSize: 11,
    color: "#A0988B",
    lineHeight: 21,
  },
  action: {
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#FFDA00",
    marginVertical: 7,
  },
  secondary: {
    backgroundColor: "#F0EDE4",
  },
  actionText: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "TajawalBold",
    color: "#554A29",
  },
  registration: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 15,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  status: {
    flexDirection: "row-reverse",
    gap: 7,
    alignItems: "center",
    backgroundColor: "#FFF2C9",
    alignSelf: "flex-end",
    padding: 8,
    borderRadius: 12,
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
    backgroundColor: "#F6F4EF",
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalContent: {
    padding: 22,
    paddingBottom: 50,
  },
  modalBar: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progress: {
    flexDirection: "row-reverse",
    gap: 6,
    marginBottom: 24,
  },
  progressPart: {
    flex: 1,
    height: 5,
    backgroundColor: "#eee",
    borderRadius: 3,
  },
  progressActive: {
    backgroundColor: "#ffda00",
  },
  label: {
    fontSize: 12,
    fontFamily: "TajawalBold",
    marginTop: 17,
    color: "#726A5D",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E0D4",
    borderRadius: 15,
    padding: 15,
    textAlign: "right",
    fontFamily: "Tajawal",
    fontSize: 15,
    marginTop: 8,
    color: "#514A3E",
    backgroundColor: "#fff",
  },
  errorInput: {
    borderColor: "#ad3224",
  },
  error: {
    fontSize: 12,
    lineHeight: 22,
    color: "#ad3224",
    marginTop: 7,
  },
  choices: {
    flexDirection: "row-reverse",
    gap: 9,
    marginVertical: 12,
  },
  choice: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E1D3",
    padding: 12,
    borderRadius: 14,
  },
  choiceActive: {
    backgroundColor: "#FFEB9F",
    borderColor: "#EFD573",
  },
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
    borderColor: "#EAE5DB",
    paddingVertical: 14,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    color: "#645C4E",
  },
  info: {
    backgroundColor: "#EEEAE0",
    padding: 17,
    borderRadius: 17,
    fontSize: 12,
    lineHeight: 24,
    marginVertical: 15,
    color: "#877D6C",
  },
  success: {
    alignItems: "center",
    paddingVertical: 30,
  },
  reference: {
    fontSize: 20,
    fontFamily: "TajawalBold",
    padding: 18,
    backgroundColor: "#FFF0BA",
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,.5)",
  },
  dialog: {
    padding: 25,
    borderRadius: 27,
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
});
