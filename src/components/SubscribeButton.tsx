import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { fetchSubscriptionStatus, subscribe, unsubscribe, type SubscriptionStatus } from "../lib/api";

const label: Record<SubscriptionStatus, string> = {
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
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState<SubscriptionStatus>("none");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const loggedIn = accessToken != null;

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    fetchSubscriptionStatus(channelId)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [channelId, loggedIn]);

  const goToLogin = () => {
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?next=${next}`);
  };

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);

    const next: SubscriptionStatus =
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
        onClick={loggedIn ? toggle : goToLogin}
        disabled={busy}
        className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          active
            ? "border border-border text-text hover:bg-surface-hover"
            : "bg-accent text-white hover:opacity-90"
        }`}
      >
        {loggedIn ? label[status] : "Login to Subscribe"}
      </button>
      {failure && <p className="mt-2 text-xs text-red-400">{failure}</p>}
    </div>
  );
}
