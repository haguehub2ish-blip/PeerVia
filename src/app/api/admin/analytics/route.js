import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  if (userData.user.email !== process.env.ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    // Total users (from Auth)
    const { data: usersList, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersError) throw usersError;

    const totalUsers = usersList.users.length;
    const totalMentorUsers = usersList.users.filter(
      (u) => u.user_metadata?.role === "mentor"
    ).length;

    // Signups over the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const signupsByDay = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const key = d.toISOString().split("T")[0];
      signupsByDay[key] = 0;
    }
    usersList.users.forEach((u) => {
      const created = u.created_at?.split("T")[0];
      if (created && signupsByDay[created] !== undefined) {
        signupsByDay[created]++;
      }
    });

    // Mentors table
    const { count: mentorCount, error: mentorError } = await supabaseAdmin
      .from("mentorss")
      .select("*", { count: "exact", head: true });
    if (mentorError) throw mentorError;

    // Applications, broken down by status
    const { data: applications, error: appError } = await supabaseAdmin
      .from("mentor_applications")
      .select("status");
    if (appError) throw appError;

    const applicationStats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    // Community questions
    const { count: questionCount, error: qError } = await supabaseAdmin
      .from("user_questions")
      .select("*", { count: "exact", head: true });
    if (qError) throw qError;

    // Answers given
    const { count: answerCount, error: aError } = await supabaseAdmin
      .from("question_answers")
      .select("*", { count: "exact", head: true });
    if (aError) throw aError;

    // Likes and comments
    const { count: likeCount, error: lError } = await supabaseAdmin
      .from("question_likes")
      .select("*", { count: "exact", head: true });
    if (lError) throw lError;

    const { count: commentCount, error: cError } = await supabaseAdmin
      .from("question_comments")
      .select("*", { count: "exact", head: true });
    if (cError) throw cError;

    return Response.json({
      totalUsers,
      totalMentorUsers,
      mentorCount,
      applicationStats,
      questionCount,
      answerCount,
      likeCount,
      commentCount,
      signupsByDay,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}