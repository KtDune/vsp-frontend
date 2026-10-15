import type { Video } from "../data/videos";

function Views({ views }: { views: number }) {
  return views >= 1_000_000
    ? `${(views / 1_000_000).toFixed(1)}M views`
    : views >= 1_000
      ? `${Math.round(views / 1_000)}K views`
      : `${views} views`;
}

function TimeAgo({ days }: { days: number }) {
  return days < 7
    ? `${days} day${days === 1 ? "" : "s"} ago`
    : days < 30
      ? `${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? "" : "s"} ago`
      : days < 365
        ? `${Math.round(days / 30)} months ago`
        : `${Math.round(days / 365)} years ago`;
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <a href="#" className="group block">
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-lg bg-surface ring-1 ring-border transition group-hover:ring-accent">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        <span className="absolute right-2 bottom-2 rounded bg-bg/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm">
          {video.duration}
        </span>
      </div>

      {/* Meta */}
      <div className="mt-3 flex gap-3">
        <img
          src={video.channel.avatar}
          alt={video.channel.name}
          className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-border"
        />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold group-hover:text-accent">
            {video.title}
          </h3>
          <p className="mt-1 truncate text-xs text-text-dim">
            {video.channel.name}
          </p>
          <p className="text-xs text-text-dim">
            <Views views={video.views} /> · <TimeAgo days={video.daysAgo} />
          </p>
        </div>
      </div>
    </a>
  );
}
