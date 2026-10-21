import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CommentsSection from "../components/CommentsSection";
import PostCard from "../components/PostCard";
import { useAuth } from "../auth/useAuth";
import { fetchPost, type Post } from "../lib/api";

type LoadState = "loading" | "loaded" | "notFound" | "error";

type PostFetch = { id: number | null; status: LoadState; post: Post | null };

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err != null &&
    "response" in err &&
    typeof (err as { response?: { status?: number } }).response?.status === "number" &&
    (err as { response: { status: number } }).response.status === 404
  );
}

export default function PostPage() {
  const { id } = useParams();
  const { ready } = useAuth();
  const navigate = useNavigate();

  const postId = Number(id);
  const validId = Number.isInteger(postId) && postId > 0;

  const [fetched, setFetched] = useState<PostFetch>({ id: null, status: "loading", post: null });
  const [retryKey, setRetryKey] = useState(0);
  const post = fetched.status === "loaded" ? fetched.post : null;

  useEffect(() => {
    if (!validId || !ready) return;
    let cancelled = false;
    fetchPost(postId)
      .then((post) => {
        if (!cancelled) setFetched({ id: postId, status: "loaded", post });
      })
      .catch((err) => {
        if (!cancelled)
          setFetched({ id: postId, status: isNotFound(err) ? "notFound" : "error", post: null });
      });
    return () => {
      cancelled = true;
    };
  }, [postId, validId, retryKey, ready]);

  if (!validId || fetched.status === "notFound") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-bold">Post not found</h1>
          <p className="mt-2 text-sm text-text-dim">
            This post doesn&apos;t exist, was removed, or is private.
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

  if (fetched.status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-text-dim">Failed to load this post.</p>
          <button
            onClick={() => {
              setFetched({ id: null, status: "loading", post: null });
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

  if (fetched.status === "loading" || post == null) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
        <p className="text-center text-sm text-text-dim">Loading post…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <PostCard post={post} showCommentsButton={false} onDeleted={() => navigate("/")} />
      <div className="mt-6">
        <CommentsSection target={{ type: "post", id: post.id, ownerId: post.userId }} />
      </div>
    </main>
  );
}
