import Navbar from "./components/Navbar";
import VideoCard from "./components/VideoCard";
import { mockVideos } from "./data/videos";

const user = { name: "angryxuen" };

export default function App() {
  return (
    <div className="min-h-svh bg-bg text-text">
      <Navbar user={user} />

      <main className="mx-auto max-w-[1800px] px-4 pt-20 pb-10 sm:pt-18">
        <h1 className="sr-only">Home feed</h1>
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </main>
    </div>
  );
}
