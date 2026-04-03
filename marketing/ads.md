# Velnot — Marketing Materials

> Target: students, professionals, business people, white-collar workers who attend meetings and want to record/summarize them.
> Core USP: Record meetings **without a bot** → Transcribe → AI action plan. Private, local, desktop-first.
> Language: English only
> App: Windows (macOS waitlist)
> Pricing: $10.99/mo · $89.99/yr · $219 lifetime
> URL: https://velnot.com

---

## 1. Reddit Posts

### r/productivity

**Title:**
I used to spend 20 minutes after every meeting just trying to remember what was decided. So I built a fix.

**Body:**
Real talk: I was terrible at taking meeting notes.

Not because I wasn't paying attention — but because it's physically impossible to listen, think, AND type at the same time. I'd leave every call with half-baked notes, missing action items, and that sinking feeling of "wait, what did we actually agree on?"

So I built **Velnot**.

It runs on Windows, sits in your tray, and does three things:

**1. Records any meeting** — Teams, Zoom, Google Meet, phone calls, doesn't matter. One click.
**2. Transcribes everything** — accurate, fast, 14 languages.
**3. Generates an action plan** — not just a summary dump. Actual structured output: decisions made, next steps, who's responsible.

The action plan part changed everything for me. My meetings now end with a clear document instead of a blur.

No bots joining your calls. No calendar integrations. Your recordings stay on your machine.

Free tier available. Try it: **https://velnot.com**

What's your current system for capturing meeting notes? Genuinely curious.

---

### r/SideProject

**Title:**
I quit taking meeting notes. Built an AI app to do it instead. Here's what I learned.

**Body:**
Six months ago I had a problem: I was spending more time documenting meetings than actually running them.

Today I shipped the solution: **Velnot** — a Windows desktop app that records your meetings, transcribes them, and spits out an AI-generated action plan.

Here's what I actually learned building this:

**The hard parts nobody talks about:**
- System audio capture on Windows is a nightmare. Different hardware, different drivers, different behaviors. Took weeks to get right.
- "Fast enough" transcription is a moving target. Users expect magic. Getting there required switching models twice.
- People don't pay for "AI summarizer." They pay for "never miss an action item again." Positioning matters more than features.

**The stack:**
- Electron + React + TypeScript
- Node.js/Express backend (Render)
- AssemblyAI Universal-2 for transcription
- OpenAI for summaries/action plans
- SQLite locally, Lemon Squeezy for payments

**Pricing:** $10.99/mo · $89.99/yr · $219 lifetime

Would love brutal feedback. What would make you actually pay for a meeting recorder?

**https://velnot.com**

---

### r/artificial

**Title:**
Most "AI meeting tools" just dump a wall of text. I built one that actually gives you an action plan. Here's the pipeline.

**Body:**
I got tired of AI meeting summaries that read like someone copy-pasted the transcript with bullet points.

So for **Velnot**, I designed the output around a specific question: *"What do I actually need to DO after this meeting?"*

**The pipeline:**

**Step 1 — Capture**
System audio + mic recording on Windows. One button. Works with any app — no integrations, no permissions, no browser extensions.

**Step 2 — Transcribe**
AssemblyAI Universal-2 model. Handles accents, crosstalk, and multilingual conversations better than anything else I tested. 14 language support baked in.

**Step 3 — Structure**
GPT-4 with a prompt engineered specifically for meeting contexts. The output isn't a summary — it's:
- Key decisions made
- Action items (with owners if detectable)
- Open questions / follow-ups
- Optional: full summary paragraph

The structured format is what users actually want. A "summary" gets skimmed. An action plan gets acted on.

Anyone building in this space? What's your transcription stack?

**Try it:** https://velnot.com

---

### r/Entrepreneur

**Title:**
Your team leaves every meeting having heard different things. Here's the $10/mo fix.

**Body:**
Here's a meeting problem nobody talks about openly:

Three people attend the same call. They walk out with three different versions of what was decided.

One person heard "we'll think about it." Another heard "we're doing it." The third wasn't sure. Two weeks later, nothing happened — and now everyone's confused about whose fault it is.

This is not a people problem. It's a memory problem.

I built **Velnot** because I kept watching this happen. The fix is embarrassingly simple: record what actually happened, and let AI turn it into a shared action plan.

**What Velnot does:**
- Records any meeting on Windows (Teams, Zoom, any call)
- Transcribes it accurately
- Outputs a structured action plan: decisions, next steps, owners
- No bot joining your call. No one knows you're recording.

Free tier to try. Plans start at $10.99/mo.

**https://velnot.com**

---

### r/WindowsApps

**Title:**
Built a Windows tray app that records any meeting and turns it into an AI action plan

**Body:**
Hey r/WindowsApps — sharing something I built that lives in the system tray.

**Velnot** — one-click meeting recorder for Windows. Records system audio + mic, transcribes with AssemblyAI, then GPT-4 generates a structured action plan (decisions, next steps, owners).

Works with Teams, Zoom, Google Meet, any app — no integrations needed. Recordings stay local.

Free tier available: https://velnot.com

Happy to answer questions about the build (Electron + React, system audio capture was the hardest part).

---

### r/remotework

**Title:**
Remote workers: how do you keep track of what was decided in your calls?

**Body:**
Genuinely curious — what's your system for making sure nothing falls through the cracks after a meeting?

I used to take notes but it's impossible to properly listen AND write at the same time. I tried shared docs, Notion templates, Slack threads — none of it stuck.

Eventually I built **Velnot** — a Windows app that just records everything and turns it into an action plan automatically. No bot joining the call, no integrations needed. One click and you're covered.

What do you use? https://velnot.com

---

### r/malelivingspace / r/cscareerquestions / r/consulting (niche targeting)

Adapt the Entrepreneur post above with specific pain points for each community.

---

## 2. Hacker News

### Show HN

**Title:**
Show HN: Velnot – Record any meeting, get an AI action plan (Windows)

**Body:**
I built Velnot because I was attending 4-5 meetings a day and leaving all of them with incomplete notes and forgotten action items.

The existing options frustrated me: Otter.ai requires you to invite a bot to your calls, Fireflies needs calendar integrations, and most tools are web-first or Mac-only. I wanted a dead-simple Windows desktop app — hit record, walk away with a document.

**How it works:**
1. One-click system audio capture (no integrations needed)
2. AssemblyAI Universal-2 for transcription (best accuracy I found across multiple models)
3. GPT-4 structures the output into decisions, action items, and follow-ups — not just a summary wall

**Technical decisions worth discussing:**
- Electron was the right call for fast cross-platform iteration, but system audio APIs on Windows are inconsistent across hardware. Ended up wrapping multiple fallback strategies.
- Local SQLite for session storage — I didn't want user recordings going to my servers unnecessarily.
- AssemblyAI over Whisper: Whisper is great but Universal-2 handles real-world meeting audio (noise, accents, crosstalk) noticeably better in my testing.

**Stack:** Electron + React + TS / Node.js + Express / SQLite / Render / Lemon Squeezy

**14 language support** — both UI and transcription.

**Pricing:** $10.99/mo · $89.99/yr · $219 lifetime

https://velnot.com

Happy to dig into any technical tradeoffs.

---

## 3. Product Hunt

### Tagline options (pick one):
1. "Stop taking notes. Start getting action plans."
2. "Your meeting recorder that actually tells you what to do next."
3. "Record any meeting. No bot. No integrations. Just results."

### Description:
Every meeting ends with decisions, action items, and follow-ups that someone is going to forget.

**Velnot fixes that.**

It records any meeting on your Windows desktop — Teams, Zoom, Google Meet, phone calls, any audio — transcribes it with high accuracy, and generates a structured action plan: what was decided, what needs to happen next, and who's responsible.

No bots joining your calls. No calendar integrations. No browser extensions. Just a desktop app that works.

**What makes it different:**
- Action plan output, not just a transcript dump
- Works with *any* meeting software — no integrations required
- One-click recording from the system tray
- 14 languages supported (transcription + full UI)
- Desktop-first: your recordings stay on your machine
- No bot in your meeting — nobody knows you're recording

**Who it's for:**
Managers, founders, consultants, students, remote workers — anyone who's ever sent a "per our conversation" email.

**Pricing:**
- Free tier to try (3 sessions)
- Monthly: $10.99/mo
- Yearly: $89.99/yr (save 33%)
- Lifetime: $219 one-time

**Download:** https://velnot.com

### Maker comment:
Hey Product Hunt —

Solo dev here. I built Velnot because I kept leaving meetings with half-baked notes and the feeling that I'd missed something important.

The core insight: people don't need another transcript. They need to know *what to do next*. That's why the action plan output was the first thing I built — not the summary.

The hardest engineering problem was reliable system audio capture across different Windows hardware. Took longer than I expected, but it's solid now.

I'm here all day — ask me anything about the build, the decisions, or what's coming next.

---

## 4. IndieHackers

**Title:**
I built a meeting recorder that turns calls into action plans. Here's everything I learned solo.

**Body:**
I want to share something I've seen very little writing about: what it actually feels like to build a productivity tool that competes with VC-backed SaaS — as one person, with no budget.

I started **Velnot**. It's a Windows desktop app that records meetings, transcribes them, and generates AI action plans. It's live and taking paid subscribers.

---

**What I got wrong:**

*"The AI will sell itself."*
Wrong. People don't buy "AI meeting recorder." They buy "I will never miss an action item again." Features don't convert. Outcomes do.

*"Transcription is a solved problem."*
Also wrong — for real-world meeting audio. Background noise, accents, multiple speakers, crosstalk — it's messy. I went through two transcription providers before settling on AssemblyAI's Universal-2 model.

*"Windows audio is straightforward."*
Definitely wrong. System audio capture behaves differently across hardware, drivers, and Windows versions.

---

**What worked:**
- Keeping scope tiny. Record → Transcribe → Action plan. Cut everything else.
- Pricing with conviction. $10.99/mo is not cheap for a utility app. But the value is real.
- Building in public. Sharing progress created early users who gave feedback before launch.

---

**Stack:**
Electron + React + TS · Node.js/Express · AssemblyAI · OpenAI · SQLite · Lemon Squeezy · Render

**$10.99/mo · $89.99/yr · $219 lifetime**

What's the hardest thing you've found about getting people to pay for productivity software?

**https://velnot.com**

---

## 5. Twitter/X

**Post 1 — Pain hook:**
You leave every meeting thinking "I should've written that down."

Then you spend 20 minutes trying to remember what was actually decided.

There's a better way.

→ velnot.com

---

**Post 2 — Product:**
Velnot does 3 things:

1. Records your meeting (any app, one click)
2. Transcribes everything accurately
3. Generates an action plan — not a summary wall

Windows desktop app. No bots. No integrations. Just works.

→ velnot.com

---

**Post 3 — Builder story:**
I built a meeting recorder in my spare time.

The hardest part wasn't the AI.
It was Windows audio capture.
And positioning.
And pricing.
And convincing people to pay.

Today it's live.

→ velnot.com  #buildinpublic

---

**Post 4 — Insight:**
"AI meeting summarizer" is the wrong frame.

Nobody wants a summary. They want to know:
- What was decided
- What they need to do
- Who's responsible for what

That's an action plan. That's what Velnot generates.

→ velnot.com

---

**Post 5 — Social proof angle:**
Three people attend the same meeting.

They walk out with three different versions of what was decided.

Two weeks later, nothing happened. Everyone thinks it's someone else's fault.

Recording your meetings fixes this. → velnot.com

---

**Post 6 — Privacy angle:**
Most meeting recorders join your call as a bot.

Everyone sees it. Some people get weird about it.

Velnot records at the system level. No bot. No notification. Just you and your meeting.

→ velnot.com

---

**Post 7 — Demo/screen recording:**
[Attach 30-second screen recording of: start recording → meeting audio → stop → action plan appears]

This is what Velnot does in 30 seconds.
Record → Transcribe → Action plan. That's it.

→ velnot.com

---

## 6. LinkedIn

**Post 1 — Professional pain:**
I've sat in 1,000+ meetings in my career.

At least half of them ended without a clear record of what was decided or who was responsible for what.

We call this "alignment" — but mostly it's just hoping everyone remembers the same thing.

I built a fix: Velnot records your meetings and turns them into structured action plans. Decisions. Next steps. Owners.

No bot in the call. No calendar integration. Just a Windows app that quietly does its job.

Try it free: https://velnot.com

---

**Post 2 — Manager angle:**
If you manage a team, here's a simple test:

Ask 3 people who attended the same meeting last week what was decided.

You'll get 3 different answers.

This isn't a people problem. It's a documentation problem. And it costs real time and real money.

Velnot: record → transcribe → action plan. $10.99/mo.

https://velnot.com

---

**Post 3 — Builder/build in public:**
6 months ago I started building a Windows app in my spare time.

Today it's live.

Velnot records your meetings, transcribes them, and generates AI action plans. 14 languages. Desktop-first. No bots.

The hardest part wasn't the AI — it was Windows audio capture. And positioning. And pricing.

What I'd tell anyone building a side project: ship ugly, learn fast, price with conviction.

→ velnot.com

---

## 7. YouTube

### Short (30–60 sec) script:
[Screen recording with voiceover]

"Every meeting ends with things you'll forget. Action items, decisions, follow-ups — gone.

Here's how Velnot fixes that.

[Click tray icon] → one click to start recording.
[Meeting audio plays]
[Click stop]

In 30 seconds: a full transcript — and an AI-generated action plan. Decisions made, next steps, who's responsible.

No bot joining your call. No integrations. Just your desktop.

Free tier at velnot.com."

### Long-form video ideas:
- "I recorded every meeting for 30 days. Here's what I learned."
- "Why I built a meeting app instead of using Otter.ai"
- "Velnot vs Otter.ai vs Fireflies — honest comparison"

---

## 8. Free Directory Listings (submit once, traffic forever)

### AI Tool Directories — submit to ALL of these:
- **There's An AI For That** (theresanaiforthat.com) — submit via their form
- **Futurepedia** (futurepedia.io) — free listing
- **Toolify.ai** (toolify.ai) — free listing
- **AI Tool Master** (aitoolmaster.com)
- **TopAI.tools** (topai.tools)
- **AI Depot** (aidepot.co)
- **Supertools** (supertools.therundown.ai)
- **AI Scout** (aiscout.net)
- **GPT Store / ChatGPT plugins** (if applicable)

### Software Directories:
- **AlternativeTo** (alternativeto.net) — list as alternative to Otter.ai, Fireflies, Fathom
- **G2** (g2.com) — free listing, ask early users for reviews
- **Capterra** (capterra.com) — free listing
- **GetApp** (getapp.com) — free listing
- **Software Advice** — free listing
- **BetaList** (betalist.com) — launch listing
- **Launching Next** (launchingnext.com)
- **Startup Buffer** (startupbuffer.com)
- **SaaSHub** (saashub.com)
- **StackShare** (stackshare.io) — list the tech stack

### Productivity-specific:
- **Productivity Tools** directories
- **Windows apps** directories

---

## 9. Community Posts (Discord / Slack)

### Discord servers to join and post in:
- **Buildspace** — builder community
- **Indie Hackers Discord**
- **Product Hunt Makers**
- **AI Tinkerers**
- **Productivity Lab**
- **r/productivity Discord**

### Slack communities:
- **Online Geniuses**
- **Startup Study Group**
- **Product School**
- Remote work Slack groups

**Post template for communities:**
Hey — built a Windows app that records meetings and turns them into action plans. No bot joining the call. Free tier available. Would love feedback from this community: https://velnot.com

---

## 10. dev.to / Hashnode / Medium Articles

### Article ideas:
1. **"How I capture system audio on Windows with Electron"** — technical, developer audience, links to Velnot at the end
2. **"Building a meeting app that competes with VC-funded SaaS as a solo dev"** — IndieHacker story
3. **"Why I chose AssemblyAI over Whisper for real-world meeting transcription"** — comparison post, drives AI developer traffic
4. **"The UX lesson I learned: people don't want summaries, they want action plans"** — product design angle

Each article ends with: *"This is what I built: [velnot.com](https://velnot.com)"*

---

## 11. Quora / Reddit Comment Strategy

Search for questions like:
- "best meeting recorder for windows"
- "how to transcribe meetings automatically"
- "alternatives to otter.ai"
- "meeting note taking app windows"
- "how to remember meeting action items"

Answer genuinely and helpfully. Mention Velnot at the end as "what I built to solve this."

---

## 12. Key Messages

| Message | Use when |
|--------|----------|
| "Stop taking notes. Start getting action plans." | Primary tagline |
| "Not a transcript. An action plan." | Differentiator |
| "No bot joining your call." | Privacy / discretion angle |
| "Works with any meeting software — no integrations" | Objection: "does it work with X?" |
| "One click. Stays on your machine." | Privacy / simplicity angle |
| "14 languages" | International / multilingual teams |
| "Solo-built. No VC. Priced honestly." | #buildinpublic authenticity |
| "Free tier to try" | Conversion hook |

---

## 13. Posting Schedule

### Week 1 — Launch Wave
| Day | Platform | Action |
|-----|----------|--------|
| Day 1 (Mon) | r/SideProject | Launch post |
| Day 1 (Mon) | Twitter/X | Post 3 (builder story) |
| Day 1 (Mon) | LinkedIn | Post 3 (builder) |
| Day 2 (Tue) | Hacker News | Show HN |
| Day 2 (Tue) | BetaList | Submit listing |
| Day 3 (Wed) | r/productivity | Pain point post |
| Day 3 (Wed) | Twitter/X | Post 1 (pain hook) |
| Day 3 (Wed) | AI directories | Submit to 5 directories |
| Day 4 (Thu) | IndieHackers | Builder story |
| Day 4 (Thu) | Twitter/X | Post 4 (insight) |
| Day 4 (Thu) | AI directories | Submit to 5 more directories |
| Day 5 (Fri) | Product Hunt | Full launch |
| Day 5 (Fri) | LinkedIn | Post 1 (professional pain) |
| Day 6 (Sat) | Twitter/X | Post 7 (screen recording demo) |
| Day 6 (Sat) | AlternativeTo | List as Otter.ai alternative |
| Day 7 (Sun) | r/Entrepreneur | Team angle post |
| Day 7 (Sun) | r/artificial | Technical post |

### Week 2 — Follow-up
| Day | Platform | Action |
|-----|----------|--------|
| Day 8 | YouTube | Upload demo Short |
| Day 9 | dev.to | Publish technical article |
| Day 10 | r/WindowsApps | Post |
| Day 11 | r/remotework | Post |
| Day 12 | LinkedIn | Post 2 (manager angle) |
| Day 13 | Discord communities | Post in 3-5 servers |
| Day 14 | Quora | Answer 5 relevant questions |

### Ongoing (weekly)
- 2-3 Twitter/X posts per week
- 1 LinkedIn post per week
- Answer Quora/Reddit questions as they appear
- Submit to 2-3 new directories per week
