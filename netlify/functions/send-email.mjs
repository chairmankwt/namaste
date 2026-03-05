// Netlify Function: /api/send-email
// Sends email notifications via Resend when appointments are created/edited/cancelled

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500 });
  }

  try {
    const body = await req.json();
    const { to, subject, html } = body;

    if (!to || !to.length || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), { status: 400 });
    }

    // Filter out empty emails
    const recipients = Array.isArray(to) ? to.filter(e => e && e.includes("@")) : [to].filter(e => e && e.includes("@"));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ message: "No valid recipients" }), { status: 200 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Spa Notifications <onboarding@resend.dev>",
        to: recipients,
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return new Response(JSON.stringify({ error: "Email send failed", details: result }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200 });
  } catch (e) {
    console.error("Send email error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const config = {
  path: "/api/send-email",
};
