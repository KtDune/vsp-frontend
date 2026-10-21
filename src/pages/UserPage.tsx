import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import PostCard from "../components/PostCard";
import TabButton from "../components/TabButton";
import VideoCard from "../components/VideoCard";
import { defaultAvatar } from "../data/user";
import { fetchUser, fetchPosts, fetchVideoPage, type Post, type ProfileUser, type Video } from "../lib/api";
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

type UploadItem =
  | { kind: "video"; date: string; video: Video }
  | { kind: "post"; date: string; post: Post };

const mergeUploads = (videos: Video[], posts: Post[]): UploadItem[] =>
  [
    ...videos.map((video) => ({ kind: "video" as const, date: video.createdAt, video })),
    ...posts.map((post) => ({ kind: "post" as const, date: post.createdAt ?? "", post })),
  ].sort((a, b) => (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0));

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
  const [tab, setTab] = useState<"details" | "uploads">("details");
  const [uploadsState, setUploadsState] = useState<{
    userId: number;
    uploads: UploadItem[] | null;
    failed: boolean;
  } | null>(null);

  const meId = identity?.id;
  const username = identity?.username;

  useEffect(() => {
    if (tab !== "uploads" || accessToken == null || meId == null || username == null) return;

    let cancelled = false;

    const videosPromise = (async () => {
      const all: Video[] = [];
      for (let page = 0; ; page += 1) {
        const slice = await fetchVideoPage(page, undefined, { username });
        all.push(...slice.content);
        if (slice.last) break;
      }
      return all;
    })();

    Promise.all([fetchPosts({ username }), videosPromise])
      .then(([posts, videos]) => {
        if (!cancelled) {
          setUploadsState({ userId: meId, uploads: mergeUploads(videos, posts), failed: false });
        }
      })
      .catch(() => {
        if (!cancelled) setUploadsState({ userId: meId, uploads: null, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [tab, accessToken, meId, username]);

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
  const uploads = uploadsState?.userId === identity.id ? uploadsState.uploads : null;
  const uploadsFailed = uploadsState?.userId === identity.id ? uploadsState.failed : false;

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
          <TabButton active={tab === "uploads"} onClick={() => setTab("uploads")}>
            {`Uploads${uploads != null ? ` (${uploads.length})` : ""}`}
          </TabButton>
        </div>

        {tab === "details" ? (
          <dl className="mt-2">
            <Detail label="Email" value={identity.email} />
            <Detail label="Joined" value={formattedDate(profile?.createdAt ?? null)} />
          </dl>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {uploads == null && !uploadsFailed && (
              <p className="py-6 text-center text-sm text-text-dim">Loading uploads…</p>
            )}
            {uploadsFailed && (
              <p className="py-6 text-center text-sm text-text-dim">Failed to load uploads.</p>
            )}
            {uploads != null && uploads.length === 0 && (
              <p className="py-6 text-center text-sm text-text-dim">No uploads yet.</p>
            )}
            {uploads?.map((item) =>
              item.kind === "video" ? (
                <VideoCard key={`video-${item.video.id}`} video={item.video} />
              ) : (
                <PostCard
                  key={`post-${item.post.id}`}
                  post={item.post}
                  onDeleted={(id) =>
                    setUploadsState((prev) =>
                      prev && prev.userId === meId && prev.uploads != null
                        ? {
                            ...prev,
                            uploads: prev.uploads.filter(
                              (entry) => !(entry.kind === "post" && entry.post.id === id),
                            ),
                          }
                        : prev,
                    )
                  }
                />
              ),
            )}
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
