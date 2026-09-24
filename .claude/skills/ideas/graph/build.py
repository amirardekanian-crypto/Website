import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit("usage: build.py <scratchpad folder>  (the page is written there, never into the repo)")
OUT = sys.argv[1]

import html, json
E = html.escape

IDEAS = [
 dict(n=1, name="The Spine", sub="An exercise catalogue where every exercise is linked", layer="Foundation",
  stages=["Exercise selection","Programming","Education"], needs=[], cost="One-off: about 2–3 h of your review for ~80 exercises. Claude drafts them. Then nothing per athlete.",
  chain=["Exercise","Purpose","Pattern","Qualities","Easier ⇄ Harder","Alternatives","Where it's used","Your history"],
  what="One catalogue of every exercise. Each one gets a permanent id and its relationships: why it's used, its movement pattern, the physical qualities it trains, an easier and a harder version, alternatives, cues, video, and the tennis moment it serves. Programme exercises point at that id instead of carrying a name.",
  problem="Today an exercise is only its name. <code>exercise_library.json</code> has 319 exercises, but it only maps a name to a video. When an exercise is renamed, the app has to guess it's the same one. That's why nothing can link up: no history per exercise, no swaps, no count of what each session trains. Even the course app's library is less connected than it looks: its <em>easier</em> and <em>harder</em> are plain text, not links.",
  how="Tap an exercise name on a card to open an <strong>About this exercise</strong> sheet. It shows why the exercise is there, what it builds, the easier and harder versions (both tappable), every session in your programme that uses it, and your own history with it.",
  athlete="An exercise stops being an instruction to follow and becomes something the athlete understands and can explore.",
  coach="The pipeline picks from the catalogue instead of typing names. Renames stop splitting Personal Records in two. You fix a video or a cue once, for everyone. The Exercise Ledger becomes something you can search.",
  mvp="An <code>exercises</code> table for the ~80 exercises used in live programmes: id, purpose, qualities, easier_id, harder_id. <code>/program-assemble</code> writes an <code>exId</code> on each exercise, and program.html shows the sheet. In the course app, turn <em>easier</em>/<em>harder</em> into real links.",
  adv="Shared by all four apps. An editor for it in coach.html. <code>/program-design</code> picks by quality and restriction, e.g. with knee history it filters out loaded deep knee bends. Farsi names alongside."),
 dict(n=2, name="The Quality Map", sub="What each session and cycle builds", layer="Foundation",
  stages=["Decision making","Programming","Education"], needs=[1], cost="About 1 h with you to fix the list of qualities. Tagging is part of #1.",
  chain=["Cycle focus","Qualities","Sessions","Exercises","The test that measures it","Your result"],
  what="A fixed list of 10–12 physical qualities for tennis and padel: max strength, power, reactive strength, acceleration, deceleration and change of direction, rotational power, shoulder and elbow resilience, aerobic base, repeat-sprint ability, mobility. Every exercise in #1 is tagged with its qualities, so any session or cycle can be read as a mix of qualities.",
  problem="Cycle focuses are written as prose. The athlete can't see how Tuesday's session serves the cycle, or why this cycle is different from the last one.",
  how="The session header reads <em>Today builds: Deceleration · Max strength · Shoulder resilience</em>. My Plan shows each cycle as a quality bar that changes from cycle to cycle. Tap a quality to see what it is, why tennis needs it, every exercise in your programme that trains it, and the test that measures it.",
  athlete="The plan reads as designed, not random: <em>I'm in the deceleration cycle, and this is the work that builds it.</em>",
  coach="A design check you already do for muscles, now done for qualities: how much each quality gets per week. It catches a cycle that says it's about power but has only two power exercises.",
  mvp="Quality tags in #1, a row of chips on the session header, and one short page per quality.",
  adv="A quality-volume chart per cycle in coach.html. Roadmaps written in qualities. An athlete quality profile from tests, showing strong and weak qualities."),
 dict(n=3, name="Court Map", sub="Tennis moments linked to the exercises that train them", layer="Foundation",
  stages=["Assessment","Education"], needs=[1,2], cost="One-off: about 8 moments of copy for you to approve. Nothing per athlete.",
  chain=["Court moment","Qualities","Exercises","Your sessions","…and back: exercise → court moment"],
  what="A point broken into moments: split step, first step, wide forehand, recovery step, serve, overhead, lunge volley. Each moment links to the qualities it uses and to the exercises in <em>your</em> programme that train them.",
  problem="Tennis players don't think in hip hinges. The link from gym to court lives in your head and in the course app's <code>tennis</code> field, and a coached athlete never sees it.",
  how="An <strong>On court</strong> screen inside My Plan. Tap <em>Wide forehand</em> to see: deceleration, rotational power, adductor strength. <em>In your programme: Lateral lunge (Tue), Med-ball scoop toss (Thu).</em> It works the other way too: the exercise sheet says <em>On court: the wide forehand</em>.",
  athlete="The gym work finally has a reason the athlete can feel on court.",
  coach="The most convincing part of your coaching keeps working when you're not there. The same content sells the course in the demo and in ads.",
  mvp="A fixed list of 8 moments, each with its qualities. The exercises for each moment are worked out from the athlete's programme through #1.",
  adv="An illustrated court. At intake the athlete picks <em>the moment I lose points</em>, and that shapes the roadmap and shows up as their own focus."),
 dict(n=4, name="Because", sub="The plan explains itself, athlete by athlete", layer="Before the session",
  stages=["Assessment","Decision making","Exercise selection"], needs=[], cost="None extra. <code>/program-engage</code> writes the line from the reasoning <code>/program-design</code> already produces. You review it with the other engagement text.",
  chain=["Intake answers","Tests","Injury history","Decision","Exercise"],
  what="Every exercise carries one line saying why <em>this athlete</em> is doing it, with where the reason came from: your goal, your test, your injury history, your sport, or your last cycle.",
  problem="PRODUCT.md promises <em>we'll always tell you what the purpose is</em>. The reasons exist, because design writes them into the coaching log, but that log is coach-only. So the athlete sees none of them.",
  how="Under the exercise name: <em>Because: your knee history → reverse lunge instead of forward lunge</em>, with a small tag showing the source. In My Plan, <strong>Why is my plan like this?</strong> groups the exercises by reason.",
  athlete="This is the strongest version of the reaction you're after: <em>this app actually knows me.</em>",
  coach="Fewer <em>why am I doing this?</em> messages. Next cycle, you can see which decision came from which restriction.",
  mvp="A <code>because</code> sentence and a <code>source</code> tag on each exercise, written by the pipeline and shown on the open card. The coaching log stays coach-only; this line is written fresh for the athlete.",
  adv="The reason links to its evidence: the intake answer, the test result, the Personal Records number. It updates each cycle, e.g. <em>kept: your squat went from 90 to 102</em>."),
 dict(n=5, name="The Card Remembers", sub="Last time, on every exercise", layer="In the session",
  stages=["Execution","Progression"], needs=[], cost="None.",
  chain=["Exercise","Your sets over time","Personal Records estimate","Today's RPE target","Your note"],
  what="Each exercise card shows what you did last time and the time before: load, reps, RPE and your note. The set log gets a box for reps.",
  problem="<code>session_history</code> is saved on every finish, but program.html never reads it. The midnight reset keeps only the last weight. <strong>Reps aren't logged at all</strong>, so neither the app nor you can tell 60 kg × 8 from 60 kg × 5, and every 1RM estimate rests on the planned reps.",
  how="One line on the card: <em>Last week: 60 kg · 8, 8, 7 · RPE 8 · \"left knee fine\"</em>. Tap it for a small chart of your history on this exercise, linked to its entry in Personal Records.",
  athlete="The athlete can progress without having to ask, and sees the week-to-week change that keeps people coming back.",
  coach="This follows <em>RPE, never load</em>: the card shows history and never prescribes a weight. Planned-vs-done in coach.html gains reps, and 1RM estimates become honest.",
  mvp="Read the athlete's last two <code>session_history</code> rows for that day and parse the summary. coach.html's <code>parseSessionLog</code> already does this. Add a reps box to the set log.",
  adv="History is stored by the #1 exercise id, so it survives renames and new cycles. A nudge in RPE terms: <em>you left 2 in the tank last time</em>. A full history page per exercise."),
 dict(n=6, name="Green Light", sub="Readiness that changes the session", layer="In the session",
  stages=["Execution","Adaptation"], needs=[], cost="None, once you've set the thresholds.",
  chain=["Readiness","Your coaching rule","Today's targets","The log","Coach sees an amber day"],
  what="The readiness check adjusts the session using your own rule: on a low-readiness day every RPE target drops by 1 (never below 6), and the minimum dose (first power move plus first main lift) is marked.",
  problem="Readiness is collected and then ignored. PRODUCT.md and HOW-IT-WORKS.md promise autoregulation, and COACHING-PRINCIPLES.md spells out the rule, but nothing applies it.",
  how="After the readiness questions, the day is green, amber or red. Amber: targets read <em>RPE 7 (normally 8)</em>. Red: a <em>minimum-dose day</em> banner, with the two must-dos highlighted and everything else optional. The completion card and the report record which version was done.",
  athlete="Permission to train smart on a bad day, instead of skipping or grinding through it.",
  coach="Your rule runs every day without you, and you see that it ran instead of being asked about it.",
  mvp="A threshold on the existing readiness score, the −1 RPE shown on the cards, and the first power move and first main lift marked as the minimum dose.",
  adv="Measured against each athlete's own baseline, which coach.html already works out. A readiness trend on Home. Patterns like <em>low on Mondays after match weekends</em>."),
 dict(n=7, name="The Ladder", sub="Step up, step down or swap, mid-session", layer="In the session",
  stages=["Execution","Adaptation","Feedback"], needs=[1], cost="None per athlete. The links are written once with #1.",
  chain=["Exercise","Easier / Harder / Same-quality alternative","Reason","Log","Coach"],
  what="During a session, any exercise can step down, step up or switch sideways, using the links in #1. The switch is logged along with its reason.",
  problem="There's no way to switch. When the machine is taken or a knee complains, the athlete improvises or skips, and you find out later from a free-text note.",
  how="<strong>Change</strong> on the card opens Easier, Harder and alternatives that train the same qualities, with reason chips: <em>equipment busy · too hard · too easy · discomfort</em>. Pick one and the card switches, and the log records <em>A → B, equipment</em>.",
  athlete="Never stuck mid-session, and still following the plan.",
  coach="Switch reasons become data: an exercise switched three weeks running for <em>too hard</em> is a design signal. Injury rules still hold, because the alternatives are filtered by the athlete's restrictions.",
  mvp="Easier and harder only, from #1, with a reason chip. It shows up in the session report.",
  adv="Filtered by injury flags and by the equipment named at intake. You turn a switch permanent in one tap in coach.html. The course app gets the same ladder."),
 dict(n=8, name="Body Check", sub="Reporting pain properly", layer="In the session",
  stages=["Feedback","Monitoring","Education"], needs=[1], cost="Replying to flags, which you'd want to see anyway.",
  chain=["Body area","Exercises that load it","Easier options (#7)","Soreness-vs-pain read","Coach alert","The trend"],
  what="A proper way to report pain: tap the body area, give it 0–10, say when it hurts (during, after, next morning), and say whether it feels like soreness or pain.",
  problem="There's no field for pain. It arrives as words in notes and chat, so it's easy to miss, it can't be tracked over time, and it can't trigger anything.",
  how="<strong>Something hurts?</strong> on the completion card and in the readiness check. The app shows which exercises in the programme load that area, links the soreness-vs-pain article and flags you. It never diagnoses; it reports to the coach.",
  athlete="Feels looked after, and learns the difference between soreness and pain. That's already one of your rules: teach soreness vs pain, never fear.",
  coach="The most important signal in coaching shows up the same day, with its history.",
  mvp="Area, 0–10, and soreness or pain, saved with the session and shown in #9.",
  adv="Exercises that load a flagged area get a quiet marker, and the Ladder opens on the easier options. Your pain-management rule of thumb shown alongside."),
 dict(n=9, name="Radar", sub="The coach's early warning list", layer="Between sessions",
  stages=["Monitoring","Communication"], needs=[], cost="Saves time: reading one list replaces opening every athlete's file.",
  chain=["Every athlete log","A rule","An alert","One-tap action","A reply the athlete sees"],
  what="The Needs-you list in coach.html starts firing on signals that already exist: a spike in training-load ratio (ACWR), readiness below the athlete's own normal three days running, RPE creeping above target, a Body Check, missed sessions, a retest now due, a date from the handoff brief arriving, the same switch made again and again.",
  problem="Those signals exist, but only inside each athlete's file. You see them only if you open the file.",
  how="Each alert is one row: who, what, the evidence as a small chart, and one-tap actions: send a reply template, open the editor, mark as handled.",
  athlete="Feels the coach noticed, because the coach did.",
  coach="The same attention for 40 athletes that you can give to 10 today.",
  mvp="Four rules over data coach.html already loads: readiness drop, RPE creep, retest due, five days without a session.",
  adv="The handoff brief's MEASURE, FILM and DATES become tracked items. A weekly summary. The athlete sees a <em>coach checked your week</em> stamp."),
 dict(n=10, name="Pinned", sub="Messages attached to the thing they're about", layer="Between sessions",
  stages=["Communication","Feedback"], needs=[1], cost="The same messages you send now, with less digging for context.",
  chain=["Message","Exercise / session / outcome","The athlete's log for it","Next cycle's review"],
  what="A message attaches to the thing it's about: an exercise, a set, a session or a cycle outcome, and the conversation shows up on that thing.",
  problem="Chat is one stream with an optional Day N tag. Your answer about the Romanian deadlift sits in chat, not on the RDL card where the athlete needs it next Tuesday.",
  how="<strong>Ask coach</strong> on an exercise card. Your reply then shows on that card as a note until the cycle ends. In coach.html the question arrives with the exercise, what was prescribed and the athlete's last sets.",
  athlete="Answers appear exactly where they're needed.",
  coach="The context comes with the question, so you answer once. Questions about each exercise feed the cycle review.",
  mvp="<code>messages</code> gets an optional exercise or day, and the card shows the latest coach reply.",
  adv="Form-check videos attached to an exercise. Answers you give often become cues for every athlete."),
 dict(n=11, name="Right Read, Right Time", sub="Articles that show up when they matter", layer="Between sessions",
  stages=["Education"], needs=[1,2], cost="Tag each article once. The <code>/article</code> skill can suggest the tags.",
  chain=["Article","Exercise","Quality","Cycle","Moment (first tempo, first RPE, a pain flag)"],
  what="Articles are tagged with exercises, qualities, cycle types and situations, and the app offers the right one at the right moment.",
  problem="The Read library and the programme don't link to each other. An athlete in a deceleration cycle never finds the deceleration article unless they go looking.",
  how="The exercise sheet says <em>Read: why we slow the lowering</em>. The cycle card says <em>Before this cycle: a 3-minute read</em>. The first tempo opens the tempo article, and a Body Check links soreness vs pain. Each article lists <em>In your programme: …</em>.",
  athlete="Learning comes in small pieces, when it's relevant.",
  coach="Articles you've already written do more work, and you explain the same thing less often.",
  mvp="Tags on articles (exercise ids and qualities), with one Read link on the exercise sheet and one on the cycle card.",
  adv="Triggers for first-time moments. The course app's 22 lessons linked the same way."),
 dict(n=12, name="The Debrief", sub="Cycle outcomes, scored with evidence", layer="End of cycle",
  stages=["Review","Progression","Adaptation"], needs=[], cost="Each outcome needs a measure when it's written, which <code>/program-engage</code> adds. Scoring is automatic where the measure is data, and one tick from you where it isn't.",
  chain=["Outcomes","Measures (Personal Records, tests, sessions done, body weight)","Result","Design decisions","Next cycle"],
  what="At the end of a cycle, the athlete gets a scored review. Each outcome from the cycle message is marked met, partly met or not yet, with its evidence. Then it shows what changes next cycle and why: kept, progressed, replaced, added.",
  problem="Outcomes are shown as a checklist that nobody ever checks. The design step does a full cycle review, but only the coach sees it. <code>cycle_reports</code> are saved and never shown anywhere.",
  how="A Debrief screen opens in the cycle's last week, linked from My Plan. Each outcome carries its evidence: <em>Squat 1RM estimate +7.5 kg: 95 → 102.5 ✓</em>. At the bottom: <em>Next cycle: 4 kept, 3 progressed, 5 new, and here's why</em>, leading into the teaser.",
  athlete="Sees proof of progress at the moment they decide whether to renew. That's where you keep them.",
  coach="The review you already do becomes the renewal pitch.",
  mvp="Each outcome gets an optional <code>measure</code>, a Personal Records lift or a test. The Debrief works out start against now; the rest is text from the pipeline.",
  adv="A career view across all cycles, and a shareable result card (a format you already design)."),
 dict(n=13, name="Patterns", sub="What your habits do to your training", layer="Between sessions",
  stages=["Monitoring","Education"], needs=[], cost="None.",
  chain=["Proof habits","Readiness","Session RPE","Personal Records","Body weight"],
  what="The app puts Proof and training data side by side and shows athletes their own patterns: <em>on nights under 7 h of sleep, your session RPE runs 0.8 higher</em>.",
  problem="Sleep is logged in Proof and asked again in the readiness check, and the two are never compared. Proof covers the 23 hours outside training and program.html the one hour of training, and apart from ticking the workout habit they never meet.",
  how="A Patterns card, one finding at a time, only once there's enough data (e.g. 20+ sessions). Always worded as <em>your data suggests</em>, never as a promise.",
  athlete="The habit tracker earns its place: <em>why should I log water?</em> answers itself.",
  coach="Evidence for lifestyle conversations on the weekly call.",
  mvp="One comparison, sleep at target against below, showing average readiness and session RPE, only above a minimum amount of data.",
  adv="A small set of honest comparisons, and the same view per athlete on the Calls tab in coach.html. It shows a link, not proof of cause, and the minimum-data rule is non-negotiable."),
 dict(n="5b", label="5+", name="The History Sheet", sub="Every time you did this lift, with the trend", layer="Grown along the way", grown="5",
  stages=["Progression","Feedback","Monitoring"], needs=[5], cost="None.",
  chain=["Exercise","Every session that had it","Sets, reps, RPE, note","Best set over time"],
  what="One sheet per exercise listing every session the athlete did it, newest first, with the best set's estimated max drawn as a small trend line.",
  problem="The Card Remembers shows last time only. The question an athlete actually asks is <em>am I getting stronger at this?</em>, and one session can't answer it.",
  how="<strong>History ›</strong> on the Last time strip, or from the ⓘ sheet. Each row reads like the log line: date, day, sets, RPE coloured against target, the note left that day.",
  athlete="Progress they can see without asking, which is what keeps people training.",
  coach="Fewer <em>how am I doing?</em> messages, and every row is the same log line you already read in coach.html.",
  mvp="Built with #5: read from <code>get_my_history()</code>, old sessions parsed from their summary text, nothing migrated.",
  adv="Renames already join through the Personal Records matcher. Next: mark the sessions where a Ceiling best was set."),
 dict(n=14, name="Rungs", sub="Removed 24 Sep: three plain lists instead", layer="Grown along the way", grown="1",
  stages=["Progression","Education","Exercise selection"], needs=[1],
  cost="None. It was taken out.",
  chain=["Exercise","Regressions","Progressions","Alternatives"],
  what="Rungs drew each movement pattern as a ladder in the ⓘ sheet, marked with what the athlete had climbed. It was built and then <strong>removed the same day</strong>.",
  problem="You, on seeing it: <em>remove the rung, too much information, even im mixed up. doesnt help athlete.</em> A ladder built from first links mixed real progressions with exercises that only train the same area.",
  how="The ⓘ sheet now shows three plain lists: <strong>Regressions</strong> (the same movement made easier), <strong>Progressions</strong> (the same movement made harder) and <strong>Alternatives</strong> (the same movement on other equipment or a machine). All 212 entries were relinked to those meanings; the old links are kept coach-side.",
  athlete="Three short, honest lists instead of a staircase to decode.",
  coach="Your words on the screen: regressions, progressions, alternatives. Moving up stays your call at the next cycle.",
  mvp="Done: the ladder, its marks and <em>N rungs climbed</em> are gone from the app, the skills and the docs.",
  adv="Do not bring a ladder back."),
 dict(n=15, name="Who Has This", sub="Change a cue or a video, and see who it reaches", layer="Grown along the way", grown="1",
  stages=["Programming","Communication"], needs=[1], cost="None.",
  chain=["Spine entry","Every live programme","Athletes doing it now"],
  what="In coach.html, every Spine entry lists the athletes whose current programme uses it.",
  problem="Cues and videos are written once on the Spine now, so one edit reaches every athlete who has that exercise. You need to see who that is before you change it.",
  how="coach.html → Exercises → an entry → <strong>Doing it now</strong>. Also a <em>Not in the Spine yet</em> list of names live programmes use that have no entry.",
  athlete="Nothing directly. It protects them from a cue changing under them without warning.",
  coach="A one-look answer to <em>who will this change affect?</em>, and a to-do list for the Spine.",
  mvp="Built with the Exercises tab: read from <code>programs</code> through the same name resolver the app uses.",
  adv="A note to those athletes when an approved cue or video changes."),
 dict(n=16, name="Not Yet", sub="A paused progression, with what unlocks it", layer="Grown along the way", grown="4",
  stages=["Progression","Education","Communication"], needs=[1, 4],
  cost="None extra. The gate is written once, in the Exercise Ledger you already keep.",
  chain=["Ledger: Paused exercise","Its gate","The athlete's film or test","Unlocked next cycle"],
  what="A <strong>Paused</strong> exercise (never a Banned one) with its gate in plain words: what unlocks it and how you will know. <strong>Parked 24 Sep</strong>: it was going to live in Rungs, which you removed as too much information, so it waits for your call on whether it earns a place at all.",
  problem="The ledgers hold 49 Paused or Banned exercises, the other half of every decision. The athlete never sees what they are working towards, so <em>when can I jump?</em> arrives by message.",
  how="If it comes back: one line under <strong>Progressions</strong> in the ⓘ sheet, <em>Box Drop · not yet · unlocks when your snap-downs land quiet and still.</em>",
  athlete="The next step is a target, not a mystery. The boring drill has a point.",
  coach="Fewer <em>when can I…</em> messages, and filmed evidence arriving at the moment you need it.",
  mvp="A <code>gates</code> list on the programme (exercise id plus one sentence), written with the Becauses.",
  adv="The unlock ties to a real result, a Personal Record or a test."),
 dict(n=17, name="Still Warm", sub="Qualities the cycle means to keep, watched for going cold", layer="Grown along the way", grown="2",
  stages=["Monitoring","Adaptation","Progression"], needs=[2, 5], cost="None. It reads what was logged against the qualities already tagged.",
  chain=["Cycle: qualities to keep","Logged working sets","Days since last trained","Radar row"],
  what="Once exercises carry qualities, the logged sessions show when each quality was last trained. Still Warm watches the ones a cycle is meant to <em>keep</em> and flags one that goes cold.",
  problem="Your own focus lines say <em>one heavy exposure a week so the force base doesn't drain</em>. Nothing checks it: a missed day or a swapped session can quietly drop the one strength exposure for two weeks.",
  how="A row in coach.html's Needs-you list: <em>Strength: no working set in 12 days (a power cycle, keeping strength)</em>. Only for qualities the cycle means to keep, never for ones it is resting on purpose.",
  athlete="Nothing directly, and that's the point: the maintenance they never see is kept.",
  coach="Your maintenance rule, checked every day from what was actually done, not from what was planned.",
  mvp="Days since the last logged working set per quality, from #5's history through the Spine tags. Flag past a threshold you set (e.g. 10 days).",
  adv="Part of Radar (#9). The threshold differs per quality: strength drains slower than power."),
 dict(n=18, name="The Back-off Week Shows Itself", sub="The closing week draws itself: same weight, half the sets", layer="Grown along the way", grown="12",
  stages=["Execution","Programming","Adaptation"], needs=[], cost="None. The week is worked out from the cycle's dates.",
  chain=["Cycle start date","Week number","Closing week","Primary blocks","Set rows"],
  what="The last week of every cycle draws itself as the back-off week: one line on the Home day card (<em>Back-off week: same weight, half the sets</em>) and the extra set rows on each Primary card greyed out as <em>not this week</em>.",
  problem="Four loading weeks plus one back-off is the house rule, and the back-off lives only in a notes card. Alireza's Cycle 1 debrief found it: in week 5 he did every set, with his heaviest squat and RDL of the cycle.",
  how="Nothing to set up. From the cycle's <code>startDate</code> the app knows it is the closing week; Home says so, and Primary cards show half their set rows, the rest greyed.",
  athlete="The one easy week is actually easy, so the four hard ones land.",
  coach="Your back-off rule, applied on every athlete's phone without a message from you.",
  mvp="Primary blocks only, half the sets rounded up (4 becomes 2, 3 becomes 2). Weight and intent unchanged.",
  adv="A per-cycle override for a cycle that ends on a test week or a tournament, and the Debrief (#12) reading whether the back-off happened."),
]

STAGES = ["Assessment","Decision making","Exercise selection","Programming","Execution","Feedback",
          "Monitoring","Progression","Education","Communication","Review","Adaptation"]
LAYERS = ["Foundation","Before the session","In the session","Between sessions","End of cycle","Grown along the way"]
LAYER_NOTE = {
 "Foundation":"The data every other idea stands on. Not screens, just information that links.",
 "Before the session":"Assessment and decisions, made visible.",
 "In the session":"The hour the athlete is actually training.",
 "Between sessions":"Monitoring, conversation and learning.",
 "End of cycle":"Where review turns into the next cycle and a renewal.",
 "Grown along the way":"New ideas that came out of building the ones above. Each says which one it grew from.",
}

STATUS = {
 1: ("Built 24 Sep", "https://claude.ai/artifact/WymDKxk58nkCy5eSgodSrU"),
 4: ("Built 24 Sep", "https://claude.ai/artifact/WtZ4xfq38dV7zZwRu926jw"),
 5: ("Built 24 Sep", "https://claude.ai/artifact/NTtDNds5vcLoE6AfX21Zoj"),
 2: ("Built 24 Sep", "https://claude.ai/artifact/US2RW8TaHZbFk8voADq6fu"),
 "5b": ("Built 24 Sep", None), 14: ("Removed 24 Sep", None), 15: ("Built 24 Sep", None),
 16: ("Parked 24 Sep", None),
 12: ("Built 24 Sep as /cycle-report", "https://claude.ai/artifact/JY1eG1RNYHTLvYpFCwcHBx"),
}

def chips(i):
    st = STATUS.get(i["n"])
    s = ""
    if st:
        cls = "gone" if st[0].startswith(("Removed", "Parked")) else "built"
        s += (f'<a class="chip {cls}" href="{st[1]}">{E(st[0])} · the brief ›</a>' if st[1]
              else f'<span class="chip {cls}">{E(st[0])}</span>')
    if i.get("grown"):
        s += f'<a class="chip grown" href="#idea-{i["grown"]}">grew from #{i["grown"]}</a>'
    s += "".join(f'<span class="chip">{E(x)}</span>' for x in i["stages"])
    if i["needs"]:
        s += "".join(f'<a class="chip need" href="#idea-{n}">needs #{n}</a>' for n in i["needs"])
    else:
        s += '<span class="chip free">stands alone</span>'
    return s

def chain(i):
    parts = []
    for k, x in enumerate(i["chain"]):
        if k: parts.append('<span class="arr" aria-hidden="true">→</span>')
        parts.append(f'<span class="node">{E(x)}</span>')
    return "".join(parts)

def card(i):
    return f'''
<article class="idea" id="idea-{i["n"]}">
  <header class="ih">
    <span class="num">{i.get("label") or format(i["n"], "02d")}</span>
    <div><h3>{E(i["name"])}</h3><p class="sub">{E(i["sub"])}</p></div>
  </header>
  <div class="chips">{chips(i)}</div>
  <dl class="f">
    <div><dt>1 · What it is</dt><dd>{i["what"]}</dd></div>
    <div><dt>2 · The problem</dt><dd>{i["problem"]}</dd></div>
    <div><dt>3 · How it works</dt><dd>{i["how"]}</dd></div>
    <div><dt>4 · What connects</dt><dd><div class="chain">{chain(i)}</div></dd></div>
    <div><dt>5 · For the athlete</dt><dd>{i["athlete"]}</dd></div>
    <div><dt>6 · For you</dt><dd>{i["coach"]}<p class="cost"><b>Your time:</b> {i["cost"]}</p></dd></div>
  </dl>
  <div class="tiers">
    <div class="tier mvp"><h4>7 · MVP</h4><p>{i["mvp"]}</p></div>
    <div class="tier adv"><h4>8 · Advanced</h4><p>{i["adv"]}</p></div>
  </div>
</article>'''

by_stage = {s: [i["n"] for i in IDEAS if s in i["stages"]] for s in STAGES}
stage_html = "".join(
  f'<li><span class="st">{E(s)}</span><span class="pins">' +
  "".join(f'<a href="#idea-{n}">{"5+" if n == "5b" else n}</a>' for n in by_stage[s]) + '</span></li>' for s in STAGES)

sections = ""
for L in LAYERS:
    items = [i for i in IDEAS if i["layer"] == L]
    sections += f'<section class="layer"><div class="lh"><h2>{E(L)}</h2><p>{E(LAYER_NOTE[L])}</p></div>' + "".join(card(i) for i in items) + "</section>"

tpl = open(os.path.join(HERE, "page.tpl.html"), encoding="utf-8").read()
out = tpl.replace("{{STAGES}}", stage_html).replace("{{SECTIONS}}", sections)
open(os.path.join(OUT, "coaching-graph.html"), "w", encoding="utf-8").write(out)
json.dump([{k: i[k] for k in ("n","name","sub","layer","needs")} for i in IDEAS], open(os.path.join(OUT, "ideas.json"),"w"), indent=1)
print(len(out))
