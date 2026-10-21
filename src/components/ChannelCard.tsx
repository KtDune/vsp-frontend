import { Link } from "react-router-dom";
import { defaultAvatar } from "../data/user";
import SubscribeButton from "./SubscribeButton";
import type { ProfileUser } from "../lib/api";

export default function ChannelCard({ user }: { user: ProfileUser }) {
  const isPrivate = user.visibility === "PRIVATE";

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <Link
          to={`/channel/${encodeURIComponent(user.username)}`}
          className="flex min-w-0 items-center gap-4"
        >
          <img
            src={user.profileUrl ?? defaultAvatar}
            alt={user.username}
            className="h-14 w-14 shrink-0 rounded-full ring-2 ring-accent"
          />
          <div className="min-w-0">
            <h3 className="truncate font-bold">{user.username}</h3>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                isPrivate ? "bg-text-dim/15 text-text-dim" : "bg-accent/15 text-accent"
              }`}
            >
              {isPrivate ? "Private account" : "Public account"}
            </span>
          </div>
        </Link>
        <div className="ml-auto shrink-0">
          <SubscribeButton channelId={user.id} isPrivate={isPrivate} />
        </div>
      </div>
    </div>
  );
}
