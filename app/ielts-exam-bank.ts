import { ADDITIONAL_LISTENING_MOCKS } from "./additional-listening-mocks.ts";

export type ListeningQuestionKind = "gap" | "choice";

export interface ListeningExamQuestion {
  number: number;
  kind: ListeningQuestionKind;
  prompt: string;
  options?: string[];
  answers: string[];
  explanation: string;
}

export interface ListeningTurn {
  speaker: string;
  accent: "en-GB" | "en-AU" | "en-US" | "en-IN";
  text: string;
}

export interface ListeningExamSection {
  part: 1 | 2 | 3 | 4;
  title: string;
  context: string;
  instruction: string;
  turns: ListeningTurn[];
  questions: ListeningExamQuestion[];
}

export interface ListeningMock {
  id: string;
  title: string;
  level: string;
  sections: ListeningExamSection[];
}

const gap = (
  number: number,
  prompt: string,
  answer: string | string[],
  explanation: string,
): ListeningExamQuestion => ({
  number,
  kind: "gap",
  prompt,
  answers: Array.isArray(answer) ? answer : [answer],
  explanation,
});

const choice = (
  number: number,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string,
): ListeningExamQuestion => ({
  number,
  kind: "choice",
  prompt,
  options,
  answers: [answer],
  explanation,
});

const CORE_LISTENING_MOCKS: ListeningMock[] = [
  {
    id: "mock-a",
    title: "Mock A · 城市生活与学习",
    level: "6.5–7.0 标准",
    sections: [
      {
        part: 1,
        title: "短期住宿预订",
        context: "两人对话 · 日常社会场景",
        instruction: "Questions 1–10 · Complete the form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
        turns: [
          { speaker: "Agent", accent: "en-GB", text: "Good morning, Harbourside Accommodation. How can I help?" },
          { speaker: "Caller", accent: "en-AU", text: "Hello. I need a room while I attend a training course in Bristol next month. The course begins on the twelfth of September, but I would like to arrive on the tenth." },
          { speaker: "Agent", accent: "en-GB", text: "Certainly. And how long will you stay?" },
          { speaker: "Caller", accent: "en-AU", text: "Fourteen nights. My name is Daniel Mercer. Mercer is spelled M E R C E R." },
          { speaker: "Agent", accent: "en-GB", text: "Thank you. Would you prefer a single room or a studio?" },
          { speaker: "Caller", accent: "en-AU", text: "A single room is fine, but I need a private bathroom. I do not mind sharing a kitchen." },
          { speaker: "Agent", accent: "en-GB", text: "We have one in Clifton House at eighty-six pounds per night, including breakfast. There is a cheaper room in Park Lodge, but breakfast costs extra." },
          { speaker: "Caller", accent: "en-AU", text: "Clifton House sounds better. Is it close to the training centre?" },
          { speaker: "Agent", accent: "en-GB", text: "It is a twelve-minute walk. The number eight bus also stops opposite the building. Do you have any special requirements?" },
          { speaker: "Caller", accent: "en-AU", text: "I am allergic to feathers, so the pillows must be synthetic. I would also like a room away from the lift if possible." },
          { speaker: "Agent", accent: "en-GB", text: "I have noted synthetic pillows and a quiet room. We ask for a deposit of one hundred and twenty pounds. The balance is due when you arrive." },
          { speaker: "Caller", accent: "en-AU", text: "That is fine. Can I pay the deposit by debit card?" },
          { speaker: "Agent", accent: "en-GB", text: "Yes. Before we take payment, may I have your email address?" },
          { speaker: "Caller", accent: "en-AU", text: "It is d dot mercer at northmail dot com. And my mobile ends in seven four nine two." },
          { speaker: "Agent", accent: "en-GB", text: "Perfect. I will email the confirmation and directions this afternoon." },
        ],
        questions: [
          gap(1, "Arrival date: 10 ______", "September", "来电者明确说在课程开始前，于10 September抵达。"),
          gap(2, "Length of stay: ______ nights", "14", "住宿时长为fourteen nights。"),
          gap(3, "Family name: Daniel ______", "Mercer", "姓名拼写为M-E-R-C-E-R。"),
          gap(4, "Room: single room with a private ______", "bathroom", "需要private bathroom，可共用厨房。"),
          gap(5, "Building selected: ______ House", "Clifton", "来电者选择了Clifton House。"),
          gap(6, "Price per night: £______", "86", "Clifton House每晚86英镑，含早餐。"),
          gap(7, "Bus number: ______", "8", "number eight bus在楼对面停靠。"),
          gap(8, "Pillows must be ______", "synthetic", "因羽毛过敏，枕头必须是synthetic。"),
          gap(9, "Deposit: £______", "120", "订金为120英镑。"),
          gap(10, "Mobile number ends in: ______", "7492", "手机尾号为7492。"),
        ],
      },
      {
        part: 2,
        title: "就业技能中心介绍",
        context: "单人讲话 · 日常社会场景",
        instruction: "Questions 11–20 · Choose the correct answer, A, B or C.",
        turns: [
          { speaker: "Guide", accent: "en-GB", text: "Welcome to Eastbank Skills Centre. Before the tour begins, I will explain how the building works and which services require advance booking. The reception desk directly ahead is open from eight thirty until six on weekdays. It closes at four on Saturdays, and the whole centre is closed on Sundays." },
          { speaker: "Guide", accent: "en-GB", text: "To your left is the careers library. You may browse job advertisements without an appointment, but a staff member must issue a card before you borrow books. The computers beside the windows are for preparing applications. Please save documents to your own online account because files are removed every evening." },
          { speaker: "Guide", accent: "en-GB", text: "Interview practice takes place upstairs in Rooms Twelve and Thirteen. These sessions were previously free, but from this month there is a five-pound booking fee. It is refunded when you attend. The fee was introduced because too many people reserved a place and then failed to arrive." },
          { speaker: "Guide", accent: "en-GB", text: "On the ground floor, the workshop room runs short courses. Monday's course covers CV structure, Wednesday focuses on online applications, and Friday is about workplace communication. The Wednesday class is currently full, although names can be added to a waiting list." },
          { speaker: "Guide", accent: "en-GB", text: "Behind reception is the quiet room. It is not a study space; it is available for private phone interviews with employers. Reserve it for up to forty-five minutes. Food is not allowed, but water in a closed bottle is fine." },
          { speaker: "Guide", accent: "en-GB", text: "Finally, advisers offer individual appointments on Tuesday and Thursday afternoons. Bring a current CV if you have one. If you need to cancel, do so by midday on the previous working day, otherwise you may have to wait two weeks before booking again. We will now begin the tour in the careers library." },
        ],
        questions: [
          choice(11, "When does reception close on Saturday?", ["4:00 p.m.", "6:00 p.m.", "It is closed all day."], "4:00 p.m.", "周六reception在4点关闭。"),
          choice(12, "What must visitors obtain before borrowing books?", ["an appointment", "a centre card", "a reference letter"], "a centre card", "借书前需由工作人员签发card。"),
          choice(13, "Why should computer files be saved online?", ["Printing is unavailable.", "The computers are shared with employers.", "Local files are deleted daily."], "Local files are deleted daily.", "电脑中的文件每晚都会删除。"),
          choice(14, "Why was a fee introduced for interview practice?", ["Tutors requested higher pay.", "Many bookings were not used.", "New equipment was purchased."], "Many bookings were not used.", "原因是预约后缺席的人太多。"),
          choice(15, "When is the online application course?", ["Monday", "Wednesday", "Friday"], "Wednesday", "Wednesday课程主题是online applications。"),
          choice(16, "What can people currently do about the full course?", ["join a waiting list", "watch it online", "attend without booking"], "join a waiting list", "满员后可加入waiting list。"),
          choice(17, "What is the quiet room mainly used for?", ["silent study", "private employer calls", "small group meetings"], "private employer calls", "quiet room用于与雇主进行私人电话面试。"),
          choice(18, "How long can the quiet room be booked?", ["30 minutes", "45 minutes", "60 minutes"], "45 minutes", "每次最多45分钟。"),
          choice(19, "Individual advisers are available on", ["two weekday afternoons", "every weekday morning", "Saturday only"], "two weekday afternoons", "个人咨询安排在周二和周四下午。"),
          choice(20, "What should clients bring to an adviser appointment?", ["a current CV", "proof of income", "a course certificate"], "a current CV", "讲话者要求有的话带current CV。"),
        ],
      },
      {
        part: 3,
        title: "公共交通研究项目",
        context: "三人讨论 · 教育培训场景",
        instruction: "Questions 21–30 · Choose the correct answer, A, B or C.",
        turns: [
          { speaker: "Tutor", accent: "en-GB", text: "Mina and Leo, I have read your proposal on commuting habits. The topic is useful, but your original plan to survey everyone at the central station is too broad." },
          { speaker: "Mina", accent: "en-US", text: "We thought a large sample would make the results more reliable." },
          { speaker: "Tutor", accent: "en-GB", text: "Size helps only when the sample represents the population you are studying. People at the central station are mainly rail passengers. You said you wanted to compare bus, bicycle and car users as well." },
          { speaker: "Leo", accent: "en-AU", text: "So we could survey at three locations: the station, the business park and the university entrance." },
          { speaker: "Tutor", accent: "en-GB", text: "That would be better. Use the same two time periods at each place. Morning rush hour is essential, but do not collect data in the evening because poor light makes it harder to approach cyclists safely. Try lunchtime instead." },
          { speaker: "Mina", accent: "en-US", text: "Our questionnaire currently has twenty-four questions. Is that too many?" },
          { speaker: "Tutor", accent: "en-GB", text: "For a street survey, yes. Keep the journey length, main reason for choosing the transport mode, and satisfaction rating. Remove the detailed questions about household income. They are sensitive and not central to your research question." },
          { speaker: "Leo", accent: "en-AU", text: "We also planned an open question about what would make people change how they travel." },
          { speaker: "Tutor", accent: "en-GB", text: "Keep that. It may reveal factors you have not predicted, although you will need a clear system for coding the answers. Test the revised survey on ten volunteers before fieldwork." },
          { speaker: "Mina", accent: "en-US", text: "I can organise the pilot. Leo is stronger with statistics, so he can prepare the spreadsheet." },
          { speaker: "Leo", accent: "en-AU", text: "And perhaps Mina should lead the interviews because she has done customer research at work." },
          { speaker: "Tutor", accent: "en-GB", text: "That division is sensible, but both of you should interview some participants so that one person's style does not influence every response. Record refusals as well as completed surveys." },
          { speaker: "Mina", accent: "en-US", text: "For the final report, should we compare our results with the city council's travel data?" },
          { speaker: "Tutor", accent: "en-GB", text: "Yes, but note that its latest dataset is three years old. Use it for context, not as proof that your sample is correct. Your strongest evidence will be the pattern across your three sites." },
          { speaker: "Leo", accent: "en-AU", text: "We will revise the proposal tonight and send it tomorrow morning." },
        ],
        questions: [
          choice(21, "What is the tutor's main criticism of the original sample?", ["It is too small.", "It favours one type of traveller.", "It includes too many age groups."], "It favours one type of traveller.", "中心车站样本主要是铁路乘客，不能代表其他通勤方式。"),
          choice(22, "Which additional locations do the students suggest?", ["a hospital and a shopping centre", "a business park and a university", "two suburban stations"], "a business park and a university", "学生提出business park和university entrance。"),
          choice(23, "Which two survey periods does the tutor recommend?", ["morning and lunchtime", "lunchtime and evening", "morning and evening"], "morning and lunchtime", "导师认为早高峰必要，并以午餐时间代替晚上。"),
          choice(24, "Why should the income questions be removed?", ["People cannot estimate income.", "They require complex analysis.", "They are sensitive and not essential."], "They are sensitive and not essential.", "收入问题敏感且不是研究核心。"),
          choice(25, "What does the tutor say about the open question?", ["It may produce unexpected factors.", "It should replace the satisfaction rating.", "It will be easy to analyse."], "It may produce unexpected factors.", "开放题可能发现未预料的因素。"),
          choice(26, "How many people should take the pilot survey?", ["5", "10", "24"], "10", "导师要求先在10名志愿者中测试。"),
          choice(27, "What will Leo prepare?", ["the interview schedule", "the data spreadsheet", "the participant information sheet"], "the data spreadsheet", "Leo擅长统计，将准备spreadsheet。"),
          choice(28, "Why must both students conduct interviews?", ["to finish more quickly", "to reduce the effect of interviewer style", "to meet a course rule"], "to reduce the effect of interviewer style", "避免单一采访者风格影响全部回答。"),
          choice(29, "How should the council data be used?", ["as background context", "to replace missing surveys", "to prove the sample is accurate"], "as background context", "数据已有三年，只适合作背景。"),
          choice(30, "What will provide the strongest evidence?", ["the number of refusals", "the council dataset", "patterns across the three sites"], "patterns across the three sites", "三个地点之间的共同模式最有说服力。"),
        ],
      },
      {
        part: 4,
        title: "城市热岛与降温设计",
        context: "学术独白 · 教育培训场景",
        instruction: "Questions 31–40 · Complete the notes. Write ONE WORD AND/OR A NUMBER.",
        turns: [
          { speaker: "Lecturer", accent: "en-AU", text: "Today we will examine the urban heat island effect and three practical responses. Cities are often warmer than surrounding rural areas because dark roofs and roads absorb solar energy during the day and release it slowly after sunset. Heat is also produced by vehicles, cooling systems and industry. The largest temperature difference is usually measured at night, when open countryside cools more rapidly." },
          { speaker: "Lecturer", accent: "en-AU", text: "The first response is increasing tree cover. Trees create shade, but their cooling effect also depends on evaporation from leaves. Species selection matters. A tree that needs constant irrigation may be unsuitable in a dry city. Researchers therefore assess both canopy size and water demand. Young trees provide limited shade, so planners must protect space for them to reach maturity rather than counting only the number planted." },
          { speaker: "Lecturer", accent: "en-AU", text: "The second approach uses reflective surfaces. A pale roof can return more sunlight to the atmosphere and remain cooler than a dark roof. This reduces the amount of heat entering a building and may lower demand for air conditioning. However, highly reflective material can create glare for neighbouring buildings. Its effect also declines when dust accumulates, so maintenance must be included in cost estimates." },
          { speaker: "Lecturer", accent: "en-AU", text: "The third response is designing for ventilation. Streets aligned with the usual wind direction can help warm air move away. The benefit may disappear when new towers block these paths. Computer models are useful, but field measurements are still needed because wind behaves differently around real buildings, trees and traffic." },
          { speaker: "Lecturer", accent: "en-AU", text: "No single method is sufficient. A recent project in Westford combined trees, pale paving and shaded bus stops. Summer surface temperature fell by six degrees in the treated streets. More importantly, pedestrian counts increased by eighteen percent in the afternoon. The project measured comfort as well as temperature, since a cooler street has limited public value if people do not choose to use it." },
          { speaker: "Lecturer", accent: "en-AU", text: "For your assignment, compare two neighbourhoods rather than describing the whole city. Record shade at three times of day and identify the surface material at each measurement point. Do not rely on weather-app temperatures, which may come from a distant airport. Use the department's handheld sensors and photograph each site so that another researcher could repeat your observations." },
        ],
        questions: [
          gap(31, "The greatest urban–rural temperature difference is often at ______.", "night", "城乡温差通常在夜间最大。"),
          gap(32, "Trees cool through shade and ______ from their leaves.", "evaporation", "树木还通过叶片蒸发降温。"),
          gap(33, "Planners should consider canopy size and water ______.", "demand", "物种选择需同时考虑树冠和用水需求。"),
          gap(34, "Trees need enough space to reach ______.", "maturity", "幼树遮阴有限，需要保护生长到成熟的空间。"),
          gap(35, "Reflective roofs may reduce the need for air ______.", "conditioning", "反射屋顶可减少air conditioning需求。"),
          gap(36, "A possible problem with very reflective materials is ______.", "glare", "高反射材料可能给周边建筑造成眩光。"),
          gap(37, "Dust means reflective surfaces require regular ______.", "maintenance", "积尘会降低效果，因此需计入维护。"),
          gap(38, "In Westford, surface temperature fell by ______ degrees.", "6", "Westford项目表面温度下降6度。"),
          gap(39, "Afternoon pedestrian numbers rose by ______ percent.", "18", "下午行人数量增加18%。"),
          gap(40, "Students should use handheld ______ rather than weather apps.", "sensors", "作业要求使用系里的手持传感器。"),
        ],
      },
    ],
  },
  {
    id: "mock-b",
    title: "Mock B · 工作与职业发展",
    level: "6.5–7.0 标准",
    sections: [
      {
        part: 1,
        title: "海外招聘会登记",
        context: "两人对话 · 日常社会场景",
        instruction: "Questions 1–10 · Complete the registration form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
        turns: [
          { speaker: "Coordinator", accent: "en-GB", text: "International Careers Fair, registration desk. How may I help?" },
          { speaker: "Applicant", accent: "en-US", text: "I would like to attend the fair in Manchester on the twenty-eighth of October. My name is Priya Nair. Nair is N A I R." },
          { speaker: "Coordinator", accent: "en-GB", text: "Thank you. Which employment area interests you most?" },
          { speaker: "Applicant", accent: "en-US", text: "Hotel management. I currently work in retail, but I completed a hospitality diploma last year." },
          { speaker: "Coordinator", accent: "en-GB", text: "The morning session is full, so I can offer entry at one fifteen in the afternoon. The fair closes at five." },
          { speaker: "Applicant", accent: "en-US", text: "One fifteen is fine. I would also like the workshop about interviews in different cultures." },
          { speaker: "Coordinator", accent: "en-GB", text: "That workshop is in Seminar Room C at two forty. Please arrive ten minutes early. Do you require a printed name badge?" },
          { speaker: "Applicant", accent: "en-US", text: "Yes, please. Put Priya Nair, and below that write guest services. That is the type of role I want." },
          { speaker: "Coordinator", accent: "en-GB", text: "Do you need any accessibility support or dietary information?" },
          { speaker: "Applicant", accent: "en-US", text: "No accessibility support. I am vegetarian, though, and I have an allergy to peanuts." },
          { speaker: "Coordinator", accent: "en-GB", text: "I will note both. The standard ticket is twelve pounds, including refreshments. You can pay online after this call. What is your postcode?" },
          { speaker: "Applicant", accent: "en-US", text: "It is M fifteen, four R Q." },
          { speaker: "Coordinator", accent: "en-GB", text: "Thanks. Bring the confirmation code on your phone. The venue is Millgate Hall, opposite the art gallery." },
        ],
        questions: [
          gap(1, "Family name: ______", "Nair", "姓氏拼写为N-A-I-R。"),
          gap(2, "Fair date: 28 ______", "October", "招聘会在10月28日。"),
          gap(3, "Preferred field: hotel ______", "management", "首选领域是hotel management。"),
          gap(4, "Current work area: ______", "retail", "申请者目前在零售业工作。"),
          gap(5, "Entry time: ______ p.m.", ["1:15", "1.15"], "入场时间为下午1:15。"),
          gap(6, "Workshop room: Seminar Room ______", "C", "跨文化面试工作坊在Seminar Room C。"),
          gap(7, "Desired role: ______ services", "guest", "胸牌下方填写guest services。"),
          gap(8, "Food allergy: ______", ["peanut", "peanuts"], "申请者对花生过敏。"),
          gap(9, "Ticket price: £______", "12", "标准票价12英镑。"),
          gap(10, "Venue: ______ Hall", "Millgate", "场地是Millgate Hall。"),
        ],
      },
      {
        part: 2,
        title: "新员工办公室入职说明",
        context: "单人讲话 · 日常社会场景",
        instruction: "Questions 11–20 · Choose the correct answer, A, B or C.",
        turns: [
          { speaker: "Manager", accent: "en-US", text: "Welcome to Northline Design. This introduction covers the practical arrangements for your first month. Your access card opens the main doors from seven in the morning until nine at night. Outside those hours, security must approve entry. Do not lend the card to a colleague, even if they have forgotten theirs." },
          { speaker: "Manager", accent: "en-US", text: "Most teams use flexible hours. Everyone must be available between ten and three, but you can begin earlier or finish later around those core hours. On your first Friday, however, arrive by nine for the safety briefing in the ground-floor studio." },
          { speaker: "Manager", accent: "en-US", text: "Desks are reserved through the staff portal. Book no more than two weeks ahead. The window desks are popular, so please cancel promptly if plans change. Lockers are assigned permanently by Facilities, not booked in the portal." },
          { speaker: "Manager", accent: "en-US", text: "The kitchen on each floor provides tea, coffee and milk. Bring your own lunch container and label food kept in the refrigerator. Unlabelled items are cleared every Friday evening. The café downstairs is independent, so staff discounts do not apply there." },
          { speaker: "Manager", accent: "en-US", text: "For technical problems, use the help form rather than emailing individual engineers. Select urgent only when work has stopped completely. Password resets are usually answered within fifteen minutes; requests for new software may take three working days because a manager must approve the licence." },
          { speaker: "Manager", accent: "en-US", text: "Finally, your mentor will meet you twice in the first week and weekly after that. The purpose is to discuss how the role is developing, not to evaluate your performance. Formal review takes place with your line manager after three months. Questions can wait until the tour, which begins beside the large model in reception." },
        ],
        questions: [
          choice(11, "What is required for very early entry?", ["a temporary card", "security approval", "a manager's key"], "security approval", "早7点前或晚9点后进入需security批准。"),
          choice(12, "When must all staff be available?", ["7 a.m.–9 p.m.", "9 a.m.–5 p.m.", "10 a.m.–3 p.m."], "10 a.m.–3 p.m.", "核心工作时间为10点到3点。"),
          choice(13, "What happens on the first Friday?", ["a safety briefing", "a formal review", "a team lunch"], "a safety briefing", "第一个周五9点参加安全说明。"),
          choice(14, "How far ahead can desks be reserved?", ["one week", "two weeks", "one month"], "two weeks", "工位最多提前两周预订。"),
          choice(15, "Who assigns lockers?", ["Facilities", "team leaders", "reception"], "Facilities", "储物柜由Facilities固定分配。"),
          choice(16, "When is unlabelled food removed?", ["every evening", "Friday evening", "Monday morning"], "Friday evening", "无标签食物每周五晚上清理。"),
          choice(17, "What is true of the downstairs café?", ["It closes at three.", "It gives no staff discount.", "It accepts lunch vouchers."], "It gives no staff discount.", "咖啡馆独立运营，没有员工折扣。"),
          choice(18, "When should a technical request be marked urgent?", ["when a password is forgotten", "when work has completely stopped", "when software is needed soon"], "when work has completely stopped", "只有工作完全停止时才选urgent。"),
          choice(19, "Why can new software take three days?", ["It must be tested.", "A licence needs approval.", "Engineers work off-site."], "A licence needs approval.", "新软件许可证需经理批准。"),
          choice(20, "What is the mentor meeting for?", ["performance grading", "role-development discussion", "technical training"], "role-development discussion", "导师会议用于讨论角色发展，不是绩效评价。"),
        ],
      },
      {
        part: 3,
        title: "员工培训研究讨论",
        context: "三人讨论 · 教育培训场景",
        instruction: "Questions 21–30 · Choose the correct answer, A, B or C.",
        turns: [
          { speaker: "Supervisor", accent: "en-AU", text: "Jon and Sara, your project compares online and face-to-face staff training. What have you decided about participants?" },
          { speaker: "Sara", accent: "en-GB", text: "We contacted four companies, but only two agreed. One is a logistics firm and the other a call centre." },
          { speaker: "Jon", accent: "en-US", text: "At first we were disappointed, but together they can provide about eighty participants." },
          { speaker: "Supervisor", accent: "en-AU", text: "Eighty is adequate. The bigger problem is that each company uses a different training topic. Compare learning format, but acknowledge that topic difficulty may influence the results." },
          { speaker: "Sara", accent: "en-GB", text: "We planned to compare final quiz scores." },
          { speaker: "Supervisor", accent: "en-AU", text: "Include them, but add a short test before training. Otherwise you will not know whether one group started with more knowledge. Use the same questions before and after, changing only their order." },
          { speaker: "Jon", accent: "en-US", text: "Should we ask employees which format they prefer?" },
          { speaker: "Supervisor", accent: "en-AU", text: "Yes, after they finish. Asking beforehand may affect how they approach the course. Also measure completion time automatically through the training platform rather than asking people to estimate it." },
          { speaker: "Sara", accent: "en-GB", text: "The logistics company wants us to interview managers as well." },
          { speaker: "Supervisor", accent: "en-AU", text: "That could explain practical issues, such as whether staff can leave their workstation for classroom training. Treat the interviews as supporting evidence, not as a direct measure of learning." },
          { speaker: "Jon", accent: "en-US", text: "I can handle the numerical analysis. Sara has experience transcribing interviews." },
          { speaker: "Sara", accent: "en-GB", text: "But we should both code the first two interviews and compare our categories. That will make the process more consistent." },
          { speaker: "Supervisor", accent: "en-AU", text: "Good. For ethics, replace employee names with codes as soon as data is collected. Keep the code key in a separate encrypted file and destroy it after marking. Companies may receive a summary, but not individual results." },
          { speaker: "Jon", accent: "en-US", text: "We will revise the consent form to explain that." },
        ],
        questions: [
          choice(21, "How do the students now feel about having two companies?", ["The sample is large enough.", "The industries are too similar.", "They need a third company."], "The sample is large enough.", "两家公司合计约80人，导师认为足够。"),
          choice(22, "What limitation must the report acknowledge?", ["training topics are different", "company sizes are unknown", "staff ages are not balanced"], "training topics are different", "两家公司培训主题不同，难度可能影响结果。"),
          choice(23, "Why is a pre-training test needed?", ["to select participants", "to measure starting knowledge", "to shorten the final quiz"], "to measure starting knowledge", "前测用于判断两组起始知识水平。"),
          choice(24, "How should the second version of the test differ?", ["question order only", "questions and scoring", "topic and length"], "question order only", "前后测题目相同，只改变顺序。"),
          choice(25, "When should format preference be collected?", ["before training", "during training", "after training"], "after training", "提前询问可能影响学习态度，所以结束后再问。"),
          choice(26, "How should completion time be measured?", ["participant estimates", "manager observations", "platform records"], "platform records", "由平台自动记录完成时间。"),
          choice(27, "What can manager interviews mainly explain?", ["practical workplace constraints", "individual test scores", "employee motivation levels"], "practical workplace constraints", "经理访谈用于解释离岗参加课堂培训等实际限制。"),
          choice(28, "Why will both students code two interviews?", ["to finish the work faster", "to improve consistency", "to learn transcription"], "to improve consistency", "共同编码并比较类别可提高一致性。"),
          choice(29, "Where should the employee-code key be stored?", ["with the test results", "in a separate encrypted file", "by the companies"], "in a separate encrypted file", "身份代码表需单独加密保存。"),
          choice(30, "What may companies receive?", ["individual scores", "full interview transcripts", "a summary of results"], "a summary of results", "公司只能收到汇总，不能收到个人结果。"),
        ],
      },
      {
        part: 4,
        title: "轮班工作与睡眠",
        context: "学术独白 · 教育培训场景",
        instruction: "Questions 31–40 · Complete the notes. Write ONE WORD AND/OR A NUMBER.",
        turns: [
          { speaker: "Lecturer", accent: "en-GB", text: "This lecture considers sleep among shift workers. Human alertness follows a roughly twenty-four-hour rhythm controlled partly by light. Working at night conflicts with this rhythm, so tiredness is not simply the result of poor discipline. Even experienced night workers rarely adjust completely because daylight and family routines pull the body back toward daytime activity." },
          { speaker: "Lecturer", accent: "en-GB", text: "Rotating schedules create an additional difficulty. Research suggests that forward rotation, moving from morning to evening and then night shifts, is easier than rotating backwards. Speed matters too. A schedule that changes every two or three days prevents full adjustment but limits the time spent on nights. A weekly rotation may leave workers tired both at work and on days off." },
          { speaker: "Lecturer", accent: "en-GB", text: "Light can be managed strategically. Bright light near the start of a night shift supports alertness, while dark glasses on the journey home can reduce morning stimulation. The bedroom should be dark, quiet and cool. Blackout curtains are often more effective than an eye mask because they also prevent light from filling the room when the mask moves." },
          { speaker: "Lecturer", accent: "en-GB", text: "Caffeine improves alertness temporarily, but timing is important. Consuming it in the final four hours of a shift can delay sleep after work. Short naps of about twenty minutes may help before or during a shift. Longer naps can produce sleep inertia, a period of confusion and poor performance immediately after waking." },
          { speaker: "Lecturer", accent: "en-GB", text: "Employers also influence risk. Consecutive night shifts should be limited, and demanding tasks should not all be scheduled between three and five in the morning, when alertness is commonly lowest. Breaks are more useful when workers can leave a noisy workstation and rest in a separate area." },
          { speaker: "Lecturer", accent: "en-GB", text: "For your case study, choose one occupation and examine the schedule, physical environment and journey home. Interview at least six workers, but do not ask them to maintain sleep diaries for longer than fourteen days because completion rates fall sharply after that point. Compare reported tiredness with one objective measure, such as reaction time, and state clearly that individual responses to shift work vary." },
        ],
        questions: [
          gap(31, "The body clock is controlled partly by ______.", "light", "昼夜节律部分受光线控制。"),
          gap(32, "Even experienced workers seldom adjust ______.", "completely", "有经验的夜班人员也很少完全适应。"),
          gap(33, "______ rotation is easier than moving backwards.", "forward", "顺向轮班比反向轮班更容易。"),
          gap(34, "On the trip home, workers may wear dark ______.", "glasses", "下班途中可戴深色眼镜减少晨光刺激。"),
          gap(35, "Blackout curtains can be better than an eye ______.", "mask", "遮光窗帘通常比眼罩更有效。"),
          gap(36, "Avoid caffeine during the final ______ hours of a shift.", "4", "轮班最后四小时应避免咖啡因。"),
          gap(37, "A useful short nap is about ______ minutes.", "20", "约20分钟的小睡可能有帮助。"),
          gap(38, "Long naps may cause sleep ______ after waking.", "inertia", "长时间小睡后可能出现sleep inertia。"),
          gap(39, "Alertness is often lowest between 3 and ______ a.m.", "5", "警觉度通常在凌晨3至5点最低。"),
          gap(40, "Sleep diaries should last no more than ______ days.", "14", "睡眠日记不应超过14天。"),
        ],
      },
    ],
  },
  {
    id: "mock-c",
    title: "Mock C · 搬迁与职场学习",
    level: "6.5–7.0 标准",
    sections: [
      {
        part: 1,
        title: "搬家公司询价",
        context: "两人对话 · 日常社会场景",
        instruction: "Questions 1–10 · Complete the quotation. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.",
        turns: [
          { speaker: "Adviser", accent: "en-AU", text: "Good afternoon, Greenway Removals. Are you calling for a quotation?" },
          { speaker: "Customer", accent: "en-GB", text: "Yes. I am moving from a flat in Leeds to Sheffield on Friday the seventeenth of November. My name is Owen Clarke, with an E at the end of Clarke." },
          { speaker: "Adviser", accent: "en-AU", text: "What size is the current property?" },
          { speaker: "Customer", accent: "en-GB", text: "It has two bedrooms, but the second is used as an office. The flat is on the third floor. There is a lift, although the largest bookcase will not fit inside it." },
          { speaker: "Adviser", accent: "en-AU", text: "We will bring stair equipment. Are there other unusually heavy items?" },
          { speaker: "Customer", accent: "en-GB", text: "An upright piano. The washing machine is staying, and I will move the television myself." },
          { speaker: "Adviser", accent: "en-AU", text: "Would you like us to pack everything?" },
          { speaker: "Customer", accent: "en-GB", text: "Only the kitchen. I can pack clothes and books, but I would like you to supply thirty medium boxes and protective covers for two pictures." },
          { speaker: "Adviser", accent: "en-AU", text: "The crew can arrive between seven thirty and eight. The estimated total is six hundred and forty pounds, including insurance up to twenty thousand pounds. There is a seventy-pound charge if parking is not reserved." },
          { speaker: "Customer", accent: "en-GB", text: "I have already applied for a parking permit. The reference is L D fifty-eight." },
          { speaker: "Adviser", accent: "en-AU", text: "Excellent. Please send photographs of the piano and bookcase by Monday so we can confirm the quotation." },
        ],
        questions: [
          gap(1, "Moving date: Friday 17 ______", "November", "搬家日期为11月17日。"),
          gap(2, "Customer: Owen ______", "Clarke", "姓氏是Clarke，并特别说明末尾有e。"),
          gap(3, "Current flat: ______ floor", "third", "住处在三楼。"),
          gap(4, "Large item that will not fit in lift: ______", "bookcase", "最大的书柜放不进电梯。"),
          gap(5, "Heavy item: upright ______", "piano", "重物是一架立式钢琴。"),
          gap(6, "Packing service required for: ______", "kitchen", "只要求搬家公司打包厨房。"),
          gap(7, "Number of medium boxes: ______", "30", "需要30个中号箱子。"),
          gap(8, "Estimated price: £______", "640", "预计总价640英镑。"),
          gap(9, "Insurance limit: £______", ["20000", "20,000"], "保险上限为20,000英镑。"),
          gap(10, "Parking reference: ______", ["LD58", "LD 58"], "停车许可编号是LD58。"),
        ],
      },
      {
        part: 2,
        title: "市民健康中心导览",
        context: "单人讲话 · 日常社会场景",
        instruction: "Questions 11–20 · Choose the correct answer, A, B or C.",
        turns: [
          { speaker: "Guide", accent: "en-GB", text: "Welcome to Riverside Health Hub. The hub combines exercise, advice and rehabilitation services, but it is not an emergency clinic. If someone is seriously ill, call the emergency number rather than coming here. Reception is open from seven on weekdays and from nine at weekends." },
          { speaker: "Guide", accent: "en-GB", text: "New members begin with a twenty-minute assessment in Consultation Room Two. Wear comfortable clothing, but you will not exercise during this appointment. A coach will discuss your goals, previous injuries and current activity. The assessment is included in membership; a missed appointment, however, costs fifteen pounds." },
          { speaker: "Guide", accent: "en-GB", text: "The main gym is straight ahead. Between four and seven on weekday evenings, it is reserved for members aged sixteen and above because the room becomes crowded. Younger members can use the supervised studio upstairs. Please clean equipment after use, but leave damaged equipment in place and report it to staff." },
          { speaker: "Guide", accent: "en-GB", text: "The therapy pool has warmer water than the main pool. Public swimming is not allowed there. It is used for referred rehabilitation groups on Tuesday and Thursday mornings. Participants enter through the side changing room, where a hoist is available." },
          { speaker: "Guide", accent: "en-GB", text: "Free wellbeing talks take place monthly in the café area. Next month's topic has changed from nutrition to managing sleep. Places are free but limited, so reserve online. The café itself sells food until six, although drinks remain available until the building closes." },
          { speaker: "Guide", accent: "en-GB", text: "Finally, lockers use a one-pound coin, which is returned. Do not leave belongings overnight; lockers open automatically at closing time. Lost property is kept at reception for four weeks before usable items are donated. Our tour now continues in the upstairs studio." },
        ],
        questions: [
          choice(11, "What should people do in a serious medical emergency?", ["come directly to the hub", "call the emergency number", "book at reception"], "call the emergency number", "中心不是急诊，严重情况应拨打急救电话。"),
          choice(12, "What happens in the first assessment?", ["a fitness test", "a discussion with a coach", "a group exercise class"], "a discussion with a coach", "首次评估主要讨论目标、旧伤和活动情况。"),
          choice(13, "When is a fee charged for the assessment?", ["when it is missed", "when it lasts over twenty minutes", "when no membership is purchased"], "when it is missed", "缺席会收取15英镑。"),
          choice(14, "Who may use the main gym from 4 to 7 p.m.?", ["all members", "members aged 16+", "coaches only"], "members aged 16+", "繁忙时段限16岁以上会员。"),
          choice(15, "What should a member do with damaged equipment?", ["move it to reception", "repair it if possible", "leave it and inform staff"], "leave it and inform staff", "损坏设备留在原位并报告。"),
          choice(16, "What is special about the therapy pool?", ["It is warmer.", "It is outdoors.", "It is open to the public."], "It is warmer.", "治疗池水温高于主泳池。"),
          choice(17, "When do rehabilitation groups use the pool?", ["two mornings a week", "weekday evenings", "every weekend"], "two mornings a week", "周二和周四上午使用。"),
          choice(18, "What is the next wellbeing talk about?", ["nutrition", "managing sleep", "preventing injury"], "managing sleep", "下月主题从营养改为睡眠管理。"),
          choice(19, "What is needed to operate a locker?", ["a membership card", "a one-pound coin", "a phone code"], "a one-pound coin", "储物柜使用1英镑硬币且会退回。"),
          choice(20, "How long is lost property kept?", ["one week", "one month", "three months"], "one month", "失物保存四周，即约一个月。"),
        ],
      },
      {
        part: 3,
        title: "企业实习项目评估",
        context: "三人讨论 · 教育培训场景",
        instruction: "Questions 21–30 · Choose the correct answer, A, B or C.",
        turns: [
          { speaker: "Tutor", accent: "en-US", text: "Amir and Beth, your evaluation of the internship programme has a clear purpose. Tell me about the evidence you have collected." },
          { speaker: "Beth", accent: "en-GB", text: "We sent an online survey to last year's sixty interns. Forty-two replied, which is better than we expected." },
          { speaker: "Amir", accent: "en-AU", text: "We also interviewed six workplace supervisors, but only two academic tutors were available." },
          { speaker: "Tutor", accent: "en-US", text: "Do not present the tutor interviews as representative. Use them to identify issues for future research. What did interns value most?" },
          { speaker: "Beth", accent: "en-GB", text: "We expected professional contacts to rank first. In fact, practical experience was clearly highest. Confidence came second, while contacts were third." },
          { speaker: "Amir", accent: "en-AU", text: "The largest complaint concerned unclear tasks during the first week. Some supervisors assumed students already knew the company's software." },
          { speaker: "Tutor", accent: "en-US", text: "That suggests an induction checklist. Be careful, though: students at small firms reported clearer tasks than those at large firms, so company size may be involved." },
          { speaker: "Beth", accent: "en-GB", text: "We could compare responses by company size. We also asked whether payment affected satisfaction, but only eight internships were paid." },
          { speaker: "Tutor", accent: "en-US", text: "Eight is too few for a strong statistical claim. Describe the pattern, but avoid saying payment caused higher satisfaction." },
          { speaker: "Amir", accent: "en-AU", text: "For our presentation, I will explain the survey and Beth can present the interviews." },
          { speaker: "Beth", accent: "en-GB", text: "I think it would be clearer to organise by findings instead of methods. We could each present one main finding and combine survey and interview evidence." },
          { speaker: "Tutor", accent: "en-US", text: "I agree with Beth. Start with practical experience, then induction, and finish with recommendations. Include one chart, not all seven from the report. The comparison by company size would be most useful." },
          { speaker: "Amir", accent: "en-AU", text: "We will revise the slides and rehearse on Wednesday." },
        ],
        questions: [
          choice(21, "How many interns completed the survey?", ["42", "60", "6"], "42", "60人中有42人回复。"),
          choice(22, "How should the academic tutor interviews be used?", ["as representative evidence", "to suggest future research", "to replace missing surveys"], "to suggest future research", "只有两名导师，不具代表性，可用于发现未来研究问题。"),
          choice(23, "What did interns value most?", ["professional contacts", "confidence", "practical experience"], "practical experience", "实践经验排名第一。"),
          choice(24, "What was the main complaint?", ["limited payment", "unclear early tasks", "poor academic support"], "unclear early tasks", "最大抱怨是第一周任务不清楚。"),
          choice(25, "What may explain differences in task clarity?", ["company size", "internship length", "student subject"], "company size", "小公司和大公司反馈不同，规模可能相关。"),
          choice(26, "Why must payment findings be treated cautiously?", ["Satisfaction was not measured.", "Only eight placements were paid.", "Payment data was anonymous."], "Only eight placements were paid.", "带薪实习样本仅8个，不能作强因果结论。"),
          choice(27, "How does Beth want to organise the presentation?", ["by research method", "by main finding", "by company"], "by main finding", "Beth建议按研究发现组织。"),
          choice(28, "What should the presentation begin with?", ["practical experience", "the survey response rate", "payment"], "practical experience", "导师建议先讲实践经验。"),
          choice(29, "Which visual does the tutor recommend?", ["all seven report charts", "the company-size comparison", "a list of interview questions"], "the company-size comparison", "只放一个图，最有用的是公司规模比较。"),
          choice(30, "What will the students do on Wednesday?", ["collect more data", "meet the companies", "rehearse the presentation"], "rehearse the presentation", "两人将在周三排练。"),
        ],
      },
      {
        part: 4,
        title: "工作场所中的噪声",
        context: "学术独白 · 教育培训场景",
        instruction: "Questions 31–40 · Complete the notes. Write ONE WORD AND/OR A NUMBER.",
        turns: [
          { speaker: "Lecturer", accent: "en-US", text: "Workplace noise is usually discussed as a risk to hearing, but sound below the level that causes physical damage can still affect performance. Irregular noise is especially distracting because the brain repeatedly shifts attention toward an unpredictable event. A steady mechanical sound may be easier to ignore than occasional speech from nearby colleagues." },
          { speaker: "Lecturer", accent: "en-US", text: "The type of task also matters. Simple repetitive work may show little change, while reading, writing and tasks involving working memory are more vulnerable. Speech is particularly disruptive when workers can understand the words, because the brain processes meaning even when they try not to listen." },
          { speaker: "Lecturer", accent: "en-US", text: "Open-plan offices were expected to improve communication. They do increase the chance of brief contact, but studies often find lower privacy and more interruption. Adding high partitions can block sight lines but does not remove low-frequency sound. Soft ceiling materials and carpets reduce reflected sound more effectively." },
          { speaker: "Lecturer", accent: "en-US", text: "Some organisations use sound masking, a controlled background sound designed to make conversations less intelligible at a distance. It should be introduced gradually. If it is too loud or contains noticeable patterns, workers may find the masking sound itself annoying." },
          { speaker: "Lecturer", accent: "en-US", text: "Headphones can help with short periods of concentration, but noise cancellation is less effective against nearby voices than against a steady engine. Safety rules may also prevent headphone use in laboratories or warehouses. A better policy provides quiet rooms for demanding tasks while keeping shared areas for collaboration." },
          { speaker: "Lecturer", accent: "en-US", text: "For your observation study, measure sound for at least fifteen minutes at each location. Record both average level and sudden peaks. Ask workers to rate interruption immediately after the measurement rather than at the end of the week. Finally, note the task being performed, since the same sound can have a different effect on data entry and report writing." },
        ],
        questions: [
          gap(31, "______ noise attracts attention repeatedly because it is unpredictable.", "irregular", "不规则噪声因不可预测而反复吸引注意。"),
          gap(32, "A steady ______ sound can be easier to ignore.", "mechanical", "稳定的机械声可能更容易忽略。"),
          gap(33, "Tasks using working ______ are especially vulnerable.", "memory", "涉及工作记忆的任务更易受影响。"),
          gap(34, "Speech distracts more when workers understand its ______.", "meaning", "听懂语义时干扰更强。"),
          gap(35, "Open offices often reduce privacy and increase ______.", "interruption", "开放办公室常降低隐私并增加打断。"),
          gap(36, "Carpets reduce ______ sound.", "reflected", "地毯和软质天花板减少反射声。"),
          gap(37, "Sound masking makes distant conversations less ______.", "intelligible", "声音掩蔽让远处谈话更难听清。"),
          gap(38, "Noise cancellation works best against a steady ______.", "engine", "降噪耳机更擅长处理稳定发动机声。"),
          gap(39, "Measure each location for at least ______ minutes.", "15", "每处至少测量15分钟。"),
          gap(40, "Record average sound and sudden ______.", "peaks", "记录平均声级和突然峰值。"),
        ],
      },
    ],
  },
];

export const LISTENING_MOCKS: ListeningMock[] = [
  ...CORE_LISTENING_MOCKS,
  ...ADDITIONAL_LISTENING_MOCKS,
];

export function normalizeListeningAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?£$]/g, "")
    .replace(/\s+/g, " ");
}

export function isListeningAnswerCorrect(
  question: ListeningExamQuestion,
  value: string,
): boolean {
  const normalized = normalizeListeningAnswer(value);
  return question.answers.some(
    (answer) => normalizeListeningAnswer(answer) === normalized,
  );
}

export function listeningBandFromRaw(raw: number): number {
  if (raw >= 39) return 9;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8;
  if (raw >= 32) return 7.5;
  if (raw >= 30) return 7;
  if (raw >= 26) return 6.5;
  if (raw >= 23) return 6;
  if (raw >= 18) return 5.5;
  if (raw >= 16) return 5;
  return 4.5;
}
