import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ChannelCard from "../components/ChannelCard";
import TabButton from "../components/TabButton";
import VideoCard from "../components/VideoCard";
import { fetchVideoPage, searchUsers, type ProfileUser, type Video } from "../lib/api";

type Tab = "all" | "videos" | "channels";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name")?.trim() ?? "";

  const [tab, setTab] = useState<Tab>("all");
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [users, setUsers] = useState<ProfileUser[] | null>(null);
  const [prevName, setPrevName] = useState(name);

  if (prevName !== name) {
    setPrevName(name);
    setVideos(null);
    setUsers(null);
  }

  useEffect(() => {
    if (!name) return;

    let cancelled = false;
    const all: Video[] = [];

    const load = async (page: number) => {
      for (;;) {
        const slice = await fetchVideoPage(page, name);
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

    searchUsers(name)
      .then((found) => {
        if (!cancelled) setUsers(Array.isArray(found) ? found : []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  const hasVideos = videos !== null && videos.length > 0;
  const hasUsers = users !== null && users.length > 0;

  const videosSection = (emptyLabel: string) => {
    if (videos === null) {
      return <p className="text-sm text-text-dim">Searching videos…</p>;
    }
    if (videos.length === 0) {
      return <p className="text-sm text-text-dim">{emptyLabel}</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    );
  };

  const channelsSection = (emptyLabel: string) => {
    if (users === null) {
      return <p className="text-sm text-text-dim">Searching channels…</p>;
    }
    if (users.length === 0) {
      return <p className="text-sm text-text-dim">{emptyLabel}</p>;
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map((user) => (
          <ChannelCard key={user.id} user={user} />
        ))}
      </div>
    );
  };

  let body: React.ReactNode;
  if (!name) {
    body = (
      <p className="mt-10 text-center text-sm text-text-dim">
        Type a query to search videos or channels.
      </p>
    );
  } else if (tab === "all") {
    body =
      users !== null && videos !== null && !hasUsers && !hasVideos ? (
        <p className="mt-10 text-center text-sm text-text-dim">No results found.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {(users === null || hasUsers) && (
            <section>
              <h2 className="text-xs font-semibold tracking-wide text-text-dim uppercase">
                Channels
              </h2>
              <div className="mt-3">{channelsSection("No channels found.")}</div>
            </section>
          )}
          {(videos === null || hasVideos) && (
            <section>
              <h2 className="text-xs font-semibold tracking-wide text-text-dim uppercase">
                Videos
              </h2>
              <div className="mt-3">{videosSection("No videos found.")}</div>
            </section>
          )}
        </div>
      );
  } else if (tab === "videos") {
    body = videosSection("No videos found.");
  } else {
    body = channelsSection("No channels found.");
  }

  return (
    <main className="mx-auto max-w-[1800px] px-4 pt-20 pb-10 sm:pt-18">
      <h1 className="sr-only">Search</h1>
      <p className="text-sm text-text-dim">Results{name ? ` for "${name}"` : ""}</p>
      <div className="mt-3 flex gap-1 border-b border-border">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All
        </TabButton>
        <TabButton active={tab === "videos"} onClick={() => setTab("videos")}>
          Videos
        </TabButton>
        <TabButton active={tab === "channels"} onClick={() => setTab("channels")}>
          Channels
        </TabButton>
      </div>
      <div className="mt-6">{body}</div>
    </main>
  );
}
