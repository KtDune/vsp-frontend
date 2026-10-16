import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import VideoCard from "../components/VideoCard";
import { fetchVideoPage, type Video } from "../lib/api";

export default function VideoSearchPage() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name")?.trim() ?? "";

  const [result, setResult] = useState<{ videos: Video[]; miss: boolean } | null>(null);

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
        if (!cancelled) setResult({ videos: all, miss: all.length === 0 });
      })
      .catch(() => {
        if (!cancelled) setResult({ videos: [], miss: true });
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  let body: React.ReactNode;
  if (!name) {
    body = <p className="mt-10 text-center text-sm text-text-dim">Type a query to search videos.</p>;
  } else if (result?.miss || result === null) {
    body = (
      <p className="mt-10 text-center text-sm text-text-dim">
        {result === null ? "Searching" : "No videos found."}
      </p>
    );
  } else {
    body = (
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {result.videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-[1800px] px-4 pt-20 pb-10 sm:pt-18">
      <h1 className="sr-only">Video search</h1>
      <p className="text-sm text-text-dim">
        Results{result && !result.miss ? ` for "${name}"` : ""}
      </p>
      {body}
    </main>
  );
}
