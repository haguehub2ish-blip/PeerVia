import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const alt = "PeerVia mentor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;

  const { data: mentor } = await supabase
    .from("mentorss")
        .select("name, subject, school, photo_url, initials, verified")
    .eq("activated", true)
    .eq("id", id)
    .maybeSingle();

  const name = mentor?.name || "PeerVia Mentor";
  const line = mentor
    ? [mentor.subject, mentor.school].filter(Boolean).join(" · ")
    : "Real answers from the people living it.";
  const initials =
    mentor?.initials ||
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // The image generator can only draw PNG/JPG photos. Anything else falls back to initials.
  const photoOk = mentor?.photo_url && /\.(png|jpe?g)(\?|$)/i.test(mentor.photo_url);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#F1E7CC",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 300,
            height: 300,
            borderRadius: 150,
            overflow: "hidden",
            background: "#BC6C25",
            border: "8px solid #FFFDF8",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFDF8",
            fontSize: 110,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {photoOk ? (
            <img
              src={mentor.photo_url}
              alt=""
              width={300}
              height={300}
              style={{ objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginLeft: 64, flex: 1 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 4,
              color: "#BC6C25",
              fontWeight: 700,
            }}
          >
            {mentor?.verified ? "VERIFIED MENTOR" : "MENTOR"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: name.length > 22 ? 56 : 76,
              fontWeight: 700,
              color: "#241A12",
              marginTop: 16,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#7A6952", marginTop: 20 }}>
            {line}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#241A12",
              marginTop: 48,
              fontWeight: 700,
            }}
          >
            PeerVia · Real answers from the people living it
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}