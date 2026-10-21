import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ThumbsUp } from "lucide-react";
import CommentsSection from "../components/CommentsSection";
import OwnerMenu from "../components/OwnerMenu";
import SubscribeButton from "../components/SubscribeButton";
import VideoCard from "../components/VideoCard";
import { useAuth } from "../auth/useAuth";
import { getAuthUser } from "../lib/token";
import { defaultAvatar } from "../data/user";
import {
  deleteVideo,
  fetchVideo,
  fetchVideoLikeStatus,
  fetchVideoPage,
  likeVideo,
  unlikeVideo,
  updateVideo,
  type LikeStatus,
  type Video,
  type VideoDetail,
} from "../lib/api";
import { formatDuration, formatViews } from "../lib/format";

type LoadState = "loading" | "loaded" | "notFound" | "error";

type VideoFetch = { id: number | null; status: LoadState; video: VideoDetail | null };

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    "response" in err &&
    typeof (err as { response?: { status?: number } }).response?.status === "number" &&
    (err as { response: { status: number } }).response.status === 404
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(count: number): string {
  return count >= 1_000_000
    ? `${(count / 1_000_000).toFixed(1)}M`
    : count >= 1_000
      ? `${Math.round(count / 1_000)}K`
      : String(count);
}

function LikeButton({
  videoId,
  loggedIn,
  authReady,
  onLoginRequired,
}: {
  videoId: number;
  loggedIn: boolean;
  authReady: boolean;
  onLoginRequired: () => void;
}) {
  const [status, setStatus] = useState<LikeStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchVideoLikeStatus(videoId)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [videoId, authReady]);

  const toggle = async () => {
    if (busy || !status) return;
    if (!loggedIn) {
      onLoginRequired();
      return;
    }
    setBusy(true);
    const previous = status;
    const next = {
      likedByMe: !previous.likedByMe,
      likeCount: previous.likeCount + (previous.likedByMe ? -1 : 1),
    };
    setStatus(next);
    try {
      if (next.likedByMe) {
        await likeVideo(videoId);
      } else {
        await unlikeVideo(videoId);
      }
    } catch {
      setStatus(previous);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy || status == null}
      className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
        status?.likedByMe
          ? "bg-accent/15 text-accent"
          : "bg-surface text-text hover:bg-surface-hover"
      }`}
    >
      <ThumbsUp
        className="h-4 w-4"
        fill={status?.likedByMe ? "currentColor" : "none"}
      />
      {status ? formatCount(status.likeCount) : "…"}
    </button>
  );
}

export default function WatchPage() {
  const { id } = useParams();
  const { accessToken, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const videoId = Number(id);
  const validId = Number.isInteger(videoId) && videoId > 0;

  const [fetched, setFetched] = useState<VideoFetch>({ id: null, status: "loading", video: null });
  const [retryKey, setRetryKey] = useState(0);
  const current = useMemo<VideoFetch>(
    () => (fetched.id === videoId ? fetched : { id: videoId, status: "loading", video: null }),
    [fetched, videoId],
  );
  const video = current.status === "loaded" ? current.video : null;

  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVisibility, setFormVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const [related, setRelated] = useState<Video[]>([]);

  const identity = accessToken != null ? getAuthUser() : null;

  useEffect(() => {
    if (!validId || !ready) return;
    let cancelled = false;
    window.scrollTo(0, 0);
    fetchVideo(videoId)
      .then((v) => {
        if (!cancelled) setFetched({ id: videoId, status: "loaded", video: v });
      })
      .catch((err) => {
        if (!cancelled)
          setFetched({ id: videoId, status: isNotFound(err) ? "notFound" : "error", video: null });
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, validId, retryKey, ready]);

  useEffect(() => {
    if (video == null) return;
    let cancelled = false;
    fetchVideoPage(0, undefined, { userId: video.userId })
      .then((slice) => {
        if (!cancelled) setRelated(slice.content.filter((v) => v.id !== video.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [video]);

  if (!validId || current.status === "notFound") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-bold">Video not found</h1>
          <p className="mt-2 text-sm text-text-dim">
            This video doesn&apos;t exist, was removed, or is private.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (current.status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-text-dim">Failed to load this video.</p>
          <button
            onClick={() => {
              setFetched({ id: null, status: "loading", video: null });
              setRetryKey((k) => k + 1);
            }}
            className="mt-4 inline-block cursor-pointer rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (current.status === "loading" || video == null) {
    return (
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-10">
        <p className="text-center text-sm text-text-dim">Loading video…</p>
      </main>
    );
  }

  const commentsDisabled = video.commentsDisabled === true;
  const longDescription = video.description != null && video.description.length > 280;

  const openEdit = (close: () => void) => {
    if (!video) return;
    setFormTitle(video.title);
    setFormDescription(video.description ?? "");
    setFormVisibility(video.visibility);
    setVideoError(null);
    close();
    setEditOpen(true);
  };

  const submitVideoEdit = async (close: () => void) => {
    if (!video || videoBusy) return;
    const title = formTitle.trim();
    if (!title || title.length > 100) return;
    setVideoBusy(true);
    setVideoError(null);
    try {
      await updateVideo(video.id, {
        title,
        description: formDescription,
        visibility: formVisibility,
      });
      setFetched((prev) =>
        prev.id === video.id && prev.video
          ? { ...prev, video: { ...prev.video, title, description: formDescription, visibility: formVisibility } }
          : prev,
      );
      close();
      setEditOpen(false);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Failed to update video");
    } finally {
      setVideoBusy(false);
    }
  };

  const handleVideoDelete = async (close: () => void) => {
    if (!video || videoBusy) return;
    setVideoBusy(true);
    setVideoError(null);
    try {
      await deleteVideo(video.id);
      close();
      navigate("/");
    } catch (err) {
      setVideoBusy(false);
      setVideoError(err instanceof Error ? err.message : "Failed to delete video");
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 pt-20 pb-10 sm:pt-18">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
            <video
              key={video.id}
              controls
              poster={video.thumbnailUrl ?? undefined}
              src={video.videoUrl}
              className="aspect-video w-full"
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-lg font-bold sm:text-xl">{video.title}</h1>
            {identity?.id === video.userId && (
              <OwnerMenu
                label="Video options"
                items={
                  confirming
                    ? [
                        {
                          label: "Confirm delete",
                          busy: videoBusy,
                          busyLabel: "Deleting…",
                          danger: true,
                          onClick: handleVideoDelete,
                        },
                        {
                          label: "Keep",
                          disabled: videoBusy,
                          onClick: (close) => {
                            close();
                            setConfirming(false);
                          },
                        },
                      ]
                    : [
                        { label: "Edit", onClick: openEdit },
                        {
                          label: "Delete",
                          danger: true,
                          onClick: () => setConfirming(true),
                        },
                      ]
                }
              />
            )}
          </div>
          {videoError && !editOpen && (
            <p className="mt-2 text-xs text-red-400">{videoError}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <Link
              to={`/channel/${encodeURIComponent(video.channelName)}`}
              className="flex items-center gap-3 rounded-full"
            >
              <img
                src={video.channelAvatarUrl ?? defaultAvatar}
                alt={video.channelName}
                className="h-10 w-10 rounded-full bg-surface object-cover"
              />
              <span>
                <span className="block text-sm font-semibold">{video.channelName}</span>
                <span className="block text-xs text-text-dim">
                  {formatViews(video.viewCount)} · {formatDate(video.createdAt)}
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <LikeButton
                videoId={video.id}
                loggedIn={identity != null}
                authReady={ready}
                onLoginRequired={() =>
                  navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
                }
              />
              <SubscribeButton channelId={video.userId} isPrivate={video.visibility === "PRIVATE"} />
            </div>
          </div>

          {video.description != null && video.description.trim() !== "" && (
            <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
              <p className={`whitespace-pre-wrap ${descriptionExpanded ? "" : "line-clamp-3"}`}>
                {video.description}
              </p>
              {longDescription && (
                <button
                  onClick={() => setDescriptionExpanded((e) => !e)}
                  className="mt-2 cursor-pointer text-xs font-semibold text-text-dim hover:text-text"
                >
                  {descriptionExpanded ? "Show less" : "Show more"}
                </button>
              )}
              {video.duration != null && (
                <p className="mt-2 text-xs text-text-dim">Duration {formatDuration(video.duration)}</p>
              )}
            </div>
          )}

          <div className="mt-8">
            {commentsDisabled ? (
              <p className="text-sm text-text-dim">Comments are disabled on this video.</p>
            ) : (
              <CommentsSection
                target={{ type: "video", id: video.id, ownerId: video.userId }}
              />
            )}
          </div>
        </div>

        {related.length > 0 && (
          <aside className="min-w-0">
            <h2 className="mb-4 text-sm font-bold text-text-dim">More from {video.channelName}</h2>
            <div className="flex flex-col gap-6">
              {related.slice(0, 8).map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </aside>
        )}
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !videoBusy && setEditOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-bg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Edit video</h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">Title</span>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={100}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">Description</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  className="resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">Visibility</span>
                <select
                  value={formVisibility}
                  onChange={(e) => setFormVisibility(e.target.value === "PRIVATE" ? "PRIVATE" : "PUBLIC")}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
              {videoError && <p className="text-xs text-red-400">{videoError}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditOpen(false);
                  setVideoError(null);
                }}
                disabled={videoBusy}
                className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold text-text-dim hover:text-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitVideoEdit(() => {})}
                disabled={videoBusy || !formTitle.trim()}
                className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {videoBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
