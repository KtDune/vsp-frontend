import { useEffect, useRef, useState } from "react";
import VideoCard from "../components/VideoCard";
import { fetchVideoPage, type Video } from "../lib/api";

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const inFlightRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    inFlightRef.current = true;

    fetchVideoPage(page)
      .then((data) => {
        if (cancelled) return;
        setVideos((prev) => [...prev, ...data.content]);
        setLast(data.last);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load videos");
        }
      })
      .finally(() => {
        if (!cancelled) inFlightRef.current = false;
      });

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
  }, [page, reloadKey]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inFlightRef.current && !last && !error) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [last, error]);

  return (
    <main className="mx-auto max-w-[1800px] px-4 pt-20 pb-10 sm:pt-18">
      <h1 className="sr-only">Home feed</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {error && (
        <div className="mt-10 text-center">
          <p className="text-sm text-text-dim">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 cursor-pointer text-sm font-medium text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      )}
      {!error && <div ref={sentinelRef} className="h-1" />}
    </main>
  );
}
