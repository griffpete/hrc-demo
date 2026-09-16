const PROJECT_ID = process.env.SINCH_PROJECT_ID;
const APP_ID = process.env.SINCH_APP_ID;
const KEY_ID = process.env.SINCH_KEY_ID;
const KEY_SECRET = process.env.SINCH_KEY_SECRET;

const CLINIC_PHONE = "+16265855900";

function text(body) {
  return { text_message: { text: body } };
}

function consultOffer(service) {
  return {
    choice_message: {
      text_message: {
        text: `Thanks for your interest in ${service}. A new patient consultation runs about 45 minutes, and you'll meet one-on-one with a reproductive endocrinologist to talk through your options.`
      },
      choices: [
        {
          text_message: { text: "Request a consult" },
          postback_data: "request_consult",
          display_mode: "PERSISTENT"
        },
        {
          call_message: { title: "Call clinic", phone_number: CLINIC_PHONE },
          postback_data: "call_clinic",
          display_mode: "PERSISTENT"
        }
      ]
    }
  };
}

const rescheduleOptions = {
  choice_message: {
    text_message: {
      text: "No problem at all, Sarah. Here's what Dr. Chen has open this week — tap a time and we'll move your appointment over."
    },
    choices: [
      {
        text_message: { text: "Thu 2:30 PM" },
        postback_data: "slot_thu_230",
        display_mode: "PERSISTENT"
      },
      {
        text_message: { text: "Fri 9:15 AM" },
        postback_data: "slot_fri_915",
        display_mode: "PERSISTENT"
      },
      {
        text_message: { text: "Mon 11:00 AM" },
        postback_data: "slot_mon_1100",
        display_mode: "PERSISTENT"
      },
      {
        call_message: { title: "None of these", phone_number: CLINIC_PHONE },
        postback_data: "call_clinic",
        display_mode: "PERSISTENT"
      }
    ]
  }
};

function slotConfirmed(when) {
  return text(
    `You're all set for ${when} with Dr. Chen at our Pasadena office. Your original Thursday slot has been released. We'll send a reminder the day before.`
  );
}

const replies = {
  confirm_appt: text(
    "Thank you, Sarah. You're confirmed with Dr. Chen for Thursday, September 17 at 10:00 AM at our Pasadena office. Please arrive 15 minutes early, and hold off on breakfast if you're having morning bloodwork."
  ),

  reschedule_appt: rescheduleOptions,

  slot_thu_230: slotConfirmed("Thursday, September 17 at 2:30 PM"),
  slot_fri_915: slotConfirmed("Friday, September 18 at 9:15 AM"),
  slot_mon_1100: slotConfirmed("Monday, September 21 at 11:00 AM"),

  call_clinic: text(
    "Our Pasadena office is open Monday through Friday, 7:00 AM to 5:00 PM, and Saturdays 7:00 AM to noon. Outside those hours the same number reaches our on-call nurse."
  ),

  svc_ivf: consultOffer("IVF"),
  svc_egg_freezing: consultOffer("egg freezing"),
  svc_donor: consultOffer("our donor program"),
  svc_genetic: consultOffer("genetic testing"),

  request_consult: text(
    "Thank you. A new patient coordinator will reach out within one business day to find a time and walk you through what to bring. If you'd rather not wait, you're welcome to call us directly."
  ),

  add_monitoring: text(
    "Added to your calendar. Monitoring visits are quick, usually 20 to 30 minutes, and you can come straight back to the lab without checking in at the front desk."
  ),

  directions_pasadena: text(
    "See you there. We're on South Arroyo Parkway just past Del Mar. Park in the structure behind the building and bring your ticket up with you for validation."
  ),

  take_survey: text(
    "Thank you! We appreciate you taking the time to share your feedback."
  )
};

const fallback = text(
  "Thank you for your message. Our care team reads these during clinic hours and will follow up shortly. For anything time-sensitive about a current cycle, please call us and ask for the nurse line."
);

function auth() {
  return "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
}

async function send(identity, message) {
  const res = await fetch(
    `https://us.conversation.api.sinch.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: APP_ID,
        recipient: {
          identified_by: {
            channel_identities: [{ channel: "RCS", identity }]
          }
        },
        message
      })
    }
  );

  if (!res.ok) {
    console.error("SEND FAILED:", await res.text());
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = req.body || {};
  const contact = body.message?.contact_message;
  const identity = body.message?.channel_identity?.identity;

  try {
    if (contact?.choice_response_message) {
      const postback = contact.choice_response_message.postback_data;
      console.log("BUTTON TAP:", postback, identity);
      const reply = replies[postback];
      if (reply && identity) await send(identity, reply);
    } else if (contact?.text_message) {
      console.log("TYPED REPLY:", contact.text_message.text, identity);
      if (identity) await send(identity, fallback);
    } else if (body.message_delivery_report) {
      console.log("DELIVERY:", body.message_delivery_report.status);
    } else {
      console.log("OTHER:", JSON.stringify(body));
    }
  } catch (err) {
    console.error("HANDLER ERROR:", err);
  }

  return res.status(200).json({ ok: true });
}
