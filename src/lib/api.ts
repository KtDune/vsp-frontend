import { http } from "./http";

export type Video = {
  id: number;
  userId: number;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number;
  createdAt: string;
  channelName: string;
  channelAvatarUrl: string | null;
};

export type VideoSlice = {
  content: Video[];
  last: boolean;
};

export type ProfileUser = {
  id: number;
  username: string;
  profileUrl: string | null;
  visibility: string;
  createdAt: string | null;
};

const PAGE_SIZE = 20;

export async function fetchVideoPage(
  page: number,
  title?: string,
  opts?: { userId?: number; username?: string },
): Promise<VideoSlice> {
  const res = await http.get<{ success: boolean; videos?: VideoSlice }>("/videos", {
    params: {
      page,
      size: PAGE_SIZE,
      ...(title ? { title } : {}),
      ...(opts?.userId != null ? { userId: opts.userId } : {}),
      ...(opts?.username ? { username: opts.username } : {}),
    },
  });
  const slice = res.data.videos ?? (res.data as unknown as VideoSlice);
  return slice ?? { content: [], last: true };
}

export async function fetchUser(id: number): Promise<ProfileUser> {
  const res = await http.get<{ success: boolean; user?: ProfileUser }>(`/users/${id}`);
  const user = res.data.user;
  if (!user) throw new Error("User not found");
  return user;
}

export async function fetchUserByName(username: string): Promise<ProfileUser> {
  const res = await http.get<{ success: boolean; user?: ProfileUser }>(
    `/users/by-username/${encodeURIComponent(username)}`,
  );
  const user = res.data.user;
  if (!user) throw new Error("User not found");
  return user;
}

export async function subscribe(channelId: number): Promise<void> {
  await http.post(`/users/${channelId}/subscribe`, {});
}

export async function unsubscribe(channelId: number): Promise<void> {
  await http.delete(`/users/${channelId}/subscribe`);
}

export async function searchUsers(name: string): Promise<ProfileUser[]> {
  const res = await http.get<ProfileUser[]>("/users", {
    params: { name: name.trim() },
  });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}
