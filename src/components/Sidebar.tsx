import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { defaultAvatar } from "../data/user";
import { fetchMySubscriptions, type SubscribedChannel } from "../lib/api";

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>([]);
  const [pending, setPending] = useState<SubscribedChannel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loggedIn = accessToken != null;

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  useEffect(() => {
    if (!open || !loggedIn) return;
    let cancelled = false;
    fetchMySubscriptions()
      .then((data) => {
        if (cancelled) return;
        setSubscriptions(data.subscriptions);
        setPending(data.pendingRequests);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loggedIn]);

  const logOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      onClose();
      navigate("/");
    }
  };

  const channels = [...subscriptions, ...pending];

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-x-0 bottom-0 top-14 z-20 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Main menu"
        className={`fixed left-0 bottom-0 top-14 z-30 flex w-64 flex-col bg-bg transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex flex-col p-3">
          <Link
            to="/"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover"
          >
            Videos
          </Link>
        </nav>

        {loggedIn && (
          <>
            <hr className="border-border" />
            <p className="px-6 pt-4 pb-1 text-xs font-medium tracking-wide text-text-dim uppercase">
              Subscribed channels
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {!loaded ? (
                <p className="px-3 py-2 text-sm text-text-dim">Loading…</p>
              ) : channels.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-dim">No subscriptions yet.</p>
              ) : (
                channels.map((s) => (
                  <Link
                    key={s.id}
                    to={`/channel/${encodeURIComponent(s.channelUsername ?? String(s.channelId))}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-hover"
                  >
                    <img
                      src={s.channelProfileUrl ?? defaultAvatar}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full bg-surface object-cover"
                    />
                    <span
                      className={`truncate text-sm ${
                        s.status === "APPROVED" ? "font-medium text-text" : "text-text-dim"
                      }`}
                    >
                      {s.channelUsername ?? "Channel"}
                    </span>
                    {s.status === "PENDING" && (
                      <span className="ml-auto shrink-0 rounded-full bg-text-dim/15 px-2 py-0.5 text-[10px] font-semibold text-text-dim">
                        Requested
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>

            <hr className="border-border" />
            <div className="p-3">
              <button
                onClick={logOut}
                disabled={loggingOut}
                className="w-full cursor-pointer rounded-full px-3 py-2 text-left text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-50"
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
