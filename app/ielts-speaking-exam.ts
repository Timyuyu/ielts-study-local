import { ADDITIONAL_PART3_QUESTIONS } from "./additional-speaking-bank.ts";

export interface Part3Question {
  id: string;
  topic: string;
  question: string;
  answer: string;
  phrases: string[];
  coaching: string;
}

export interface SpeakingMockSet {
  id: string;
  title: string;
  part1Topic: string;
  part1Questions: string[];
  part2: {
    prompt: string;
    bullets: string[];
  };
  part3Ids: string[];
}

type Part3Spec = readonly [
  id: string,
  topic: string,
  question: string,
  position: string,
  reason: string,
  example: string,
  caveat: string,
  phrases: readonly [string, string, string],
];

const PART3_SPECS: Part3Spec[] = [
  ["p3-01", "Work", "Why do some people change careers several times?", "The main reason is that people these days expect more from work than just a steady salary.", "They also want room to grow, some flexibility, and the feeling that their skills will still matter as industries change.", "Like, an office administrator might retrain in digital marketing when their routine tasks get automated.", "But switching careers over and over can be risky if you don't research the new field first.", ["a stable salary", "retrain in", "made without researching"]],
  ["p3-02", "Work", "Should employers be responsible for training their staff?", "Employers should take real responsibility for job-specific training.", "The company benefits directly when staff use new systems safely and efficiently, so dumping all the training costs on workers isn't fair.", "A manufacturer, for instance, should teach workers to use new equipment before expecting full productivity.", "That said, employees still need to keep up broader skills like communication and digital literacy themselves.", ["job-specific training", "benefits directly", "broader skills"]],
  ["p3-03", "Work", "Is working from home likely to remain common?", "I think hybrid work will stick around in jobs that don't need you physically there.", "It cuts commuting and gives people more control over focused work.", "Lots of tech firms now bring staff in for collaboration but let them write reports from home.", "It won't suit hospitality, healthcare, or anyone without a quiet home setup.", ["physical presence", "focused tasks", "will not suit"]],
  ["p3-04", "Work", "What makes a job attractive apart from salary?", "A good job usually comes with respectful management, reasonable autonomy, and a real chance to move up.", "People spend a huge part of their lives at work, so how they're treated day to day often matters more than a small pay gap.", "A supportive boss who gives useful feedback can make a tough role totally doable.", "Priorities shift with life stage too; some workers care more about security than promotion.", ["reasonable autonomy", "useful feedback", "vary by life stage"]],
  ["p3-05", "Work", "Will technology create more jobs than it removes?", "Technology will probably create new roles, but the gains won't be spread evenly.", "Automation removes some routine tasks while raising demand for design, maintenance, and human-centred services.", "Online retail killed some shop jobs but created work in logistics and digital support.", "The transition can still hurt unless training actually reaches the people whose old jobs disappear.", ["distributed evenly", "routine tasks", "the transition"]],

  ["p3-06", "Education", "What skills should schools teach for future employment?", "Schools should pair solid reading, writing and maths with problem-solving, teamwork, and good digital judgement.", "Specific software changes fast, but students will keep needing to judge information and pick up unfamiliar tools.", "A group project can teach planning and negotiation if individual contributions are marked fairly.", "These practical skills should support subject knowledge, not replace it.", ["digital judgement", "evaluate information", "complement subject knowledge"]],
  ["p3-07", "Education", "Are examinations a fair way to measure ability?", "Exams are useful for comparing people under the same conditions, but they only measure part of someone's ability.", "Time pressure rewards memory and speed more than teamwork, creativity, or long-term investigation.", "A strong student might produce excellent projects yet struggle in a two-hour written test.", "The fairest system mixes exams with coursework while protecting both from cheating.", ["consistent conditions", "time pressure", "combines exams with coursework"]],
  ["p3-08", "Education", "Why do adults return to education?", "Adults often go back to school because their career changed, or because earlier responsibilities got in the way.", "Mature students usually have a clearer goal and can link theory to work experience.", "Someone might take an evening accounting course after being promoted to manage a budget.", "But they also face more pressure from work, childcare, and course fees.", ["a clearer purpose", "workplace experience", "face greater pressure"]],
  ["p3-09", "Education", "Should university education be free?", "Governments should make university affordable, especially where society needs qualified professionals.", "High fees can stop capable students from low-income families applying at all.", "Public support for nursing or engineering degrees can fix serious skill shortages.", "Fully free tuition for every course may be too expensive, so grants could target need and public benefit.", ["low-income families", "skill shortages", "targeted by need"]],
  ["p3-10", "Education", "How has online learning changed education?", "Online learning has widened access and made short, specialised courses much easier to offer.", "Learners can study around work and replay tricky explanations.", "A worker in a small town can now take a course taught by a university abroad.", "Completion can be low without deadlines, interaction, and quick feedback, so good online design needs more than recorded lectures.", ["widened access", "replay explanations", "timely feedback"]],

  ["p3-11", "Cities", "Why do young people move to large cities?", "Young adults are mainly pulled in by concentrated jobs, education, and social life.", "A big city lets them change jobs or find their crowd without having to move again.", "Creative industries, for instance, tend to cluster in a few urban centres.", "But high rents and long commutes can eventually push people toward smaller cities.", ["concentrated opportunities", "form networks", "push people toward"]],
  ["p3-12", "Cities", "How can cities remain affordable for workers?", "Cities need a mix of housing supply, tenant protection, and reliable public transport.", "Building only expensive apartments does nothing for teachers, service staff, or young workers.", "Affordable homes near rail and bus lines can widen the area people can reach jobs from.", "Rent controls alone can scare off construction, so policy has to balance protection with long-term supply.", ["housing supply", "widen the area", "balance immediate protection"]],
  ["p3-13", "Cities", "Should private cars be restricted in city centres?", "Some restrictions make sense where congestion and pollution hurt a lot of residents.", "Pedestrian zones and congestion charges can make buses faster and streets safer.", "A delivery driver, though, has very different needs from a commuter who has a direct train option.", "So restrictions should come with decent transport alternatives and exemptions for trips that really matter.", ["are justified", "direct train alternative", "paired with"]],
  ["p3-14", "Cities", "What makes a public space successful?", "A successful public space is safe, comfortable, and useful to different groups all day long.", "People need seats, shade, clear routes, and a reason to stay rather than just pass through.", "A square with a small market and a play area can pull in both workers and families.", "Good design alone won't work if maintenance is poor or events shut out local residents.", ["throughout the day", "pass through", "design alone is insufficient"]],
  ["p3-15", "Cities", "Will smaller towns become more popular in future?", "Smaller towns might attract more people if remote and hybrid work keep going.", "They can offer cheaper housing, shorter trips, and stronger local connections.", "Someone who only goes into the city office twice a month may no longer need to live nearby.", "It'll depend on broadband, healthcare, and transport; pretty scenery can't make up for weak basic services.", ["local connections", "depend on", "compensate for"]],

  ["p3-16", "Technology", "Why do people replace devices that still work?", "People replace working devices because of marketing, social pressure, and software support ending.", "A device may still work mechanically but become annoying once apps stop running or batteries can't be replaced.", "Some phone users upgrade mainly because a contract makes the monthly cost feel small.", "Consumers also keep devices longer when repair guides and spare parts are easy to find.", ["software support", "monthly cost", "spare parts"]],
  ["p3-17", "Technology", "Should companies collect less personal data?", "Companies should only collect what's necessary for a clearly explained service.", "Big datasets create risks of misuse, leaks, and decisions users can't challenge.", "A weather app may need your rough location but not your contact list.", "Some data can improve safety or personalisation, as long as consent is real and deletion is possible.", ["clearly stated", "risks of misuse", "provided consent is genuine"]],
  ["p3-18", "Technology", "Does social media strengthen or weaken relationships?", "It can do both; it depends on whether it supports real contact or just replaces it.", "Messaging helps distant friends stay aware of each other's lives.", "But passively watching updates can feel like closeness without any actual conversation.", "So the effect depends less on screen time alone than on the quality and purpose of the interaction.", ["meaningful contact", "an illusion of closeness", "quality and purpose"]],
  ["p3-19", "Technology", "How should children learn to use artificial intelligence?", "Kids should learn to question AI output, protect private info, and show where they used help.", "The tools can support brainstorming and feedback, but confident wording doesn't guarantee accuracy.", "A student could compare an AI summary with the original source and spot what's missing.", "Banning it completely would throw away a chance to teach good judgement before the tools hit workplaces.", ["question AI output", "original source", "responsible judgement"]],
  ["p3-20", "Technology", "Will machines ever replace human teachers?", "Machines will automate parts of teaching, but they're unlikely to replace the whole job.", "Software can give repeated practice and instant correction, while teachers read emotions, motivation, and social dynamics.", "An app can flag a wrong answer, but a teacher can find out that anxiety or unclear instructions caused it.", "Tech works best when it frees teachers up for the human support that actually matters.", ["repeated practice", "social dynamics", "high-value human support"]],

  ["p3-21", "Environment", "Who should pay for environmental damage?", "The organisation that causes the damage should pay first, then the wider system can share the rest.", "When polluters don't cover the cost, taxpayers and local residents end up carrying it.", "A factory that dumps waste should fund the cleanup before public money steps in.", "But some old damage has no clear owner, so governments still need a fund for those cases.", ["measurable damage", "transferring the burden", "fund clean-up"]],
  ["p3-22", "Environment", "Can individual actions solve climate change?", "Individual action matters, but it can't replace policy and industrial change.", "Personal choices shape demand and make stronger public measures politically possible.", "Taking the bus helps, but only if the government actually runs a reliable network.", "The best approach links household behaviour with changes in energy, construction, and transport.", ["influence demand", "depends on", "links household behaviour"]],
  ["p3-23", "Environment", "Why is it difficult to reduce waste?", "Waste is baked into how products are designed, sold, and delivered.", "People may want to reuse things but face packaging they can't avoid and repairs that cost more than replacement.", "A sealed appliance with no spare parts leaves the owner almost no choice.", "Habits matter too, so rules should come with clearer information and real alternatives.", ["embedded in", "few practical choices", "accessible alternatives"]],
  ["p3-24", "Environment", "Should flights become more expensive?", "Frequent and unnecessary flying should carry more of its environmental cost.", "Higher prices can cut short trips where rail works fine and can fund cleaner transport.", "A business traveller between nearby cities might choose a fast train instead.", "Policy should protect the travel people genuinely need and avoid cutting off remote communities with no substitute.", ["reflect the cost", "realistic alternative", "practical substitute"]],
  ["p3-25", "Environment", "How can workplaces become more sustainable?", "Workplaces should first measure their biggest sources of energy use, travel, and waste.", "Visible evidence stops companies from focusing only on symbolic gestures.", "A firm might find that inefficient heating matters far more than removing paper cups.", "Staff participation helps, but management has to fund changes and make sustainability part of buying decisions.", ["largest sources", "symbolic actions", "purchasing decisions"]],

  ["p3-26", "Health", "Why do many people struggle to exercise regularly?", "The main barriers are time, tiredness, cost, and surroundings built for sitting.", "Advice alone is weak when people work long hours or have nowhere safe to walk.", "A parent may want to exercise but can't get to a gym without childcare.", "Small routines and convenient facilities are more sustainable than big plans built on motivation alone.", ["main barriers", "advice alone", "more sustainable"]],
  ["p3-27", "Health", "Should employers support staff health?", "Employers should reduce the health risks their work creates and make healthy choices practical.", "Reasonable workloads, safe equipment, and real breaks affect both wellbeing and performance.", "A warehouse can rotate repetitive tasks and provide recovery areas.", "Employers shouldn't poke into private medical decisions or use wellness programmes as a substitute for fair conditions.", ["health risks", "genuine breaks", "a substitute for"]],
  ["p3-28", "Health", "Why is public health information sometimes ignored?", "People may distrust the source, find the advice unrealistic, or face barriers information can't remove.", "Warnings also lose power when they're vague or scary but offer nothing you can actually do.", "Telling people to eat fresh food doesn't help much if it's expensive locally.", "Messages work better when they're specific, honest about uncertainty, and backed by practical services.", ["distrust the source", "lose impact", "transparent about uncertainty"]],
  ["p3-29", "Health", "Is prevention more important than treatment?", "Prevention deserves more money because it can reduce suffering before expensive treatment is needed.", "Vaccination, screening, and safer streets can protect whole populations.", "Early blood-pressure checks might stop a medical emergency years later.", "Treatment is still really important, because not every illness is preventable, and people shouldn't be blamed for getting sick.", ["deserves more investment", "entire populations", "not every illness is preventable"]],
  ["p3-30", "Health", "How might healthcare change in the next twenty years?", "Healthcare will probably use more remote monitoring, personalised data, and routine automation.", "These tools can spot changes earlier and let clinicians focus on complex decisions.", "A heart patient might send daily readings from home instead of travelling all the time.", "Systems still need to protect privacy and keep face-to-face care for people who need examination or human reassurance.", ["remote monitoring", "complex decisions", "human reassurance"]],

  ["p3-31", "Transport", "Why do people continue to drive despite congestion?", "Driving is often still the most predictable option for complicated journeys.", "Public transport may not link homes, workplaces, and childcare at the times people need.", "A commuter might put up with traffic because two bus changes would take way longer.", "Some trips are just habit, so reliable alternatives and clear info can still persuade drivers to change.", ["predictable option", "complex journeys", "persuade drivers"]],
  ["p3-32", "Transport", "Should public transport be free?", "Very low fares can help access, but totally free travel isn't always the best use of limited money.", "Passengers care about frequency, safety, and reliability just as much as price.", "A free bus that comes once an hour doesn't help a shift worker much.", "Targeted discounts plus investment in service quality may do more good.", ["limited funds", "service quality", "targeted discounts"]],
  ["p3-33", "Transport", "How can commuting time affect quality of life?", "Long, unpredictable commutes eat into sleep, family time, and exercise.", "They also add stress, because one small delay can mess up work or the school run.", "Someone travelling ninety minutes each way loses fifteen hours every week.", "A comfortable train ride hurts less when you can read or work, so reliability and conditions matter too.", ["unpredictable commutes", "every week", "conditions matter"]],
  ["p3-34", "Transport", "Will self-driving vehicles improve cities?", "They may cut some accidents, but they won't fix congestion on their own.", "If driverless cars travel empty to pick people up, total distance could actually rise.", "Shared driverless shuttles might help older people reach transport hubs.", "Cities still need to prioritise walking, cycling, and high-capacity public transport instead of treating automation as the whole answer.", ["automatically solve", "vehicle distance", "high-capacity"]],
  ["p3-35", "Transport", "Why is cycling common in some cities but not others?", "Cycling takes off when routes feel continuous, safe, and convenient for everyday trips.", "Culture matters, but infrastructure really shapes what people see as normal.", "Protected lanes and secure parking let less confident riders join in.", "Hills and weather have some effect, though e-bikes and good maintenance can lower those barriers.", ["ordinary trips", "strongly shapes", "reduce barriers"]],

  ["p3-36", "Culture", "Why should traditional crafts be preserved?", "Traditional crafts preserve practical knowledge and a community's way of reading materials and place.", "They can also support distinctive local jobs instead of mass-produced souvenirs.", "A weaving method may carry knowledge about plants, climate, and social history.", "Preservation should let craftspeople innovate; freezing a tradition can make it economically pointless.", ["practical knowledge", "distinctive local employment", "allow craftspeople to innovate"]],
  ["p3-37", "Culture", "Does tourism protect or damage local culture?", "Tourism can fund preservation, but too much demand can turn living traditions into shows for visitors.", "Income gives communities a reason to maintain buildings and skills.", "At the same time, central areas may lose residents when homes become short-term rentals.", "It comes down to local control, visitor numbers, and whether the money actually stays in the community.", ["fund preservation", "living traditions", "local control"]],
  ["p3-38", "Culture", "Why do international films become popular?", "International films break through when a specific story also carries emotions people everywhere recognise.", "Streaming and subtitles have lowered the practical barriers to finding them.", "A family drama set in one country can still speak about ambition, conflict, or loss.", "Marketing still matters, because plenty of great films never get shown widely enough to find an audience.", ["practical barriers", "communicate universally", "find an audience"]],
  ["p3-39", "Culture", "Should museums return objects to their countries of origin?", "Museums should return objects taken through force, theft, or clearly unequal deals.", "Ownership isn't just legal; cultural objects can carry spiritual and historical meaning for living communities.", "Return can be paired with loans and research partnerships that keep public access open.", "Every case is different, so decisions need transparent evidence rather than one blanket rule based on age.", ["countries of origin", "living communities", "transparent evidence"]],
  ["p3-40", "Culture", "How can cities support local artists?", "Cities can offer affordable workspace, small grants, and access to public venues.", "Artists often need time and space more than one big competition prize.", "Unused shops could host temporary studios and exhibitions cheaply.", "Funding decisions should be independent and reach different communities, otherwise support just flows to existing networks.", ["affordable workspace", "temporary studios", "established networks"]],

  ["p3-41", "Community", "Why are some neighbours less connected than in the past?", "Frequent moving, long working hours, and car-based routines cut down casual contact.", "People might share a building but enter through private parking and barely ever meet.", "In older streets, local shops and front gardens used to create little conversations over and over.", "Online groups can rebuild some connection, but trust usually grows faster through regular face-to-face contact.", ["casual contact", "repeated conversations", "face-to-face activity"]],
  ["p3-42", "Community", "What makes people volunteer?", "People volunteer when they see a clear need, believe their effort will help, and feel welcomed by the group.", "Social connection is often just as important as the cause itself.", "A weekend river clean-up gives an instant visible result and introduces neighbours.", "Groups lose volunteers when roles are unclear or the time demanded is more than was promised.", ["a clear need", "visible result", "roles are unclear"]],
  ["p3-43", "Community", "Should governments fund community centres?", "Public funding makes sense, because community centres provide benefits commercial services can't profitably offer.", "They can reduce isolation, host advice services, and give young people a safe place to hang out.", "A modest centre might prevent bigger social costs down the road.", "But funding should require proof of local use and avoid forcing the same programme on every neighbourhood.", ["is justified", "reduce isolation", "evidence of local use"]],
  ["p3-44", "Community", "How can different generations learn from each other?", "Regular shared projects work better than occasional formal events.", "Older people can offer professional and historical knowledge, while younger people can bring current digital skills.", "A community archive project could combine student interviews with long-term residents' memories.", "The exchange should go both ways, not assume only one generation has valuable knowledge.", ["shared projects", "historical knowledge", "the exchange should be mutual"]],
  ["p3-45", "Community", "Is it easier to build community online?", "Online tools make it easier to find people who share your interests, especially across distance.", "They lower the cost of organising and let people join from home.", "A local group can quickly coordinate help during a storm over messaging.", "Strong communities still need trust and accountability, which are harder to judge when identities and commitments stay temporary.", ["lower the cost", "coordinate help", "trust and accountability"]],

  ["p3-46", "Success", "How has the meaning of success changed?", "Success is being defined more by autonomy, wellbeing, and meaningful work than by status alone.", "More awareness of burnout has made people question careers that look great but swallow their whole life.", "A worker might pick a smaller company for flexibility instead of a famous employer.", "But income and status still matter a lot where financial security is shaky.", ["defined through", "awareness of burnout", "financial security"]],
  ["p3-47", "Success", "Do successful people need to take risks?", "Most achievement involves some uncertainty, but useful risk is calculated, not reckless.", "You need to test assumptions, cap your possible losses, and prepare alternatives.", "A business owner might trial a product with a small customer group before putting in all their savings.", "Persistence is valuable, but refusing to kill a failing plan can turn courage into bad judgement.", ["calculated risk", "test assumptions", "poor judgement"]],
  ["p3-48", "Success", "Why do societies admire famous people?", "Famous people give society visible stories through which we talk about ambition, talent, and identity.", "Media repetition also creates familiarity, which people can mistake for importance.", "An athlete's discipline might genuinely inspire young people.", "Admiration gets unhealthy when fame is treated as proof of expertise or character in unrelated areas.", ["visible stories", "media repetition", "proof of expertise"]],
  ["p3-49", "Success", "Should children be rewarded for every achievement?", "Children need recognition, but constant external rewards can weaken their interest in the activity itself.", "Specific feedback helps them understand effort and strategy instead of just chasing prizes.", "Praising a kid for revising a tough draft is more useful than paying them for every high mark.", "Occasional rewards are fine to celebrate big milestones, as long as they don't become the only reason to learn.", ["external rewards", "specific feedback", "major milestones"]],
  ["p3-50", "Success", "Can failure be more useful than success?", "Failure can be more informative, because it reveals weaknesses that success hides.", "But its value depends on getting feedback and having another chance to try.", "A rejected job application can expose an unclear CV or a gap in interview prep.", "Repeated failure without support just damages confidence, so reflection has to lead to a real change.", ["more informative", "expose a gap", "lead to a practical change"]],
];

const CORE_PART3_QUESTIONS: Part3Question[] = PART3_SPECS.map(
  ([id, topic, question, position, reason, example, caveat, phrases]) => ({
    id,
    topic,
    question,
    answer: `${position} ${reason} ${example} ${caveat}`,
    phrases: [...phrases],
    coaching: "立场 → 原因 → 例子 → 限定；避免只谈个人经历，要把讨论提升到群体或社会层面。",
  }),
);

export const PART3_QUESTIONS: Part3Question[] = [
  ...CORE_PART3_QUESTIONS,
  ...ADDITIONAL_PART3_QUESTIONS,
];

export const SPEAKING_MOCKS: SpeakingMockSet[] = [
  {
    id: "sp-mock-01",
    title: "Mock 01 · Work & Career",
    part1Topic: "Work or studies",
    part1Questions: ["Do you work or are you a student?", "What do you enjoy most about your work or studies?", "What skill would you like to improve?", "Would you like to do the same work in the future?"],
    part2: { prompt: "Describe a job you think would be interesting.", bullets: ["what the job is", "what skills it requires", "why it interests you", "whether you would like to do it"] },
    part3Ids: ["p3-01", "p3-02", "p3-03", "p3-04", "p3-05"],
  },
  {
    id: "sp-mock-02",
    title: "Mock 02 · Education",
    part1Topic: "Learning",
    part1Questions: ["What are you learning at the moment?", "Do you prefer learning alone or with others?", "Which subject was difficult at school?", "How often do you use online courses?"],
    part2: { prompt: "Describe a useful skill you learned outside school.", bullets: ["what it was", "why you learned it", "how you learned it", "how it has helped you"] },
    part3Ids: ["p3-06", "p3-07", "p3-08", "p3-09", "p3-10"],
  },
  {
    id: "sp-mock-03",
    title: "Mock 03 · Cities",
    part1Topic: "Your neighbourhood",
    part1Questions: ["What is your neighbourhood like?", "What do you usually do there?", "Has it changed recently?", "Would you like to live there in the future?"],
    part2: { prompt: "Describe a public place you enjoy visiting.", bullets: ["where it is", "what it looks like", "what people do there", "why you enjoy it"] },
    part3Ids: ["p3-11", "p3-12", "p3-13", "p3-14", "p3-15"],
  },
  {
    id: "sp-mock-04",
    title: "Mock 04 · Technology",
    part1Topic: "Technology",
    part1Questions: ["What device do you use most?", "Is there technology you find difficult?", "How has technology changed your work?", "Do you take breaks from screens?"],
    part2: { prompt: "Describe a piece of technology that is useful to you.", bullets: ["what it is", "when you started using it", "how you use it", "why it is useful"] },
    part3Ids: ["p3-16", "p3-17", "p3-18", "p3-19", "p3-20"],
  },
  {
    id: "sp-mock-05",
    title: "Mock 05 · Environment",
    part1Topic: "Nature",
    part1Questions: ["Do you spend much time outdoors?", "What natural place is near your home?", "Did you learn about nature as a child?", "What environmental issue concerns you?"],
    part2: { prompt: "Describe an environmental activity you took part in.", bullets: ["what it was", "where and when it happened", "who joined you", "what effect it had"] },
    part3Ids: ["p3-21", "p3-22", "p3-23", "p3-24", "p3-25"],
  },
  {
    id: "sp-mock-06",
    title: "Mock 06 · Health",
    part1Topic: "Healthy routines",
    part1Questions: ["What do you do to stay healthy?", "Do you get enough sleep?", "Did you play sport as a child?", "What healthy habit would you like to develop?"],
    part2: { prompt: "Describe a healthy change you made.", bullets: ["what the change was", "why you made it", "how difficult it was", "what result it had"] },
    part3Ids: ["p3-26", "p3-27", "p3-28", "p3-29", "p3-30"],
  },
  {
    id: "sp-mock-07",
    title: "Mock 07 · Transport",
    part1Topic: "Travel",
    part1Questions: ["How do you usually travel to work or study?", "What transport is common in your city?", "Do you enjoy long journeys?", "What would improve travel in your area?"],
    part2: { prompt: "Describe a journey that took longer than expected.", bullets: ["where you were going", "how you travelled", "why it took longer", "how you felt"] },
    part3Ids: ["p3-31", "p3-32", "p3-33", "p3-34", "p3-35"],
  },
  {
    id: "sp-mock-08",
    title: "Mock 08 · Culture",
    part1Topic: "Films and museums",
    part1Questions: ["What kind of films do you like?", "How often do you visit museums?", "Did your family visit cultural places?", "Would you like to learn a traditional craft?"],
    part2: { prompt: "Describe a cultural place you visited.", bullets: ["where it was", "when you went", "what you saw", "why it was memorable"] },
    part3Ids: ["p3-36", "p3-37", "p3-38", "p3-39", "p3-40"],
  },
  {
    id: "sp-mock-09",
    title: "Mock 09 · Community",
    part1Topic: "Neighbours",
    part1Questions: ["Do you know your neighbours?", "How often do people help each other?", "Are local events popular?", "What makes a neighbourhood friendly?"],
    part2: { prompt: "Describe a person who helps their community.", bullets: ["who the person is", "what they do", "how you know about them", "why their work matters"] },
    part3Ids: ["p3-41", "p3-42", "p3-43", "p3-44", "p3-45"],
  },
  {
    id: "sp-mock-10",
    title: "Mock 10 · Success",
    part1Topic: "Goals",
    part1Questions: ["Do you set personal goals?", "What goal are you working on now?", "Who encourages you?", "How do you celebrate progress?"],
    part2: { prompt: "Describe a goal you achieved.", bullets: ["what the goal was", "why it mattered", "what you did", "how you felt afterwards"] },
    part3Ids: ["p3-46", "p3-47", "p3-48", "p3-49", "p3-50"],
  },
];

export const SPEAKING_BAND_ANCHORS = {
  fluency: {
    name: "Fluency & Coherence",
    zh: "流利度与连贯性",
    band6: "能持续作答，但会因犹豫、重复或自我纠正偶尔失去连贯；连接手段不总是自然。",
    band7: "能较轻松地长段表达，偶有语言搜索；连接词与话语标记使用较灵活。",
  },
  vocabulary: {
    name: "Lexical Resource",
    zh: "词汇资源",
    band6: "词汇足以展开多数话题，选词偶有不当但意思清楚，通常能够换一种说法。",
    band7: "能灵活讨论多类话题，使用部分不常见词和搭配，并有效改述。",
  },
  grammar: {
    name: "Grammatical Range & Accuracy",
    zh: "语法范围与准确性",
    band6: "能混合简单和复杂句；复杂结构常有错误，但通常不妨碍理解。",
    band7: "能较灵活使用多种复杂结构，并经常产出无错误句子，仍有少量语法问题。",
  },
  pronunciation: {
    name: "Pronunciation",
    zh: "发音",
    band6: "使用一定范围的语音特征但控制不稳定；整体通常能听懂，个别发音影响清晰度。",
    band7: "具备Band 6全部积极特征，并表现出部分Band 8特征；整体容易理解。",
  },
} as const;
