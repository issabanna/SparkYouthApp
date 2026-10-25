const leaderActivityId = '__leader_applications__',
  accountActivityId = '__accounts__';
const accountFields = [['englishFirstName', 'الاسم الأول بالإنجليزية'], ['englishFatherName', 'اسم الأب بالإنجليزية'], ['englishLastName', 'اسم العائلة بالإنجليزية']];
const leaderFields = [['city','مدينة السكن'],['phone','رقم الهاتف'],['nationalId','الرقم الوطني / رقم الهوية'],['maritalStatus', 'الحالة الاجتماعية'], ['education', 'التعليم'], ['employmentStatus', 'حالة العمل'], ['workplace', 'مكان العمل أو الدراسة'], ['church', 'اسم الكنيسة'], ['previousCamp', 'هل كنت في مخيم جلعاد من قبل؟']];
function validateAccountDetails(input) {
  const details = {};
  for (const [key] of accountFields) {
    if (typeof input?.[key] !== 'string' || !input[key].trim() || input[key].length > 200) throw Error('أكمل بيانات الحساب.');
    details[key] = input[key].trim();
  }
  if (!['male', 'female'].includes(input.gender)) throw Error('اختر الجنس.');
  return {...details,gender:input.gender};
}
const leaderChoices = {
  maritalStatus: ['أعزب / عزباء', 'متزوج / متزوجة', 'مطلق / مطلقة', 'أرمل / أرملة'],
  education: ['مدرسة', 'دبلوم', 'بكالوريوس', 'دراسات عليا'],
  employmentStatus: ['طالب / طالبة', 'يعمل / تعمل', 'لا يعمل / لا تعمل'],
  previousCamp: ['نعم', 'لا']
};
function validateLeaderDetails(input) {
  const details = {};
  for (const [key] of leaderFields) {
    if (typeof input?.[key] !== 'string' || !input[key].trim() || input[key].length > 500) throw Error('أكمل بيانات طلب الإرشاد.');
    details[key] = input[key].trim();
    if (leaderChoices[key] && !leaderChoices[key].includes(details[key])) throw Error('اختر إجابة من القائمة.');
  }
  if (!/^[A-Za-z0-9-]{4,30}$/.test(details.nationalId)) throw Error('أدخل الرقم الوطني أو رقم الهوية الصحيح.');
  if (!/^\d{10}$/.test(details.phone)) throw Error('أدخل رقم هاتف من 10 أرقام.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dob || '') || !Number.isFinite(Date.parse(input.dob)) || new Date(input.dob).toISOString().slice(0,10)!==input.dob || input.dob>new Date().toISOString().slice(0,10) || input.dob<'1900-01-01')throw Error('اختر تاريخ ميلاد صحيحًا.');
  return {...details,dob:input.dob};
}
function safeLinks(links) {
  return (Array.isArray(links) ? links : []).filter(l => typeof l?.title === 'string' && l.title.trim() && typeof l.url === 'string' && /^https:\/\//i.test(l.url) && (() => {
    try {
      const u = new URL(l.url);
      return !u.username && !u.password;
    } catch {
      return false;
    }
  })()).slice(0, 50).map(l => ({
    title: l.title.slice(0, 150),
    url: l.url.slice(0, 2000)
  }));
}
module.exports = {
  leaderActivityId,
  accountActivityId,
  accountFields,
  leaderFields,
  leaderChoices,
  validateAccountDetails,
  validateLeaderDetails,
  safeLinks
};
const campRoles = {
  manager: 'Manager',
  supportTeamHead: 'Support Team Head',
  teamHead: 'Team Head',
  supportTeam: 'Support Team',
  leader: 'Leader',
  office: 'Office'
};
function evaluationSections(role) {
  return role === 'manager' ? ['support', 'team', 'campers'] : role === 'supportTeamHead' ? ['support'] : role === 'teamHead' ? ['team'] : role === 'leader' ? ['campers'] : [];
}
function assignmentOf(record, activity) {
  return record?.status === 'LeaderApproved' ? (record.assignments || []).find(a => a.activityId === activity) : null;
}
module.exports.campRoles = campRoles;
module.exports.evaluationSections = evaluationSections;
module.exports.assignmentOf = assignmentOf;
const evaluationQuestions = {
  support: [['spiritual', 'التقييم الروحي خلال المخيم بالصلاة والخلوة'], ['positivity', 'الإيجابية والروح الجيدة مع الآخرين'], ['punctuality', 'الالتزام بالمواعيد والدقة'], ['tasks', 'تقييم أداء المهام الموكلة'], ['example', 'القيادة كمثال جيد'], ['overall', 'التقييم العام']],
  team: [['spiritual', 'التقييم الروحي خلال المخيم بالصلاة والخلوة'], ['positivity', 'الإيجابية والروح الجيدة مع الآخرين'], ['timeWithCampers', 'قضاء وقت مع المخيمين'], ['oneToOne', 'وقت شخصي مع المخيمين'], ['example', 'القيادة كمثال جيد'], ['love', 'إظهار الحب للمخيمين'], ['overall', 'التقييم العام']],
  campers: [['firstCamp', 'هل هذه أول مرة للمخيم في جلعاد؟', 'yesNo'], ['relationship', 'هل كان للمخيم علاقة شخصية مع الله قبل المخيم؟', 'yesNo'], ['churchCommitment', 'هل المخيم ملتزم بكنيسة من قبل؟', 'yesNo'], ['faithInvitation', 'هل قدمت دعوة صريحة للمخيم بأخذ خطوة الإيمان؟', 'yesNo'], ['churchInvitation', 'هل دعوت المخيم لكنيسة محلية معينة؟', 'yesNo'], ['response', 'التقييم العام لاستجابة المخيم لمحتوى المخيم'], ['rules', 'التقييم العام لالتزام المخيم بقوانين المخيم']]
};
const evaluationChoices = ['Exceptional – رائع', 'Good – جيد', 'Need improvement – بحاجة إلى تحسين', 'Poor – ضعيف'];
function choicesForQuestion(q) {
  return q[2] === 'yesNo' ? ['نعم', 'لا'] : evaluationChoices;
}
module.exports.choicesForQuestion = choicesForQuestion;
module.exports.evaluationQuestions = evaluationQuestions;
module.exports.evaluationChoices = evaluationChoices;
function evaluationYear(activity) {
  return /^\d{4}-/.test(activity?.date || '') ? Number(activity.date.slice(0, 4)) : Number(new Intl.DateTimeFormat('en', {
    year: 'numeric',
    timeZone: 'Asia/Amman'
  }).format(new Date()));
}
module.exports.evaluationYear = evaluationYear;
