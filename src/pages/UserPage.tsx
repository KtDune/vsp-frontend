import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PostCard from "../components/PostCard";
import TabButton from "../components/TabButton";
import { defaultAvatar } from "../data/user";
import { fetchUser, fetchPosts, type Post, type ProfileUser } from "../lib/api";
import { getAuthUser } from "../lib/token";

const formattedDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3">
      <dt className="text-xs font-medium tracking-wide text-text-dim uppercase">
        {label}
      </dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}

function NotLoggedIn() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-xl font-bold">Not logged in</h1>
        <p className="mt-2 text-sm text-text-dim">Log in to see your profile.</p>
        <Link
          to="/login"
          className="mt-4 inline-block rounded-full border border-border bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}

export default function UserPage() {
  const { accessToken } = useAuth();
  const identity = getAuthUser();
  const [state, setState] = useState<{
    userId: number;
    profile: ProfileUser | null;
    failed: boolean;
  } | null>(null);
  const [tab, setTab] = useState<"details" | "posts">("details");
  const [postsState, setPostsState] = useState<{
    userId: number;
    posts: Post[];
    failed: boolean;
  } | null>(null);

  const meId = identity?.id;

  useEffect(() => {
    if (tab !== "posts" || accessToken == null || meId == null) return;

    let cancelled = false;

    fetchPosts({ userId: meId })
      .then((posts) => {
        if (!cancelled) setPostsState({ userId: meId, posts, failed: false });
      })
      .catch(() => {
        if (!cancelled) setPostsState({ userId: meId, posts: [], failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [tab, accessToken, meId]);

  useEffect(() => {
    const me = getAuthUser();
    if (accessToken == null || !me) return;

    let cancelled = false;

    fetchUser(me.id)
      .then((user) => {
        if (!cancelled) setState({ userId: me.id, profile: user, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ userId: me.id, profile: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (accessToken == null || !identity) {
    return <NotLoggedIn />;
  }

  const fresh = state?.userId === identity.id ? state : null;
  const profile = fresh?.profile ?? null;
  const failed = fresh?.failed ?? false;
  const name = profile?.username ?? identity.username;
  const visibility = profile ? (profile.visibility ?? "PRIVATE") : null;
  const posts = postsState?.userId === identity.id ? postsState.posts : null;
  const postsFailed = postsState?.userId === identity.id ? postsState.failed : false;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <img
            src={profile?.profileUrl ?? defaultAvatar}
            alt="Avatar"
            className="h-20 w-20 rounded-full ring-2 ring-accent"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {visibility && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    visibility === "PUBLIC"
                      ? "bg-accent/15 text-accent"
                      : "bg-text-dim/15 text-text-dim"
                  }`}
                >
                  {visibility === "PUBLIC" ? "Public account" : "Private account"}
                </span>
              )}
              {failed && <span className="text-xs text-text-dim">Failed to load profile</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-border">
          <TabButton active={tab === "details"} onClick={() => setTab("details")}>
            Details
          </TabButton>
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
            {`Posts${posts != null ? ` (${posts.length})` : ""}`}
          </TabButton>
        </div>

        {tab === "details" ? (
          <dl className="mt-2">
            <Detail label="Email" value={identity.email} />
            <Detail label="Joined" value={formattedDate(profile?.createdAt ?? null)} />
          </dl>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {posts == null && !postsFailed && (
              <p className="py-6 text-center text-sm text-text-dim">Loading posts…</p>
            )}
            {postsFailed && (
              <p className="py-6 text-center text-sm text-text-dim">Failed to load posts.</p>
            )}
            {posts != null && posts.length === 0 && (
              <p className="py-6 text-center text-sm text-text-dim">No posts yet.</p>
            )}
            {posts?.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={(id) =>
                  setPostsState((prev) =>
                    prev && prev.userId === meId
                      ? { ...prev, posts: prev.posts.filter((p) => p.id !== id) }
                      : prev,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      <Link
        to="/"
        className="mt-6 inline-block text-sm text-text-dim hover:text-accent"
      >
        ← Back to home
      </Link>
    </main>
  );
}
