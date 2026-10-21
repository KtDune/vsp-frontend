import { isAxiosError } from "axios";
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

export type VideoDetail = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  thumbnailUrl: string | null;
  videoUrl: string;
  duration: number | null;
  viewCount: number;
  createdAt: string;
  channelName: string;
  channelAvatarUrl: string | null;
  commentsDisabled: boolean | null;
};

export type ProfileUser = {
  id: number;
  username: string;
  profileUrl: string | null;
  visibility: string;
  createdAt: string | null;
};

export type Post = {
  id: number;
  userId: number;
  content: string | null;
  visibility: string;
  isEdited: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  imageUrls: string[];
  authorUsername: string;
  authorProfileUrl: string | null;
};

const PAGE_SIZE = 20;

type UploadResponse = {
  success: boolean;
  url?: string;
  message?: string;
};

function toUploadForm(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  return form;
}

function uploadProgressHandler(onProgress?: (percent: number) => void) {
  if (!onProgress) return undefined;
  return (event: { loaded: number; total?: number }) => {
    if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
  };
}

function requireUploadUrl(data: UploadResponse): string {
  if (!data.success || !data.url) {
    throw new Error(data.message ?? "Upload failed");
  }
  return data.url;
}

export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  try {
    const res = await http.post<UploadResponse>("/uploads/videos", toUploadForm(file), {
      timeout: 0,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: uploadProgressHandler(onProgress),
    });
    return requireUploadUrl(res.data);
  } catch (err) {
    throw toError(err, "Upload failed");
  }
}

export async function uploadImage(
  file: File,
  kind: "image" | "avatar" = "image",
  onProgress?: (percent: number) => void,
): Promise<string> {
  const endpoint = kind === "avatar" ? "/uploads/avatars" : "/uploads/images";
  try {
    const res = await http.post<UploadResponse>(endpoint, toUploadForm(file), {
      timeout: 0,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: uploadProgressHandler(onProgress),
    });
    return requireUploadUrl(res.data);
  } catch (err) {
    throw toError(err, "Upload failed");
  }
}

export async function createVideo(body: {
  title: string;
  description?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
}): Promise<number> {
  try {
    const res = await http.post<{ success: boolean; id?: number; message?: string }>("/videos", body);
    if (!res.data.success || !res.data.id) {
      throw new Error(res.data.message ?? "Could not create the video");
    }
    return res.data.id;
  } catch (err) {
    throw toError(err, "Could not create the video");
  }
}

export async function createPost(body: {
  content?: string | null;
  imageUrls?: string[];
  visibility?: string;
}): Promise<void> {
  try {
    const res = await http.post<{ success: boolean; message?: string }>("/posts", body);
    if (!res.data.success) {
      throw new Error(res.data.message ?? "Could not publish the post");
    }
  } catch (err) {
    throw toError(err, "Could not publish the post");
  }
}

export type SubscribedChannel = {
  id: number;
  channelId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  channelUsername: string | null;
  channelProfileUrl: string | null;
};

export type MySubscriptions = {
  subscriptions: SubscribedChannel[];
  pendingRequests: SubscribedChannel[];
};

export async function fetchMySubscriptions(): Promise<MySubscriptions> {
  const res = await http.get<{
    success: boolean;
    subscriptions?: SubscribedChannel[];
    pendingRequests?: SubscribedChannel[];
  }>("/subscriptions/mine", { params: { page: 0, size: 50 } });
  return {
    subscriptions: res.data.subscriptions ?? [],
    pendingRequests: res.data.pendingRequests ?? [],
  };
}

export type SubscriptionRequest = {
  id: number;
  subscriberId: number;
  channelId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string | null;
  subscriberUsername: string | null;
  subscriberProfileUrl: string | null;
};

export async function fetchSubscriptionRequests(
  userId: number,
  page: number = 0,
): Promise<SubscriptionRequest[]> {
  const res = await http.get<{ success: boolean; requests?: SubscriptionRequest[] }>(
    `/users/${userId}/subscription-requests`,
    { params: { page, size: PAGE_SIZE } },
  );
  return res.data.requests ?? [];
}

export async function approveSubscription(id: number): Promise<void> {
  const res = await http.post<{ success: boolean; message?: string }>(
    `/subscriptions/${id}/approve`,
    {},
  );
  if (!res.data.success) {
    throw new Error(res.data.message ?? "Could not approve the request");
  }
}

export async function rejectSubscription(id: number): Promise<void> {
  const res = await http.post<{ success: boolean; message?: string }>(
    `/subscriptions/${id}/reject`,
    {},
  );
  if (!res.data.success) {
    throw new Error(res.data.message ?? "Could not reject the request");
  }
}

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

const toError = (err: unknown, fallback: string): Error => {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return new Error(message);
  }
  if (err instanceof Error && err.message) return err;
  return new Error(fallback);
};

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

export type UserUpdate = {
  username?: string;
  password?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  profileUrl?: string | null;
};

export async function updateUser(id: number, changes: UserUpdate): Promise<void> {
  try {
    const res = await http.put<{ success: boolean; message?: string }>(`/users/${id}`, changes);
    if (!res.data.success) {
      throw new Error(res.data.message ?? "Could not update the account");
    }
  } catch (err) {
    throw toError(err, "Could not update the account");
  }
}

export async function deleteUser(id: number, password: string): Promise<void> {
  try {
    const res = await http.delete<{ success: boolean; message?: string }>(`/users/${id}`, {
      data: { password },
    });
    if (!res.data.success) {
      throw new Error(res.data.message ?? "Could not delete the account");
    }
  } catch (err) {
    throw toError(err, "Could not delete the account");
  }
}

export type SubscriptionStatus = "none" | "pending" | "subscribed";

export type Subscriber = {
  id: number;
  subscriberId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  subscriberUsername: string | null;
  subscriberProfileUrl: string | null;
};

export type SubscriberSlice = {
  content: Subscriber[];
  last: boolean;
};

export async function fetchSubscriberCount(channelId: number): Promise<number | null> {
  try {
    const res = await http.get<{ success: boolean; subscriberCount?: number }>(
      `/users/${channelId}/subscriber-count`,
    );
    if (!res.data.success) return null;
    return res.data.subscriberCount ?? 0;
  } catch {
    return null;
  }
}

export async function fetchSubscribers(channelId: number, page: number): Promise<SubscriberSlice> {
  const res = await http.get<{ success: boolean; subscribers?: SubscriberSlice }>(
    `/users/${channelId}/subscribers`,
    { params: { page, size: PAGE_SIZE } },
  );
  return res.data.subscribers ?? { content: [], last: true };
}

export async function removeSubscriberById(subscriptionId: number): Promise<void> {
  const res = await http.delete<{ success: boolean; message?: string }>(
    `/subscriptions/${subscriptionId}`,
  );
  if (!res.data.success) {
    throw new Error(res.data.message ?? "Could not remove subscriber");
  }
}

export async function fetchSubscriptionStatus(channelId: number): Promise<SubscriptionStatus> {
  const res = await http.get<{ success: boolean; status?: string }>(
    `/users/${channelId}/subscription-status`,
  );
  switch (res.data.status) {
    case "PENDING":
      return "pending";
    case "APPROVED":
      return "subscribed";
    default:
      return "none";
  }
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

export async function fetchVideo(id: number): Promise<VideoDetail> {
  const res = await http.get<{ success: boolean; video?: VideoDetail }>(`/videos/${id}`);
  const video = res.data.video;
  if (!video) throw new Error("Video not found or private");
  return video;
}

export type LikeStatus = {
  likedByMe: boolean;
  likeCount: number;
};

export async function fetchVideoLikeStatus(id: number): Promise<LikeStatus> {
  const res = await http.get<{ success: boolean; likedByMe?: boolean; likeCount?: number }>(
    `/videos/${id}/like-status`,
  );
  return { likedByMe: res.data.likedByMe ?? false, likeCount: res.data.likeCount ?? 0 };
}

export async function likeVideo(id: number): Promise<void> {
  await http.post(`/videos/${id}/like`, {});
}

export async function unlikeVideo(id: number): Promise<void> {
  await http.delete(`/videos/${id}/like`);
}

export async function fetchPostLikeStatus(id: number): Promise<LikeStatus> {
  const res = await http.get<{ success: boolean; likedByMe?: boolean; likeCount?: number }>(
    `/posts/${id}/like-status`,
  );
  return { likedByMe: res.data.likedByMe ?? false, likeCount: res.data.likeCount ?? 0 };
}

export async function likePost(id: number): Promise<void> {
  await http.post(`/posts/${id}/like`, {});
}

export async function unlikePost(id: number): Promise<void> {
  await http.delete(`/posts/${id}/like`);
}

export async function fetchCommentLikeStatus(id: number): Promise<LikeStatus> {
  const res = await http.get<{ success: boolean; likedByMe?: boolean; likeCount?: number }>(
    `/comments/${id}/like-status`,
  );
  return { likedByMe: res.data.likedByMe ?? false, likeCount: res.data.likeCount ?? 0 };
}

export async function likeComment(id: number): Promise<void> {
  await http.post(`/comments/${id}/like`, {});
}

export async function unlikeComment(id: number): Promise<void> {
  await http.delete(`/comments/${id}/like`);
}

export type Comment = {
  id: number;
  userId: number;
  videoId: number | null;
  postId: number | null;
  parentId: number | null;
  content: string;
  isEdited: boolean;
  createdAt: string | null;
  replyCount: number | null;
  authorUsername: string;
  authorProfileUrl: string | null;
};

export type CommentSlice = {
  content: Comment[];
  last: boolean;
};

export async function fetchVideoComments(videoId: number, page: number): Promise<CommentSlice> {
  const res = await http.get<{ success: boolean; comments?: CommentSlice }>("/comments", {
    params: { videoId, page, size: PAGE_SIZE },
  });
  return res.data.comments ?? { content: [], last: true };
}

export async function fetchPostComments(postId: number, page: number): Promise<CommentSlice> {
  const res = await http.get<{ success: boolean; comments?: CommentSlice }>("/comments", {
    params: { postId, page, size: PAGE_SIZE },
  });
  return res.data.comments ?? { content: [], last: true };
}

export async function fetchCommentReplies(commentId: number, page: number): Promise<CommentSlice> {
  const res = await http.get<{ success: boolean; replies?: CommentSlice }>(
    `/comments/${commentId}/replies`,
    { params: { page, size: PAGE_SIZE } },
  );
  return res.data.replies ?? { content: [], last: true };
}

export async function addComment(body: {
  videoId?: number;
  postId?: number;
  content: string;
  parentId?: number;
}): Promise<number> {
  const res = await http.post<{ success: boolean; id?: number }>("/comments", body);
  return res.data.id ?? 0;
}

export async function editComment(id: number, content: string): Promise<void> {
  await http.put(`/comments/${id}`, { content });
}

export async function deleteComment(id: number): Promise<void> {
  await http.delete(`/comments/${id}`);
}

export type VideoUpdate = {
  title?: string;
  description?: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
};

export async function updateVideo(id: number, changes: VideoUpdate): Promise<void> {
  await http.put(`/videos/${id}`, changes);
}

export async function deleteVideo(id: number): Promise<void> {
  await http.delete(`/videos/${id}`);
}

export async function updatePost(
  id: number,
  changes: { content?: string },
): Promise<void> {
  await http.put(`/posts/${id}`, changes);
}

export async function deletePost(id: number): Promise<void> {
  await http.delete(`/posts/${id}`);
}

export async function fetchPosts(
  opts: { userId?: number; username?: string } = {},
): Promise<Post[]> {
  const res = await http.get<{ success: boolean; posts?: { content?: Post[] } }>("/posts", {
    params: {
      ...(opts.userId != null ? { userId: opts.userId } : {}),
      ...(opts.username ? { username: opts.username } : {}),
    },
  });
  const content = res.data.posts?.content;
  return Array.isArray(content) ? content : [];
}

export async function fetchPost(id: number): Promise<Post> {
  const res = await http.get<{ success: boolean; post?: Post }>(`/posts/${id}`);
  const post = res.data.post;
  if (!post) throw new Error("Post not found or private");
  return post;
}
