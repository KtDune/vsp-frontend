import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import VideoCard from "../components/VideoCard";
import SubscribeButton from "../components/SubscribeButton";
import { defaultAvatar } from "../data/user";
import { fetchUserByName, fetchVideoPage, type ProfileUser, type Video } from "../lib/api";

const formatDate = (iso: string | null) =>
  iso &&
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function ChannelPage() {
  const { username: rawName } = useParams<{ username: string }>();
  const username = decodeURIComponent(rawName ?? "");
  const invalid = username.trim().length === 0;

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [missing, setMissing] = useState(false);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [prevName, setPrevName] = useState<string | null>(invalid ? null : username);

  if (!invalid && prevName !== username) {
    setPrevName(username);
    setUser(null);
    setVideos(null);
    setMissing(false);
  }

  useEffect(() => {
    if (invalid) return;

    let cancelled = false;

    fetchUserByName(username)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });

    const all: Video[] = [];
    const load = async (page: number) => {
      for (;;) {
        const slice = await fetchVideoPage(page, undefined, { username });
        all.push(...slice.content);
        if (slice.last) return;
        page += 1;
      }
    };

    load(0)
      .then(() => {
        if (!cancelled) setVideos(all);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      });

    return () => {
      cancelled = true;
    };
  }, [username, invalid]);

  if (invalid || missing) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
        <p className="mt-10 text-center text-sm text-text-dim">User not found.</p>
      </main>
    );
  }

  const isPrivate = user != null && user.visibility !== "PUBLIC";

  let videosBody: React.ReactNode;
  if (videos === null) {
    videosBody = <p className="text-sm text-text-dim">Loading videos…</p>;
  } else if (videos.length === 0) {
    videosBody = (
      <p className="text-sm text-text-dim">
        {isPrivate ? "This account is private." : "No videos yet."}
      </p>
    );
  } else {
    videosBody = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1800px] px-4 pt-20 pb-10 sm:pt-18">
      {user ? (
        <div className="flex items-center gap-5">
          <img
            src={user.profileUrl ?? defaultAvatar}
            alt={user.username}
            className="h-20 w-20 shrink-0 rounded-full ring-2 ring-accent"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{user.username}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isPrivate ? "bg-text-dim/15 text-text-dim" : "bg-accent/15 text-accent"
                }`}
              >
                {isPrivate ? "Private account" : "Public account"}
              </span>
              {user.createdAt && (
                <span className="text-xs text-text-dim">Joined {formatDate(user.createdAt)}</span>
              )}
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <SubscribeButton channelId={user.id} isPrivate={isPrivate} />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-surface" />
          <div className="h-6 w-40 animate-pulse rounded bg-surface" />
        </div>
      )}

      <hr className="my-6 border-border" />

      {videosBody}
    </main>
  );
}
