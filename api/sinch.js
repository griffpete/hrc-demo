export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  res.status(200).end();

  const body = req.body;
  const contact = body.message?.contact_message;
  const identity = body.message?.channel_identity?.identity;

  if (contact?.choice_response_message) {
    const postback = contact.choice_response_message.postback_data;
    console.log("BUTTON TAP:", postback);
    const reply = replies[postback];
    if (reply && identity) await send(identity, { text_message: { text: reply } });
  } else if (contact?.text_message) {
    console.log("TYPED REPLY:", contact.text_message.text);
    if (identity) await send(identity, { text_message: { text: "Thanks — a member of our care team will follow up during clinic hours." } });
  } else if (body.message_delivery_report) {
    console.log("DELIVERY:", body.message_delivery_report.status);
  }
}
