import { createClient } from "@supabase/supabase-js";
import { getFieldGroups, parseKeywords } from "@/lib/filterDefaults";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";

const TZ = "Europe/Amsterdam";
const DAY_MS = 86400000;
const MAX_CHART_DAYS = 365; // daily charts show at most the last 365 days

// ---------- Date helpers (all day buckets use Amsterdam time) ----------

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });

function dayKey(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "" : dayFmt.format(d);
}

function shiftDay(key, n) {
  const d = new Date(`${key}T12:00:00Z`);
  return new Date(d.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

function lastDays(n) {
  const today = dayKey(new Date());
  const keys = [];
  for (let i = n - 1; i >= 0; i--) keys.push(shiftDay(today, -i));
  return keys;
}

// ---------- Data helpers ----------

// Reads a whole table. The first page is fetched alone; if the table is bigger, the rest
// is fetched six pages at a time instead of one after another.
async function fetchAll(makeQuery) {
  const pageSize = 1000;
  const batch = 6;

  const first = await makeQuery().range(0, pageSize - 1);
  if (first.error) throw first.error;
  const all = [...(first.data || [])];
  if (all.length < pageSize) return all;

  for (let start = pageSize; start < 1000000; start += pageSize * batch) {
    const results = await Promise.all(
      Array.from({ length: batch }, (_, i) => {
        const from = start + i * pageSize;
        return makeQuery().range(from, from + pageSize - 1);
      })
    );
    let done = false;
    for (const { data, error } of results) {
      if (error) throw error;
      if (data?.length) all.push(...data);
      if (!data || data.length < pageSize) done = true;
    }
    if (done) break;
  }
  return all;
}

// Only downloads the columns we actually use. If a column name does not exist,
// it falls back to reading everything so nothing breaks.
async function fetchTable(table, columns) {
  try {
    return await fetchAll(() => supabaseAdmin.from(table).select(columns));
  } catch {
    return await fetchAll(() => supabaseAdmin.from(table).select("*"));
  }
}

// Results are kept for 60 seconds, so switching between views is instant.
const CACHE_MS = 60 * 1000;
const cache = new Map();
function cached(key, fresh, load) {
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = load().catch((e) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

async function countRows(table) {
  const { count, error } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

async function listAllUsers() {
  const perPage = 1000;
  const first = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage });
  if (first.error) throw first.error;
  let users = first.data.users || [];
  if (users.length < perPage) return users;

  const lastPage = Number(first.data.lastPage) || 0;
  if (lastPage > 1) {
    // Fetch all remaining pages at the same time
    const pages = await Promise.all(
      Array.from({ length: Math.min(lastPage, 100) - 1 }, (_, i) =>
        supabaseAdmin.auth.admin.listUsers({ page: i + 2, perPage })
      )
    );
    for (const { data, error } of pages) {
      if (error) throw error;
      users = users.concat(data.users || []);
    }
    return users;
  }

  for (let page = 2; page <= 100; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users = users.concat(data.users || []);
    if (!data.users || data.users.length < perPage) break;
  }
  return users;
}

// Counts labels case-insensitively; getLabels may return one label or an array.
function tally(items, getLabels, limit) {
  const map = new Map();
  for (const item of items) {
    const raw = getLabels(item);
    const labels = Array.isArray(raw) ? raw : [raw];
    for (const l of labels) {
      const label = String(l ?? "").trim().replace(/\s+/g, " ");
      if (!label) continue;
      const key = label.toLowerCase();
      const entry = map.get(key) || { label, count: 0 };
      entry.count++;
      map.set(key, entry);
    }
  }
  const out = [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return limit ? out.slice(0, limit) : out;
}

function median(list) {
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

// Same field groups as the mentors page filter
const FIELD_GROUPS = {
  Medicine: /medic|nursing|dentist|pharmac|biomedic|surgery|clinical/,
  Engineering: /engineer|aerospace|mechatronic|robotic/,
  Law: /\blaw\b|legal|jurisprudence/,
  "Computer Science": /computer|software|informatics|artificial intelligence|\bai\b|data science|cyber|information technology/,
  Business: /business|management|finance|accounting|marketing|entrepreneur/,
  Economics: /economic|econometric/,
  Psychology: /psycholog|neuroscien|behaviou?r/,
};

function fieldGroups(subject) {
  const text = (subject || "").toLowerCase();
  const groups = Object.keys(FIELD_GROUPS).filter((g) => FIELD_GROUPS[g].test(text));
  return groups.length > 0 ? groups : ["Other"];
}

function normalizePath(p) {
  let path = String(p).split("?")[0].split("#")[0];
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (/^\/mentors\/[^/]+$/.test(path)) return "/mentors/[profile]";
  if (/^\/course-guides\/[^/]+$/.test(path)) return "/course-guides/[guide]";
  return path || "/";
}

const VIEW_COLS_BASIC = "path, user_id, visitor_id, created_at";
const VIEW_COLS_RICH =
  "path, user_id, visitor_id, created_at, session_id, referrer, utm_source, device, browser, os, country";
const SESSION_GAP_MS = 30 * 60 * 1000;

const SOURCE_RULES = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/duckduckgo\./, "DuckDuckGo"],
  [/ecosia\./, "Ecosia"],
  [/instagram\./, "Instagram"],
  [/facebook\.|(^|\.)fb\.com$|(^|\.)fb\.me$/, "Facebook"],
  [/linkedin\.|(^|\.)lnkd\.in$/, "LinkedIn"],
  [/tiktok\./, "TikTok"],
  [/(^|\.)t\.co$|twitter\.|(^|\.)x\.com$/, "X / Twitter"],
  [/reddit\./, "Reddit"],
  [/youtube\.|youtu\.be/, "YouTube"],
  [/whatsapp\./, "WhatsApp"],
  [/snapchat\./, "Snapchat"],
  [/discord\./, "Discord"],
  [/chatgpt\.com|openai\.com/, "ChatGPT"],
  [/perplexity\./, "Perplexity"],
  [/claude\.ai/, "Claude"],
];

function sourceLabel(referrer, utm) {
  if (utm) return `${String(utm).toLowerCase()} (tagged link)`;
  if (!referrer) return "Direct / unknown";
  const host = String(referrer).toLowerCase().replace(/^www\./, "");
  for (const [pattern, label] of SOURCE_RULES) {
    if (pattern.test(host)) return label;
  }
  return host;
}

let regionNames = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}
function countryName(code) {
  try {
    return regionNames?.of(String(code).toUpperCase()) || code;
  } catch {
    return code;
  }
}

// ---------- Route ----------

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes((userData.user.email || "").toLowerCase())) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const rangeParam = params.get("range") || params.get("days") || "30";
  const lifetime = rangeParam === "all";
  const requested = Number(rangeParam);
  const days = lifetime ? 0 : [7, 30, 90].includes(requested) ? requested : 30;
  const audience = ["in", "out"].includes(params.get("audience")) ? params.get("audience") : "all";
  const fresh = params.get("fresh") === "1";
  const todayKey = dayKey(new Date());

  try {
    const now = Date.now();

    // Everything is loaded once and reused for 60 seconds. Changing the audience (or going
    // back to a range you already opened) does not download anything again.
    const { warnings, results } = await cached(`range:${lifetime ? "all" : days}`, fresh, async () => {
      // One broken table should never take the whole page down.
      const warnings = [];
      const safe = async (label, fn, fallback) => {
        try {
          return await fn();
        } catch (e) {
          warnings.push(`${label}: ${e?.message || String(e)}`);
          return fallback;
        }
      };

      const viewsSince = lifetime ? null : new Date(now - (days * 2 + 2) * DAY_MS).toISOString();

      const results = await Promise.all([
        safe("Users", listAllUsers, []),
        safe(
          "mentorss",
          () => fetchTable("mentorss", "id, name, school, subject, country, languages, available, verified, sessions, answers"),
          []
        ),
        safe(
          "mentor_applications",
          () => fetchTable("mentor_applications", "status, created_at, field, university, country"),
          []
        ),
        safe("user_questions", () => fetchTable("user_questions", "id, created_at, subject, country"), []),
        safe(
          "question_answers",
          () => fetchTable("question_answers", "created_at, user_question_id, mentor_name"),
          []
        ),
        safe("question_comments", () => fetchTable("question_comments", "created_at, user_id"), []),
        safe("mentor_reviews", () => fetchTable("mentor_reviews", "created_at, rating, mentor_id"), []),
        safe("student_profiles", () => fetchTable("student_profiles", "is_minor, consent_status"), []),
        safe("parental_requests", () => fetchTable("parental_requests", "status, kind"), []),
        safe("course_guides", () => fetchTable("course_guides", "id, subject, country_label, country"), []),
        safe(
          "page_views",
          async () => {
            const load = (cols) =>
              fetchAll(() => {
                let q = supabaseAdmin
                  .from("page_views")
                  .select(cols)
                  .not("path", "like", "/admin%")
                  .order("created_at", { ascending: true });
                if (viewsSince) q = q.gte("created_at", viewsSince);
                return q;
              });
            try {
              return await load(VIEW_COLS_RICH);
            } catch {
              // New tracking columns not added yet: fall back to the basic ones
              return await load(VIEW_COLS_BASIC);
            }
          },
          []
        ),
        safe("question_likes", () => countRows("question_likes"), null),
        safe(
          "question_views",
          async () => {
            const rows = await fetchAll(() => supabaseAdmin.from("question_views").select("view_count"));
            return rows.reduce((sum, r) => sum + (Number(r.view_count) || 0), 0);
          },
          null
        ),
        safe(
          "page_views (total)",
          async () => {
            const countViews = async (onlySignedIn) => {
              let q = supabaseAdmin
                .from("page_views")
                .select("*", { count: "exact", head: true })
                .not("path", "like", "/admin%");
              if (onlySignedIn) q = q.not("user_id", "is", null);
              const { count, error } = await q;
              if (error) throw error;
              return count || 0;
            };
            const [all, signedIn] = await Promise.all([countViews(false), countViews(true)]);
            return { all, in: signedIn };
          },
          null
        ),
        safe("mentor_calendar_events", () => countRows("mentor_calendar_events"), null),
        safe(
          "mentor_calendar_events (upcoming)",
          async () => {
            const { count, error } = await supabaseAdmin
              .from("mentor_calendar_events")
              .select("*", { count: "exact", head: true })
              .gte("event_date", todayKey);
            if (error) throw error;
            return count || 0;
          },
          null
        ),
        safe(
          "call_requests",
          () => fetchTable("call_requests", "created_at, student_id, student_email, mentor_id, source"),
          []
        ),
      ]);

      return { warnings, results };
    });

    const [
      users,
      allMentors,
      applications,
      questions,
      answers,
      comments,
      reviews,
      profiles,
      parental,
      guides,
      rawViews,
      likeCount,
      questionViewTotal,
      allTimeViewsRaw,
      calendarTotal,
      calendarUpcoming,
      callRequests,
    ] = results;

    // ---------- Period ----------
    // "Lifetime" starts at the first recorded activity and has no previous period to compare with.
    const earliestOf = (list) =>
      list.reduce((min, x) => (x.created_at && (min === null || x.created_at < min) ? x.created_at : min), null);

    let periodDays = days;
    let keys;
    let startKey;
    if (lifetime) {
      const stamps = [
        rawViews[0]?.created_at,
        earliestOf(users),
        earliestOf(applications),
        earliestOf(questions),
        earliestOf(callRequests),
        earliestOf(reviews),
      ].filter(Boolean);
      const firstKey = dayKey(stamps.length ? stamps.sort()[0] : new Date());
      periodDays = Math.max(1, Math.round((Date.parse(todayKey) - Date.parse(firstKey)) / DAY_MS) + 1);
      keys = lastDays(Math.min(periodDays, MAX_CHART_DAYS));
      startKey = firstKey;
    } else {
      keys = lastDays(days);
      startKey = keys[0];
    }
    const prevStartKey = lifetime ? null : shiftDay(startKey, -days);
    const inPeriodKey = (k) => k >= startKey && k <= todayKey;
    const inPrevKey = (k) => !lifetime && k >= prevStartKey && k < startKey;

    const allTimeViews =
      allTimeViewsRaw === null
        ? null
        : audience === "in"
          ? allTimeViewsRaw.in
          : audience === "out"
            ? Math.max(0, allTimeViewsRaw.all - allTimeViewsRaw.in)
            : allTimeViewsRaw.all;

    const mentors = allMentors.filter((m) => !m.admin_only);

    // ---------- Daily series ----------
    const daily = Object.fromEntries(
      keys.map((k) => [
        k,
        {
          views: 0,
          visitors: 0,
          sessions: 0,
          signups: 0,
          applications: 0,
          questions: 0,
          answers: 0,
          comments: 0,
          reviews: 0,
          callRequests: 0,
        },
      ])
    );
    const bump = (field, ts) => {
      const k = dayKey(ts);
      if (daily[k]) daily[k][field]++;
    };
    const countIn = (list, field = "created_at") => ({
      current: list.filter((x) => inPeriodKey(dayKey(x[field]))).length,
      previous: lifetime ? null : list.filter((x) => inPrevKey(dayKey(x[field]))).length,
    });

    // ---------- Users ----------
    users.forEach((u) => bump("signups", u.created_at));
    const mentorAccounts = users.filter((u) => u.user_metadata?.role === "mentor").length;
    const newUsers = countIn(users);
    const usersStats = {
      total: users.length,
      students: users.length - mentorAccounts,
      mentorAccounts,
      confirmed: users.filter((u) => u.email_confirmed_at || u.confirmed_at).length,
      active7d: users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 7 * DAY_MS).length,
      active30d: users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 30 * DAY_MS).length,
      newInPeriod: newUsers.current,
      newPrev: newUsers.previous,
      providers: tally(users, (u) => u.app_metadata?.provider || "email"),
    };

    // ---------- Students & parental consent ----------
    const studentsStats = {
      profiles: profiles.length,
      minors: profiles.filter((p) => p.is_minor === true).length,
      consent: tally(profiles, (p) => p.consent_status),
      requestsTotal: parental.length,
      requestsByStatus: tally(parental, (p) => p.status),
      requestsByKind: tally(parental, (p) => p.kind),
    };

    // ---------- Reviews ----------
    reviews.forEach((r) => bump("reviews", r.created_at));
    const ratingValues = reviews.map((r) => Number(r.rating)).filter((r) => r > 0);
    const reviewAgg = new Map();
    reviews.forEach((r) => {
      const k = String(r.mentor_id);
      const a = reviewAgg.get(k) || { sum: 0, count: 0 };
      a.sum += Number(r.rating) || 0;
      a.count++;
      reviewAgg.set(k, a);
    });
    const reviewsStats = {
      total: reviews.length,
      avg: ratingValues.length ? round2(ratingValues.reduce((s, r) => s + r, 0) / ratingValues.length) : null,
      distribution: [1, 2, 3, 4, 5].map((star) => ratingValues.filter((r) => Math.round(r) === star).length),
    };

    // ---------- Mentors ----------
    const mentorNames = new Map(mentors.map((m) => [String(m.id), m.name]));
    const languagesOf = (m) =>
      typeof m.languages === "string" ? m.languages.split(",") : Array.isArray(m.languages) ? m.languages : [];
   
       const { data: fieldRows } = await supabaseAdmin
      .from("site_filters")
      .select("label, keywords, sort_order")
      .eq("kind", "field")
      .order("sort_order", { ascending: true });
    const fieldDefs = fieldRows?.length
      ? fieldRows.map((r) => ({ label: r.label, keywords: parseKeywords(r.keywords) }))
      : undefined;
    const mentorsStats = {
      total: mentors.length,
      available: mentors.filter((m) => m.available === true).length,
      verified: mentors.filter((m) => m.verified === true).length,
      totalSessions: mentors.reduce((s, m) => s + (Number(m.sessions) || 0), 0),
      totalAnswersColumn: mentors.reduce((s, m) => s + (Number(m.answers) || 0), 0),
      withoutReviews: mentors.filter((m) => !reviewAgg.has(String(m.id))).length,
            byField: tally(mentors, (m) => getFieldGroups(m.subject, fieldDefs)),
      byCountry: tally(mentors, (m) => m.country),
      bySchool: tally(mentors, (m) => m.school, 8),
      languages: tally(mentors, languagesOf, 8),
      topRated: mentors
        .map((m) => {
          const a = reviewAgg.get(String(m.id));
          return a ? { name: m.name, school: m.school, avg: round1(a.sum / a.count), count: a.count } : null;
        })
        .filter(Boolean)
        .sort((x, y) => y.avg - x.avg || y.count - x.count)
        .slice(0, 5),
      topAnswerers: tally(answers, (a) => a.mentor_name, 5),
    };

    // ---------- Applications ----------
    applications.forEach((a) => bump("applications", a.created_at));
    const appCount = (s) => applications.filter((a) => a.status === s).length;
    const pendingTimes = applications
      .filter((a) => a.status === "pending")
      .map((a) => new Date(a.created_at).getTime())
      .filter(Number.isFinite);
    const approved = appCount("approved");
    const rejected = appCount("rejected");
    const newApps = countIn(applications);
    const applicationsStats = {
      total: applications.length,
      pending: appCount("pending"),
      approved,
      rejected,
      other: applications.length - appCount("pending") - approved - rejected,
      approvalRate: approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : null,
      newInPeriod: newApps.current,
      newPrev: newApps.previous,
      oldestPendingDays: pendingTimes.length ? Math.floor((now - Math.min(...pendingTimes)) / DAY_MS) : null,
      topFields: tally(applications, (a) => a.field, 6),
      topUniversities: tally(applications, (a) => a.university, 6),
      topCountries: tally(applications, (a) => a.country, 6),
    };

    // ---------- Community ----------
    questions.forEach((q) => bump("questions", q.created_at));
    answers.forEach((a) => bump("answers", a.created_at));
    comments.forEach((c) => bump("comments", c.created_at));

    const firstAnswer = new Map();
    answers.forEach((a) => {
      const t = new Date(a.created_at).getTime();
      if (!Number.isFinite(t)) return;
      const k = String(a.user_question_id);
      if (!firstAnswer.has(k) || t < firstAnswer.get(k)) firstAnswer.set(k, t);
    });
    const waits = [];
    const unansweredAges = [];
    let answeredCount = 0;
    questions.forEach((q) => {
      const asked = new Date(q.created_at).getTime();
      const answeredAt = firstAnswer.get(String(q.id));
      if (answeredAt !== undefined) {
        answeredCount++;
        if (Number.isFinite(asked) && answeredAt >= asked) waits.push((answeredAt - asked) / 3600000);
      } else if (Number.isFinite(asked)) {
        unansweredAges.push(now - asked);
      }
    });
    const communityStats = {
      questions: questions.length,
      answered: answeredCount,
      unanswered: questions.length - answeredCount,
      answerRate: questions.length ? Math.round((answeredCount / questions.length) * 100) : null,
      medianFirstAnswerHours: median(waits) === null ? null : round1(median(waits)),
      oldestUnansweredDays: unansweredAges.length ? Math.floor(Math.max(...unansweredAges) / DAY_MS) : null,
      answers: answers.length,
      comments: comments.length,
      commenters: new Set(comments.map((c) => c.user_id).filter(Boolean)).size,
      likes: likeCount,
      views: questionViewTotal,
      topSubjects: tally(questions, (q) => String(q.subject || "").split(","), 6),
      topCountries: tally(questions, (q) => String(q.country || "").split(","), 6),
    };

    // ---------- Content ----------
    const guideNames = new Map(
      guides.map((g) => [String(g.id), [g.subject, g.country_label || g.country].filter(Boolean).join(" · ")])
    );
    const contentStats = {
      guides: guides.length,
      guidesByCountry: tally(guides, (g) => g.country_label || g.country, 6),
      guidesBySubject: tally(guides, (g) => g.subject, 6),
      calendarEvents: calendarTotal,
      calendarUpcoming,
    };

    // ---------- Traffic ----------
    // A person who logged in on any device counts once; anonymous visitors are per browser.
    const visitorToUser = new Map();
    rawViews.forEach((v) => {
      if (v.visitor_id && v.user_id) visitorToUser.set(v.visitor_id, v.user_id);
    });
    const identityOf = (v) => v.user_id || (v.visitor_id && visitorToUser.get(v.visitor_id)) || v.visitor_id || "unknown";

    const views = rawViews
      .filter((v) => v.path && !/^\/(admin|api)(\/|$)/.test(v.path))
      .map((v) => ({
        path: v.path,
        day: dayKey(v.created_at),
        ts: new Date(v.created_at),
        vid: identityOf(v),
        known: Boolean(v.user_id || (v.visitor_id && visitorToUser.get(v.visitor_id))),
        loggedIn: Boolean(v.user_id),
        sessionId: v.session_id || null,
        referrer: v.referrer || null,
        utm: v.utm_source || null,
        device: v.device || null,
        browser: v.browser || null,
        os: v.os || null,
        country: v.country || null,
      }))
      // Audience filter: signed in = views made while logged in, signed out = views made while logged out
      .filter((v) => audience === "all" || (audience === "in" ? v.loggedIn : !v.loggedIn));

    // Sessions: use the stored session id; for older rows, split a person's views at 30-minute gaps.
    const lastSeen = new Map();
    views.forEach((v) => {
      if (v.sessionId) {
        v.sid = v.sessionId;
        return;
      }
      const prev = lastSeen.get(v.vid);
      const t = v.ts.getTime();
      const n = prev ? (t - prev.t <= SESSION_GAP_MS ? prev.n : prev.n + 1) : 0;
      lastSeen.set(v.vid, { t, n });
      v.sid = `${v.vid}#${n}`;
    });
    const richTracking = views.some((v) => v.sessionId);

    const periodViews = views.filter((v) => inPeriodKey(v.day));
    const prevViews = views.filter((v) => inPrevKey(v.day));

    const visitorsByDay = new Map();
    const daysSeenByVisitor = new Map();
    periodViews.forEach((v) => {
      if (daily[v.day]) daily[v.day].views++;
      if (!visitorsByDay.has(v.day)) visitorsByDay.set(v.day, new Set());
      visitorsByDay.get(v.day).add(v.vid);
      if (!daysSeenByVisitor.has(v.vid)) daysSeenByVisitor.set(v.vid, new Set());
      daysSeenByVisitor.get(v.vid).add(v.day);
    });
    keys.forEach((k) => {
      daily[k].visitors = visitorsByDay.get(k)?.size || 0;
    });

    const visitorsPeriod = new Set(periodViews.map((v) => v.vid));
    const visitorsPrev = new Set(prevViews.map((v) => v.vid));
    const returning = [...daysSeenByVisitor.values()].filter((d) => d.size >= 2).length;
    const loggedInVisitors = new Set(periodViews.filter((v) => v.known).map((v) => v.vid)).size;

    // Session aggregation (first view of each session = entry page, source and device)
    const sessionMap = new Map();
    periodViews.forEach((v) => {
      const existing = sessionMap.get(v.sid);
      if (!existing) sessionMap.set(v.sid, { first: v, count: 1 });
      else existing.count++;
    });
    const sessionList = [...sessionMap.values()];
    sessionList.forEach((sess) => {
      if (daily[sess.first.day]) daily[sess.first.day].sessions++;
    });
    const bounced = sessionList.filter((sess) => sess.count === 1).length;

    const byHour = Array(24).fill(0);
    const weekdayCounts = {};
    periodViews.forEach((v) => {
      byHour[Number(hourFmt.format(v.ts)) % 24]++;
      const wd = weekdayFmt.format(v.ts);
      weekdayCounts[wd] = (weekdayCounts[wd] || 0) + 1;
    });
    const byWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
      label,
      count: weekdayCounts[label] || 0,
    }));

    const pageAgg = new Map();
    periodViews.forEach((v) => {
      const p = normalizePath(v.path);
      const entry = pageAgg.get(p) || { path: p, count: 0, visitors: new Set() };
      entry.count++;
      entry.visitors.add(v.vid);
      pageAgg.set(p, entry);
    });
    const topPages = [...pageAgg.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p) => ({ path: p.path, count: p.count, visitors: p.visitors.size }));

    const profileViewRows = periodViews.filter((v) =>
      /^\/mentors\/[^/]+$/.test(v.path.split("?")[0].replace(/\/+$/, ""))
    );
    const profileViews = tally(
      profileViewRows,
      (v) => {
        const id = decodeURIComponent(v.path.split("?")[0].replace(/\/+$/, "").split("/")[2] || "");
        return mentorNames.get(id) || "Removed mentor";
      },
      5
    );
    const guideViews = tally(
      periodViews.filter((v) => /^\/course-guides\/[^/]+$/.test(v.path.split("?")[0].replace(/\/+$/, ""))),
      (v) => {
        const id = decodeURIComponent(v.path.split("?")[0].replace(/\/+$/, "").split("/")[2] || "");
        return guideNames.get(id) || "Removed guide";
      },
      5
    );

    const reachSets = {
      mentors: new Set(),
      profile: new Set(),
      guides: new Set(),
      community: new Set(),
      signup: new Set(),
      apply: new Set(),
    };
    periodViews.forEach((v) => {
      const p = normalizePath(v.path);
      if (p === "/mentors") reachSets.mentors.add(v.vid);
      if (p === "/mentors/[profile]") reachSets.profile.add(v.vid);
      if (p === "/course-guides" || p === "/course-guides/[guide]") reachSets.guides.add(v.vid);
      if (p === "/community") reachSets.community.add(v.vid);
      if (p === "/signup") reachSets.signup.add(v.vid);
      if (p === "/apply") reachSets.apply.add(v.vid);
    });
    const totalVisitors = visitorsPeriod.size;
    const reachRow = (label, set) => ({
      label,
      visitors: set.size,
      pct: totalVisitors ? Math.round((set.size / totalVisitors) * 100) : 0,
    });

    // Sources, devices, browsers, systems and countries (only sessions that carry the data)
    const richSessions = sessionList.filter((sess) => sess.first.sessionId);
    const trafficStats = {
      richTracking,
      viewsPeriod: periodViews.length,
      viewsPrev: lifetime ? null : prevViews.length,
      visitorsPeriod: totalVisitors,
      visitorsPrev: lifetime ? null : visitorsPrev.size,
      viewsToday: daily[todayKey].views,
      visitorsToday: daily[todayKey].visitors,
      sessionsPeriod: sessionList.length,
      pagesPerVisitor: totalVisitors ? round1(periodViews.length / totalVisitors) : null,
      pagesPerSession: sessionList.length ? round1(periodViews.length / sessionList.length) : null,
      bounceRate: sessionList.length ? Math.round((bounced / sessionList.length) * 100) : null,
      returningVisitors: returning,
      returningPct: totalVisitors ? Math.round((returning / totalVisitors) * 100) : null,
      loggedInVisitors,
      loggedInVisitorsPct: totalVisitors ? Math.round((loggedInVisitors / totalVisitors) * 100) : null,
      loggedInPct: periodViews.length
        ? Math.round((periodViews.filter((v) => v.loggedIn).length / periodViews.length) * 100)
        : null,
      allTimeViews,
      byHour,
      byWeekday,
      topPages,
      topMentorProfiles: profileViews,
      topGuides: guideViews,
      entryPages: tally(sessionList, (sess) => normalizePath(sess.first.path), 6),
      sources: tally(richSessions, (sess) => sourceLabel(sess.first.referrer, sess.first.utm), 8),
      devices: tally(richSessions, (sess) => sess.first.device),
      browsers: tally(richSessions, (sess) => sess.first.browser, 6),
      systems: tally(richSessions, (sess) => sess.first.os, 6),
      countries: tally(richSessions, (sess) => (sess.first.country ? countryName(sess.first.country) : ""), 8),
      reach: [
        reachRow("Browsed the mentor list", reachSets.mentors),
        reachRow("Opened a mentor profile", reachSets.profile),
        reachRow("Read a course guide", reachSets.guides),
        reachRow("Visited the community", reachSets.community),
        reachRow("Opened sign-up", reachSets.signup),
        reachRow("Opened the mentor application", reachSets.apply),
      ],
    };

    // ---------- Call requests ----------
    callRequests.forEach((cr) => bump("callRequests", cr.created_at));
    const callsPeriod = countIn(callRequests);
    const requesters = tally(callRequests, (cr) => cr.student_id || cr.student_email);
    const parentCalls = parental.filter((p) => p.kind === "call");
    const parentApproved = parentCalls.filter((p) => p.status === "approved").length;
    const parentDeclined = parentCalls.filter((p) => p.status === "declined").length;
    const callsStats = {
      total: callRequests.length,
      inPeriod: callsPeriod.current,
      prev: callsPeriod.previous,
      uniqueStudents: requesters.length,
      repeatStudents: requesters.filter((r) => r.count >= 2).length,
      perHundredProfileViews: profileViewRows.length
        ? round1((callsPeriod.current / profileViewRows.length) * 100)
        : null,
      topMentors: tally(callRequests, (cr) => mentorNames.get(String(cr.mentor_id)) || "Removed mentor", 5),
      bySource: tally(callRequests, (cr) => cr.source),
      parentTotal: parentCalls.length,
      parentPending: parentCalls.filter((p) => p.status === "pending").length,
      parentApproved,
      parentDeclined,
      parentApprovalRate:
        parentApproved + parentDeclined > 0
          ? Math.round((parentApproved / (parentApproved + parentDeclined)) * 100)
          : null,
    };

    return Response.json(
      {
        days: periodDays,
        range: lifetime ? "all" : String(days),
        lifetime,
        audience,
        chartDays: keys.length,
        timezone: TZ,
        generatedAt: new Date().toISOString(),
        warnings,
        daily: keys.map((k) => ({ day: k, ...daily[k] })),
        traffic: trafficStats,
        users: usersStats,
        students: studentsStats,
        mentors: mentorsStats,
        applications: applicationsStats,
        community: communityStats,
        reviews: reviewsStats,
        calls: callsStats,
        content: contentStats,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}