import type { ListeningExamQuestion, ListeningExamSection, ListeningMock, ListeningTurn } from "./ielts-exam-bank.ts";

type GapFact = readonly [prompt: string, answer: string | string[], spoken: string];
type ChoiceFact = readonly [prompt: string, answer: string, distractors: readonly [string, string], spoken: string];

interface SectionSeed {
  part: 1 | 2 | 3 | 4;
  title: string;
  context: string;
  speakers: readonly { speaker: string; accent: ListeningTurn["accent"] }[];
  intro: string;
  facts: readonly GapFact[] | readonly ChoiceFact[];
  kind: "gap" | "choice";
}

const makeSection = (seed: SectionSeed): ListeningExamSection => {
  const start = (seed.part - 1) * 10 + 1;
  const turns = [
    { ...seed.speakers[0], text: seed.intro },
    ...Array.from({ length: 5 }, (_, groupIndex) => ({
      ...seed.speakers[groupIndex % seed.speakers.length],
      text: seed.facts.slice(groupIndex * 2, groupIndex * 2 + 2).map((fact) => fact[3] ?? fact[2]).join(" "),
    })),
  ];

  const questions: ListeningExamQuestion[] = seed.facts.map((fact, index) => {
    const number = start + index;
    if (seed.kind === "gap") {
      const [prompt, answer] = fact as GapFact;
      return {
        number,
        kind: "gap",
        prompt,
        answers: Array.isArray(answer) ? [...answer] : [answer],
        explanation: `录音中明确给出的答案是“${Array.isArray(answer) ? answer[0] : answer}”。注意拼写、单复数和题目规定的字数。`,
      };
    }
    const [prompt, answer, distractors] = fact as ChoiceFact;
    const answerPosition = index % 3;
    const options = [...distractors];
    options.splice(answerPosition, 0, answer);
    return {
      number,
      kind: "choice",
      prompt,
      options,
      answers: [answer],
      explanation: `说话者最终确认的是“${answer}”；其余选项要么只是早期想法，要么被后文更正。`,
    };
  });

  return {
    part: seed.part,
    title: seed.title,
    context: seed.context,
    instruction: seed.kind === "gap"
      ? `Questions ${start}–${start + 9} · Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.`
      : `Questions ${start}–${start + 9} · Choose the correct answer, A, B or C.`,
    turns,
    questions,
  };
};

const MOCK_D_SECTIONS: SectionSeed[] = [
  {
    part: 1, title: "自行车租赁预订", context: "两人对话 · 日常社会场景", kind: "gap",
    speakers: [{ speaker: "Agent", accent: "en-GB" }, { speaker: "Customer", accent: "en-AU" }],
    intro: "Good morning, Northbank Cycle Hire. I can take the details for your weekend booking now.",
    facts: [
      ["Customer surname: ______", "Mercer", "The booking is for Nina Mercer; that is Mercer with an E after the M."],
      ["Collection date: 18 ______", "May", "She will collect the bicycle on Saturday the eighteenth of May, not the Friday."],
      ["Type of bicycle: ______ bike", "hybrid", "A hybrid bike will suit the canal path better than the mountain model she first considered."],
      ["Frame size: ______", "medium", "Her height falls in the medium frame range."],
      ["Extra item: rear ______", "basket", "She needs a rear basket for a camera bag, but does not require child equipment."],
      ["Helmet charge: £______", "4", "Helmet hire adds four pounds for the whole weekend."],
      ["Return time on Sunday: ______ p.m.", "6", "The shop closes at six on Sunday, so the bike must be back by then."],
      ["Security deposit: £______", ["80", "eighty"], "The refundable security deposit is eighty pounds."],
      ["Proof of address: utility ______", "bill", "A passport proves identity, and a recent utility bill is needed for the address."],
      ["Booking reference: NB______", ["472", "NB472"], "The reference to quote is N B four seven two."],
    ],
  },
  {
    part: 2, title: "河畔社区中心导览", context: "单人独白 · 日常社会场景", kind: "choice",
    speakers: [{ speaker: "Coordinator", accent: "en-GB" }],
    intro: "Welcome to the Riverside Community Centre. I will explain the building and a few rules before today's activities begin.",
    facts: [
      ["Where should new visitors register?", "at the ground-floor desk", ["in the cafe", "outside the sports hall"], "New visitors should register at the ground-floor desk beside the main entrance."],
      ["What changed about the cafe?", "it closes earlier", ["it serves only drinks", "it moved upstairs"], "The cafe still serves food, but it now closes earlier at four thirty."],
      ["Who may use the computer room before noon?", "people with booked sessions", ["all adult members", "school students only"], "Before noon, the computer room is reserved for people with booked advice sessions."],
      ["Why is Studio Two unavailable today?", "the floor is being repaired", ["a class is over capacity", "new mirrors are arriving"], "Studio Two is closed because damage to the floor is being repaired."],
      ["Where are bicycles parked?", "behind the garden gate", ["beside reception", "under the front steps"], "Cycle stands are behind the garden gate, rather than on the narrow front pavement."],
      ["What must parents do in the play room?", "remain in the building", ["book a staff member", "bring indoor shoes"], "Parents may leave the play room itself, but they must remain elsewhere in the building."],
      ["What is free on Wednesday evenings?", "language exchange", ["yoga classes", "printing service"], "The Wednesday language exchange is free; the yoga class still has a small fee."],
      ["How are lockers opened?", "with a four-digit code", ["with a coin", "with a membership card"], "The new lockers use a four-digit code selected by the user."],
      ["What should visitors do with lost property?", "ask at reception", ["email the cleaner", "leave a note in the cafe"], "All lost property is recorded and held at reception."],
      ["Where will the tour finish?", "in the roof garden", ["in the sports hall", "at the front desk"], "We will finish upstairs in the roof garden, where the gardening group is waiting."],
    ],
  },
  {
    part: 3, title: "城市热岛研究讨论", context: "三人讨论 · 教育培训场景", kind: "choice",
    speakers: [{ speaker: "Tutor", accent: "en-US" }, { speaker: "Leila", accent: "en-GB" }, { speaker: "Tom", accent: "en-AU" }],
    intro: "Leila and Tom, let us review your proposed study of summer temperatures across the city before you collect data.",
    facts: [
      ["What is the students' main research question?", "how street design affects night temperature", ["why summers are becoming longer", "whether residents use air conditioning"], "Our central question is how street design affects night temperature, not the wider cause of climate change."],
      ["Why did they reject satellite data alone?", "it cannot show street-level detail", ["it is too expensive", "it is unavailable at night"], "Satellite data is useful, but it cannot provide enough street-level detail for this project."],
      ["Where will sensors be placed?", "on shaded lamp posts", ["on building roofs", "inside parked cars"], "We will attach sensors to shaded lamp posts at a consistent height."],
      ["How many neighbourhoods will be compared?", "four", ["two", "six"], "Four neighbourhoods are realistic within the available time."],
      ["What must be recorded near each sensor?", "surface materials", ["shop opening hours", "pedestrian numbers"], "Record nearby surface materials such as asphalt, grass and pale paving."],
      ["What problem affected the pilot sensor?", "direct afternoon sunlight", ["battery failure", "water damage"], "The pilot reading rose sharply because direct afternoon sunlight reached the sensor."],
      ["How often will data be downloaded?", "once a week", ["every evening", "at the end of the month"], "Downloading once a week will reveal faults before too much data is lost."],
      ["Who will Leila interview?", "park maintenance staff", ["local shop owners", "school pupils"], "Leila will ask park maintenance staff about watering and shade management."],
      ["Which visual will the presentation use?", "a temperature map", ["a table of every reading", "photographs only"], "A temperature map will communicate the pattern more clearly than a large table."],
      ["What limitation will they emphasise?", "the study covers one season", ["the sensors are different brands", "residents refused access"], "The report must state that the measurements cover only one summer season."],
    ],
  },
  {
    part: 4, title: "城市传粉昆虫走廊", context: "学术独白 · 大学讲座", kind: "gap",
    speakers: [{ speaker: "Lecturer", accent: "en-GB" }],
    intro: "Today's lecture examines how connected urban planting can support bees and other pollinating insects.",
    facts: [
      ["Many pollinators need food within a short flight ______.", "distance", "Small insects need reliable food within a short flight distance."],
      ["Isolated flower beds may function like ecological ______.", "islands", "Widely separated flower beds behave like ecological islands."],
      ["Road verges can provide a useful linear ______.", "habitat", "Managed road verges can form a long, narrow habitat through a district."],
      ["Planting should include flowers across several ______.", "seasons", "A good corridor provides flowers across several seasons, not only in midsummer."],
      ["Native plants often support a wider range of insect ______.", "species", "Native plants often support more insect species because of long ecological relationships."],
      ["Cutting all grass at once removes food and ______.", "shelter", "Uniform mowing removes both food and shelter at the same moment."],
      ["Some bare soil is needed by ground-nesting ______.", "bees", "Ground-nesting bees require patches of open, undisturbed soil."],
      ["Citizen surveys should record effort as well as insect ______.", "numbers", "Record survey time and conditions alongside insect numbers."],
      ["Chemical use should be reduced near flowering ______.", "plants", "Avoid chemical spraying beside flowering plants whenever possible."],
      ["Success is measured through reproduction, not just adult ______.", "visits", "Adult visits alone are insufficient; successful reproduction is stronger evidence."],
    ],
  },
];

const MOCK_E_SECTIONS: SectionSeed[] = [
  {
    part: 1, title: "语言学校注册", context: "两人对话 · 日常社会场景", kind: "gap",
    speakers: [{ speaker: "Administrator", accent: "en-AU" }, { speaker: "Student", accent: "en-GB" }],
    intro: "Good afternoon, Westbridge Language School. Let us complete your enrolment for the autumn course.",
    facts: [
      ["Student first name: ______", "Haruto", "The student's first name is Haruto, spelled H A R U T O."],
      ["Course starts: 6 ______", "October", "The evening course begins on the sixth of October."],
      ["Current level: upper ______", "intermediate", "His placement result is upper intermediate rather than advanced."],
      ["Main goal: workplace ______", "communication", "He mainly wants to improve workplace communication."],
      ["Preferred class days: Tuesday and ______", "Thursday", "Tuesday and Thursday fit his work schedule."],
      ["Classroom: Room ______", ["14", "fourteen"], "The class is in Room fourteen on the second floor."],
      ["Textbook fee: £______", ["28", "twenty-eight"], "The textbook costs twenty-eight pounds after the student discount."],
      ["Optional club: ______ club", "debate", "He chooses the debate club rather than the film club."],
      ["Emergency contact: Mrs ______", "Sato", "His emergency contact is Mrs Sato."],
      ["Payment deadline: 22 ______", "September", "Full payment is required by the twenty-second of September."],
    ],
  },
  {
    part: 2, title: "遗产铁路游览须知", context: "单人独白 · 日常社会场景", kind: "choice",
    speakers: [{ speaker: "Guide", accent: "en-GB" }],
    intro: "Before we board the heritage train, I will explain today's route, facilities and safety arrangements.",
    facts: [
      ["Why is the steam engine not operating?", "it needs an inspection", ["coal has not arrived", "the driver is ill"], "The steam engine is undergoing a required inspection, so today's train uses a restored diesel engine."],
      ["Where should wheelchairs board?", "at the middle carriage", ["beside the engine", "at the rear door"], "The level boarding platform lines up with the middle carriage."],
      ["What is included in every ticket?", "entry to the rail museum", ["a hot lunch", "a printed guidebook"], "All tickets include entry to the small rail museum at Hillford."],
      ["When is food served?", "after the first station", ["before departure", "during the return journey only"], "The cafe trolley opens after we leave the first station."],
      ["What may passengers do at Pine Halt?", "take a short woodland walk", ["rent bicycles", "visit a factory"], "Pine Halt offers a marked twenty-minute woodland walk."],
      ["Why must passengers keep their tickets?", "they are checked on return", ["they contain a meal voucher", "they open museum lockers"], "Tickets are checked again when passengers board the return service."],
      ["What should photographers avoid?", "crossing the yellow line", ["using tripods", "photographing staff"], "Photographers must stay behind the yellow platform line."],
      ["What changed about the return train?", "it leaves ten minutes later", ["it uses another station", "it has fewer carriages"], "The return departure has moved ten minutes later to four forty."],
      ["Where is lost property taken?", "to the booking office", ["to the museum cafe", "to the final carriage"], "Found items are delivered to the booking office at the main station."],
      ["What will happen before departure?", "a safety demonstration", ["a ticket refund", "a group photograph"], "A short safety demonstration will take place beside the train before boarding."],
    ],
  },
  {
    part: 3, title: "博物馆导览应用项目", context: "三人讨论 · 教育培训场景", kind: "choice",
    speakers: [{ speaker: "Supervisor", accent: "en-US" }, { speaker: "Aisha", accent: "en-GB" }, { speaker: "Ben", accent: "en-AU" }],
    intro: "Aisha and Ben, your museum-guide application proposal is promising, but we need to narrow the evaluation plan.",
    facts: [
      ["Who is the primary user group?", "first-time adult visitors", ["school teachers", "museum researchers"], "The initial version is for first-time adult visitors, not specialist users."],
      ["What feature will be tested first?", "short object stories", ["indoor navigation", "ticket purchasing"], "We will first test short object stories because they are central to the learning aim."],
      ["Why was voice recognition rejected?", "the galleries are noisy", ["it costs too much", "visitors dislike microphones"], "Reliable voice recognition would be difficult in noisy galleries."],
      ["How many exhibits will the prototype include?", "twelve", ["six", "twenty"], "Twelve exhibits offer enough variety without making the prototype too large."],
      ["What will visitors do after each story?", "answer one question", ["take a photograph", "rate the room temperature"], "A single question after each story will check attention without creating a long quiz."],
      ["How will accessibility be improved?", "with adjustable text size", ["with brighter screens only", "with free headphones"], "Adjustable text size is the most feasible accessibility improvement for this stage."],
      ["Where will testing take place?", "in one permanent gallery", ["in the museum cafe", "online at home"], "Testing will use one permanent gallery so the objects and route remain stable."],
      ["What data will not be collected?", "visitors' names", ["time spent", "question responses"], "Names are unnecessary and should not be collected."],
      ["What does Ben need to revise?", "the consent screen", ["the colour palette", "the project title"], "Ben will simplify the consent screen before Friday."],
      ["What will the final report compare?", "two story lengths", ["adult and child users", "weekdays and weekends"], "The report will compare short and medium-length object stories."],
    ],
  },
  {
    part: 4, title: "睡眠与记忆巩固", context: "学术独白 · 大学讲座", kind: "gap",
    speakers: [{ speaker: "Lecturer", accent: "en-US" }],
    intro: "This lecture looks at how different stages of sleep contribute to learning and the stabilisation of memory.",
    facts: [
      ["New memories are initially dependent on the ______.", "hippocampus", "Many new memories initially depend on a brain structure called the hippocampus."],
      ["Deep sleep supports the transfer of factual ______.", "information", "Deep sleep appears to support the transfer of factual information into longer-term networks."],
      ["REM sleep is often linked with emotional memory and ______.", "creativity", "REM sleep has been linked with emotional processing and creativity."],
      ["Participants learned pairs of unrelated ______.", "words", "In one experiment participants learned pairs of unrelated words."],
      ["The sleep group performed better the next ______.", "morning", "Those who slept were tested the next morning and remembered more."],
      ["Caffeine can delay sleep even when people feel ______.", "tired", "Late caffeine may delay sleep despite a person's feeling of tiredness."],
      ["Bright evening light can suppress the hormone ______.", "melatonin", "Bright evening light suppresses melatonin, which helps signal biological night."],
      ["Short naps may benefit procedural ______.", "learning", "A well-timed short nap can benefit procedural learning."],
      ["Memory improvement is not caused simply by avoiding ______.", "interference", "Avoiding daytime interference explains only part of the sleep advantage."],
      ["Students should distribute revision across several ______.", "days", "Revision should be distributed across several days rather than placed in one late night."],
    ],
  },
];

const MOCK_F_SECTIONS: SectionSeed[] = [
  {
    part: 1, title: "社区志愿活动报名", context: "两人对话 · 日常社会场景", kind: "gap",
    speakers: [{ speaker: "Organiser", accent: "en-GB" }, { speaker: "Volunteer", accent: "en-US" }],
    intro: "Hello, Green Streets Weekend. I can register you for one of Saturday's volunteer teams.",
    facts: [
      ["Volunteer surname: ______", "Donovan", "The volunteer is Alex Donovan, spelled D O N O V A N."],
      ["Chosen activity: river ______", "clean-up", "Alex chooses the river clean-up rather than tree planting."],
      ["Meeting place: East ______", "Bridge", "The team meets below East Bridge at eight thirty."],
      ["Start time: ______ a.m.", ["8:30", "8.30", "eight thirty"], "Registration opens at eight fifteen and work begins at eight thirty."],
      ["Clothing: waterproof ______", "boots", "Volunteers should bring waterproof boots because the bank is muddy."],
      ["Provided item: protective ______", "gloves", "Heavy protective gloves and rubbish bags are provided."],
      ["Lunch: vegetable ______", "soup", "Lunch is vegetable soup with bread; volunteers may bring extra snacks."],
      ["Medical note: allergic to ______", "peanuts", "Alex reports a peanut allergy on the registration form."],
      ["Emergency contact: Jamie ______", "Donovan", "The emergency contact is Jamie Donovan."],
      ["Team code: River ______", ["7", "seven"], "Alex is assigned to River Team seven."],
    ],
  },
  {
    part: 2, title: "海岸游客中心讲解", context: "单人独白 · 日常社会场景", kind: "choice",
    speakers: [{ speaker: "Ranger", accent: "en-AU" }],
    intro: "Welcome to Seacliff Visitor Centre. Conditions are changing today, so please listen to the updated route advice.",
    facts: [
      ["Why is the cliff path closed?", "loose rock after rain", ["a bird survey", "construction work"], "The cliff path is closed because recent rain loosened rock above it."],
      ["Which route remains open?", "the beach boardwalk", ["the lighthouse steps", "the north ridge"], "The beach boardwalk remains open as far as the observation shelter."],
      ["What can visitors borrow?", "binoculars", ["walking poles", "rain jackets"], "Binoculars can be borrowed from the information desk with an identity card."],
      ["Where are seals most likely visible?", "from the western shelter", ["beside the cafe", "at the car park"], "The western shelter overlooks the rocks where seals are resting this morning."],
      ["What should visitors never do?", "feed seabirds", ["photograph nests", "walk in small groups"], "Do not feed seabirds because it changes their behaviour and attracts them to people."],
      ["When does the guided walk begin?", "at two fifteen", ["at one thirty", "at three o'clock"], "Today's guided beach walk begins at two fifteen."],
      ["What is today's talk about?", "plastic in marine food chains", ["history of fishing", "weather forecasting"], "The indoor talk examines plastic moving through marine food chains."],
      ["Where is the accessible toilet?", "beside the education room", ["inside the cafe", "near the western shelter"], "The accessible toilet is beside the education room at the rear of the centre."],
      ["What can be purchased at reception?", "a parking extension", ["boat tickets", "camping permits"], "Visitors delayed by an activity can purchase a parking extension at reception."],
      ["What time does the centre close?", "five thirty", ["five o'clock", "six thirty"], "The building closes at five thirty, although the car park remains open."],
    ],
  },
  {
    part: 3, title: "校园食物浪费研究", context: "三人讨论 · 教育培训场景", kind: "choice",
    speakers: [{ speaker: "Tutor", accent: "en-GB" }, { speaker: "Priya", accent: "en-IN" }, { speaker: "Max", accent: "en-US" }],
    intro: "Priya and Max, your food-waste project has useful pilot data. Let us decide what the main study should measure.",
    facts: [
      ["Where was the pilot conducted?", "in the main dining hall", ["in student kitchens", "in two cafes"], "The pilot used the main dining hall because it serves the largest number of meals."],
      ["What waste was measured separately?", "uneaten cooked food", ["paper receipts", "kitchen packaging"], "Uneaten cooked food was separated from preparation waste."],
      ["Why were Fridays unusual?", "fewer students ate on campus", ["portions were larger", "the menu was vegetarian"], "Friday totals were lower because fewer students ate on campus."],
      ["What data should be added?", "number of meals sold", ["student age", "weather temperature"], "Waste must be related to the number of meals sold each day."],
      ["Which intervention will be tested?", "smaller default portions", ["higher meal prices", "fewer menu choices"], "The team will test smaller default portions while allowing free extra servings."],
      ["What concern does Priya raise?", "students may take food twice", ["staff may refuse to help", "bins may be moved"], "Priya notes that repeat servings must be counted to avoid misleading results."],
      ["How long will the trial last?", "three weeks", ["one week", "six weeks"], "Three weeks is long enough to reduce the novelty effect."],
      ["Who will record observations?", "trained student volunteers", ["kitchen managers", "external researchers"], "Trained student volunteers will use the same observation sheet."],
      ["What will the poster display?", "waste per meal", ["total food purchases", "names of high-waste groups"], "The public poster will show waste per meal rather than a raw total."],
      ["What is the main ethical issue?", "avoiding public blame", ["paying participants", "photographing meals"], "Communication must avoid blaming individuals or particular cultural food choices."],
    ],
  },
  {
    part: 4, title: "泥炭地生态修复", context: "学术独白 · 大学讲座", kind: "gap",
    speakers: [{ speaker: "Lecturer", accent: "en-GB" }],
    intro: "This lecture explains why damaged peatlands release carbon and how restoration changes water movement.",
    facts: [
      ["Healthy peat forms in waterlogged, low-oxygen ______.", "conditions", "Peat accumulates under waterlogged, low-oxygen conditions."],
      ["Drainage allows microbes to break down stored organic ______.", "matter", "When land is drained, microbes break down previously stored organic matter."],
      ["Damaged peat may become vulnerable to ______.", "fire", "Dry damaged peat is also more vulnerable to fire."],
      ["Restoration often begins by blocking drainage ______.", "channels", "The first practical step is often blocking artificial drainage channels."],
      ["Small dams can be made from timber or compacted ______.", "peat", "Small dams may use timber, plastic or compacted peat from the site."],
      ["Moss fragments are spread across areas of bare ______.", "soil", "Fragments of peat-forming moss are spread over bare soil surfaces."],
      ["Grazing pressure must sometimes be ______.", "reduced", "Early recovery may require grazing pressure to be reduced."],
      ["Water levels are measured with simple observation ______.", "wells", "Observation wells allow teams to track changes in water level."],
      ["Vegetation recovery can be checked using fixed ______.", "photographs", "Fixed photographs taken from the same points show vegetation recovery."],
      ["Carbon benefits may take many ______ to appear.", "years", "Full carbon benefits can take many years, so monitoring must continue."],
    ],
  },
];

const MOCK_G_SECTIONS: SectionSeed[] = [
  {
    part: 1, title: "共享办公会员咨询", context: "两人对话 · 日常社会场景", kind: "gap",
    speakers: [{ speaker: "Host", accent: "en-US" }, { speaker: "Caller", accent: "en-GB" }],
    intro: "Hello, Foundry Workspace. I can explain the membership and reserve your trial day.",
    facts: [
      ["Caller surname: ______", "Rahman", "The caller is Sofia Rahman, spelled R A H M A N."],
      ["Trial date: 3 ______", "June", "She requests Monday the third of June."],
      ["Arrival time: ______ a.m.", ["8:45", "8.45", "eight forty-five"], "She plans to arrive at eight forty-five before her first call."],
      ["Preferred area: quiet ______", "zone", "A desk in the quiet zone is more suitable than the social floor."],
      ["Required equipment: second ______", "monitor", "She needs a second monitor but will bring her own laptop."],
      ["Phone booth limit: ______ minutes", ["45", "forty-five"], "Phone booths may be booked for forty-five minutes at a time."],
      ["Monthly membership: £______", ["165", "one hundred and sixty-five"], "The part-time monthly membership costs one hundred and sixty-five pounds."],
      ["Locker location: third ______", "floor", "Her optional locker would be on the third floor."],
      ["Access method: mobile ______", "pass", "Members enter using a mobile pass rather than a plastic card."],
      ["Trial code: FOUNDRY ______", ["24", "twenty-four"], "The trial booking code is FOUNDRY twenty-four."],
    ],
  },
  {
    part: 2, title: "制造厂安全培训", context: "单人独白 · 工作培训场景", kind: "choice",
    speakers: [{ speaker: "Safety Officer", accent: "en-AU" }],
    intro: "Before entering the production floor, every visitor must understand the route, protective equipment and emergency signals.",
    facts: [
      ["Where must visitors collect eye protection?", "at the security desk", ["inside the workshop", "from the guide"], "Eye protection is issued at the security desk before the tour group forms."],
      ["What footwear is prohibited?", "open-toed shoes", ["rubber soles", "dark-coloured boots"], "Open-toed shoes are never permitted on the production floor."],
      ["Why must loose jewellery be removed?", "it may catch in machinery", ["it affects sensors", "it can scratch products"], "Loose jewellery can catch in moving machinery."],
      ["What does a continuous alarm mean?", "evacuate the building", ["stop the nearest machine", "return to reception"], "A continuous alarm means everyone must evacuate by the marked route."],
      ["Where is the assembly point?", "beside the north gate", ["in the staff car park", "outside the canteen"], "The visitor assembly point is beside the north gate."],
      ["Who may take photographs?", "people with written permission", ["all visitors", "employees only"], "Photography requires written permission because some designs are confidential."],
      ["What should visitors do near forklifts?", "use marked walkways", ["wave to the driver", "walk behind the vehicle"], "Visitors must remain inside the blue marked walkways near forklift routes."],
      ["When may machinery be touched?", "during a supervised demonstration", ["whenever it is stopped", "after the tour"], "Machinery may be touched only during a supervised demonstration."],
      ["What information is on the visitor badge?", "emergency contact number", ["lunch choice", "passport number"], "The badge shows the site's emergency contact number."],
      ["Where does the induction end?", "in the training room", ["at the loading bay", "in the design office"], "The induction finishes in the training room with a short knowledge check."],
    ],
  },
  {
    part: 3, title: "远程团队协作研究", context: "三人讨论 · 教育培训场景", kind: "choice",
    speakers: [{ speaker: "Tutor", accent: "en-GB" }, { speaker: "Elena", accent: "en-US" }, { speaker: "Marcus", accent: "en-AU" }],
    intro: "Elena and Marcus, your study of remote teamwork needs a clearer sample and a more precise definition of collaboration.",
    facts: [
      ["Which teams will be included?", "software teams in three companies", ["all office workers", "freelancers working alone"], "The sample will include software teams from three companies."],
      ["What does the project mainly examine?", "how decisions are documented", ["which video tool is fastest", "employee salary levels"], "The main focus is how distributed teams document decisions."],
      ["Why are meeting recordings unsuitable?", "access is restricted", ["audio quality is poor", "meetings are too short"], "Companies will not grant broad access to confidential meeting recordings."],
      ["What data will replace recordings?", "decision logs", ["annual reports", "private messages"], "Decision logs and follow-up summaries provide a safer evidence source."],
      ["How many team leaders will be interviewed?", "nine", ["six", "twelve"], "Nine leaders, three per company, can be interviewed within the schedule."],
      ["What pattern appeared in the pilot?", "important choices were repeated", ["employees avoided meetings", "documents were never opened"], "Important choices were repeated across several channels, creating confusion about the final version."],
      ["What variable must be controlled?", "team size", ["office furniture", "employee age"], "Team size may affect communication volume and must be recorded."],
      ["Who will code the documents?", "both students independently", ["the company managers", "an external consultant"], "Both students will code a sample independently and compare results."],
      ["What will the analysis compare?", "clear and unclear decisions", ["profitable and unprofitable firms", "morning and evening meetings"], "They will compare cases where later action was clear with cases where it was disputed."],
      ["What does the tutor request next?", "a revised ethics form", ["more companies", "a new project title"], "The tutor asks for a revised ethics form covering document anonymisation."],
    ],
  },
  {
    part: 4, title: "建筑声学设计", context: "学术独白 · 大学讲座", kind: "gap",
    speakers: [{ speaker: "Lecturer", accent: "en-US" }],
    intro: "Today we will consider how room shape and materials influence speech, music and background noise.",
    facts: [
      ["Sound reaches a listener directly and through multiple ______.", "reflections", "A listener receives direct sound plus reflections from surrounding surfaces."],
      ["Hard parallel walls may create a repeated flutter ______.", "echo", "Hard parallel surfaces can produce a rapid flutter echo."],
      ["Absorptive materials convert some sound energy into ______.", "heat", "Absorptive materials convert a small amount of acoustic energy into heat."],
      ["Low-frequency control often requires thicker ______.", "materials", "Lower frequencies usually require thicker absorptive materials."],
      ["A lecture room needs high speech ______.", "intelligibility", "Lecture rooms should prioritise speech intelligibility."],
      ["Excessive absorption can make music sound ______.", "lifeless", "Too much absorption may make live music sound lifeless."],
      ["Background noise from ventilation should remain ______.", "steady", "Ventilation noise is less distracting when it remains low and steady."],
      ["Movable curtains provide acoustic ______.", "flexibility", "Movable curtains can change absorption and give a room acoustic flexibility."],
      ["Computer models must be checked with on-site ______.", "measurements", "Predictions from computer models should be checked against on-site measurements."],
      ["Users' experience is collected through interviews and ______.", "surveys", "Interviews and short surveys reveal how people actually experience the room."],
    ],
  },
];

const MOCK_H_SECTIONS: SectionSeed[] = [
  {
    part: 1, title: "音乐课程报名", context: "两人对话 · 日常社会场景", kind: "gap",
    speakers: [{ speaker: "Receptionist", accent: "en-GB" }, { speaker: "Learner", accent: "en-US" }],
    intro: "Hello, City Music Workshop. I can enrol you in the new term and arrange an instrument assessment.",
    facts: [
      ["Learner surname: ______", "Keller", "The learner is Daniel Keller, with double L."],
      ["Instrument: acoustic ______", "guitar", "Daniel wants the acoustic guitar course rather than electric guitar."],
      ["Previous experience: ______ years", ["2", "two"], "He played for two years at school but has not practised recently."],
      ["Course level: lower ______", "intermediate", "The tutor recommends lower intermediate after the assessment."],
      ["Lesson day: ______", "Wednesday", "Wednesday evening is available; Monday is already full."],
      ["Lesson begins: ______ p.m.", ["6:15", "6.15", "six fifteen"], "The class begins at six fifteen and lasts seventy-five minutes."],
      ["Room: Studio ______", ["B", "b"], "Classes take place in Studio B behind the main hall."],
      ["Term fee: £______", ["132", "one hundred and thirty-two"], "The twelve-week term costs one hundred and thirty-two pounds."],
      ["Required item: music ______", "stand", "Students bring a music stand, although spare chairs are provided."],
      ["Enrolment number: GTR______", ["619", "GTR619"], "The enrolment number is G T R six one nine."],
    ],
  },
  {
    part: 2, title: "城市艺术节志愿者说明", context: "单人独白 · 日常社会场景", kind: "choice",
    speakers: [{ speaker: "Festival Manager", accent: "en-GB" }],
    intro: "Thank you for volunteering at this year's City Arts Festival. I will explain changes to the venues and your shift responsibilities.",
    facts: [
      ["Where do volunteers collect badges?", "at the central library", ["at the town hall", "at each venue"], "All volunteers collect badges from the central library information room."],
      ["What colour shirts do information volunteers wear?", "green", ["blue", "orange"], "Information volunteers wear green shirts; orange is reserved for technical staff."],
      ["Why was the outdoor cinema moved?", "strong wind is forecast", ["ticket sales are low", "the screen is damaged"], "The outdoor cinema has moved indoors because strong wind is forecast."],
      ["Which venue has step-free access at the rear?", "the old theatre", ["the riverside stage", "the craft hall"], "The old theatre's step-free entrance is at the rear lane."],
      ["What should volunteers do before answering questions?", "check the live schedule", ["call the manager", "offer a printed leaflet"], "Check the live schedule because several performance times may change."],
      ["Who handles medical incidents?", "the first-aid team", ["venue artists", "security guards only"], "Contact the first-aid team through the radio for any medical incident."],
      ["Where may volunteers eat?", "in the staff tent", ["inside galleries", "at ticket desks"], "Meals should be eaten in the staff tent, not at public-facing positions."],
      ["What must be recorded after a lost child case?", "the time and location", ["the child's school", "the volunteer's opinion"], "Record the time and location after following the safeguarding procedure."],
      ["When does the evening briefing start?", "at five forty-five", ["at five fifteen", "at six thirty"], "The evening briefing begins at five forty-five in the library."],
      ["Where are radios returned?", "to the equipment desk", ["to the nearest artist", "to the police point"], "Return radios to the equipment desk before signing out."],
    ],
  },
  {
    part: 3, title: "公共健康宣传评估", context: "三人讨论 · 教育培训场景", kind: "choice",
    speakers: [{ speaker: "Tutor", accent: "en-AU" }, { speaker: "Noor", accent: "en-GB" }, { speaker: "Caleb", accent: "en-US" }],
    intro: "Noor and Caleb, your evaluation of the walking campaign needs to separate message reach from actual behaviour change.",
    facts: [
      ["What was the campaign's target behaviour?", "walking short local journeys", ["joining sports clubs", "buying fitness trackers"], "The campaign encouraged people to walk local journeys under two kilometres."],
      ["Where were posters displayed?", "at bus stops and clinics", ["inside schools only", "in sports shops"], "Posters appeared mainly at bus stops and health clinics."],
      ["What was measured before launch?", "residents' usual travel", ["air pollution", "shoe sales"], "A baseline survey recorded how residents usually made short journeys."],
      ["Why is website traffic insufficient?", "visits do not prove action", ["the site was unavailable", "older people had no access"], "Website visits show interest but do not prove that anyone walked more."],
      ["What extra evidence is available?", "pedestrian counts", ["hospital records", "fuel prices"], "Automatic pedestrian counts are available at four locations."],
      ["What problem affected one counter?", "nearby roadworks", ["heavy rain", "a software update"], "Roadworks diverted pedestrians past one counter and distorted its data."],
      ["Which participants will be interviewed?", "people who changed one journey", ["only campaign staff", "professional athletes"], "Interviews will focus on residents who changed at least one regular journey."],
      ["What factor should interviews explore?", "feeling of safety", ["knowledge of slogans", "choice of shoes"], "The team should ask whether routes felt safe and pleasant enough to use."],
      ["What will the final chart compare?", "baseline and follow-up travel", ["four poster designs", "different age groups only"], "The central chart will compare baseline and follow-up travel choices."],
      ["What conclusion must be avoided?", "that the campaign alone caused change", ["that some people saw posters", "that short trips exist"], "Other street changes occurred, so the campaign cannot be claimed as the only cause."],
    ],
  },
  {
    part: 4, title: "双语与健康老龄化", context: "学术独白 · 大学讲座", kind: "gap",
    speakers: [{ speaker: "Lecturer", accent: "en-GB" }],
    intro: "This lecture reviews research on lifelong bilingualism, cognitive control and healthy ageing.",
    facts: [
      ["Bilingual speakers continually manage competing language ______.", "systems", "Bilingual speakers manage two competing language systems even when using only one."],
      ["This management may exercise selective ______.", "attention", "Selecting the intended language may exercise selective attention."],
      ["Studies often compare the age of dementia symptom ______.", "onset", "Many studies compare the reported age of symptom onset."],
      ["Education and income are important background ______.", "variables", "Education, income and migration history are important background variables."],
      ["Speaking two languages does not prevent brain ______.", "disease", "Bilingual experience does not prevent the underlying brain disease."],
      ["It may contribute to cognitive ______.", "reserve", "Researchers instead discuss a possible contribution to cognitive reserve."],
      ["Benefits appear stronger with frequent active ______.", "use", "Frequent active use of both languages may matter more than early classroom exposure alone."],
      ["Self-reported language skill can be difficult to ______.", "verify", "Self-reported skill and use are difficult to verify consistently."],
      ["Longitudinal studies follow the same people over ______.", "time", "Longitudinal research follows the same individuals over time."],
      ["Social connection may partly explain positive health ______.", "outcomes", "Social connection and continued learning may partly explain positive health outcomes."],
    ],
  },
];

const mock = (id: string, title: string, sections: SectionSeed[]): ListeningMock => ({
  id,
  title,
  level: "6.5–7.0 标准 · 原创仿真",
  sections: sections.map(makeSection),
});

export const ADDITIONAL_LISTENING_MOCKS: ListeningMock[] = [
  mock("mock-d", "Mock D · 城市生活与生态研究", MOCK_D_SECTIONS),
  mock("mock-e", "Mock E · 旅行、学习与记忆", MOCK_E_SECTIONS),
  mock("mock-f", "Mock F · 社区行动与环境修复", MOCK_F_SECTIONS),
  mock("mock-g", "Mock G · 工作、技术与空间", MOCK_G_SECTIONS),
  mock("mock-h", "Mock H · 文化、健康与沟通", MOCK_H_SECTIONS),
];
