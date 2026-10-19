import type { Post } from "../lib/api";
import { formatTimeAgo } from "../lib/format";
import { defaultAvatar } from "../data/user";

export default function PostCard({ post }: { post: Post }) {
  const images = post.imageUrls ?? [];

  return (
    <article className="rounded-xl border border-border bg-surface-hover p-4">
      <div className="flex items-center gap-3">
        <img
          src={post.authorProfileUrl ?? defaultAvatar}
          alt={post.authorUsername}
          className="h-8 w-8 rounded-full bg-surface object-cover"
        />
        <span className="text-sm font-semibold text-text">{post.authorUsername}</span>
      </div>
      {post.content && (
        <p className="mt-3 text-sm whitespace-pre-wrap text-text">{post.content}</p>
      )}
      {images.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {images.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              className={`w-full border border-border bg-bg object-cover ${
                images.length === 1 ? "aspect-video" : "aspect-square"
              }`}
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-text-dim">
        {post.createdAt ? formatTimeAgo(post.createdAt) : "—"}
        {post.isEdited && " · Edited"}
      </p>
    </article>
  );
}
