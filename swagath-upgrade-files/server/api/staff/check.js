import { isStaff } from "../../lib/staff-auth.js";

export const access = "public";
export const methods = ["POST"];

export default async function (req, res) {
  if (isStaff(req)) return res.json({ ok: true });
  res.status(401).json({ ok: false });
}
