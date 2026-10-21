import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EllipsisVertical, ThumbsUp } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { getAuthUser, type AuthUser } from "../lib/token";
import { defaultAvatar } from "../data/user";
import {
  addComment,
  deleteComment,
  editComment,
  fetchCommentLikeStatus,
  fetchCommentReplies,
  fetchPostComments,
  fetchVideoComments,
  likeComment,
  unlikeComment,
  type Comment,
  type LikeStatus,
} from "../lib/api";
import { formatTimeAgo } from "../lib/format";

export type CommentTarget = { type: "video" | "post"; id: number; ownerId: number };

type CommentsState = {
  items: Comment[];
  page: number;
  last: boolean;
  loading: boolean;
  loadedFor: number | null;
};

const EMPTY_COMMENTS: CommentsState = { items: [], page: 0, last: true, loading: false, loadedFor: null };

function targetParams(target: CommentTarget): { videoId?: number; postId?: number } {
  return target.type === "video" ? { videoId: target.id } : { postId: target.id };
}

function CommentRow({
  comment,
  target,
  me,
  authReady,
  onRemoved,
}: {
  comment: Comment;
  target: CommentTarget;
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
  const canDelete = me != null && (me.id === comment.userId || me.id === target.ownerId);

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
      const newId = await addComment({ ...targetParams(target), content, parentId: comment.id });
      const reply: Comment = {
        id: newId || -Date.now(),
        userId: me.id,
        videoId: target.type === "video" ? target.id : null,
        postId: target.type === "post" ? target.id : null,
        parentId: comment.id,
        content,
        isEdited: false,
        createdAt: new Date().toISOString(),
        replyCount: 0,
        authorUsername: me.username,
        authorProfileUrl: null,
      };
      setReplies((prev) => [...prev, reply]);
      setRepliesLast(true);
      setRepliesOpen(true);
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
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
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
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
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
                target={target}
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

export default function CommentsSection({ target }: { target: CommentTarget }) {
  const { accessToken, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const me = accessToken != null ? getAuthUser() : null;

  const [comments, setComments] = useState<CommentsState>(EMPTY_COMMENTS);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const load = target.type === "video"
      ? fetchVideoComments(target.id, 0)
      : fetchPostComments(target.id, 0);
    load
      .then((slice) => {
        if (!cancelled)
          setComments({
            items: slice.content,
            page: 0,
            last: slice.last,
            loading: false,
            loadedFor: target.id,
          });
      })
      .catch(() => {
        if (!cancelled)
          setComments({ items: [], page: 0, last: true, loading: false, loadedFor: target.id });
      });
    return () => {
      cancelled = true;
    };
  }, [target.type, target.id, ready]);

  const commentsLoaded = comments.loadedFor === target.id;

  const loadMoreComments = () => {
    if (comments.loading) return;
    setComments((prev) => ({ ...prev, loading: true }));
    const load = target.type === "video"
      ? fetchVideoComments(target.id, comments.page + 1)
      : fetchPostComments(target.id, comments.page + 1);
    load
      .then((slice) => {
        setComments((prev) => ({
          items: [...prev.items, ...slice.content],
          page: comments.page + 1,
          last: slice.last,
          loading: false,
          loadedFor: target.id,
        }));
      })
      .catch(() => {
        setComments((prev) => ({ ...prev, loading: false }));
      });
  };

  const removeTopLevelComment = (id: number) => {
    setComments((prev) => ({ ...prev, items: prev.items.filter((c) => c.id !== id) }));
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || commentBusy) return;
    if (!me) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setCommentBusy(true);
    setCommentError(null);
    try {
      const newId = await addComment({ ...targetParams(target), content });
      setComments((prev) => ({
        ...prev,
        items: [
          {
            id: newId || -Date.now(),
            userId: me.id,
            videoId: target.type === "video" ? target.id : null,
            postId: target.type === "post" ? target.id : null,
            parentId: null,
            content,
            isEdited: false,
            createdAt: new Date().toISOString(),
            replyCount: 0,
            authorUsername: me.username,
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
    <section>
      <h2 className="text-base font-bold">
        Comments{" "}
        {commentsLoaded && comments.items.length > 0 && (
          <span className="text-text-dim">
            ({comments.items.length}
            {!comments.last ? "+" : ""})
          </span>
        )}
      </h2>

      {me != null ? (
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
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
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
              target={target}
              me={me}
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
    </section>
  );
}
