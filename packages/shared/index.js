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
      title: "موعدنا تحت النجوم",
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
exports.defaultContent.schemaVersion = 2;
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
    title: "مخيم سبارك · تحت النجوم",
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
  return {
    ...c,
    schemaVersion: 2,
    activities: activities.map(exports.normalizeActivity),
  };
};
exports.ar.learning = "تعلّم";
