import React from "react";
import MediaImage from "./MediaImage";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { displayRange } from "@spark/shared";
import Svg, { Text as SvgText, Path } from "react-native-svg";
export default function CampPoster({ activity, logo, compact = false }) {
  const color = /^#[0-9a-f]{6}$/i.test(activity.brandColor || "")
    ? activity.brandColor
    : "#5149ae";
  const word = (activity.brandTitle || "CAMP").toUpperCase();
  const grade = activity.gradeLabel?.match(/\d+(?:[–-]\d+)?\+?/)?.[0];
  const range = grade
    ? grade + (activity.gradeLabel.includes("وما بعده") ? "+" : "")
    : activity.useAgeLimits
      ? `${activity.minAge}–${activity.maxAge}`
      : "";
  const circle = compact ? 190 : 272;
  if (compact)
    return (
      <View style={s.previewCard}>
        <MediaImage
          path={activity.image}
          style={s.previewPhoto}
        />
        <LinearGradient
          colors={["rgba(0,0,0,.05)", "rgba(0,0,0,.78)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.previewTag, { backgroundColor: color }]}>
          <Text style={s.previewTagText}>{word}</Text>
        </View>
        <View style={s.previewLogoBox}>
          <MediaImage
            path={logo || "/media/spark-logo.png"}
            style={s.previewLogo}
          />
        </View>
        <View style={s.previewCopy}>
          <Text style={s.previewTitle}>{activity.title.split(" · ")[0]}</Text>
          <Text style={s.previewGrade}>
            {activity.gradeLabel
              ? displayRange(activity.gradeLabel)
              : activity.useAgeLimits
                ? displayRange(`للأعمار ${activity.minAge}–${activity.maxAge}`)
                : "مجتمع سبارك"}
          </Text>
        </View>
      </View>
    );
  return (
    <View style={[s.poster, { height: compact ? 330 : 442 }]}>
      <LinearGradient
        colors={[color, color, "#121519"]}
        locations={[0, 0.72, 1]}
        style={s.colorBand}
      />
      <View style={s.leftRail}>
        <Text style={s.railText}>SPARK · CAMP EXPERIENCE</Text>
        <View style={[s.railLine, { backgroundColor: color }]} />
      </View>
      <View style={s.brandRow}>
        <MediaImage
          path={logo || "/media/spark-logo.png"}
          style={s.logo}
        />
        <View>
          <Text style={s.brandName}>SPARK</Text>
          <Text style={s.brandCaption}>CAMP EXPERIENCE</Text>
        </View>
      </View>
      <View
        style={[
          s.circle,
          {
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            top: compact ? 77 : 83,
          },
        ]}
      >
        <MediaImage path={activity.image} style={s.photo} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,.32)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[s.outline, { top: compact ? 123 : 158 }]}>
        <Svg width="100%" height={100} viewBox="0 0 360 100">
          <SvgText
            x="180"
            y="82"
            textAnchor="middle"
            fontSize={Math.min(87, 610 / word.length)}
            fontWeight="900"
            fontFamily="Arial"
            letterSpacing="-3"
            fill="rgba(255,255,255,.04)"
            stroke="#fff"
            strokeWidth="1.4"
          >
            {word}
          </SvgText>
        </Svg>
      </View>
      <View style={[s.corner, { borderColor: color }]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path
            d="M4 20L12 5l8 15H4zm4 0l4-8 4 8"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>
      </View>
      <View style={[s.footer, { bottom: compact ? 12 : 17 }]}>
        <Text style={[s.campName, compact && { fontSize: 21 }]}>
          {activity.title.split(" · ")[0]}
        </Text>
        <View style={s.yellowRule} />
        {range ? (
          <View style={s.eligibility}>
            <Text style={s.rangeLabel}>
              {grade ? "للطلاب في الصفوف" : "للأعمار"}
            </Text>
            <Text style={[s.range, compact && { fontSize: 29 }]}>
              {displayRange(range)}
            </Text>
          </View>
        ) : (
          <Text style={s.motto}>نلعب. نكتشف. ننمو.</Text>
        )}
        {activity.birthYearLabel ? (
          <Text style={s.birth}>{displayRange(activity.birthYearLabel)}</Text>
        ) : (
          <Text style={s.motto}>مغامرة تجمعنا، وذكريات تبقى</Text>
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  previewCard: { height: 205, overflow: "hidden", backgroundColor: "#252525" },
  previewPhoto: { width: "100%", height: "100%" },
  previewTag: {
    position: "absolute",
    right: 16,
    top: 15,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  previewTagText: {
    fontFamily: "TajawalBold",
    color: "#fff",
    fontSize: 10,
    letterSpacing: 1,
  },
  previewLogoBox: {
    position: "absolute",
    left: 15,
    top: 15,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#fff",
    padding: 3,
  },
  previewLogo: { width: "100%", height: "100%", resizeMode: "contain" },
  previewCopy: { position: "absolute", bottom: 18, left: 20, right: 20 },
  previewTitle: {
    fontFamily: "TajawalBold",
    fontSize: 24,
    color: "#fff",
    textAlign: "right",
    marginBottom: 7,
  },
  previewGrade: {
    fontFamily: "Tajawal",
    fontSize: 12,
    color: "#ffffffdc",
    textAlign: "right",
  },
  poster: {
    overflow: "hidden",
    backgroundColor: "#f5f5f2",
    alignItems: "center",
  },
  colorBand: { position: "absolute", top: 0, bottom: 0, left: 22, right: 22 },
  leftRail: {
    position: "absolute",
    left: 2,
    top: 28,
    bottom: 26,
    width: 17,
    justifyContent: "space-between",
    alignItems: "center",
  },
  railText: {
    fontFamily: "TajawalBold",
    fontSize: 8,
    letterSpacing: 2,
    color: "#777",
    width: 220,
    transform: [{ rotate: "-90deg" }],
    position: "absolute",
    top: 157,
    left: -102,
  },
  railLine: { width: 2, height: 28, marginTop: "auto" },
  brandRow: {
    position: "absolute",
    top: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 3,
  },
  logo: { width: 39, height: 39, resizeMode: "contain" },
  brandName: {
    fontFamily: "TajawalBold",
    fontSize: 22,
    letterSpacing: 1,
    color: "#fff",
    lineHeight: 25,
  },
  brandCaption: {
    fontFamily: "TajawalBold",
    fontSize: 7,
    color: "#ffffffb0",
    letterSpacing: 1.2,
  },
  circle: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#ffffff40",
  },
  photo: { width: "100%", height: "100%" },
  outline: { position: "absolute", left: 0, right: 0, zIndex: 4 },
  corner: {
    position: "absolute",
    right: 0,
    bottom: 35,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 8,
    backgroundColor: "#f5f5f2",
  },
  footer: {
    position: "absolute",
    left: 31,
    right: 31,
    alignItems: "center",
    zIndex: 5,
  },
  campName: {
    fontFamily: "TajawalBold",
    fontSize: 26,
    color: "#ffda00",
    textAlign: "center",
  },
  yellowRule: {
    width: 40,
    height: 2,
    backgroundColor: "#ffda00",
    marginTop: 6,
    marginBottom: 8,
  },
  eligibility: { alignItems: "center" },
  rangeLabel: {
    fontFamily: "Tajawal",
    fontSize: 10,
    color: "#fff",
    marginBottom: 0,
  },
  range: {
    fontFamily: "TajawalBold",
    fontSize: 39,
    color: "#fff",
    lineHeight: 44,
    writingDirection: "ltr",
  },
  birth: {
    fontFamily: "TajawalBold",
    fontSize: 10,
    color: "#171717",
    backgroundColor: "#ffda00",
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 5,
  },
  motto: {
    fontFamily: "Tajawal",
    fontSize: 9,
    color: "#ffffffa0",
    marginTop: 4,
    textAlign: "center",
  },
});
