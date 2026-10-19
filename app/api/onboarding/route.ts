import { requireSession } from "../../server/auth";
import { checkOrigin, failure, json } from "../../server/http";
import { demoTour, saveTourSeen, tourSeen } from "../../server/onboarding";

export async function GET() {
  try {
    const { user, account } = await requireSession();
    const demo = demoTour(account.email);
    return json({ demo, seen: demo ? false : await tourSeen(user.sub) });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const { user, account } = await requireSession();
    if (!demoTour(account.email)) await saveTourSeen(user.sub);
    return json({ demo: demoTour(account.email), seen: true });
  } catch (error) { return failure(error); }
}
