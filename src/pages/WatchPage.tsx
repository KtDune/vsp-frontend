import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { EllipsisVertical, ThumbsUp } from "lucide-react";
import OwnerMenu from "../components/OwnerMenu";
import SubscribeButton from "../components/SubscribeButton";
import VideoCard from "../components/VideoCard";
import { useAuth } from "../auth/useAuth";
import { getAuthUser, type AuthUser } from "../lib/token";
import { defaultAvatar } from "../data/user";
import {
  addComment,
  deleteComment,
  deleteVideo,
  editComment,
  fetchCommentLikeStatus,
  fetchCommentReplies,
  fetchVideo,
  fetchVideoComments,
  fetchVideoLikeStatus,
  fetchVideoPage,
  likeComment,
  likeVideo,
  unlikeComment,
  unlikeVideo,
  updateVideo,
  type Comment,
  type LikeStatus,
  type Video,
  type VideoDetail,
} from "../lib/api";
import { formatDuration, formatTimeAgo, formatViews } from "../lib/format";

type LoadState = "loading" | "loaded" | "notFound" | "error";

type VideoFetch = { id: number | null; status: LoadState; video: VideoDetail | null };

type CommentsState = {
  items: Comment[];
  page: number;
  last: boolean;
  loading: boolean;
  loadedFor: number | null;
};

const EMPTY_COMMENTS: CommentsState = { items: [], page: 0, last: true, loading: false, loadedFor: null };

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

function CommentRow({
  comment,
  videoId,
  videoOwnerId,
  me,
  authReady,
  onRemoved,
}: {
  comment: Comment;
  videoId: number;
  videoOwnerId: number;
  me: AuthUser | null;
  authReady: boolean;
  onRemoved: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [content, setContent] = useState(comment.content);
  const [edited, setEdited] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesPage, setRepliesPage] = useState(0);
  const [repliesLast, setRepliesLast] = useState(true);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyCount, setReplyCount] = useState(comment.replyCount ?? 0);
  const [replyBoxOpen, setReplyBoxOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [like, setLike] = useState<LikeStatus | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);

  const canEdit = me?.id === comment.userId;
  const canDelete = me != null && (me.id === comment.userId || me.id === videoOwnerId);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchCommentLikeStatus(comment.id)
      .then((s) => {
        if (!cancelled) setLike(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [comment.id, authReady]);

  const requireLogin = () =>
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);

  const toggleLike = async () => {
    if (likeBusy || !like) return;
    if (!me) {
      requireLogin();
      return;
    }
    setLikeBusy(true);
    const previous = like;
    const next = {
      likedByMe: !previous.likedByMe,
      likeCount: previous.likeCount + (previous.likedByMe ? -1 : 1),
    };
    setLike(next);
    try {
      if (next.likedByMe) {
        await likeComment(comment.id);
      } else {
        await unlikeComment(comment.id);
      }
    } catch {
      setLike(previous);
    } finally {
      setLikeBusy(false);
    }
  };

  const loadReplies = (page: number, append: boolean) => {
    setRepliesLoading(true);
    fetchCommentReplies(comment.id, page)
      .then((slice) => {
        setReplies((prev) => (append ? [...prev, ...slice.content] : slice.content));
        setRepliesLast(slice.last);
        setRepliesPage(page);
        setRepliesOpen(true);
      })
      .catch(() => {})
      .finally(() => setRepliesLoading(false));
  };

  const submitReply = async () => {
    const content = replyText.trim();
    if (!content || replyBusy) return;
    if (!me) {
      requireLogin();
      return;
    }
    setReplyBusy(true);
    setReplyError(null);
    try {
      const newId = await addComment({ videoId, content, parentId: comment.id });
      const reply: Comment = {
        id: newId || -Date.now(),
        userId: me.id,
        videoId,
        postId: null,
        parentId: comment.id,
        content,
        isEdited: false,
        createdAt: new Date().toISOString(),
        replyCount: 0,
        authorUsername: me.username,
        authorProfileUrl: null,
      };
      if (repliesOpen) {
        setReplies((prev) => [...prev, reply]);
        setRepliesLast(true);
      } else {
        setReplyCount((c) => c + 1);
      }
      setReplyText("");
      setReplyBoxOpen(false);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleReplyRemoved = (replyId: number) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setReplyCount((c) => Math.max(0, c - 1));
  };

  const startEdit = () => {
    setMenuOpen(false);
    setActionError(null);
    setEditText(content ?? "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    const next = editText.trim();
    if (!next || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await editComment(comment.id, next);
      setContent(next);
      setEdited(true);
      setEditOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to edit comment");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await deleteComment(comment.id);
      setMenuOpen(false);
      onRemoved();
    } catch (err) {
      setActionBusy(false);
      setActionError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  return (
    <li className="flex gap-3">
      <img
        src={comment.authorProfileUrl ?? defaultAvatar}
        alt={comment.authorUsername}
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full bg-surface object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold">{comment.authorUsername}</span>
            <span className="ml-2 text-xs text-text-dim">
              {comment.createdAt ? formatTimeAgo(comment.createdAt) : ""}
              {(edited || comment.isEdited) ? " (edited)" : ""}
            </span>
          </p>
          {(canEdit || canDelete) && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Comment options"
                className="cursor-pointer rounded-full p-1 text-text-dim transition hover:bg-surface-hover hover:text-text"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border border-border bg-bg py-1 shadow-lg">
                    {actionError && (
                      <p className="px-3 py-1 text-xs text-red-400">{actionError}</p>
                    )}
                    {canEdit && (
                      <button
                        onClick={startEdit}
                        disabled={actionBusy}
                        className="block w-full cursor-pointer px-3 py-1.5 text-left text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={actionBusy}
                        className="block w-full cursor-pointer px-3 py-1.5 text-left text-xs font-medium text-red-400 hover:bg-surface-hover disabled:opacity-50"
                      >
                        {actionBusy ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {editOpen ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditOpen(false);
                  setActionError(null);
                }}
                className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-text-dim hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={actionBusy || !editText.trim() || editText.trim() === content?.trim()}
                className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {actionBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap">{content}</p>
        )}

        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-dim">
          <button
            onClick={toggleLike}
            disabled={likeBusy}
            className={`flex cursor-pointer items-center gap-1 transition disabled:opacity-60 ${
              like?.likedByMe ? "text-accent" : "hover:text-text"
            }`}
          >
            <ThumbsUp
              className="h-4 w-4"
              fill={like?.likedByMe ? "currentColor" : "none"}
            />
            {like ? like.likeCount : ""}
          </button>
          <button
            onClick={() => (me ? setReplyBoxOpen((o) => !o) : requireLogin())}
            className="cursor-pointer font-semibold hover:text-text"
          >
            Reply
          </button>
          {replyCount > 0 && !repliesOpen && (
            <button
              onClick={() => loadReplies(0, false)}
              disabled={repliesLoading}
              className="cursor-pointer font-semibold text-accent hover:underline disabled:opacity-60"
            >
              Show {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>

        {replyBoxOpen && (
          <div className="mt-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={`Reply to ${comment.authorUsername}…`}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {replyError && <p className="mt-1 text-xs text-red-400">{replyError}</p>}
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setReplyBoxOpen(false);
                  setReplyText("");
                  setReplyError(null);
                }}
                className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-text-dim hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={submitReply}
                disabled={replyBusy || !replyText.trim()}
                className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {replyBusy ? "Posting…" : "Reply"}
              </button>
            </div>
          </div>
        )}

        {repliesOpen && replies.length > 0 && (
          <ul className="mt-4 flex flex-col gap-4 border-l border-border pl-4">
            {replies.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                videoId={videoId}
                videoOwnerId={videoOwnerId}
                me={me}
                authReady={authReady}
                onRemoved={() => handleReplyRemoved(reply.id)}
              />
            ))}
          </ul>
        )}

        {repliesOpen && !repliesLast && (
          <button
            onClick={() => loadReplies(repliesPage + 1, true)}
            disabled={repliesLoading}
            className="mt-2 cursor-pointer text-xs font-semibold text-accent hover:underline disabled:opacity-60"
          >
            {repliesLoading ? "Loading…" : "Show more replies"}
          </button>
        )}
      </div>
    </li>
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

  const [comments, setComments] = useState<CommentsState>(EMPTY_COMMENTS);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

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

  useEffect(() => {
    if (video == null || video.commentsDisabled === true) return;
    let cancelled = false;
    fetchVideoComments(video.id, 0)
      .then((slice) => {
        if (!cancelled)
          setComments({
            items: slice.content,
            page: 0,
            last: slice.last,
            loading: false,
            loadedFor: video.id,
          });
      })
      .catch(() => {
        if (!cancelled) setComments((prev) => ({ ...prev, loadedFor: video.id, last: true }));
      });
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
  const commentsLoaded = comments.loadedFor === video.id;
  const longDescription = video.description != null && video.description.length > 280;

  const loadMoreComments = () => {
    if (comments.loading) return;
    setComments((prev) => ({ ...prev, loading: true }));
    fetchVideoComments(video.id, comments.page + 1)
      .then((slice) => {
        setComments((prev) => ({
          items: [...prev.items, ...slice.content],
          page: comments.page + 1,
          last: slice.last,
          loading: false,
          loadedFor: video.id,
        }));
      })
      .catch(() => {
        setComments((prev) => ({ ...prev, loading: false }));
      });
  };

  const removeTopLevelComment = (id: number) => {
    setComments((prev) => ({ ...prev, items: prev.items.filter((c) => c.id !== id) }));
  };

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

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || commentBusy) return;
    if (!identity) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setCommentBusy(true);
    setCommentError(null);
    try {
      const newId = await addComment({ videoId, content });
      setComments((prev) => ({
        ...prev,
        items: [
          {
            id: newId || -Date.now(),
            userId: identity.id,
            videoId,
            postId: null,
            parentId: null,
            content,
            isEdited: false,
            createdAt: new Date().toISOString(),
            replyCount: 0,
            authorUsername: identity.username,
            authorProfileUrl: null,
          },
          ...prev.items,
        ],
      }));
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setCommentBusy(false);
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

          <section className="mt-8">
            <h2 className="text-base font-bold">
              Comments{" "}
              {commentsLoaded && comments.items.length > 0 && (
                <span className="text-text-dim">
                  ({comments.items.length}
                  {!comments.last ? "+" : ""})
                </span>
              )}
            </h2>

            {commentsDisabled ? (
              <p className="mt-4 text-sm text-text-dim">Comments are disabled on this video.</p>
            ) : (
              <>
                {identity != null ? (
                  <div className="mt-4 flex gap-3">
                    <img
                      src={defaultAvatar}
                      alt="Your avatar"
                      className="h-9 w-9 shrink-0 rounded-full bg-surface object-cover"
                    />
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Add a comment…"
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      {commentError && <p className="mt-1 text-xs text-red-400">{commentError}</p>}
                      <div className="mt-1.5 flex justify-end">
                        <button
                          onClick={submitComment}
                          disabled={commentBusy || !commentText.trim()}
                          className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {commentBusy ? "Posting…" : "Comment"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-text-dim">
                    <Link
                      to={`/login?next=${encodeURIComponent(location.pathname)}`}
                      className="text-accent hover:underline"
                    >
                      Log in
                    </Link>{" "}
                    to join the conversation.
                  </p>
                )}

                {!commentsLoaded && <p className="mt-6 text-sm text-text-dim">Loading comments…</p>}

                {commentsLoaded && comments.items.length === 0 && (
                  <p className="mt-6 text-sm text-text-dim">No comments yet.</p>
                )}

                {commentsLoaded && comments.items.length > 0 && (
                  <ul className="mt-6 flex flex-col gap-6">
                {comments.items.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    videoId={video.id}
                    videoOwnerId={video.userId}
                    me={identity}
                    authReady={ready}
                    onRemoved={() => removeTopLevelComment(comment.id)}
                  />
                ))}
                  </ul>
                )}

                {commentsLoaded && !comments.last && (
                  <button
                    onClick={loadMoreComments}
                    disabled={comments.loading}
                    className="mt-6 cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-hover disabled:opacity-60"
                  >
                    {comments.loading ? "Loading…" : "Show more comments"}
                  </button>
                )}
              </>
            )}
          </section>
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
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
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
