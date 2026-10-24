import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import { displayRange } from "@spark/shared";
import Svg, { Text as SvgText } from "react-native-svg";
const uri = (p) =>
  /^(https?:|data:)/.test(p) || Platform.OS === "web"
    ? p
    : "https://sparkyouth.vercel.app" + p;
export default function CampPoster({ activity, logo }) {
  const color = /^#[0-9a-f]{6}$/i.test(activity.brandColor || "")
    ? activity.brandColor
    : "#4d45a4";
  return (
    <View style={[s.poster, { backgroundColor: color }]}>
      <View style={s.top}>
        <Image
          source={
            logo
              ? { uri: logo }
              : require("../admin/public/media/spark-logo.png")
          }
          style={s.logo}
        />
        <Text style={s.brand}>SPARK CAMP</Text>
        <Text style={s.edition}>مجتمع يتعلّم، يلعب وينمو</Text>
      </View>
      <View style={s.circle}>
        <Image source={{ uri: uri(activity.image) }} style={s.photo} />
      </View>
      <View style={s.outline}>
        <Svg width="100%" height="64" viewBox="0 0 360 64">
          <SvgText
            x="180"
            y="51"
            textAnchor="middle"
            fontSize="53"
            fontWeight="900"
            fontFamily="Arial"
            fill="none"
            stroke="#fff"
            strokeWidth="1.4"
          >
            {activity.brandTitle || "CAMP"}
          </SvgText>
        </Svg>
      </View>
      <View style={s.footer}>
        <Text style={s.name}>{activity.title}</Text>
        <Text style={s.grade}>
          {displayRange(activity.gradeLabel) || "مخيم سبارك"}
        </Text>
        {activity.birthYearLabel ? (
          <Text style={s.years}>{displayRange(activity.birthYearLabel)}</Text>
        ) : null}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  poster: { height: 330, overflow: "hidden", alignItems: "center" },
  top: { alignItems: "center", paddingTop: 15, zIndex: 2 },
  logo: { width: 27, height: 27, resizeMode: "contain" },
  brand: {
    fontFamily: "TajawalBold",
    fontSize: 14,
    color: "#fff",
    letterSpacing: 1,
    marginTop: 2,
  },
  edition: {
    fontFamily: "Tajawal",
    fontSize: 10,
    color: "#ffffffb0",
    marginTop: 3,
  },
  circle: {
    position: "absolute",
    top: 85,
    width: 190,
    height: 190,
    borderRadius: 95,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#ffffff30",
  },
  photo: { width: "100%", height: "100%" },
  outline: { position: "absolute", top: 144, left: 0, right: 0, zIndex: 3 },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 15,
    alignItems: "center",
  },
  name: {
    fontFamily: "TajawalBold",
    fontSize: 21,
    color: "#ffda00",
    textAlign: "center",
  },
  grade: {
    fontFamily: "TajawalBold",
    fontSize: 18,
    color: "#fff",
    marginTop: 5,
  },
  years: {
    fontFamily: "TajawalBold",
    fontSize: 10,
    color: "#141414",
    backgroundColor: "#ffda00",
    paddingHorizontal: 11,
    paddingVertical: 3,
    borderRadius: 5,
    marginTop: 5,
  },
});
