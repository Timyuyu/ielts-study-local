export interface ChoiceQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface ReadingBankItem {
  id: string;
  title: string;
  lead: string;
  paragraphs: string[];
  questions: ChoiceQuestion[];
}

export interface ListeningBankItem {
  id: string;
  label: string;
  title: string;
  transcript: string;
  questions: ChoiceQuestion[];
}

export interface WritingBankItem {
  id: string;
  topic: string;
  prompt: string;
  instruction: string;
  type: string;
  goal: string;
}

type ReadingSpec = readonly [
  id: string,
  title: string,
  lead: string,
  previousApproach: string,
  change: string,
  result: string,
  lesson: string,
];

const READING_SPECS: ReadingSpec[] = [
  ["r01", "Cooler Schoolyards", "A field study examined how shade changes learning spaces", "many urban schools relied on large asphalt yards that became extremely hot in summer", "planted native trees and replaced dark paving with pale, permeable surfaces", "afternoon ground temperatures fell and pupils spent more breaks outdoors", "small design changes can improve both comfort and daily use when their effects are measured"],
  ["r02", "Libraries After Dark", "One city tested whether later library hours would reach new readers", "branches closed before many commuters returned from work", "kept three neighbourhood libraries open until ten o'clock on weekdays", "evening visits rose sharply while daytime attendance remained stable", "public services may reach different groups when opening hours reflect real routines"],
  ["r03", "Bees Above the City", "Researchers studied beehives placed on office rooftops", "urban biodiversity projects focused mainly on parks at street level", "installed small hives beside rooftop gardens and monitored nearby flowers", "bee numbers increased without reducing populations in the surrounding parks", "unused roof space can support wildlife if food supply and colony health are carefully tracked"],
  ["r04", "Buses That Bend", "A rural transport trial replaced fixed routes with flexible stops", "nearly empty buses followed the same long route every hour", "allowed passengers to request approved stops through a phone line or simple app", "average journey times shortened and more older residents used the service", "limited flexibility can make public transport more useful without removing reliable schedules"],
  ["r05", "A Museum You Can Touch", "An exhibition challenged the rule that visitors must never handle objects", "replicas were kept behind glass even when they had little financial value", "created a supervised table of durable copies that visitors could lift and examine", "families stayed longer and recalled more details in follow-up interviews", "carefully designed physical interaction can deepen learning while original objects remain protected"],
  ["r06", "Compost on the Corner", "A neighbourhood compared central compost bins with home collection", "food scraps were mixed with general waste and transported out of the district", "placed sealed compost hubs beside existing recycling points", "participation doubled and complaints about smell remained rare", "convenient shared facilities can change habits when maintenance is planned from the start"],
  ["r07", "Quieter Nights in Hospital", "A hospital investigated why patients slept poorly", "staff completed many routine checks separately throughout the night", "grouped non-urgent checks and reduced corridor lighting after midnight", "patients reported longer sleep and staff recorded no increase in safety incidents", "small changes to routine can improve recovery when essential monitoring is preserved"],
  ["r08", "Concrete Used Twice", "Engineers tested crushed building waste in new pavements", "demolished concrete was normally sent to landfill outside the city", "replaced part of the new stone aggregate with carefully graded recycled material", "the test pavement matched standard strength while using less newly quarried stone", "recycled materials can perform well when their quality is controlled rather than assumed"],
  ["r09", "Signs in Two Languages", "A station redesigned signs for a growing multilingual district", "translations were added inconsistently and often used smaller lettering", "tested bilingual signs with equal type size and repeated colour-coded symbols", "first-time visitors reached platforms faster and asked staff fewer questions", "clear visual hierarchy matters as much as translation when information must be understood quickly"],
  ["r10", "Counting Birds Together", "Scientists invited residents to report garden birds", "annual surveys depended on a small team visiting a limited number of sites", "trained volunteers to submit timed observations through paper forms or an app", "the project covered five times more locations and still produced consistent population trends", "citizen science can expand research when instructions and verification are built into the method"],
  ["r11", "Seagrass Returns", "Marine biologists restored a damaged coastal meadow", "large areas were replanted at once despite strong seasonal currents", "tested small seed bags in sheltered zones before expanding the project", "survival rates improved and young fish returned to the recovering habitat", "restoration is more reliable when local conditions are tested before work is scaled up"],
  ["r12", "The Tool Library", "A community centre began lending equipment instead of only books", "residents bought drills and ladders that were rarely used", "created a membership system for borrowing tools and attending repair lessons", "household spending on occasional equipment fell and repair activity increased", "shared access can be more valuable than ownership for items people need infrequently"],
  ["r13", "A Later School Bell", "A secondary school moved the start of the day", "teenagers began lessons at seven thirty despite long travel times", "shifted the timetable forty-five minutes later without reducing teaching hours", "lateness decreased and first-period test scores improved", "schedules designed around adolescent sleep patterns may support both attendance and concentration"],
  ["r14", "Meetings Without Mondays", "A company tested one meeting-free day each week", "short internal meetings interrupted focused work throughout every weekday", "reserved Monday afternoons for uninterrupted individual tasks", "project completion accelerated while urgent decisions were still handled through a clear exception rule", "protected focus time works best when teams also agree how genuine emergencies will be managed"],
  ["r15", "Labels That Reduce Waste", "A supermarket changed how expiry information was presented", "customers often confused quality dates with food-safety deadlines", "added plain-language storage advice beside the existing date labels", "fewer edible products were discarded and reported food-safety problems did not rise", "better explanations can change behaviour without removing information consumers already recognise"],
  ["r16", "Darker Streets, Safer Insects", "Ecologists examined the effect of night lighting on moths", "park lamps shone upward and used bright blue-white bulbs all night", "fitted warmer lights with shields that directed illumination toward paths", "moth activity recovered while pedestrians rated the paths just as safe", "lighting can serve people and wildlife when colour and direction are considered together"],
  ["r17", "Gardens That Hold Rain", "A flood-prone street introduced planted drainage beds", "rainwater flowed directly from roofs and roads into overloaded pipes", "built shallow rain gardens that temporarily stored and filtered runoff", "peak water entering the drainage system fell during heavy storms", "working with natural absorption can reduce pressure on conventional urban infrastructure"],
  ["r18", "Forests the Size of a Court", "Residents planted a dense microforest on unused land", "the narrow plot was mown regularly but offered little shade or habitat", "planted many native species closely together and recorded their growth", "the trees grew quickly and summer air near the plot became cooler", "even small sites can deliver ecological benefits when species suit the local environment"],
  ["r19", "Notes in Digital Textbooks", "A college compared private and shared online annotations", "students read electronic chapters individually and rarely discussed difficult passages", "allowed classes to attach questions and explanations to specific lines", "students returned to complex sections more often and exam performance improved", "digital reading becomes more active when learners can make thinking visible to one another"],
  ["r20", "Sensors Beneath the Soil", "Farmers tested low-cost moisture sensors in dry fields", "irrigation followed a fixed calendar regardless of recent rainfall", "used soil readings to decide when each field actually needed water", "water use fell while crop yields remained unchanged", "simple measurements can improve resource use when they directly guide everyday decisions"],
  ["r21", "A Calmer Station", "Transport planners changed how passengers entered a busy platform", "people crowded around one central information screen", "added smaller live displays along the full length of the platform", "passengers spread out and boarding delays became less frequent", "placing information where decisions occur can improve crowd flow without expanding the building"],
  ["r22", "Exercise With Neighbours", "A health team studied walking groups for older adults", "exercise advice was mainly delivered through leaflets at clinics", "organised free weekly walks led by trained local volunteers", "attendance remained high and participants reported less social isolation", "health programmes may last longer when physical activity also creates social connection"],
  ["r23", "The Returnable Cup", "Cafés introduced a deposit system for reusable cups", "discounts for bringing a personal cup attracted only a small group of customers", "charged a refundable deposit for a standard cup accepted by every participating café", "reuse increased because customers could return cups at different locations", "shared systems can remove practical barriers that individual rewards do not address"],
  ["r24", "Stairs in Sight", "Architects studied how office layout affects movement", "lifts were visible from the entrance while stairs were hidden behind fire doors", "placed an open staircase beside the main lobby and improved its lighting", "stair use rose without signs asking employees to exercise", "the easiest visible option can shape behaviour more effectively than repeated instructions"],
  ["r25", "Growing New Coral", "A reef project compared coral nurseries in two locations", "young coral was attached directly to exposed reef sections", "raised fragments in sheltered underwater frames before transplanting them", "more fragments survived storms and later established on the reef", "temporary protection can improve restoration outcomes during the most vulnerable stage"],
  ["r26", "Cooling an Old Building", "Engineers reduced heat in a protected historic hall", "portable air conditioners consumed energy but cooled the space unevenly", "reopened original roof vents and added discreet automated shades", "indoor temperatures became steadier while the building's appearance was preserved", "historic design features can contribute to modern comfort when they are understood and adapted"],
  ["r27", "Standing for Part of the Lesson", "A classroom trial introduced adjustable desks", "pupils remained seated for nearly the entire school day", "allowed students to alternate between sitting and standing during selected activities", "restlessness declined but handwriting quality and lesson completion stayed stable", "moderate choice in posture may help concentration without disrupting academic work"],
  ["r28", "Benches That Move", "A park tested movable seating in a public square", "heavy benches faced one direction and were rarely used by groups", "provided lighter seats that visitors could arrange around shade or activities", "the square supported more varied uses and the seats were seldom removed from the site", "giving users limited control can make shared spaces work for more kinds of activity"],
  ["r29", "Radio During the Storm", "A coastal town reviewed emergency communication after power cuts", "official updates depended mainly on websites and social media", "maintained a battery-powered local radio service with scheduled bulletins", "residents received consistent instructions even when mobile networks failed", "older communication channels can remain valuable when modern systems depend on fragile infrastructure"],
  ["r30", "Fruit That Looks Different", "A retailer sold produce that failed cosmetic standards", "misshapen fruit was rejected before reaching supermarket shelves", "displayed it in a clearly labelled section at a modest discount", "sales were strong and overall demand for standard produce did not fall", "transparent marketing can create a market for usable food that appearance rules once excluded"],
  ["r31", "Repair Beside the Cycle Lane", "A city installed public bicycle repair stands", "cyclists with minor mechanical problems had to find a specialist shop", "placed pumps and basic tools at transport hubs and popular cycle routes", "small faults were fixed quickly and more commuters completed their journeys by bicycle", "supporting infrastructure can make sustainable travel more dependable, not merely more attractive"],
  ["r32", "Wetlands Before Walls", "A river town compared natural and concrete flood defences", "plans focused on raising walls along the entire riverbank", "restored upstream wetlands that could hold water during peak rainfall", "downstream flood levels fell and new wildlife habitat developed", "landscape restoration can complement engineered protection while providing additional benefits"],
  ["r33", "Reading Old Handwriting", "An archive asked the public to transcribe historical letters", "a small professional team processed documents one collection at a time", "created short online tasks and checked each line against several volunteers' answers", "searchable records became available sooner without reducing transcription accuracy", "large cultural projects can use public help when agreement between contributors is systematically checked"],
  ["r34", "Learning on the Job", "A college redesigned part of its technical programme", "students completed all theory before entering a workplace placement", "alternated classroom weeks with supervised work at local firms", "students connected concepts to equipment sooner and more completed the course", "frequent links between theory and practice can support learning better than a single final placement"],
  ["r35", "Clinics on Wheels", "A health service tested mobile appointments in remote villages", "patients travelled several hours for routine checks at a central hospital", "sent a small clinic vehicle to a regular circuit of village centres", "missed appointments declined and serious cases were referred earlier", "bringing basic services closer can improve access while central facilities handle complex treatment"],
  ["r36", "Mapping the Noise", "Residents helped create a detailed city noise map", "official measurements came from a few permanent roadside sensors", "lent calibrated portable meters to volunteers for short surveys", "the map identified quiet courtyards and noisy shortcuts that fixed sensors had missed", "combining standard equipment with local participation can reveal patterns at a finer scale"],
  ["r37", "Solar Pumps for Small Farms", "A cooperative replaced diesel irrigation pumps", "fuel costs made watering unpredictable for small farms", "shared solar-powered pumps through a booking system", "irrigation became more reliable and operating costs fell after the initial purchase", "shared ownership can make cleaner technology accessible when individual investment is too expensive"],
  ["r38", "A More Relaxed Theatre", "A theatre adapted selected performances for sensory-sensitive audiences", "every show required silence, fixed seating and complete darkness", "kept low lighting, reduced sudden sounds and allowed visitors to move", "new families attended while standard performances retained their audience", "offering different formats can widen access without replacing established experiences"],
  ["r39", "A Walk Prescribed by Doctors", "Doctors referred patients to guided park walks", "advice to exercise was given without details about where or with whom", "provided scheduled routes led by trained guides near local clinics", "more patients completed weekly activity and reported improved mood", "specific supported opportunities can turn general health advice into practical action"],
  ["r40", "Steps for Migrating Fish", "Engineers modified a barrier across a river", "the old weir blocked fish moving upstream to breeding grounds", "built a sequence of shallow channels around the structure", "several native species returned upstream during the next migration season", "infrastructure can sometimes remain in use while targeted design restores ecological movement"],
  ["r41", "Paper That Resists Water", "Material scientists developed recyclable food packaging", "plastic coatings made many paper containers difficult to recycle", "applied a thin plant-based barrier that separated during normal pulping", "the package resisted moisture and was recovered by existing paper mills", "new materials have greater impact when they fit the recycling systems already in place"],
  ["r42", "Pupils Teaching Pupils", "A school paired older and younger readers", "struggling readers received only occasional individual help from teachers", "trained older pupils to lead short, structured reading sessions twice a week", "younger pupils gained fluency and the tutors improved their own confidence", "peer support can benefit both groups when activities are simple and adults monitor progress"],
  ["r43", "Timed Entry at the Museum", "A popular museum changed its ticket system", "large queues formed early even though galleries were quiet later", "offered free timed reservations while keeping some tickets for walk-in visitors", "waiting times fell and attendance was spread more evenly across the day", "managing arrival times can improve access without reducing the total number of visitors"],
  ["r44", "Bricks From Coffee Grounds", "Designers tested waste coffee in lightweight blocks", "used coffee grounds were collected as general rubbish", "dried the grounds and mixed a small proportion into clay before firing", "the blocks were lighter while meeting requirements for non-structural walls", "waste ingredients can have useful applications when products are tested for a clearly defined purpose"],
  ["r45", "Medicine by Drone", "A remote health network trialled small delivery drones", "urgent medicines travelled by road across mountains and seasonal rivers", "flew lightweight packages between a hospital and two approved landing sites", "delivery times became more predictable, especially after heavy rain", "new transport technology is most useful when it solves a specific access problem and operates within clear limits"],
  ["r46", "Seeds From the Library", "A library allowed members to borrow packets of seeds", "gardening information was available but beginners struggled to find affordable local varieties", "created a seed exchange with planting notes supplied by experienced residents", "more members tried food growing and returned locally adapted seeds", "libraries can support practical community knowledge as well as access to written information"],
  ["r47", "Green Lights for Late Buses", "A transport authority adjusted traffic signals", "buses received the same signal timing as all other vehicles", "gave slightly earlier green lights to services that were running behind schedule", "bus punctuality improved with little change to other traffic", "small priority measures can make shared transport more reliable without major road construction"],
  ["r48", "Writing Notes by Hand", "A university compared two ways of recording lectures", "students were encouraged to copy slides quickly onto laptops", "asked one group to write shorter handwritten summaries in their own words", "that group remembered relationships between ideas more accurately", "selecting and reformulating information may support understanding better than recording every detail"],
  ["r49", "Making Space for Night Markets", "A council created rules for temporary evening markets", "vendors applied through the same lengthy process used by permanent shops", "introduced a seasonal permit with shared waste and safety requirements", "more small traders participated and nearby streets remained clean", "proportionate regulation can support temporary activity while protecting public standards"],
  ["r50", "Photographs of a Changing Glacier", "Scientists combined modern measurements with historic images", "early photographs were treated mainly as illustrations rather than data", "matched archived viewpoints with new high-resolution photographs", "the comparisons revealed detailed ice loss before satellite records began", "carefully standardised historical material can extend scientific evidence further into the past"],
];

function rotateOptions(correct: string, distractors: [string, string], seed: number) {
  const options = [correct, ...distractors];
  const shift = seed % options.length;
  const rotated = [...options.slice(shift), ...options.slice(0, shift)];
  return { options: rotated, answer: rotated.indexOf(correct) };
}

export const READING_BANK: ReadingBankItem[] = READING_SPECS.map(
  ([id, title, lead, previousApproach, change, result, lesson], index) => {
    const changeAnswer = `The project ${change}.`;
    const resultAnswer = `The study found that ${result}.`;
    const lessonAnswer = `The report suggests that ${lesson}.`;
    const changeOptions = rotateOptions(
      changeAnswer,
      [
        "The previous system was expanded without any changes.",
        "The project ended before a practical trial began.",
      ],
      index,
    );
    const resultOptions = rotateOptions(
      resultAnswer,
      [
        "Participants rejected the trial before results were collected.",
        "The researchers reported no observable change in any measure.",
      ],
      index + 1,
    );
    const lessonOptions = rotateOptions(
      lessonAnswer,
      [
        "One solution should be copied everywhere without further testing.",
        "Short-term publicity is more useful than evidence from real users.",
      ],
      index + 2,
    );

    return {
      id,
      title,
      lead,
      paragraphs: [
        `For years, ${previousApproach}.`,
        `A local team then ${change}.`,
        `After a trial period, researchers found that ${result}.`,
        `The report does not claim that one answer will suit every setting. Instead, it suggests that ${lesson}.`,
      ],
      questions: [
        {
          question: "What change did the project introduce?",
          ...changeOptions,
          explanation: `第二段明确说明项目“${change}”。`,
        },
        {
          question: "What was reported after the trial?",
          ...resultOptions,
          explanation: `第三段的核心结果是“${result}”。`,
        },
        {
          question: "What is the main lesson of the passage?",
          ...lessonOptions,
          explanation: `末段总结指出“${lesson}”。`,
        },
      ],
    };
  },
);

type ListeningSpec = readonly [
  id: string,
  label: string,
  event: string,
  location: string,
  time: string,
  action: string,
  detail: string,
  contact: string,
];

const LISTENING_SPECS: ListeningSpec[] = [
  ["l01", "CAMPUS NOTICE", "Saturday's coastal field trip", "the east gate", "7:45 a.m.", "arrive fifteen minutes early", "Bring a waterproof jacket; lunch will be provided.", "email the science office by Thursday"],
  ["l02", "LIBRARY WORKSHOP", "the academic referencing workshop", "Room 204 in the central library", "4:30 p.m.", "bring a laptop with the citation software installed", "Printed handouts will be available at the door.", "contact the learning support desk"],
  ["l03", "SPORTS CENTRE", "the beginner swimming class", "the small indoor pool", "6:15 p.m.", "collect a locker key from reception", "Towels are not included in the course fee.", "call the sports centre before noon"],
  ["l04", "TRAVEL UPDATE", "the replacement bus to Oxford", "Bay 6 outside the railway station", "9:20 a.m.", "show the driver your original train ticket", "The journey will take about twenty minutes longer than usual.", "speak to station staff near the main entrance"],
  ["l05", "MUSEUM TOUR", "the architecture gallery tour", "the information desk on the ground floor", "2:00 p.m.", "leave large bags in the free lockers", "Photography is allowed, but flash must be switched off.", "ask for Maya at visitor services"],
  ["l06", "HOUSING NOTICE", "the annual apartment safety inspection", "the reception area of Block C", "10:30 a.m.", "make sure staff can access the kitchen and balcony", "The inspection should take no more than twenty minutes.", "email the housing office if you need another date"],
  ["l07", "VOLUNTEER DAY", "the riverside clean-up", "the north car park beside Green Bridge", "8:45 a.m.", "wear strong shoes and bring a reusable bottle", "Gloves and litter bags will be supplied.", "text the volunteer coordinator if heavy rain is forecast"],
  ["l08", "JOB INTERVIEW", "your customer service interview", "the third-floor meeting suite", "11:10 a.m.", "bring one form of photo identification", "You do not need to print another copy of your application.", "call Human Resources if your journey is delayed"],
  ["l09", "AIRPORT SHUTTLE", "the hotel airport transfer", "the coach stop outside Terminal Two", "5:40 p.m.", "look for a driver holding a blue Riverside Hotel sign", "The shuttle has space for one large suitcase per passenger.", "phone the hotel reception after landing"],
  ["l10", "CLINIC REMINDER", "your travel vaccination appointment", "Clinic Room 7", "3:25 p.m.", "bring your vaccination history and passport", "Please avoid arriving more than ten minutes early because seating is limited.", "use the patient portal to change the appointment"],
  ["l11", "CONFERENCE DESK", "the climate research conference", "the west lobby of the convention centre", "8:00 a.m.", "collect your name badge before entering the lecture hall", "Coffee will be served upstairs from eight thirty.", "visit the help desk beside the escalator"],
  ["l12", "LANGUAGE EXCHANGE", "the weekly language exchange", "the upstairs room at the Lantern Café", "7:00 p.m.", "write your first name and languages on a table card", "The first drink is discounted for registered participants.", "message the organiser through the student app"],
  ["l13", "COURSE MESSAGE", "the outdoor photography class", "the fountain in Market Square", "9:15 a.m.", "charge your camera battery and clear a memory card", "The class will continue in light rain.", "email the tutor if you only have a phone camera"],
  ["l14", "HOTEL UPDATE", "Sunday breakfast service", "the Garden Room", "7:30 a.m.", "give your room number to the host", "Hot food will finish at ten, but drinks remain available until ten thirty.", "ask reception about allergy information"],
  ["l15", "CYCLE HIRE", "your guided bicycle tour", "the rental shop beside River Park", "1:45 p.m.", "complete the safety form before choosing a helmet", "A small bag can be attached to each bicycle.", "call the shop if you are under one hundred and fifty centimetres tall"],
  ["l16", "THEATRE BOX OFFICE", "the evening performance of The Tempest", "the temporary entrance on King Street", "7:10 p.m.", "download your electronic ticket before joining the queue", "The usual front entrance is closed for building work.", "speak to the access team for step-free entry"],
  ["l17", "MARKET ANNOUNCEMENT", "the Saturday farmers' market", "the covered courtyard behind Town Hall", "9:00 a.m.", "bring your own shopping bags if possible", "The bread stall will accept pre-orders until Friday afternoon.", "check the council website for the vendor list"],
  ["l18", "LABORATORY NOTICE", "the chemistry safety induction", "Laboratory 3B", "12:40 p.m.", "wear closed shoes and tie back long hair", "Protective coats and glasses will be provided.", "email Dr Patel if you have missed the online quiz"],
  ["l19", "SUMMER CAMP", "the first day of the children's summer camp", "the community centre sports hall", "8:30 a.m.", "sign each child in at the blue desk", "Children need a packed lunch but snacks are supplied.", "call the camp office about medical requirements"],
  ["l20", "ORIENTATION", "the international student welcome session", "the main auditorium", "10:00 a.m.", "bring the welcome pack sent to your accommodation", "Campus tours will leave in small groups after the presentation.", "visit the international office for visa questions"],
  ["l21", "GARDEN GROUP", "the community garden planting session", "the tool shed at Lakeside Allotments", "10:15 a.m.", "wear clothes that can get muddy", "Seeds, tools and hot drinks will be provided.", "phone Ana if you need an accessible planting bed"],
  ["l22", "BOOK CLUB", "the monthly fiction discussion", "the reading room on the library's first floor", "6:30 p.m.", "prepare one question about the final chapter", "Extra copies of next month's novel can be borrowed afterwards.", "email the librarian to join online instead"],
  ["l23", "ART CLASS", "the introductory watercolour class", "Studio 5 at the arts centre", "5:50 p.m.", "bring two small objects to use in a still life", "Paper and paint are included, but brushes are not.", "ask the course office about borrowing equipment"],
  ["l24", "COOKING DEMO", "the vegetarian cooking demonstration", "the food hall demonstration kitchen", "1:00 p.m.", "tell staff about allergies when you check in", "Recipe cards will be emailed after the event.", "contact the market office to cancel your place"],
  ["l25", "LESSON CHANGE", "the intermediate swimming lesson", "the outdoor training pool", "5:35 p.m.", "meet the instructor beside Lane Four", "The changing rooms near the café are being repaired.", "call reception if the weather becomes severe"],
  ["l26", "REHEARSAL NOTE", "the community orchestra rehearsal", "St Mark's Church Hall", "7:20 p.m.", "bring the revised music for the second movement", "Music stands will already be arranged in sections.", "message the conductor if you need to borrow a part"],
  ["l27", "CHARITY RUN", "the five-kilometre charity run", "the south entrance to Hill Park", "8:10 a.m.", "attach your race number before entering the start area", "Water will be available at the halfway point and finish.", "visit the registration tent for timing-chip problems"],
  ["l28", "DENTAL CLINIC", "your routine dental check-up", "Treatment Room 4", "9:40 a.m.", "update your medical details on the online form", "Payment is due after the appointment, not before it.", "call the clinic if you develop cold symptoms"],
  ["l29", "WILDLIFE SURVEY", "the evening bat survey", "the visitor centre at Oak Wood", "7:50 p.m.", "bring a torch with a red-light setting", "Electronic detectors will be shared between pairs.", "email the ranger if you need transport from the station"],
  ["l30", "TECH SUPPORT", "your laptop repair appointment", "the service desk in Building A", "2:20 p.m.", "back up important files before handing over the device", "Most diagnostic checks take about forty minutes.", "reply to the booking email with your serial number"],
  ["l31", "PARCEL NOTICE", "collection of your international parcel", "Counter 12 at the central post office", "4:10 p.m.", "bring the collection card and photo identification", "Any customs charge must be paid by card.", "use the tracking page if you cannot collect this week"],
  ["l32", "RESEARCH STUDY", "the university sleep interview", "Room 18 in the psychology building", "11:45 a.m.", "avoid coffee for two hours before the session", "The interview will be recorded for research purposes.", "email the research assistant to withdraw"],
  ["l33", "DRIVING TEST", "your practical driving test", "the rear car park of the test centre", "8:55 a.m.", "bring your licence and eyesight certificate", "The examiner will check the vehicle before the route begins.", "phone the booking line if your instructor changes"],
  ["l34", "SCHOOL MESSAGE", "the parent information evening", "the school library", "6:05 p.m.", "submit questions through the online form by midday", "Teachers will discuss the new homework policy first.", "call the school office for childcare details"],
  ["l35", "FERRY UPDATE", "the delayed island ferry", "Pier 3", "12:25 p.m.", "keep your boarding pass ready for a second ticket check", "The café voucher can be used while you wait.", "listen for announcements about further weather changes"],
  ["l36", "GYM NOTICE", "the reopening of the fitness studio", "the second-floor training room", "6:45 a.m.", "book a time slot before attending", "New ventilation equipment has reduced the room's capacity.", "ask at reception to reactivate an old membership"],
  ["l37", "FUNDING BRIEFING", "the postgraduate scholarship briefing", "Lecture Theatre 2", "3:00 p.m.", "download the eligibility guide in advance", "There will be time for individual questions at the end.", "email the funding team for a recording"],
  ["l38", "PUBLIC LECTURE", "the talk on urban wildlife", "the science museum cinema", "6:40 p.m.", "show the free booking confirmation at the entrance", "Late arrivals will be admitted after the opening film.", "contact events staff for wheelchair spaces"],
  ["l39", "WALKING TOUR", "the historic harbour walking tour", "the clock tower in Harbour Square", "10:50 a.m.", "wear comfortable shoes for uneven paths", "The tour finishes near the maritime museum.", "call the guide if your cruise arrives late"],
  ["l40", "RECYCLING NOTICE", "the collection of small electrical items", "the mobile recycling point in North Street", "9:30 a.m.", "remove batteries and personal data before arrival", "Large appliances cannot be accepted at this event.", "check the council map for the next collection"],
  ["l41", "WORKSPACE TOUR", "the co-working space induction", "the ground-floor lounge", "8:35 a.m.", "bring the access code from your membership email", "The tour includes booking rooms and using printers.", "speak to the community manager about guests"],
  ["l42", "DONATION APPOINTMENT", "your blood donation session", "the mobile unit outside Civic Hall", "4:55 p.m.", "eat normally and drink water before arriving", "You should allow about one hour for the full visit.", "call the donor line if you are taking new medication"],
  ["l43", "EXAM UPDATE", "the economics final examination", "Hall B in the sports complex", "1:30 p.m.", "place your student card on the desk", "Calculators are permitted but covers must be removed.", "email the exams office about approved adjustments"],
  ["l44", "RESTAURANT CALL", "your group dinner reservation", "the upstairs dining room", "7:15 p.m.", "confirm the final number of guests by five o'clock", "The set menu includes a vegetarian main course.", "phone the restaurant about severe allergies"],
  ["l45", "BOAT COURSE", "the sailing safety lesson", "the equipment shed at West Marina", "9:05 a.m.", "wear a warm base layer under the supplied jacket", "The practical session will last until lunchtime.", "contact the instructor if you cannot swim"],
  ["l46", "FILM SOCIETY", "the documentary screening", "Cinema Room 1", "6:25 p.m.", "collect a free ticket from the student union desk", "A short director interview will follow the film.", "message the film society to reserve accessible seating"],
  ["l47", "POTTERY STUDIO", "the first wheel-throwing class", "the basement ceramics studio", "5:15 p.m.", "trim your nails and wear old clothes", "Clay is included, and finished work can be collected next month.", "email the technician about skin sensitivities"],
  ["l48", "LOCAL MEETING", "the neighbourhood traffic meeting", "the large room at Westside Community Centre", "7:35 p.m.", "read the two-page proposal before attending", "Residents may speak for up to two minutes each.", "send written comments to the council by Friday"],
  ["l49", "STUDY GROUP", "the statistics revision session", "Seminar Room 12", "4:05 p.m.", "bring one practice question you found difficult", "The tutor will begin with probability before regression.", "post general questions on the course forum"],
  ["l50", "WEATHER CLOSURE", "tomorrow's outdoor ecology class", "the online classroom", "10:20 a.m.", "use the video link in the updated timetable", "The fieldwork will be rearranged for the following week.", "email the lecturer if you lack a stable internet connection"],
];

const LOCATION_DISTRACTORS = [
  "the main entrance",
  "the reception desk",
  "the north car park",
  "Room 101",
  "the central library foyer",
  "the sports hall",
  "the visitor centre",
  "the south gate",
];
const TIME_DISTRACTORS = [
  "7:30 a.m.",
  "8:15 a.m.",
  "9:45 a.m.",
  "10:00 a.m.",
  "12:30 p.m.",
  "2:45 p.m.",
  "5:30 p.m.",
  "7:00 p.m.",
];
const ACTION_DISTRACTORS = [
  "bring a printed map",
  "pay the full fee in cash",
  "arrive without a booking",
  "leave all identification at home",
  "collect a paper form next week",
  "wait outside until contacted",
  "bring their own chair",
  "cancel through social media",
];

function pickDistractors(pool: string[], correct: string, seed: number): [string, string] {
  const available = pool.filter((item) => item.toLowerCase() !== correct.toLowerCase());
  return [available[seed % available.length], available[(seed + 3) % available.length]];
}

export const LISTENING_BANK: ListeningBankItem[] = LISTENING_SPECS.map(
  ([id, label, event, location, time, action, detail, contact], index) => {
    const locationOptions = rotateOptions(
      location,
      pickDistractors(LOCATION_DISTRACTORS, location, index),
      index,
    );
    const timeOptions = rotateOptions(
      time,
      pickDistractors(TIME_DISTRACTORS, time, index + 1),
      index + 1,
    );
    const actionOptions = rotateOptions(
      action,
      pickDistractors(ACTION_DISTRACTORS, action, index + 2),
      index + 2,
    );
    return {
      id,
      label,
      title: event,
      transcript: `Hello, this is a reminder about ${event}. We will meet at ${location} at ${time}. Please ${action}. ${detail} If you have any questions, ${contact}.`,
      questions: [
        {
          question: `Where should people meet for ${event}?`,
          ...locationOptions,
          explanation: `原文中的集合地点是“${location}”。`,
        },
        {
          question: "What time does it begin?",
          ...timeOptions,
          explanation: `原文明确给出的时间是“${time}”。`,
        },
        {
          question: "What are participants asked to do?",
          ...actionOptions,
          explanation: `通知中的具体要求是“${action}”。`,
        },
      ],
    };
  },
);

export const WRITING_BANK: WritingBankItem[] = [
  { id: "w01", topic: "Free university", prompt: "Some people believe that university education should be free for everyone.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "先写清楚立场，再用两个独立理由推进论证。" },
  { id: "w02", topic: "Remote work", prompt: "More employees are working from home rather than travelling to an office.", instruction: "Do the advantages of this development outweigh the disadvantages?", type: "利弊型", goal: "比较个人效率、协作质量与城市影响，并明确哪一侧更重要。" },
  { id: "w03", topic: "Public transport", prompt: "Some people think governments should make public transport free in large cities.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "分别论证财政负担与公共收益，再给出有条件的个人立场。" },
  { id: "w04", topic: "Children and screens", prompt: "Children are spending more time using digital screens from an early age.", instruction: "What problems can this cause, and what measures could reduce them?", type: "问题解决型", goal: "让每个解决方案直接对应一个已说明的具体问题。" },
  { id: "w05", topic: "City green space", prompt: "Many cities are replacing open green spaces with new housing.", instruction: "Why is this happening, and is it a positive or negative development?", type: "两问型", goal: "先解释住房压力，再判断长期生活质量的净影响。" },
  { id: "w06", topic: "School uniforms", prompt: "All school students should be required to wear a uniform.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "讨论平等、纪律和个人表达，避免只罗列优点。" },
  { id: "w07", topic: "Advertising to children", prompt: "All forms of commercial advertising aimed specifically at children should be banned.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "区分有害营销与普通产品信息，建立清晰边界。" },
  { id: "w08", topic: "Tourism limits", prompt: "Popular tourist destinations should limit the number of visitors they receive each year.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "平衡当地收入、居民生活和环境承载力。" },
  { id: "w09", topic: "Online shopping", prompt: "Online shopping is replacing many traditional shops in towns and cities.", instruction: "Do the advantages outweigh the disadvantages?", type: "利弊型", goal: "用消费者便利与社区空间变化进行同一尺度的比较。" },
  { id: "w10", topic: "Ageing population", prompt: "In many countries, the proportion of older people is increasing.", instruction: "What problems does this create, and what solutions can governments and communities provide?", type: "问题解决型", goal: "分别处理公共财政与日常照护，不把老龄化本身写成问题。" },
  { id: "w11", topic: "Space exploration", prompt: "Governments spend large amounts of money on space exploration while problems remain on Earth.", instruction: "To what extent is this spending justified?", type: "观点型", goal: "衡量长期科研收益与紧迫公共需求，给出明确优先级。" },
  { id: "w12", topic: "Four-day week", prompt: "A four-day working week should become standard in all industries.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "承认行业差异，并说明实施条件，而不是绝对化。" },
  { id: "w13", topic: "International food", prompt: "People can now buy food produced in many different countries throughout the year.", instruction: "Is this a positive or negative development?", type: "观点型", goal: "比较选择、价格、供应韧性与环境成本。" },
  { id: "w14", topic: "Homework", prompt: "Some parents believe that primary school children should not receive homework.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "区分机械作业与有目的的短任务，再提出立场。" },
  { id: "w15", topic: "Private cars", prompt: "Traffic congestion in city centres continues to worsen despite investment in roads.", instruction: "Why does this happen, and what measures would be most effective?", type: "问题解决型", goal: "解释诱发需求，并组合公共交通与价格措施。" },
  { id: "w16", topic: "News on social media", prompt: "An increasing number of people get their news mainly from social media.", instruction: "Do the advantages outweigh the disadvantages?", type: "利弊型", goal: "把传播速度与信息可信度放进具体使用场景比较。" },
  { id: "w17", topic: "Prison or rehabilitation", prompt: "Some people think prison is the best way to reduce crime, while others favour rehabilitation.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "区分危险罪犯与可矫治罪犯，避免一刀切。" },
  { id: "w18", topic: "Arts funding", prompt: "Public money should be spent on essential services rather than museums, music and theatre.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "说明艺术的公共价值，同时承认基本服务的优先性。" },
  { id: "w19", topic: "Fast fashion", prompt: "Cheap clothing is bought and discarded more quickly than in the past.", instruction: "What are the causes of this trend, and how can its negative effects be reduced?", type: "问题解决型", goal: "把低价、社交影响与商业模式连接到相应政策。" },
  { id: "w20", topic: "Competitive sport", prompt: "Competitive sports should be a compulsory part of school education.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "区分体育参与和强制竞赛，提出可执行的课程方案。" },
  { id: "w21", topic: "Cashless society", prompt: "Some countries are moving rapidly towards a cashless society.", instruction: "What are the advantages and disadvantages of this development?", type: "利弊型", goal: "讨论效率、安全与数字排斥，并保持结构对称。" },
  { id: "w22", topic: "University specialisation", prompt: "University students should study only subjects directly related to their future careers.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "比较职业深度与可迁移能力，用课程比例支持立场。" },
  { id: "w23", topic: "Rural decline", prompt: "Young people are leaving rural areas to live in cities.", instruction: "Why is this happening, and what could encourage more people to remain in rural communities?", type: "问题解决型", goal: "用就业和服务解释迁移，再提出针对性激励。" },
  { id: "w24", topic: "Celebrity influence", prompt: "Celebrities have a greater influence on young people than teachers and parents do.", instruction: "Why might this be the case, and is it a positive or negative development?", type: "两问型", goal: "解释曝光与认同机制，再判断影响取决于什么。" },
  { id: "w25", topic: "Medical prevention", prompt: "Governments should spend more on preventing illness than on treating people who are already ill.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "避免制造二选一，说明合理的资金平衡。" },
  { id: "w26", topic: "Zoos", prompt: "Some people believe zoos are cruel and unnecessary, while others think they protect wildlife.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "以动物福利、保育成果和教育质量作为判断标准。" },
  { id: "w27", topic: "Language extinction", prompt: "Many minority languages are disappearing around the world.", instruction: "Why does this matter, and what can be done to protect them?", type: "问题解决型", goal: "把文化、知识和身份价值连接到教育与媒体措施。" },
  { id: "w28", topic: "Robots at work", prompt: "Robots and artificial intelligence are taking over tasks previously done by people.", instruction: "Is this a positive or negative development?", type: "观点型", goal: "区分危险重复工作与需要判断、同理心的工作。" },
  { id: "w29", topic: "Long school holidays", prompt: "School summer holidays should be shorter, with more breaks spread throughout the year.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "比较学习连续性、家庭安排与儿童休息需求。" },
  { id: "w30", topic: "Housing ownership", prompt: "Owning a home is considered more important than renting in many societies.", instruction: "Why is this the case, and is it a positive or negative situation?", type: "两问型", goal: "解释安全感与政策激励，再评估社会和财务影响。" },
  { id: "w31", topic: "Free museums", prompt: "All museums and art galleries should be free to enter.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "比较公共可及性与稳定维护资金，提出可持续模式。" },
  { id: "w32", topic: "Global language", prompt: "The spread of one global language will eventually make international communication easier but reduce cultural diversity.", instruction: "Do the advantages outweigh the disadvantages?", type: "利弊型", goal: "用实际沟通收益对比本地语言流失，不停留在口号。" },
  { id: "w33", topic: "Consumer repair", prompt: "Manufacturers should be required to make products that are easy to repair.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "论证消费者成本、电子垃圾和企业创新之间的关系。" },
  { id: "w34", topic: "Exam assessment", prompt: "Formal examinations are the best way to assess students' academic ability.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "比较标准化、公平性与长期能力证据。" },
  { id: "w35", topic: "Working abroad", prompt: "More professionals are choosing to work in countries other than the one where they were trained.", instruction: "What are the advantages and disadvantages for the countries involved?", type: "利弊型", goal: "分别从人才流出国和接收国组织段落。" },
  { id: "w36", topic: "Water pricing", prompt: "Households should pay a higher price when they use more than a basic amount of water.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "同时处理节约激励、基本需求与大家庭公平。" },
  { id: "w37", topic: "Historic buildings", prompt: "Old buildings should be demolished to make space for modern development.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "建立保留价值标准，并讨论改造而非简单二选一。" },
  { id: "w38", topic: "Influencers", prompt: "Social media influencers are increasingly used to advertise products and lifestyles.", instruction: "Is this a positive or negative development?", type: "观点型", goal: "关注透明度、信任和年轻受众，而非泛谈社交媒体。" },
  { id: "w39", topic: "Community service", prompt: "Unpaid community service should be a compulsory part of secondary education.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "讨论公民能力、课程负担及选择空间。" },
  { id: "w40", topic: "Food skills", prompt: "Many young adults leave school without knowing how to cook healthy meals.", instruction: "Why is this a problem, and how should schools and families respond?", type: "问题解决型", goal: "把健康、预算和独立生活连接到实践教学。" },
  { id: "w41", topic: "Extreme sports", prompt: "People should be free to take part in dangerous sports even when rescue services may be required.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "平衡个人自由、知情风险和公共救援成本。" },
  { id: "w42", topic: "Company responsibility", prompt: "Businesses should be responsible for the social and environmental effects of their activities, not only for making profits.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "用长期风险、监管和利益相关者说明责任边界。" },
  { id: "w43", topic: "Paper books", prompt: "Printed books will eventually disappear because electronic reading is more convenient.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "区分预测与价值判断，并考虑不同阅读场景。" },
  { id: "w44", topic: "Sports salaries", prompt: "Professional athletes are paid far more than workers in socially important jobs.", instruction: "Why does this happen, and is it fair?", type: "两问型", goal: "解释市场收入机制，再用一致标准评价公平。" },
  { id: "w45", topic: "Urban farming", prompt: "Cities should use more rooftops and unused land to grow food locally.", instruction: "Do the advantages outweigh the disadvantages?", type: "利弊型", goal: "比较教育、供应韧性与空间、成本限制。" },
  { id: "w46", topic: "Animal testing", prompt: "Testing new medicines on animals is necessary despite concerns about animal welfare.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "以必要性、替代方法和监管标准构建有条件立场。" },
  { id: "w47", topic: "Personal data", prompt: "People often exchange personal data for free digital services.", instruction: "Why do they do this, and what risks does it create?", type: "两问型", goal: "解释便利与信息不对称，再具体说明滥用风险。" },
  { id: "w48", topic: "Local history", prompt: "Schools should teach more local history instead of focusing mainly on national and world history.", instruction: "To what extent do you agree or disagree?", type: "观点型", goal: "说明本地案例如何补充而非挤占更广阔视角。" },
  { id: "w49", topic: "Noise in cities", prompt: "Noise pollution is becoming a serious problem in many urban areas.", instruction: "What are its main causes, and what measures could reduce it?", type: "问题解决型", goal: "区分交通、施工和夜间商业，并提出不同工具。" },
  { id: "w50", topic: "Success and happiness", prompt: "Some people measure success mainly through income and career position, while others use different standards.", instruction: "Discuss both views and give your own opinion.", type: "讨论型", goal: "定义两种成功标准，并用长期生活结果比较。" },
];
