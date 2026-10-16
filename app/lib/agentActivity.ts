import { isToolUIPart, type UIMessage } from "ai";

export function waitingForAnswer(message: UIMessage) {
  const last = message.parts.at(-1);
  if (!last) return true;
  if (last.type === "text") return last.state === "done";
  if (isToolUIPart(last)) return last.state === "output-available" || last.state === "output-error";
  return true;
}
