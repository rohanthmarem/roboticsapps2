import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates a Google Calendar event with Google Meet for an interview booking.
 *
 * Required Supabase Edge Function secrets:
 *   GOOGLE_SERVICE_ACCOUNT_JSON - The full JSON content of the service account key file
 *   SUPABASE_URL               - Auto-provided by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY   - Auto-provided by Supabase
 *
 * Request body:
 *   applicantName    - Full name of the applicant
 *   applicantEmail   - Applicant's email address
 *   positionTitle    - Position(s) being interviewed for
 *   date             - Interview date (YYYY-MM-DD)
 *   startTime        - Start time (HH:MM)
 *   endTime          - End time (HH:MM)
 *   interviewerName  - Optional interviewer name
 *   ccEmails         - Array of emails to CC on the invite
 *   durationMinutes  - Duration in minutes (fallback if endTime not provided)
 *   bookingId        - interview_bookings row ID to update with Meet link
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Build a JWT from the service account credentials and exchange it for an access token. */
async function getAccessToken(
  serviceAccount: {
    client_email: string;
    private_key: string;
    token_uri: string;
  }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the private key and sign
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to get access token: ${JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      applicantName,
      applicantEmail,
      positionTitle,
      date,
      startTime,
      endTime,
      interviewerName,
      ccEmails,
      durationMinutes,
      bookingId,
    } = await req.json();

    if (!applicantEmail || !date || !startTime) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: applicantEmail, date, startTime",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load Google service account credentials
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      // Dev fallback: log and return a placeholder
      console.log(
        `[CALENDAR] Would create event: ${applicantName} on ${date} at ${startTime}`
      );
      return new Response(
        JSON.stringify({
          message: "Calendar event logged (no GOOGLE_SERVICE_ACCOUNT_JSON configured)",
          meetLink: null,
          eventId: "dev-" + Date.now(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    // Build start/end datetimes
    const startDateTime = `${date}T${startTime}:00`;
    let endDateTime: string;
    if (endTime) {
      endDateTime = `${date}T${endTime}:00`;
    } else {
      const dur = durationMinutes || 20;
      const [h, m] = startTime.split(":").map(Number);
      const totalMin = h * 60 + m + dur;
      const eh = String(Math.floor(totalMin / 60)).padStart(2, "0");
      const em = String(totalMin % 60).padStart(2, "0");
      endDateTime = `${date}T${eh}:${em}:00`;
    }

    // Build attendees list
    const attendees: { email: string; responseStatus?: string }[] = [
      { email: applicantEmail },
    ];
    if (Array.isArray(ccEmails)) {
      for (const cc of ccEmails) {
        if (cc && cc !== applicantEmail) {
          attendees.push({ email: cc });
        }
      }
    }

    const eventTitle =
      `WOSS Robotics Interview — ${applicantName || "Applicant"} — ${positionTitle || "Executive Position"}`;

    const event = {
      summary: eventTitle,
      description: `Interview for the ${positionTitle || "Executive"} position on the WOSS Robotics executive team.\n\nApplicant: ${applicantName || "N/A"}\nEmail: ${applicantEmail}${interviewerName ? `\nInterviewer: ${interviewerName}` : ""}`,
      start: {
        dateTime: startDateTime,
        timeZone: "America/Toronto",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "America/Toronto",
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `woss-interview-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      sendUpdates: "all",
    };

    // Create the Calendar event with conferenceDataVersion=1 to generate Meet link
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent("c_f6c4d445aab521e3ebce503895f646783c6c87f9a36f9e34d515b127dc2f8605@group.calendar.google.com")}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(event),
      }
    );

    const calData = await calRes.json();

    if (!calRes.ok) {
      console.error("Google Calendar API error:", calData);
      return new Response(
        JSON.stringify({ error: "Failed to create calendar event", details: calData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meetLink =
      calData.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === "video"
      )?.uri || null;

    const eventId = calData.id;
    const htmlLink = calData.htmlLink;

    // Store the Meet link and event ID in the booking record
    if (bookingId) {
      await supabase
        .from("interview_bookings")
        .update({
          meet_link: meetLink,
          calendar_event_id: eventId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    return new Response(
      JSON.stringify({
        meetLink,
        eventId,
        htmlLink,
        message: "Calendar event created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
