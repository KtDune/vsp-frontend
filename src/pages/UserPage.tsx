import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import OwnerMenu from "../components/OwnerMenu";
import PostCard from "../components/PostCard";
import SubscribersModal from "../components/SubscribersModal";
import TabButton from "../components/TabButton";
import VideoCard from "../components/VideoCard";
import { defaultAvatar } from "../data/user";
import {
  deleteUser,
  fetchUser,
  fetchPosts,
  fetchSubscriberCount,
  fetchVideoPage,
  updateUser,
  uploadImage,
  type Post,
  type ProfileUser,
  type Video,
} from "../lib/api";
import { validatePassword, validateUsername } from "../lib/auth";
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
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
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
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [subscribersOpen, setSubscribersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPassword2, setFormPassword2] = useState("");
  const [formVisibility, setFormVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  const meId = identity?.id;

  useEffect(() => {
    if (tab !== "uploads" || accessToken == null || meId == null) return;

    let cancelled = false;

    const videosPromise = (async () => {
      const all: Video[] = [];
      for (let page = 0; ; page += 1) {
        const slice = await fetchVideoPage(page, undefined, { userId: meId });
        all.push(...slice.content);
        if (slice.last) break;
      }
      return all;
    })();

    Promise.all([fetchPosts({ userId: meId }), videosPromise])
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
  }, [tab, accessToken, meId]);

  useEffect(() => {
    const me = getAuthUser();
    if (accessToken == null || !me) return;

    let cancelled = false;

    fetchUser(me.id)
      .then((user) => {
        if (cancelled) return;
        setState({ userId: me.id, profile: user, failed: false });
        fetchSubscriberCount(me.id).then((count) => {
          if (!cancelled) setSubscriberCount(count);
        });
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

  const pickAvatar = (file: File | undefined) => {
    setAvatarFile(file ?? null);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const openEdit = (close: () => void) => {
    setFormUsername(profile?.username ?? identity.username);
    setFormPassword("");
    setFormPassword2("");
    setFormVisibility(profile?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC");
    pickAvatar(undefined);
    setEditError(null);
    setEditOpen(true);
    close();
  };

  const closeEdit = () => {
    if (editBusy) return;
    setEditOpen(false);
    setEditError(null);
    pickAvatar(undefined);
  };

  const submitEdit = async () => {
    if (!identity || editBusy) return;
    const nextUsername = formUsername.trim();
    const usernameError = validateUsername(nextUsername);
    if (usernameError) {
      setEditError(usernameError);
      return;
    }
    if (formPassword) {
      const passwordError = validatePassword(formPassword);
      if (passwordError) {
        setEditError(passwordError);
        return;
      }
      if (formPassword !== formPassword2) {
        setEditError("Passwords do not match");
        return;
      }
    }
    setEditBusy(true);
    setEditError(null);
    try {
      let uploadedAvatarUrl: string | null = null;
      if (avatarFile) {
        uploadedAvatarUrl = await uploadImage(avatarFile, "avatar");
      }
      await updateUser(identity.id, {
        username: nextUsername,
        ...(formPassword ? { password: formPassword } : {}),
        ...(uploadedAvatarUrl ? { profileUrl: uploadedAvatarUrl } : {}),
        ...(formVisibility !== (profile?.visibility ?? formVisibility)
          ? { visibility: formVisibility }
          : {}),
      });
      setState((prev) =>
        prev && prev.userId === identity.id && prev.profile
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                username: nextUsername,
                visibility: formVisibility,
                ...(uploadedAvatarUrl ? { profileUrl: uploadedAvatarUrl } : {}),
              },
            }
          : prev,
      );
      setEditOpen(false);
      pickAvatar(undefined);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update the account");
    } finally {
      setEditBusy(false);
    }
  };

  const openDelete = (close: () => void) => {
    setDeletePassword("");
    setDeleteError(null);
    setDeleteOpen(true);
    close();
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setDeleteError(null);
  };

  const submitDelete = async () => {
    if (!identity || deleteBusy) return;
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteUser(identity.id, deletePassword);
      await logout().catch(() => undefined);
      navigate("/");
    } catch (err) {
      setDeleteBusy(false);
      setDeleteError(err instanceof Error ? err.message : "Could not delete the account");
    }
  };

  const menuItems = [
    { label: "Edit account", onClick: openEdit },
    { label: "Delete account", danger: true, onClick: openDelete },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <img
            src={profile?.profileUrl ?? defaultAvatar}
            alt="Avatar"
            className="h-20 w-20 rounded-full ring-2 ring-accent"
          />
          <div className="min-w-0 flex-1">
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
              {subscriberCount != null && (
                <button
                  onClick={() => setSubscribersOpen(true)}
                  className="cursor-pointer text-xs font-medium text-text hover:underline"
                >
                  {subscriberCount} {subscriberCount === 1 ? "subscriber" : "subscribers"}
                </button>
              )}
            </div>
          </div>
          <OwnerMenu label="Account options" items={menuItems} />
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

      {subscribersOpen && meId != null && (
        <SubscribersModal
          channelId={meId}
          channelName={name}
          showRemove
          onClose={() => setSubscribersOpen(false)}
          onRemoved={() =>
            setSubscriberCount((count) => (count != null ? Math.max(0, count - 1) : count))
          }
        />
      )}

      {editOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-bg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Edit account</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <img
                  src={avatarPreview ?? profile?.profileUrl ?? defaultAvatar}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full ring-2 ring-accent"
                />
                <label className="cursor-pointer rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold hover:bg-surface-hover">
                  Choose avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      pickAvatar(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">Username</span>
                <input
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  maxLength={20}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">New password</span>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">Re-enter password</span>
                <input
                  type="password"
                  value={formPassword2}
                  onChange={(e) => setFormPassword2(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-dim">Visibility</span>
                <select
                  value={formVisibility}
                  onChange={(e) =>
                    setFormVisibility(e.target.value === "PRIVATE" ? "PRIVATE" : "PUBLIC")
                  }
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
              {editError && <p className="text-xs text-red-400">{editError}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={editBusy}
                className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold text-text-dim hover:text-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={editBusy}
                className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {editBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDelete}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-bg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Delete account</h2>
            <p className="mt-1 text-sm text-text-dim">
              Your account will be deactivated and your profile anonymized. This cannot be
              undone.
            </p>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-dim">Password</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeDelete}
                disabled={deleteBusy}
                className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold text-text-dim hover:text-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitDelete}
                disabled={deleteBusy || !deletePassword}
                className="cursor-pointer rounded-full border border-red-400/30 px-4 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-400/10 disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link
        to="/"
        className="mt-6 inline-block text-sm text-text-dim hover:text-accent"
      >
        ← Back to home
      </Link>
    </main>
  );
}
