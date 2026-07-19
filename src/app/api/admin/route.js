// If approved, create a real login account and add them as a mentor
  if (status === "approved" && application) {
    const countryMap = { Netherlands: "NL", "United Kingdom": "UK" };
    const initials = `${application.first_name?.[0] || ""}${application.last_name?.[0] || ""}`.toUpperCase();
    const fullName = `${application.first_name} ${application.last_name}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: { name: fullName, role: "mentor" },
        redirectTo: `${siteUrl}/mentor/set-password`,
      }
    );

    if (inviteError) {
      return Response.json({ error: inviteError.message }, { status: 500 });
    }

    const newUserId = inviteData.user.id;

    const { error: insertError } = await supabaseAdmin.from("mentorss").insert([
      {
        user_id: newUserId,
        name: fullName,
        initials,
        school: application.university,
        year: application.year,
        verified: true,
        subject: application.field,
        country: countryMap[application.country] || application.country,
        languages: ["English"],
        bio: application.why,
        sessions: 0,
        answers: 0,
        rating: 0,
        available: true,
      },
    ]);

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }
  }