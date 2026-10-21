import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, ThumbsUp } from "lucide-react";
import type { Post, LikeStatus } from "../lib/api";
import {
  deletePost,
  fetchPostLikeStatus,
  likePost,
  unlikePost,
  updatePost,
} from "../lib/api";
import { formatTimeAgo } from "../lib/format";
import { defaultAvatar } from "../data/user";
import { useAuth } from "../auth/useAuth";
import { getAuthUser } from "../lib/token";
import OwnerMenu from "./OwnerMenu";

function formatCount(count: number): string {
  return count >= 1_000_000
    ? `${(count / 1_000_000).toFixed(1)}M`
    : count >= 1_000
      ? `${Math.round(count / 1_000)}K`
      : String(count);
}

export default function PostCard({
  post,
  onDeleted,
  showCommentsButton = true,
}: {
  post: Post;
  onDeleted?: (id: number) => void;
  showCommentsButton?: boolean;
}) {
  const { accessToken, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const identity = accessToken != null ? getAuthUser() : null;
  const isOwner = identity?.id === post.userId;

  const [content, setContent] = useState(post.content);
  const [edited, setEdited] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [like, setLike] = useState<LikeStatus | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchPostLikeStatus(post.id)
      .then((s) => {
        if (!cancelled) setLike(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [post.id, ready]);

  const toggleLike = async () => {
    if (likeBusy) return;
    if (!identity) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (!like) return;
    setLikeBusy(true);
    const previous = like;
    const next = {
      likedByMe: !previous.likedByMe,
      likeCount: previous.likeCount + (previous.likedByMe ? -1 : 1),
    };
    setLike(next);
    try {
      if (next.likedByMe) {
        await likePost(post.id);
      } else {
        await unlikePost(post.id);
      }
    } catch {
      setLike(previous);
    } finally {
      setLikeBusy(false);
    }
  };

  const images = post.imageUrls ?? [];
  const hasImages = images.length > 0;

  const startEdit = (close: () => void) => {
    setEditText(content ?? "");
    setError(null);
    close();
    setEditOpen(true);
  };

  const submitEdit = async (close: () => void) => {
    if (busy) return;
    const next = editText.trim();
    if (!next && !hasImages) return;
    setBusy(true);
    setError(null);
    try {
      await updatePost(post.id, { content: next });
      setContent(next || null);
      setEdited(true);
      close();
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (close: () => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deletePost(post.id);
      close();
      onDeleted?.(post.id);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const menuItems = !isOwner
    ? []
    : confirming
      ? [
          {
            label: "Confirm delete",
            busy: busy,
            busyLabel: "Deleting…",
            danger: true,
            onClick: handleDelete,
          },
          {
            label: "Keep",
            disabled: busy,
            onClick: (close: () => void) => {
              close();
              setConfirming(false);
              setError(null);
            },
          },
        ]
      : [
          { label: "Edit", onClick: startEdit },
          { label: "Delete", danger: true, onClick: () => setConfirming(true) },
        ];

  return (
    <article className="rounded-xl border border-border bg-surface-hover p-4">
      <div className="flex items-center gap-3">
        <img
          src={post.authorProfileUrl ?? defaultAvatar}
          alt={post.authorUsername}
          className="h-8 w-8 rounded-full bg-surface object-cover"
        />
        <span className="text-sm font-semibold text-text">{post.authorUsername}</span>
        <div className="ml-auto">
          <OwnerMenu label="Post options" items={menuItems} />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {editOpen ? (
        <div className="mt-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Post text…"
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditOpen(false);
                setConfirming(false);
                setError(null);
              }}
              className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-text-dim hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={() => submitEdit(() => {})}
              disabled={busy || (!editText.trim() && !hasImages)}
              className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        content && <p className="mt-3 text-sm whitespace-pre-wrap text-text">{content}</p>
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
        {(edited || post.isEdited) && " · Edited"}
      </p>

      <div className="mt-2 flex items-center gap-4 border-t border-border pt-2">
        <button
          onClick={toggleLike}
          disabled={likeBusy}
          className={`flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition disabled:opacity-60 ${
            like?.likedByMe ? "text-accent" : "text-text-dim hover:text-text"
          }`}
        >
          <ThumbsUp
            className="h-4 w-4"
            fill={like?.likedByMe ? "currentColor" : "none"}
          />
          {like != null ? formatCount(like.likeCount) : "…"}
        </button>
        {showCommentsButton && (
          <button
            onClick={() => navigate(`/posts/${post.id}`)}
            className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-text-dim transition hover:text-text"
          >
            <MessageSquare className="h-4 w-4" />
            Comments
          </button>
        )}
      </div>
    </article>
  );
}
