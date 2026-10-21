import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { defaultAvatar } from "../data/user";
import { fetchSubscribers, removeSubscriberById, type Subscriber } from "../lib/api";

type SubscribersModalProps = {
  channelId: number;
  channelName: string;
  showRemove?: boolean;
  onClose: () => void;
  onRemoved?: () => void;
};

export default function SubscribersModal({
  channelId,
  channelName,
  showRemove = false,
  onClose,
  onRemoved,
}: SubscribersModalProps) {
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [last, setLast] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    setSubscribers(null);
    setPage(0);
    setLast(true);
    setError(null);

    fetchSubscribers(channelId, 0)
      .then((slice) => {
        if (cancelled) return;
        setSubscribers(slice.content);
        setLast(slice.last);
      })
      .catch(() => {
        if (cancelled) return;
        setSubscribers([]);
        setError("Failed to load subscribers.");
      });

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const loadMore = async () => {
    try {
      const next = page + 1;
      const slice = await fetchSubscribers(channelId, next);
      setPage(next);
      setLast(slice.last);
      setSubscribers((prev) => (prev ? [...prev, ...slice.content] : slice.content));
    } catch {
      setError("Failed to load subscribers.");
    }
  };

  const remove = async (id: number) => {
    if (removingId != null) return;
    setRemovingId(id);
    setError(null);
    try {
      await removeSubscriberById(id);
      setSubscribers((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      onRemoved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-bg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          {channelName ? `${channelName}'s subscribers` : "Subscribers"}
        </h2>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {subscribers == null ? (
            <p className="py-4 text-sm text-text-dim">Loading…</p>
          ) : subscribers.length === 0 ? (
            <p className="py-4 text-sm text-text-dim">No subscribers yet.</p>
          ) : (
            <div className="flex flex-col">
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-hover"
                >
                  <img
                    src={subscriber.subscriberProfileUrl ?? defaultAvatar}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full bg-surface object-cover"
                  />
                  <Link
                    to={`/channel/${encodeURIComponent(subscriber.subscriberUsername ?? String(subscriber.subscriberId))}`}
                    onClick={onClose}
                    className="min-w-0 truncate text-sm font-medium text-text hover:underline"
                  >
                    {subscriber.subscriberUsername ?? "User"}
                  </Link>
                  {showRemove && (
                    <button
                      onClick={() => remove(subscriber.id)}
                      disabled={removingId != null}
                      className="ml-auto shrink-0 cursor-pointer rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                    >
                      {removingId === subscriber.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              ))}
              {!last && (
                <button
                  onClick={loadMore}
                  className="mt-1 cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-hover"
                >
                  Load more
                </button>
              )}
            </div>
          )}
          {error && <p className="py-1 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
