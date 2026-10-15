export type Video = {
  id: number;
  title: string;
  thumbnail: string;
  duration: string;
  views: number;
  daysAgo: number;
  channel: { name: string; avatar: string };
};

const thumb = (id: number) =>
  `https://picsum.photos/seed/vsp-${id}/640/360`;

export const mockVideos: Video[] = [
  {
    id: 1,
    title: "Getting started with Spring Boot 3 and building your first REST API",
    thumbnail: thumb(1),
    duration: "12:34",
    views: 2_400_000,
    daysAgo: 3,
    channel: { name: "DevTalks", avatar: thumb(101) },
  },
  {
    id: 2,
    title: "FFmpeg explained: how HLS adaptive streaming actually works",
    thumbnail: thumb(2),
    duration: "8:02",
    views: 812_000,
    daysAgo: 5,
    channel: { name: "Byte Sized", avatar: thumb(102) },
  },
  {
    id: 3,
    title: "Lo-fi beats to code databases to — 3 hour mix",
    thumbnail: thumb(3),
    duration: "3:11:45",
    views: 41_000_000,
    daysAgo: 100,
    channel: { name: "Chill performances", avatar: thumb(103) },
  },
  {
    id: 4,
    title: "Java 21 virtual threads: real-world benchmarks and pitfalls",
    thumbnail: thumb(4),
    duration: "17:19",
    views: 95_000,
    daysAgo: 1,
    channel: { name: "JVM Weekly", avatar: thumb(104) },
  },
  {
    id: 5,
    title: "Why your database queries are slow (and how to fix them)",
    thumbnail: thumb(5),
    duration: "22:57",
    views: 1_700_000,
    daysAgo: 14,
    channel: { name: "Query Creek", avatar: thumb(105) },
  },
  {
    id: 6,
    title: "Building a YouTube clone in one weekend — full walkthrough",
    thumbnail: thumb(6),
    duration: "45:10",
    views: 320_000,
    daysAgo: 7,
    channel: { name: "Side Project Lab", avatar: thumb(106) },
  },
];
