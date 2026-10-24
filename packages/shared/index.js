exports.ar = {
  brand: "سبارك",
  account: "حسابي",
  home: "الرئيسية",
  programs: "الأنشطة",
  learning: "تعلّم",
  ranking: "الترتيب",
};
exports.storageKey = "spark-camp-content-v1";
exports.defaultContent = {
  announcements: [
    {
      id: "a1",
      title: "أخبار المخيم والتسجيل",
      text: "مغامرة جديدة، أصدقاء جدد، وذكريات تبقى معنا. تابع أخبار المخيم هنا.",
      image: "/media/camp.png",
      published: true,
    },
    {
      id: "a2",
      title: "خطوة صغيرة، أثر كبير",
      text: "ابدأ مسار تعلّم قصير، وخذ معك فكرة تطبّقها في المخيم.",
      image: "/media/trail.png",
      published: true,
    },
  ],
  activities: [
    {
      id: "e1",
      title: "يوم المغامرة والعمل الجماعي",
      text: "ألعاب تعاونية، مسار في الطبيعة، وجلسة مشاركة مع المرشدين.",
      date: "",
      location: "مكان النشاط يُعلن قريبًا",
      image: "/media/camp.png",
      published: true,
    },
  ],
  galleries: [
    {
      id: "g1",
      title: "لحظات من روح المخيم",
      text: "صور توضيحية تجريبية؛ استبدلها بصور مجتمع سبارك.",
      images: ["/media/camp.png", "/media/trail.png", "/media/team.png"],
      published: true,
    },
  ],
  journeys: [
    {
      id: "j1",
      title: "لا نترك أحدًا خلفنا",
      text: "في المسار، لا تقاس قوة الفريق بسرعة أوله، بل بوصول الجميع. التفت حولك اليوم: ربما يحتاج صديق إلى تشجيع، أو إلى شخص يمشي بجانبه. المبادرة الصغيرة قد تغيّر تجربة شخص كاملًا.",
      prompt:
        "متى ساعدك أحد على الاستمرار؟ وما الخطوة التي ستقدّمها لصديق اليوم؟",
      image: "/media/trail.png",
      audience: "campers",
      published: true,
    },
    {
      id: "j2",
      title: "نترك المكان أجمل",
      text: "الطبيعة بيتنا المشترك. اجمع ما أحضرته، واحترم النباتات، ودع الهدوء مساحة للجميع. العناية بالمكان ليست مهمة شخص واحد؛ إنها عادة نصنعها معًا.",
      prompt: "اختر عادة واحدة ستحافظ عليها في رحلتك القادمة. لماذا اخترتها؟",
      image: "/media/camp.png",
      audience: "campers",
      published: true,
    },
    {
      id: "j3",
      title: "القيادة تبدأ بالإنصات",
      text: "قبل أن تعطي الحل، امنح المشارك فرصة ليشرح شعوره. اسأل سؤالًا مفتوحًا، واستمع دون مقاطعة، ثم اتفقا على خطوة واضحة. المرشد الجيد يصنع مساحة يشعر فيها الجميع بالأمان والاحترام.",
      prompt: "كيف ستتعامل مع مشارك يفضّل الانعزال عن مجموعته؟",
      image: "/media/team.png",
      audience: "leaders",
      published: true,
    },
  ],
  comments: [],
};
exports.canAccessJourney = (journey, user) =>
  !!user &&
  journey.published &&
  (journey.audience === "campers" || user.role === "approvedLeader");
exports.completedCount = (ids, journeys, user) =>
  new Set(
    ids.filter((id) =>
      journeys.some((j) => j.id === id && exports.canAccessJourney(j, user)),
    ),
  ).size;

exports.sampleProgress = [
  { name: "مريم · مثال", role: "camper", completed: ["j1", "j2"] },
  { name: "آدم · مثال", role: "camper", completed: ["j1"] },
  { name: "ريم · مثال", role: "approvedLeader", completed: ["j1", "j2", "j3"] },
  { name: "نور · مثال", role: "approvedLeader", completed: ["j1", "j3"] },
];

Object.assign(exports, require("./registrations"));
exports.contentVersion = 4;
exports.defaultContent.schemaVersion = exports.contentVersion;
Object.assign(exports.defaultContent.activities[0], {
  kind: "event",
  capacity: 40,
  seatsTaken: 0,
  minAge: 12,
  maxAge: 25,
  registrationOpen: true,
  allowWaitlist: true,
});
exports.defaultContent.activities.push(
  {
    id: "camp-demo",
    title: "مخيم الشبيبة",
    text: "أيام من التخييم والمغامرة والتعاون، مع مساحة للنمو وتكوين صداقات جديدة.",
    date: "",
    location: "موقع المخيم يُعلن قريبًا",
    image: "/media/camp.png",
    kind: "camp",
    capacity: 60,
    seatsTaken: 0,
    minAge: 12,
    maxAge: 18,
    registrationOpen: true,
    allowWaitlist: true,
    published: true,
  },
  {
    id: "trip-demo",
    title: "رحلة مسار الطبيعة",
    text: "يوم في الطبيعة، مسار مشي مع المجموعة، وأنشطة نتعلم فيها العمل كفريق.",
    date: "",
    location: "نقطة الانطلاق تُعلن قريبًا",
    image: "/media/trail.png",
    kind: "trip",
    capacity: 20,
    seatsTaken: 20,
    minAge: 12,
    maxAge: 25,
    registrationOpen: true,
    allowWaitlist: true,
    published: true,
  },
);
exports.campTemplates = [
  {
    id: "spark-kids",
    title: "مخيم الأطفال · الصفوف 3–5",
    brandTitle: "KIDS",
    brandColor: "#5149ae",
    gradeLabel: "الصفوف 3–5",
    allowedGrades: ["الثالث", "الرابع", "الخامس"],
  },
  {
    id: "spark-explorers",
    title: "مخيم الأطفال · الصفان 6–7",
    brandTitle: "KIDS",
    brandColor: "#6560b9",
    gradeLabel: "الصفان 6–7",
    allowedGrades: ["السادس", "السابع"],
  },
  {
    id: "spark-youth",
    title: "مخيم الشبيبة · الصفان 8–9",
    brandTitle: "YOUTH",
    brandColor: "#863b43",
    gradeLabel: "الصفان 8–9",
    allowedGrades: ["الثامن", "التاسع"],
  },
  {
    id: "spark-youth-plus",
    title: "مخيم الشبيبة · الصفان 10–11",
    brandTitle: "YOUTH",
    brandColor: "#71313a",
    gradeLabel: "الصفان 10–11",
    allowedGrades: ["العاشر", "الحادي عشر"],
  },
  {
    id: "spark-seniors",
    title: "مخيم الشبيبة · الصف 12+",
    brandTitle: "YOUTH",
    brandColor: "#632a36",
    gradeLabel: "الصف 12 وما بعده",
    allowedGrades: ["الثاني عشر", "الثاني عشر+", "جامعي"],
    dobMin: "2008-01-01",
    dobMax: "2009-12-31",
    birthYearLabel: "مواليد 2008–2009",
  },
  {
    id: "spark-sport",
    title: "المخيم الرياضي",
    brandTitle: "SPORT",
    brandColor: "#08683d",
    gradeLabel: "الصفوف 9–12+",
    allowedGrades: [
      "التاسع",
      "العاشر",
      "الحادي عشر",
      "الثاني عشر",
      "الثاني عشر+",
      "جامعي",
    ],
    dobMin: "2008-01-01",
    dobMax: "2012-12-31",
    birthYearLabel: "مواليد 2008–2012",
  },
].map((a) => ({
  ...a,
  text: "ألعاب وتحديات ومغامرات نصنع فيها صداقات وذكريات جديدة. المواعيد والتفاصيل النهائية تحددها الإدارة.",
  kind: "camp",
  image: a.id === "spark-sport" ? "/media/trail.png" : "/media/camp.png",
  published: true,
  inactive: true,
  registrationMode: "closed",
  useAgeLimits: false,
  capacity: 140,
  seatsTaken: 0,
  minAge: 1,
  maxAge: 99,
  date: "",
  startDate: "",
  endDate: "",
  location: "تحدده الإدارة",
  tentsEnabled: true,
  fees: 0,
  allowWaitlist: true,
}));
exports.defaultContent.activities.push(...exports.campTemplates);
exports.normalizeContent = (value) => {
  const c = { ...exports.defaultContent, ...value };
  let activities = c.activities || [];
  if (!value?.schemaVersion)
    activities = [
      ...activities,
      ...exports.defaultContent.activities.filter(
        (a) => a.id !== "e1" && !activities.some((x) => x.id === a.id),
      ),
    ];
  if ((value?.schemaVersion || 0) < 3)
    activities = [
      ...activities,
      ...exports.campTemplates.filter(
        (a) => !activities.some((x) => x.id === a.id),
      ),
    ];
  return {
    ...c,
    schemaVersion: exports.contentVersion,
    announcements: (c.announcements || []).map((a) =>
      a.id === "a1" && a.title === "موعدنا تحت النجوم"
        ? { ...a, title: "أخبار المخيم والتسجيل" }
        : a,
    ),
    activities: activities.map((a) => {
      const oldNames = {
        "camp-demo": "مخيم سبارك · تحت النجوم",
        "spark-kids": "سبارك الصغار",
        "spark-explorers": "سبارك المستكشفين",
        "spark-youth": "سبارك الشباب",
        "spark-youth-plus": "سبارك التحدّي",
        "spark-seniors": "سبارك القادة",
        "spark-sport": "سبارك الرياضي",
      };
      const current = exports.defaultContent.activities.find(
        (x) => x.id === a.id,
      );
      return exports.normalizeActivity(
        a.title === oldNames[a.id] && current
          ? {
              ...a,
              title: current.title,
              ...(current.brandTitle &&
              ["EXPLORE", "CHALLENGE", "LEAD"].includes(a.brandTitle)
                ? { brandTitle: current.brandTitle }
                : {}),
            }
          : a,
      );
    }),
  };
};

exports.displayRange = (text) =>
  (text || "").replace(
    /\d+(?:[–-]\d+)?\+?/g,
    (value) => "\u2066" + value + "\u2069",
  );
