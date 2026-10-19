import { dayKeyOf, dayKeyToStart } from "@/lib/day-key";

export const FESTIVALS = {
  "new-year": {
    dateRule: "公历 1 月 1 日",
    name: "元旦", seal: "新岁", title: "新年安好，万事有光",
    summary: "把旧年的故事轻轻收好，带着新的期待继续向前。元旦快乐。",
    letter: "愿新的一年有清晰的方向，也有从容走路的时间。愿你所读、所做、所爱，都慢慢长成喜欢的样子。",
    action: "留下新岁印记", response: "新岁已启，愿你所行有光。",
  },
  "mid-autumn": {
    dateRule: "农历八月十五",
    name: "中秋", seal: "望月", title: "今夜月明，见字如面",
    summary: "无论身在何处，愿今晚有一轮明月，也有一个可以问候的人。",
    letter: "给远方的人发一句问候，也给自己留一点闲暇。愿这轮月亮，照见你平凡而珍贵的日常。中秋快乐。",
    action: "留下望月印记", response: "月色收到了，愿你今夜安好。",
  },
  "national-day": {
    dateRule: "公历 10 月 1 日",
    name: "国庆", seal: "山河", title: "山河无恙，灯火长明",
    summary: "读几页喜欢的文字，走一段想走的路。祝你国庆快乐。",
    letter: "谢谢你在今天来到这里。愿我们所见的山河依旧辽阔，所走的路依旧有光，也愿每一个认真生活的人都能拥有安稳的日常。",
    action: "留下山河印记", response: "山河为证，愿日常安稳明亮。",
  },
  "spring-festival": {
    dateRule: "农历正月初一",
    name: "春节", seal: "迎春", title: "新岁启封，平安常伴",
    summary: "把旧年的故事好好收起，为新的一年留一页空白。新春快乐。",
    letter: "新的一年，不必急着成为更厉害的人。先照顾好自己，珍惜相聚的时刻，再慢慢完成那些想做的事。愿你新岁平安，万事顺意。",
    action: "留下迎春印记", response: "春已启程，愿新岁平安。",
  },
  "dragon-boat": {
    dateRule: "农历五月初五",
    name: "端午", seal: "端阳", title: "一叶清风，安康如常",
    summary: "愿艾草的清香掠过夏日，也愿你在忙碌之中留一点安静。端午安康。",
    letter: "一粽一念，一岁一安。愿你把日子过得有滋有味，也把平安和惦念放在每一个普通的清晨与傍晚。",
    action: "留下端阳印记", response: "端阳安康，愿清风常伴。",
  },
  "qingming": {
    dateRule: "清明节气，按年度日期表",
    name: "清明", seal: "追远", title: "慎终追远，清明自持",
    summary: "把思念放在春风里，也把脚下的路走得更稳、更清醒。",
    letter: "愿记忆有安放之处，愿来路值得回望，愿我们在春天里珍惜眼前，也不忘那些塑造了今天的名字与故事。",
    action: null, response: "",
  },
  "lantern-festival": {
    dateRule: "农历正月十五",
    name: "元宵", seal: "上元", title: "灯火可亲，春意渐近",
    summary: "一盏灯，一碗圆，愿平常日子也有值得珍惜的团圆。",
    letter: "愿你在新春的灯火里，与所念之人相聚，也为自己留一份温柔。",
    action: "留下上元印记", response: "灯火映心，愿你安好。",
  },
  "womens-day": {
    dateRule: "公历 3 月 8 日",
    name: "妇女节", seal: "自成", title: "愿每一种选择都被尊重",
    summary: "致敬女性的经验、创造与力量，也尊重每个人成为自己的权利。",
    letter: "愿你不被单一的期待定义，拥有选择生活、表达想法和奔赴所爱的自由。",
    action: null, response: "",
  },
  "arbor-day": {
    dateRule: "公历 3 月 12 日",
    name: "植树节", seal: "新绿", title: "种下此刻，静待来日",
    summary: "一株新绿需要时间，也提醒我们耐心照料正在生长的事物。",
    letter: "愿每一次认真对待土地与生活的行动，都能在未来长成荫凉。",
    action: null, response: "",
  },
  "labor-day": {
    dateRule: "公历 5 月 1 日",
    name: "劳动节", seal: "致勤", title: "致每一份认真生活",
    summary: "愿劳动被看见，付出得到尊重，也愿你拥有休息的时间。",
    letter: "无论此刻仍在岗位，还是终于可以停下脚步，都祝你平安、从容。",
    action: null, response: "",
  },
  "youth-day": {
    dateRule: "公历 5 月 4 日",
    name: "青年节", seal: "向新", title: "把好奇带去更远的地方",
    summary: "愿年轻不只是年龄，也是一份继续探索和认真行动的勇气。",
    letter: "不必急着抵达答案。带着问题向前走，沿途的积累自会成为方向。",
    action: null, response: "",
  },
  "mothers-day": {
    dateRule: "公历 5 月第二个星期日",
    name: "母亲节", seal: "念恩", title: "把感谢说给重要的人",
    summary: "一份真诚的问候，常常胜过被安排好的仪式。",
    letter: "愿你有机会表达惦念，也记得把关心留给自己。",
    action: null, response: "",
  },
  "wenchuan-remembrance": {
    dateRule: "公历 5 月 12 日",
    name: "汶川地震纪念日", seal: "铭记", title: "记住逝者，致敬重生",
    summary: "铭记 2008 年汶川地震中的遇难者，向救援者与灾后重建中的人们致意。",
    letter: "愿逝者安息，生者坚韧。铭记灾难，是为了珍惜生命、守望相助，并不断提升面对灾害的准备。",
    action: null, response: "",
  },
  "childrens-day": {
    dateRule: "公历 6 月 1 日",
    name: "儿童节", seal: "童心", title: "愿每个孩子被认真倾听",
    summary: "愿孩子们在安全、尊重与关爱中长大，也保有探索世界的好奇。",
    letter: "今天也可以读一本童年喜欢的书，记起好奇心曾怎样照亮日常。",
    action: null, response: "",
  },
  "party-anniversary": {
    dateRule: "公历 7 月 1 日",
    name: "建党纪念日", seal: "初心", title: "回望历史，珍视来路",
    summary: "以平实的文字回望历史脉络，尊重事实与不同年代的具体记忆。",
    letter: "理解历史需要时间、材料与审慎。愿每一次回望都建立在可靠记录之上。",
    action: null, response: "",
  },
  "army-day": {
    dateRule: "公历 8 月 1 日",
    name: "建军节", seal: "致敬", title: "致敬守护与担当",
    summary: "向承担守护职责的人们致意，铭记和平生活的珍贵。",
    letter: "愿和平常在，愿每一份守护都被理解与尊重。",
    action: null, response: "",
  },
  "september-eighteenth": {
    dateRule: "公历 9 月 18 日",
    name: "九一八纪念日", seal: "勿忘", title: "铭记历史，珍爱和平",
    summary: "铭记 1931 年九一八事变与此后民族苦难，以史为鉴，珍视和平。",
    letter: "铭记历史不是延续仇恨，而是尊重事实、悼念苦难，并共同守护来之不易的和平。",
    action: null, response: "",
  },
  "national-memorial-day": {
    dateRule: "公历 12 月 13 日",
    name: "国家公祭日", seal: "国殇", title: "悼念死难者，守望和平",
    summary: "悼念南京大屠杀死难者及所有战争中的无辜遇难者，铭记历史，珍爱和平。",
    letter: "面对苦难，保持记忆与对事实的尊重。愿悲剧不再重演，愿和平成为共同守护的日常。",
    action: null, response: "",
  },
  "fathers-day": {
    dateRule: "公历 6 月第三个星期日",
    name: "父亲节", seal: "念亲", title: "把感谢说给重要的人",
    summary: "愿那些不常说出口的牵挂，也有机会被认真听见。",
    letter: "一通电话、一顿饭，或一句简单的谢谢，都可以成为表达惦念的方式。愿家人平安，也愿每一份沉默的付出被看见。",
    action: null, response: "",
  },
} as const;

export type FestivalId = keyof typeof FESTIVALS;

// 清明是节气，不是固定公历日；日期需按年度历法核验后维护。
// 当前表覆盖未来三年的节日日期，扩展前应重新核对来源。
const QINGMING_DAYS: Readonly<Record<number, string>> = {
  2026: "2026-04-05",
  2027: "2027-04-05",
  2028: "2028-04-04",
  2029: "2029-04-04",
  2030: "2030-04-05",
};

export const MONOCHROME_FESTIVALS: ReadonlySet<FestivalId> = new Set([
  "qingming",
  "wenchuan-remembrance",
  "september-eighteenth",
  "national-memorial-day",
]);

// 节日当日显示，不等同于法定假期。重合时按此顺序并列，不覆盖另一节日。
export function getFestivalsForDay(day: string): FestivalId[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const date = dayKeyToStart(day);
  if (!Number.isFinite(date.getTime()) || dayKeyOf(date) !== day) return [];
  const result: FestivalId[] = [];
  const fixedDays: Readonly<Record<string, FestivalId>> = {
    "-01-01": "new-year",
    "-03-08": "womens-day",
    "-03-12": "arbor-day",
    "-05-01": "labor-day",
    "-05-04": "youth-day",
    "-05-12": "wenchuan-remembrance",
    "-06-01": "childrens-day",
    "-07-01": "party-anniversary",
    "-08-01": "army-day",
    "-09-18": "september-eighteenth",
    "-12-13": "national-memorial-day",
    "-10-01": "national-day",
  };
  const fixedFestival = fixedDays[day.slice(4)];
  if (fixedFestival) result.push(fixedFestival);
  if (QINGMING_DAYS[Number(day.slice(0, 4))] === day) result.push("qingming");
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-chinese", {
      calendar: "chinese", timeZone: "Asia/Shanghai", month: "numeric", day: "numeric",
    });
    if (formatter.resolvedOptions().calendar !== "chinese") return result;
    const parts = formatter.formatToParts(date);
    const month = parts.find((p) => p.type === "month")?.value;
    const lunarDay = parts.find((p) => p.type === "day")?.value;
    // 精确匹配普通月份，闰月（如 8bis）不作为节日。
    if (month === "8" && lunarDay === "15") result.push("mid-autumn");
    if (month === "1" && lunarDay === "1") result.push("spring-festival");
    if (month === "5" && lunarDay === "5") result.push("dragon-boat");
    if (month === "1" && lunarDay === "15") result.push("lantern-festival");
  } catch {
    // 缺少农历 ICU 支持时只显示公历节日，不猜日期。
  }
  const [year, monthNumber, dayOfMonth] = day.split("-").map(Number);
  if (monthNumber === 5 && dayOfMonth >= 8 && dayOfMonth <= 14) {
    const dateWeekday = new Date(Date.UTC(year, monthNumber - 1, dayOfMonth)).getUTCDay();
    if (dateWeekday === 0) result.push("mothers-day");
  }
  if (monthNumber === 6 && dayOfMonth >= 15 && dayOfMonth <= 21) {
    const dateWeekday = new Date(Date.UTC(year, monthNumber - 1, dayOfMonth)).getUTCDay();
    if (dateWeekday === 0) result.push("fathers-day");
  }
  return result;
}
