import { useState } from "react";
import { subscribe, unsubscribe } from "../lib/api";

type Status = "none" | "pending" | "subscribed";

const label: Record<Status, string> = {
  none: "Subscribe",
  pending: "Requested",
  subscribed: "Subscribed",
};

export default function SubscribeButton({
  channelId,
  isPrivate,
}: {
  channelId: number;
  isPrivate: boolean;
}) {
  const [status, setStatus] = useState<Status>("none");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);

    const next: Status =
      status === "none" ? (isPrivate ? "pending" : "subscribed") : "none";
    const previous = status;
    setStatus(next);

    try {
      if (next === "none") {
        await unsubscribe(channelId);
      } else {
        await subscribe(channelId);
      }
    } catch (err) {
      setStatus(previous);
      setFailure(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  };

  const active = status !== "none";

  return (
    <div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          active
            ? "border border-border text-text hover:bg-surface-hover"
            : "bg-accent text-white hover:opacity-90"
        }`}
      >
        {label[status]}
      </button>
      {failure && <p className="mt-2 text-xs text-red-400">{failure}</p>}
    </div>
  );
}
