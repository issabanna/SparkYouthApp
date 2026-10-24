import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text as NativeText,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from "@expo-google-fonts/tajawal";
import CampPoster from "./CampPoster";
import Registrations from "./Registrations";
import {
  normalizeContent,
  contentVersion,
  ar,
  kinds,
  defaultContent,
  storageKey,
  canAccessJourney,
  completedCount,
  sampleProgress,
} from "@spark/shared";
function Text({ style, ...props }) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily:
            weight && Number(weight) >= 700 ? "TajawalBold" : "Tajawal",
          fontWeight: "normal",
        },
        style,
        {
          fontWeight: "normal",
        },
      ]}
    />
  );
}
function Icon({ name, size = 24, color = "#151515" }) {
  return <Ionicons name={name} size={size} color={color} />;
}
function ProgressRing({ value }) {
  const c = 2 * Math.PI * 38;
  return (
    <View style={s.ring}>
      <Svg width={94} height={94}>
        <Circle
          cx={47}
          cy={47}
          r={38}
          stroke="#fff5ad"
          strokeWidth={9}
          fill="none"
        />
        {value > 0 && (
          <Circle
            cx={47}
            cy={47}
            r={38}
            stroke="#171717"
            strokeWidth={9}
            fill="none"
            strokeDasharray={`${(c * value) / 100} ${c}`}
            strokeLinecap="round"
            rotation={-90}
            origin="47,47"
          />
        )}
      </Svg>
      <View style={s.ringText}>
        <Text style={s.ringValue}>{value}%</Text>
      </View>
    </View>
  );
}
const sessionKey = "spark-camp-profile-v1";
const load = (key, fallback) => {
  try {
    return Platform.OS === "web"
      ? JSON.parse(localStorage.getItem(key)) || fallback
      : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  if (Platform.OS === "web") localStorage.setItem(key, JSON.stringify(value));
};
const readContent = () => {
  const raw = load(storageKey, defaultContent);
  const content = normalizeContent(raw);
  if (raw.schemaVersion !== contentVersion) {
    try {
      save(storageKey, content);
    } catch {}
  }
  return content;
};
const imageUri = (path) =>
  /^(https?:|data:)/.test(path) || Platform.OS === "web"
    ? path
    : "https://sparkyouth.vercel.app" + path;
function Photo({ path, style }) {
  return (
    <Image
      source={{
        uri: imageUri(path),
      }}
      style={[s.photo, style]}
      accessibilityLabel="صورة توضيحية للمخيم"
    />
  );
}
function Button({ children, onPress, disabled, secondary }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        disabled && {
          opacity: 0.4,
        },
      ]}
    >
      <Text style={s.buttonText}>{children}</Text>
    </Pressable>
  );
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal: Tajawal_400Regular,
    TajawalMedium: Tajawal_500Medium,
    TajawalBold: Tajawal_700Bold,
    TajawalHeavy: Tajawal_800ExtraBold,
  });
  const scrollRef = useRef(null);
  const journeyRailRef = useRef(null);
  const homeRailRef = useRef(null);
  const [content, setContent] = useState(readContent);
  const [profile, setProfile] = useState(() =>
    load(sessionKey, {
      user: null,
      reflections: {},
      completed: [],
    }),
  );
  const [tab, setTab] = useState(ar.home),
    [slide, setSlide] = useState(0),
    [selected, setSelected] = useState(null),
    [name, setName] = useState(""),
    [role, setRole] = useState("camper"),
    [reflection, setReflection] = useState(""),
    [comment, setComment] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const refresh = () => setContent(readContent());
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: false,
    });
  }, [tab]);
  const updateProfile = (next) => {
    setProfile(next);
    save(sessionKey, next);
  };
  const user = profile.user;
  const announcements = content.announcements.filter((x) => x.published),
    journeys = content.journeys.filter((j) => canAccessJourney(j, user));
  const ranking = [
    ...sampleProgress.filter(
      (p) =>
        (p.role === "approvedLeader") === (user?.role === "approvedLeader"),
    ),
    {
      ...user,
      name: user?.name + " · أنت",
      completed: profile.completed,
    },
  ]
    .map((p) => ({
      ...p,
      points: completedCount(p.completed, content.journeys, p),
    }))
    .sort((a, b) => b.points - a.points);
  const completed = completedCount(profile.completed, content.journeys, user);
  const progress = journeys.length
    ? Math.round((completed / journeys.length) * 100)
    : 0;
  const activeSlide = announcements[slide % Math.max(announcements.length, 1)];
  const journey =
    selected?.type === "journey"
      ? content.journeys.find((j) => j.id === selected.id)
      : null;
  const openJourney = (j) => {
    setReflection(profile.reflections[j.id] || "");
    setComment("");
    setNotice("");
    setSelected({
      type: "journey",
      id: j.id,
    });
  };
  const complete = () => {
    if (!reflection.trim()) return;
    updateProfile({
      ...profile,
      reflections: {
        ...profile.reflections,
        [journey.id]: reflection.trim(),
      },
      completed: [...new Set([...profile.completed, journey.id])],
    });
    setNotice("تم حفظ تأملك وإكمال المسار. أحسنت!");
  };
  const postComment = () => {
    if (!comment.trim() || !canAccessJourney(journey, user)) return;
    const next = {
      ...content,
      comments: [
        ...content.comments,
        {
          id: Date.now().toString(),
          journeyId: journey.id,
          author: user.name,
          text: comment.trim(),
        },
      ],
    };
    setContent(next);
    save(storageKey, next);
    setComment("");
  };
  if (!fontsLoaded && !fontError)
    return (
      <SafeAreaView style={s.loading}>
        <NativeText
          style={{
            fontSize: 24,
            fontWeight: "800",
          }}
        >
          SPARK
        </NativeText>
        <NativeText>جارٍ تجهيز تجربتك…</NativeText>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View style={s.brandGroup}>
          <Image
            source={{
              uri: content.branding?.logo || imageUri("/media/spark-logo.png"),
            }}
            style={s.logoImage}
            accessibilityLabel="شعار سبارك"
          />
          <View>
            <Text style={s.wordmark}>SPARK</Text>
            <Text style={s.tagline}>سبارك · نكبر معًا في المغامرة</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الإعلانات"
          disabled={!user}
          onPress={() =>
            setSelected({
              type: "announcements",
            })
          }
          style={s.notificationButton}
        >
          <Icon name="notifications-outline" size={24} />
          {announcements.length > 0 && <View style={s.notificationDot} />}
        </Pressable>
      </View>
      {!user ? (
        <ScrollView contentContainerStyle={s.content}>
          <Photo
            path="/media/camp.png"
            style={{
              height: 230,
              borderRadius: 24,
            }}
          />
          <Text style={s.kicker}>أصدقاء. مغامرة. أثر.</Text>
          <Text style={s.heroTitle}>كل مخيم بداية حكاية</Text>
          <Text style={s.body}>
            أخبار مخيمك، لحظاتنا الجميلة، ومسارات تعلّم قصيرة نتعلّم فيها معًا.
            ادخل لاستكشاف مجتمع سبارك.
          </Text>
          <Text style={s.label}>اسمك في المعاينة</Text>
          <TextInput
            accessibilityLabel="اسمك في المعاينة"
            placeholder="كيف نناديك؟"
            value={name}
            onChangeText={setName}
            maxLength={50}
            style={s.input}
          />
          <Text style={s.label}>جرّب نوع الحساب</Text>
          <View style={s.roles}>
            {[
              ["camper", "مشارك"],
              ["pendingLeader", "مرشد بانتظار الموافقة"],
              ["approvedLeader", "مرشد معتمد"],
            ].map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setRole(id)}
                style={[s.role, role === id && s.roleActive]}
                accessibilityRole="button"
              >
                <Text style={s.small}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Button
            disabled={!name.trim()}
            onPress={() =>
              updateProfile({
                ...profile,
                user: {
                  name: name.trim(),
                  role,
                },
              })
            }
          >
            دخول تجريبي ←
          </Button>
          <Text style={s.caption}>
            اختيار الدور هنا للعرض فقط، وليس تسجيل دخول أو اعتمادًا فعليًا.
          </Text>
        </ScrollView>
      ) : (
        <>
          <ScrollView ref={scrollRef} contentContainerStyle={s.content}>
            {tab === ar.home && (
              <>
                <View style={s.welcomeRow}>
                  <View style={s.welcomeAvatar}>
                    <Icon name="sunny" color="#171717" size={23} />
                  </View>
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={s.kicker}>أهلًا بعودتك، {user.name}</Text>
                    <Text style={s.heroTitle}>مغامرتنا تجمعنا</Text>
                  </View>
                </View>
                {activeSlide && (
                  <View style={s.heroCard}>
                    <Photo path={activeSlide.image} style={s.heroPhoto} />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.9)"]}
                      style={s.heroGradient}
                    />
                    <View style={s.heroCategory}>
                      <Icon name="megaphone" size={14} />
                      <Text style={s.heroCategoryText}>إعلانات سبارك</Text>
                    </View>
                    <View style={s.heroCopy}>
                      <Text style={s.heroHeading}>{activeSlide.title}</Text>
                      <Text style={s.heroDescription}>{activeSlide.text}</Text>
                    </View>
                  </View>
                )}
                <View style={s.dots}>
                  {announcements.map((a, i) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"الإعلان " + (i + 1)}
                      key={a.id}
                      onPress={() => setSlide(i)}
                      style={[
                        s.dot,
                        i === slide % announcements.length && s.dotActive,
                      ]}
                    />
                  ))}
                </View>
                <View style={s.quickRow}>
                  {[
                    [ar.programs, "calendar-outline", "تسجيل الأنشطة"],
                    [ar.learning, "book-outline", "تعلّم"],
                    ["gallery", "images-outline", "صور المخيم"],
                  ].map(([id, icon, label], index) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => {
                        if (id === "gallery") {
                          const g = content.galleries.find((g) => g.published);
                          if (g)
                            setSelected({
                              type: "gallery",
                              id: g.id,
                            });
                        } else setTab(id);
                      }}
                      style={s.quickAction}
                    >
                      <View
                        style={[
                          s.quickIcon,
                          {
                            backgroundColor: ["#FFF0AC", "#FFE6DA", "#DEF0EC"][
                              index
                            ],
                          },
                        ]}
                      >
                        <Icon
                          name={icon}
                          size={22}
                          color={["#8B7100", "#D66C49", "#21857E"][index]}
                        />
                      </View>
                      <Text style={s.quickLabel}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTab(ar.learning)}
                  style={s.homeSummary}
                >
                  <View style={s.summaryIcon}>
                    <Icon name="sparkles" size={23} color="#C58B23" />
                  </View>
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={s.summaryTitle}>مساحتك للنمو والتعلّم</Text>
                    <Text style={s.summaryCopy}>
                      {completed} مسارات مكتملة · اكتشف ما تتعلّمه اليوم
                    </Text>
                  </View>
                  <Icon name="chevron-back" size={18} color="#AAA" />
                </Pressable>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>المخيمات والأنشطة</Text>
                  <View style={s.liveBadge}>
                    <View style={s.liveDot} />
                    <Text style={s.liveText}>اكتشف</Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  ref={homeRailRef}
                  onContentSizeChange={() =>
                    homeRailRef.current?.scrollToEnd({
                      animated: false,
                    })
                  }
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.homeRail}
                >
                  {content.activities
                    .filter((a) => a.published)
                    .slice(0, 4)
                    .map((a) => (
                      <Pressable
                        key={a.id}
                        accessibilityRole="button"
                        accessibilityLabel={`عرض ${a.title}`}
                        disabled={a.inactive || !a.registrationOpen}
                        onPress={() => setTab(ar.programs)}
                        style={s.activityCard}
                      >
                        <Photo path={a.image} style={s.activityPhoto} />
                        <View style={s.activityBody}>
                          <View style={s.activityTag}>
                            <Text style={s.activityTagText}>
                              {kinds[a.kind] || "نشاط"}
                            </Text>
                            <Icon
                              name={
                                a.inactive || !a.registrationOpen
                                  ? "lock-closed-outline"
                                  : "arrow-back"
                              }
                              size={15}
                              color="#777"
                            />
                          </View>
                          <Text style={s.title} numberOfLines={2}>
                            {a.title}
                          </Text>
                          <View style={s.locationRow}>
                            <Icon
                              name="calendar-outline"
                              size={13}
                              color="#999"
                            />
                            <Text style={s.caption} numberOfLines={1}>
                              {a.startDate || a.date || "الموعد غير محدد"}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                </ScrollView>
                {!content.activities.some((a) => a.published) && (
                  <Text style={s.body}>
                    لا توجد أنشطة معلنة حاليًا. تابعنا قريبًا.
                  </Text>
                )}
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>لحظات تستحق نعيشها</Text>
                  <Icon name="camera-outline" size={22} />
                </View>
                {content.galleries
                  .filter((g) => g.published)
                  .map((g) => (
                    <Pressable
                      accessibilityRole="button"
                      key={g.id}
                      onPress={() =>
                        setSelected({
                          type: "gallery",
                          id: g.id,
                        })
                      }
                      style={s.galleryCard}
                    >
                      <Photo path={g.images[0]} style={s.galleryPhoto} />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,.8)"]}
                        style={s.heroGradient}
                      />
                      <View style={s.galleryCount}>
                        <Icon name="images" size={14} color="#fff" />
                        <Text style={s.galleryCountText}>
                          {g.images.length} صور
                        </Text>
                      </View>
                      <View style={s.galleryCopy}>
                        <Text style={s.galleryTitle}>{g.title}</Text>
                        <View style={s.arrowCircle}>
                          <Icon name="arrow-back" size={20} />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                <View style={s.blackCallout}>
                  <View style={s.yellowBadge}>
                    <Icon name="flash" size={23} />
                  </View>
                  <Text style={s.calloutTitle}>تجربة تعلّم. بطريقتنا.</Text>
                  <Text style={s.calloutText}>
                    دقائق قليلة، فكرة جديدة، وأثر يبقى معك.
                  </Text>
                  <Button onPress={() => setTab(ar.learning)}>
                    استكشف مسارات التعلّم ←
                  </Button>
                </View>
                <Text style={s.previewNote}>
                  معاينة تجريبية · البيانات محفوظة في هذا المتصفح فقط
                </Text>
              </>
            )}

            {tab === ar.programs && (
              <Registrations content={content} user={user} />
            )}
            {tab === ar.learning && (
              <>
                <Text style={s.kicker}>مساحتك لتكبر</Text>
                <Text style={s.heroTitle}>مسارات التعلّم</Text>
                <View style={s.progressCard}>
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={s.progressOverline}>كل خطوة بتعمل فرق</Text>
                    <Text style={s.progressHeading}>
                      {completed ? "أثرُك عم يكبر!" : "جاهز لخطوتك التالية؟"}
                    </Text>
                    <Text style={s.progressMeta}>
                      {completed} من {journeys.length} مسارات مكتملة
                    </Text>
                    <View style={s.progressChip}>
                      <Icon name="flash" size={13} />
                      <Text style={s.progressChipText}>
                        {completed >= 3 ? "مستكشف" : "في بداية المغامرة"}
                      </Text>
                    </View>
                  </View>
                  <ProgressRing value={progress} />
                </View>
                {user.role === "pendingLeader" && (
                  <Text style={s.info}>
                    طلب المرشد بانتظار الموافقة. ستتاح مسارات المرشدين بعد
                    الاعتماد.
                  </Text>
                )}
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>اكتشف مسارك التالي</Text>
                  <Icon name="compass-outline" size={22} />
                </View>
                <Text style={s.body}>اقرأ فكرة، تأمّل فيها، وشارك أثرها.</Text>
                <ScrollView
                  ref={journeyRailRef}
                  onContentSizeChange={() =>
                    journeyRailRef.current?.scrollToEnd({
                      animated: false,
                    })
                  }
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.journeyRail}
                >
                  {journeys
                    .filter((j) => !profile.completed.includes(j.id))
                    .map((j) => (
                      <Pressable
                        accessibilityRole="button"
                        key={j.id}
                        onPress={() => openJourney(j)}
                        style={s.journeyTile}
                      >
                        <Photo path={j.image} style={s.journeyPhoto} />
                        <View style={s.journeyNumber}>
                          <Icon
                            name={
                              j.audience === "leaders"
                                ? "shield-checkmark"
                                : "book"
                            }
                            size={14}
                          />
                          <Text style={s.journeyTime}>
                            {j.audience === "leaders" ? "للمرشدين" : "٣ دقائق"}
                          </Text>
                        </View>
                        <View style={s.journeyTileBody}>
                          <Text style={s.title}>{j.title}</Text>
                          <Text style={s.body} numberOfLines={2}>
                            {j.text}
                          </Text>
                          <View style={s.journeyFooter}>
                            <Text style={s.journeyLink}>ابدأ المسار</Text>
                            <View style={s.smallBlackCircle}>
                              <Icon name="arrow-back" size={17} color="#fff" />
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                </ScrollView>
                {journeys.every((j) => profile.completed.includes(j.id)) && (
                  <Text style={s.info}>
                    أكملت جميع المسارات المتاحة. مغامرات جديدة بانتظارك قريبًا!
                  </Text>
                )}
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>مسارات أنجزتها</Text>
                  <Icon name="checkmark-circle-outline" size={22} />
                </View>
                {journeys
                  .filter((j) => profile.completed.includes(j.id))
                  .map((j) => (
                    <Pressable
                      accessibilityRole="button"
                      key={j.id}
                      onPress={() => openJourney(j)}
                      style={s.completedCard}
                    >
                      <Photo path={j.image} style={s.completedPhoto} />
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text style={s.title}>{j.title}</Text>
                        <Text style={s.completedLabel}>
                          أكملت هذا المسار · راجع تأمّلك
                        </Text>
                      </View>
                      <Icon name="checkmark-circle" size={24} color="#181818" />
                    </Pressable>
                  ))}
                {!completed && (
                  <View style={s.emptyLearning}>
                    <Icon name="flag-outline" size={30} color="#777" />
                    <Text style={s.body}>
                      أول إنجاز إلك، قريب. اختر مسارًا وابدأ!
                    </Text>
                  </View>
                )}
                <Text style={s.previewNote}>
                  معاينة تجريبية · البيانات محفوظة في هذا المتصفح فقط
                </Text>
              </>
            )}

            {tab === ar.ranking && (
              <>
                <Text style={s.kicker}>كل خطوة تستحق التقدير</Text>
                <Text style={s.heroTitle}>لوحة الإنجاز</Text>
                <Text style={s.body}>
                  مسار مكتمل = نقطة واحدة، بعد قراءة النص وحفظ تأمّلك. تكرار
                  الإكمال لا يضيف نقاطًا.
                </Text>
                <View style={s.callout}>
                  <Text style={s.score}>
                    {completedCount(profile.completed, content.journeys, user)}
                  </Text>
                  <Text style={s.title}>مساراتك المكتملة</Text>
                  <Text style={s.caption}>
                    {user.name} ·{" "}
                    {user.role === "approvedLeader" ? "مرشد معتمد" : "مشارك"}
                  </Text>
                </View>
                <Text style={s.sectionTitle}>
                  {user.role === "approvedLeader"
                    ? "ترتيب المرشدين"
                    : "ترتيب المشاركين"}
                </Text>
                <Text style={s.caption}>
                  عرض توضيحي: الأسماء الأخرى ونتائجها أمثلة، وليست حسابات
                  حقيقية. الترتيب حسب المسارات المكتملة، والمتعادلون لهم المرتبة
                  نفسها.
                </Text>
                {ranking.map((person, i) => (
                  <View key={person.name} style={s.rankRow}>
                    <Text style={s.rankName}>{person.name}</Text>
                    <Text style={s.rankPoints}>
                      {ranking.findIndex((p) => p.points === person.points) + 1}{" "}
                      # · {person.points} نقاط
                    </Text>
                  </View>
                ))}
                <Text style={s.info}>
                  سيُربط ترتيب المجتمع الفعلي بالحسابات وقاعدة البيانات.
                </Text>
              </>
            )}
            {tab === ar.account && (
              <>
                <View style={s.identityCard}>
                  <View style={s.identityIcon}>
                    <Icon name="person" size={38} />
                  </View>
                  <Text style={s.identityName}>{user.name}</Text>
                  <Text style={s.identityRole}>
                    {user.role === "approvedLeader"
                      ? "مرشد معتمد"
                      : user.role === "pendingLeader"
                        ? "مرشد بانتظار الموافقة"
                        : "مشارك في مجتمع سبارك"}
                  </Text>
                  <View style={s.identityStats}>
                    <Text style={s.identityStat}>
                      {completed} مسارات مكتملة
                    </Text>
                    <Icon name="sparkles" color="#ffda00" size={18} />
                    <Text style={s.identityStat}>{progress}% تقدّم</Text>
                  </View>
                </View>
                <View style={s.cardContent}>
                  <Text style={s.title}>معًا نصنع مخيمًا أجمل</Text>
                  <Text style={s.body}>
                    تعلّم وشارك باحترام. تعليقات المسارات تظهر للمسموح لهم
                    بقراءة المسار؛ تأمّلك الشخصي منفصل عنها.
                  </Text>
                  <Text style={s.info}>
                    في المعاينة: التأملات والتعليقات محلية. تسجيل الدخول الحقيقي
                    وحماية بياناتك سيُربطان بالخادم.
                  </Text>
                </View>
                <Button
                  secondary
                  onPress={() => {
                    setSelected(null);
                    updateProfile({
                      ...profile,
                      user: null,
                      completed: [],
                      reflections: {},
                    });
                  }}
                >
                  الخروج من المعاينة
                </Button>
              </>
            )}
          </ScrollView>
          <View style={s.tabDock}>
            <View style={s.tabs}>
              {[
                [ar.home, "home", "home-outline"],
                [ar.programs, "bonfire", "bonfire-outline"],
                [ar.learning, "book", "book-outline"],
                [ar.ranking, "trophy", "trophy-outline"],
                [ar.account, "person", "person-outline"],
              ].map(([label, filled, outline]) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{
                    selected: tab === label,
                  }}
                  key={label}
                  onPress={() => setTab(label)}
                  style={s.tab}
                >
                  <View style={[s.tabIconWrap, tab === label && s.tabSelected]}>
                    <Icon
                      name={tab === label ? filled : outline}
                      size={23}
                      color={tab === label ? "#111" : "#757575"}
                    />
                  </View>
                  <Text style={[s.tabText, tab === label && s.active]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}

      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <SafeAreaView style={s.root}>
          <View style={s.modalHeader}>
            <Button secondary onPress={() => setSelected(null)}>
              إغلاق ×
            </Button>
          </View>
          <ScrollView contentContainerStyle={s.content}>
            {selected?.type === "announcements" && (
              <>
                <Text style={s.heroTitle}>إعلانات سبارك</Text>
                {announcements.map((a) => (
                  <View key={a.id} style={s.card}>
                    <Photo path={a.image} />
                    <View style={s.cardContent}>
                      <Text style={s.title}>{a.title}</Text>
                      <Text style={s.body}>{a.text}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
            {journey && canAccessJourney(journey, user) && (
              <>
                <Photo path={journey.image} />
                <Text style={s.heroTitle}>{journey.title}</Text>
                <Text style={s.reading}>{journey.text}</Text>
                <Text style={s.sectionTitle}>لحظة تأمّل</Text>
                <Text style={s.body}>{journey.prompt}</Text>
                <TextInput
                  accessibilityLabel="تأمّلي الشخصي"
                  placeholder="اكتب تأمّلك الشخصي هنا…"
                  multiline
                  maxLength={2000}
                  value={reflection}
                  onChangeText={setReflection}
                  style={[s.input, s.textarea]}
                />
                <Text style={s.caption}>
                  تأمّل شخصي · لا يُنشر في التعليقات
                </Text>
                <Button disabled={!reflection.trim()} onPress={complete}>
                  {profile.completed.includes(journey.id)
                    ? "حفظ تأمّلي"
                    : "حفظ التأمّل وإكمال المسار"}
                </Button>
                {!!notice && (
                  <Text accessibilityRole="alert" style={s.info}>
                    {notice}
                  </Text>
                )}
                <Text style={s.sectionTitle}>نتعلّم من بعضنا</Text>
                <Text style={s.caption}>
                  التعليقات مشتركة مع جمهور هذا المسار عند ربط الخادم. لا تشارك
                  معلومات شخصية حساسة.
                </Text>
                {content.comments
                  .filter((c) => c.journeyId === journey.id)
                  .map((c) => (
                    <View key={c.id} style={s.comment}>
                      <Text style={s.label}>{c.author}</Text>
                      <Text style={s.body}>{c.text}</Text>
                    </View>
                  ))}
                <TextInput
                  accessibilityLabel="تعليق على المسار"
                  placeholder="شارك فكرة مع المجموعة…"
                  multiline
                  value={comment}
                  maxLength={500}
                  onChangeText={setComment}
                  style={[s.input, s.textarea]}
                />
                <Button
                  secondary
                  disabled={!comment.trim()}
                  onPress={postComment}
                >
                  نشر تعليق
                </Button>
              </>
            )}
            {selected?.type === "gallery" &&
              (() => {
                const g = content.galleries.find(
                  (x) => x.id === selected.id && x.published,
                );
                return g ? (
                  <>
                    <Text style={s.heroTitle}>{g.title}</Text>
                    <Text style={s.body}>{g.text}</Text>
                    {g.images.map((path, i) => (
                      <Photo
                        key={i}
                        path={path}
                        style={{
                          marginBottom: 16,
                          height: 240,
                        }}
                      />
                    ))}
                  </>
                ) : null;
              })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  identityCard: {
    backgroundColor: "#fff",
    borderRadius: 27,
    padding: 26,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 20,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  identityIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: "#FFF0AF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  identityName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#33332D",
  },
  identityRole: {
    fontSize: 12,
    color: "#9B958B",
    marginTop: 8,
  },
  identityStats: {
    flexDirection: "row-reverse",
    gap: 13,
    alignItems: "center",
    marginTop: 23,
    padding: 14,
    backgroundColor: "#F8F6F0",
    borderRadius: 15,
  },
  identityStat: {
    fontSize: 12,
    color: "#6F695D",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#ffda00",
  },
  brandGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 9,
  },
  logoImage: {
    width: 43,
    height: 43,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderRadius: 13,
  },
  wordmark: {
    fontSize: 23,
    fontWeight: "800",
    textAlign: "right",
    letterSpacing: 0.7,
  },
  notificationButton: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#FFF9DF",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    width: 7,
    height: 7,
    backgroundColor: "#EB7859",
    position: "absolute",
    top: 8,
    right: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFF9DF",
  },
  welcomeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  welcomeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#ECE8DC",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    height: 224,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#31332E",
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  heroPhoto: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroCategory: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "#FFF6D2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  heroCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#76621D",
  },
  heroCopy: {
    position: "absolute",
    bottom: 20,
    left: 19,
    right: 19,
  },
  heroHeading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    textAlign: "right",
    marginBottom: 5,
  },
  heroDescription: {
    fontSize: 11,
    lineHeight: 20,
    color: "#ECEAE3",
    textAlign: "right",
  },
  quickRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 15,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: "#fff",
    gap: 9,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  quickIcon: {
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#49463F",
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 25,
    marginBottom: 15,
  },
  liveBadge: {
    flexDirection: "row-reverse",
    gap: 5,
    alignItems: "center",
    paddingVertical: 5,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0B54E",
  },
  liveText: {
    fontSize: 11,
    color: "#999489",
  },
  activityCard: {
    width: 247,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#fff",
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  activityPhoto: {
    height: 133,
    borderRadius: 0,
  },
  activityBody: {
    padding: 16,
  },
  activityTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activityTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D87A53",
  },
  locationRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  galleryCard: {
    height: 188,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 12,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  galleryPhoto: {
    height: "100%",
    borderRadius: 0,
  },
  galleryCount: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,.45)",
    flexDirection: "row-reverse",
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  galleryCountText: {
    fontSize: 11,
    color: "#fff",
  },
  galleryCopy: {
    position: "absolute",
    bottom: 22,
    right: 20,
    left: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "right",
  },
  arrowCircle: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: "#FFDA00",
    alignItems: "center",
    justifyContent: "center",
  },
  blackCallout: {
    backgroundColor: "#247F78",
    padding: 23,
    borderRadius: 25,
    marginTop: 16,
  },
  yellowBadge: {
    alignSelf: "flex-end",
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#F8EBA5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  calloutTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#fff",
    textAlign: "right",
    marginBottom: 8,
  },
  calloutText: {
    fontSize: 12,
    lineHeight: 22,
    color: "#D4E6DF",
    textAlign: "right",
    marginBottom: 10,
  },
  previewNote: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
    marginTop: 28,
    lineHeight: 18,
  },
  tabDock: {
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 13,
    backgroundColor: "#F6F4EF",
  },
  tabIconWrap: {
    width: 43,
    height: 29,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSelected: {
    backgroundColor: "#FFF0AD",
  },
  progressCard: {
    backgroundColor: "#FFE078",
    padding: 22,
    borderRadius: 26,
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  progressOverline: {
    fontSize: 11,
    textAlign: "right",
    color: "#A28644",
    marginBottom: 7,
  },
  progressHeading: {
    fontSize: 23,
    fontWeight: "800",
    textAlign: "right",
    color: "#4C4022",
    lineHeight: 31,
  },
  progressMeta: {
    fontSize: 12,
    textAlign: "right",
    color: "#8D743B",
    marginTop: 8,
  },
  progressChip: {
    flexDirection: "row-reverse",
    gap: 4,
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,.5)",
    padding: 7,
    borderRadius: 8,
    marginTop: 10,
  },
  progressChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  ring: {
    width: 94,
    height: 94,
  },
  ringText: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111",
  },
  journeyRail: {
    flexDirection: "row-reverse",
    gap: 14,
    paddingBottom: 8,
  },
  journeyTile: {
    width: 244,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#fff",
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  journeyPhoto: {
    height: 142,
    borderRadius: 0,
  },
  journeyNumber: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFF7DE",
    padding: 7,
    borderRadius: 9,
    flexDirection: "row-reverse",
    gap: 4,
    alignItems: "center",
  },
  journeyTime: {
    fontSize: 10,
    fontWeight: "700",
    color: "#86723A",
  },
  journeyTileBody: {
    padding: 17,
  },
  journeyFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  journeyLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#191919",
  },
  smallBlackCircle: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: "#27877F",
    alignItems: "center",
    justifyContent: "center",
  },
  completedCard: {
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
    padding: 13,
    backgroundColor: "#fff",
    borderRadius: 21,
    marginBottom: 12,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  completedPhoto: {
    width: 64,
    height: 70,
    borderRadius: 12,
  },
  completedLabel: {
    fontSize: 10,
    color: "#777",
    textAlign: "right",
  },
  emptyLearning: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 23,
    alignItems: "center",
    gap: 12,
  },
  rankRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    padding: 18,
    backgroundColor: "#fff",
    borderRadius: 17,
    marginBottom: 8,
  },
  rankName: {
    fontSize: 14,
    color: "#222222",
  },
  rankPoints: {
    fontSize: 12,
    color: "#756316",
  },
  root: {
    flex: 1,
    backgroundColor: "#F6F4EF",
    width: "100%",
    height: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginHorizontal: "auto",
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#ECE9E1",
  },
  brand: {
    fontSize: 25,
    fontWeight: "900",
    textAlign: "right",
    color: "#101713",
  },
  tagline: {
    fontSize: 10,
    color: "#716E65",
    textAlign: "right",
    marginTop: 2,
  },
  pill: {
    backgroundColor: "#fff6bf",
    padding: 8,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 10,
    color: "#685900",
  },
  demo: {
    backgroundColor: "#f5f5ef",
    padding: 7,
  },
  demoText: {
    fontSize: 10,
    textAlign: "center",
    color: "#737568",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  kicker: {
    fontSize: 12,
    color: "#969084",
    textAlign: "right",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: "800",
    textAlign: "right",
    color: "#242421",
    marginBottom: 9,
    marginTop: 2,
  },
  body: {
    fontSize: 13,
    color: "#858179",
    lineHeight: 24,
    textAlign: "right",
    marginBottom: 10,
  },
  photo: {
    width: "100%",
    height: 190,
    borderRadius: 16,
    backgroundColor: "#e3ebe4",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e9ede7",
    borderRadius: 18,
    marginTop: 16,
    overflow: "hidden",
  },
  cardContent: {
    padding: 18,
    backgroundColor: "#fff",
    borderRadius: 22,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "right",
    color: "#33332E",
    marginBottom: 8,
  },
  badge: {
    fontSize: 11,
    color: "#7d6a16",
    textAlign: "right",
    marginBottom: 10,
  },
  dots: {
    flexDirection: "row-reverse",
    gap: 5,
    justifyContent: "center",
    marginTop: 11,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D7D3C9",
  },
  dotActive: {
    backgroundColor: "#E7BB19",
    width: 19,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "right",
    color: "#373631",
  },
  caption: {
    fontSize: 10,
    lineHeight: 19,
    color: "#A39D91",
    textAlign: "right",
    marginBottom: 8,
  },
  callout: {
    backgroundColor: "#FFE7A1",
    padding: 22,
    borderRadius: 25,
    marginTop: 20,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  button: {
    backgroundColor: "#FFDA00",
    padding: 15,
    borderRadius: 16,
    marginVertical: 8,
  },
  secondary: {
    backgroundColor: "#fff",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "#544A26",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E9E4D9",
    borderRadius: 16,
    padding: 15,
    textAlign: "right",
    fontSize: 15,
    color: "#454238",
    marginVertical: 10,
    backgroundColor: "#fff",
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 8,
    color: "#222222",
  },
  roles: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 10,
  },
  role: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E0D6",
    borderRadius: 13,
    backgroundColor: "#fff",
  },
  roleActive: {
    backgroundColor: "#FFF0A5",
    borderColor: "#ECD668",
  },
  small: {
    fontSize: 11,
  },
  tabs: {
    flexDirection: "row-reverse",
    paddingTop: 9,
    paddingBottom: 9,
    backgroundColor: "#fff",
    borderRadius: 25,
    boxShadow: "0px 3px 24px rgba(45, 37, 25, 0.07)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    minHeight: 54,
  },
  tabText: {
    fontSize: 10,
    color: "#AAA69D",
  },
  tabIcon: {
    fontSize: 24,
    color: "#7b847a",
  },
  active: {
    color: "#80670E",
    fontWeight: "800",
  },
  link: {
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#667a38",
  },
  info: {
    backgroundColor: "#EEECE4",
    padding: 15,
    textAlign: "right",
    fontSize: 12,
    color: "#817969",
    lineHeight: 23,
    marginVertical: 10,
    borderRadius: 17,
  },
  score: {
    fontSize: 58,
    fontWeight: "800",
    color: "#75602C",
    textAlign: "right",
    marginBottom: 10,
  },
  modalHeader: {
    paddingHorizontal: 20,
    alignItems: "flex-start",
    backgroundColor: "#F6F4EF",
  },
  reading: {
    fontSize: 18,
    lineHeight: 34,
    textAlign: "right",
    color: "#2f4336",
    marginTop: 14,
  },
  comment: {
    padding: 16,
    backgroundColor: "#f7f8f3",
    borderRadius: 12,
    marginTop: 12,
  },
  homeSummary: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 21,
    boxShadow: "0px 4px 18px rgba(52, 39, 22, 0.055)",
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFF3D9",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    color: "#3F3D36",
    marginBottom: 5,
  },
  summaryCopy: {
    fontSize: 10,
    color: "#A09B90",
    textAlign: "right",
  },
  homeRail: {
    flexDirection: "row-reverse",
    gap: 13,
    paddingBottom: 8,
  },
});
