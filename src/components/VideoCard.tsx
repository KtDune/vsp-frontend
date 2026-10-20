import { Link } from "react-router-dom";
import type { Video } from "../lib/api";
import { formatDuration, formatTimeAgo, formatViews } from "../lib/format";
import { defaultAvatar } from "../data/user";

const thumbnailFallback =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%2316181d'/%3E%3C/svg%3E";

export default function VideoCard({ video }: { video: Video }) {
  return (
    <div className="group">
      <Link to={`/watch/${video.id}`} className="block">
        <div className="relative overflow-hidden rounded-lg bg-surface ring-1 ring-border transition group-hover:ring-accent">
          <img
            src={video.thumbnailUrl ?? thumbnailFallback}
            alt={video.title}
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
          {video.duration != null && (
            <span className="absolute right-2 bottom-2 rounded bg-bg/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
      </Link>

      <div className="mt-3 flex gap-3">
        <Link
          to={`/channel/${encodeURIComponent(video.channelName)}`}
          aria-label={`${video.channelName} channel`}
          className="shrink-0 rounded-full"
        >
          <img
            src={video.channelAvatarUrl ?? defaultAvatar}
            alt={video.channelName}
            loading="lazy"
            className="h-9 w-9 rounded-full bg-surface object-cover"
          />
        </Link>
        <div className="min-w-0">
          <Link to={`/watch/${video.id}`} className="block">
            <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-accent">
              {video.title}
            </h3>
          </Link>
          <p className="mt-1 truncate text-xs text-text-dim">
            {video.channelName} · {formatViews(video.viewCount)} · {formatTimeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
