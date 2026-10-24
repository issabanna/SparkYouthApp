import React from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
export async function pickPreviewImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    base64: true,
    quality: 1,
  });
  if (result.canceled) return null;
  const a = result.assets[0],
    mime = a.mimeType || "image/jpeg";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw Error("اختر صورة PNG أو JPEG أو WebP.");
  if (!a.base64 || (a.base64.length * 3) / 4 > 500000)
    throw Error("للنسخة التجريبية، اختر صورة أقل من 500 كيلوبايت.");
  return {
    uri: `data:${mime};base64,${a.base64}`,
    name: a.fileName || "image.jpg",
    mimeType: mime,
  };
}
export function Choice({ fieldKey, label, options, details, update, errors }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={s.pickerBox}>
        <Picker
          accessibilityLabel={label}
          selectedValue={details[fieldKey]}
          onValueChange={(v) => update(fieldKey, v)}
          style={s.picker}
        >
          <Picker.Item label="اختر…" value="" />
          {options.map((value) => (
            <Picker.Item key={value} label={value} value={value} />
          ))}
        </Picker>
      </View>
      {errors[fieldKey] && (
        <Text accessibilityRole="alert" style={s.error}>
          {errors[fieldKey]}
        </Text>
      )}
    </View>
  );
}
export function CampIdentity({ activity, details, update, errors, field }) {
  return (
    <>
      {field(
        "nationalId",
        `الرقم الوطني${activity.requireNationalId ? " (مطلوب)" : " (اختياري)"}`,
        { maxLength: 30, autoCapitalize: "characters" },
      )}
      {field("arabicFullName", "الاسم الثلاثي باللغة العربية", {
        maxLength: 150,
      })}
      {field("englishFullName", "الاسم الكامل باللغة الإنجليزية", {
        maxLength: 150,
        autoCapitalize: "words",
      })}
      <Choice
        fieldKey="grade"
        label="صف المشارك"
        options={
          activity.allowedGrades.length
            ? activity.allowedGrades
            : activity.gradeOptions
        }
        {...{ details, update, errors }}
      />
    </>
  );
}
export function CampExtra({
  activity,
  details,
  update,
  errors,
  field,
  onImage,
}) {
  return (
    <>
      <Text style={s.heading}>ولي الأمر ومعلومات أخرى</Text>
      {field("guardianName", "اسم ولي الأمر", { maxLength: 150 })}
      {field("guardianPhone", "رقم هاتف ولي الأمر", {
        keyboardType: "phone-pad",
        maxLength: 10,
      })}
      <Choice
        fieldKey="guardianPhoneOwner"
        label="هاتف ولي الأمر يعود إلى"
        options={["الأب", "الأم", "الوصي", "قريب", "آخر"]}
        {...{ details, update, errors }}
      />
      {activity.cityOptions.length ? (
        <Choice
          fieldKey="city"
          label="المدينة"
          options={activity.cityOptions}
          {...{ details, update, errors }}
        />
      ) : (
        field("city", "المدينة", { maxLength: 100 })
      )}
      {activity.schoolOptions.length ? (
        <Choice
          fieldKey="school"
          label="المدرسة"
          options={activity.schoolOptions}
          {...{ details, update, errors }}
        />
      ) : (
        field("school", "المدرسة", { maxLength: 150 })
      )}
      <Choice
        fieldKey="shirtSize"
        label="مقاس التيشيرت"
        options={activity.shirtOptions}
        {...{ details, update, errors }}
      />
      {activity.collectMedical && (
        <>
          {field("medicalNotes", "التوصيات الطبية", {
            multiline: true,
            maxLength: 2000,
            placeholder: "اكتب لا يوجد إن لم توجد توصيات",
          })}
          {field("allergies", "الحساسية", {
            multiline: true,
            maxLength: 1000,
            placeholder: "اكتب لا يوجد إن لم توجد حساسية",
          })}
        </>
      )}
      <Text style={s.heading}>
        صورة الهوية {activity.requireIdDocument ? "(مطلوبة)" : "(اختيارية)"}
      </Text>
      <Text style={s.note}>
        معاينة محلية فقط. استخدم صورة تجريبية، ولا ترفع وثيقة هوية حقيقية الآن.
      </Text>
      <Pressable accessibilityRole="button" onPress={onImage} style={s.upload}>
        <Text style={s.uploadText}>
          {details.idDocument ? "استبدال صورة الهوية" : "اختيار صورة الهوية"}
        </Text>
      </Pressable>
      {details.idDocument && (
        <Image
          source={{ uri: details.idDocument.uri }}
          style={s.preview}
          accessibilityLabel="معاينة صورة الهوية"
        />
      )}
      {errors.idDocument && (
        <Text accessibilityRole="alert" style={s.error}>
          {errors.idDocument}
        </Text>
      )}
    </>
  );
}
const s = StyleSheet.create({
  label: {
    fontFamily: "TajawalBold",
    fontSize: 13,
    textAlign: "right",
    marginTop: 16,
    color: "#222",
  },
  heading: {
    fontFamily: "TajawalBold",
    fontSize: 20,
    textAlign: "right",
    marginTop: 20,
    color: "#171717",
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  picker: {
    fontFamily: "Tajawal",
    fontSize: 15,
    color: "#171717",
    height: Platform.OS === "ios" ? 180 : 50,
    width: "100%",
    backgroundColor: "#fff",
  },
  error: {
    fontFamily: "Tajawal",
    fontSize: 12,
    color: "#ad3224",
    textAlign: "right",
    marginTop: 8,
  },
  note: {
    fontFamily: "Tajawal",
    fontSize: 11,
    color: "#777",
    textAlign: "right",
    lineHeight: 21,
    marginVertical: 14,
  },
  upload: { backgroundColor: "#fff3a8", padding: 17, borderRadius: 12 },
  uploadText: {
    fontFamily: "TajawalBold",
    textAlign: "center",
    fontSize: 14,
    color: "#171717",
  },
  preview: {
    width: "100%",
    height: 160,
    resizeMode: "contain",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginTop: 12,
  },
});
