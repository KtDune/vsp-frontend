import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, Upload, X } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import TabButton from "../components/TabButton";
import { createPost, createVideo, uploadImage, uploadVideo } from "../lib/api";

type Tab = "video" | "post";
type Visibility = "PUBLIC" | "PRIVATE";

const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_POST_IMAGES = 4;
const MAX_DESCRIPTION_WORDS = 500;

const videoAccept = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

const isAllowedVideo = (file: File) =>
  [".mp4", ".mov", ".webm"].some((ext) => file.name.toLowerCase().endsWith(ext));

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function NotLoggedIn() {
  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-xl font-bold">Not logged in</h1>
        <p className="mt-2 text-sm text-text-dim">Log in to upload videos or publish posts.</p>
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

export default function CreateVideoPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("video");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [dragging, setDragging] = useState(false);
  const [postText, setPostText] = useState("");
  const [postImages, setPostImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Tab | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [postPublished, setPostPublished] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!thumbnailUrl) return;
    return () => URL.revokeObjectURL(thumbnailUrl);
  }, [thumbnailUrl]);

  const pickFile = (next: File | null) => {
    setFileError(null);
    setDuration(null);
    if (next && !isAllowedVideo(next)) {
      setFile(null);
      setPreviewUrl(null);
      setFileError("Unsupported format · use MP4, MOV or WebM");
      return;
    }
    if (next && next.size > MAX_VIDEO_BYTES) {
      setFile(null);
      setPreviewUrl(null);
      setFileError("The video is larger than 2 GB");
      return;
    }
    setFile(next);
    setPreviewUrl(next && next.type.startsWith("video/") ? URL.createObjectURL(next) : null);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (!next) return;
    pickFile(next);
  };

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (incoming.length === 0) return;

    const room = MAX_POST_IMAGES - postImages.length;
    const oversized = incoming.some((next) => next.size > MAX_IMAGE_BYTES);

    setImageError(
      oversized
        ? "An image is larger than 5 MB"
        : incoming.length > room
          ? "Up to 4 images per post"
          : null,
    );

    const accepted = incoming
      .filter((next) => next.size <= MAX_IMAGE_BYTES)
      .slice(0, Math.max(room, 0));

    if (accepted.length > 0) {
      setPostImages((prev) => [...prev, ...accepted]);
    }
  };

  const removeImage = (index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    e.target.value = "";
    if (!next) return;
    setThumbnailError(null);
    if (next.size > MAX_IMAGE_BYTES) {
      setThumbnail(null);
      setThumbnailUrl(null);
      setThumbnailError("The image is larger than 5 MB");
      return;
    }
    setThumbnail(next);
    setThumbnailUrl(URL.createObjectURL(next));
  };

  const removeThumbnail = () => {
    setThumbnail(null);
    setThumbnailUrl(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0] ?? null);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setSubmitError(null);
  };

  const submitVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || file == null) return;
    setSubmitError(null);
    setPostPublished(false);
    setBusy("video");
    setUploadProgress(0);
    try {
      const videoUrl = await uploadVideo(file, setUploadProgress);
      const uploadedThumbnailUrl = thumbnail ? await uploadImage(thumbnail) : null;
      const id = await createVideo({
        title: title.trim(),
        description: description.trim() || null,
        visibility,
        videoUrl,
        thumbnailUrl: uploadedThumbnailUrl,
        duration,
      });
      navigate(`/watch/${id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong");
      setBusy(null);
    }
  };

  const submitPost = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || (postText.trim().length === 0 && postImages.length === 0)) return;
    setSubmitError(null);
    setPostPublished(false);
    setBusy("post");
    setUploadProgress(0);
    try {
      const imageUrls = await Promise.all(postImages.map((image) => uploadImage(image)));
      await createPost({
        content: postText.trim() || null,
        imageUrls,
        visibility: "PUBLIC",
      });
      setPostText("");
      setPostImages([]);
      setPostPublished(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  if (accessToken == null) {
    return <NotLoggedIn />;
  }

  const canUploadVideo = file != null && title.trim().length > 0;
  const canPublishPost = postText.trim().length > 0 || postImages.length > 0;
  const descriptionWords =
    description.trim().length === 0 ? 0 : description.trim().split(/\s+/).length;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-xl font-bold">Create</h1>

        <div className="mt-6 flex gap-1 border-b border-border">
          <TabButton active={tab === "video"} onClick={() => switchTab("video")}>
            Video
          </TabButton>
          <TabButton active={tab === "post"} onClick={() => switchTab("post")}>
            Post
          </TabButton>
        </div>

        {tab === "video" ? (
          <form onSubmit={submitVideo} className="mt-6 flex flex-col gap-5" noValidate>
            {file ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4">
                {previewUrl && (
                  <video
                    src={previewUrl}
                    className="max-h-64 w-full rounded-lg"
                    controls
                    onLoadedMetadata={(e) => {
                      const seconds = e.currentTarget.duration;
                      setDuration(Number.isFinite(seconds) ? Math.round(seconds) : null);
                    }}
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-text">{file.name}</span>
                  <label className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
                    Replace
                    <input
                      type="file"
                      accept={videoAccept}
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-32 text-center transition ${
                  dragging
                    ? "border-accent bg-surface-hover"
                    : "border-border bg-bg hover:border-accent"
                }`}
              >
                <input type="file" accept={videoAccept} className="hidden" onChange={onFileChange} />
                <Upload className="h-12 w-12 text-text-dim" />
                <span className="text-base font-medium text-text">
                  Click or drop a video to upload <span className="text-red-400">*</span>
                </span>
                <span className="text-xs text-text-dim">MP4, MOV or WebM · up to 2 GB</span>
              </label>
            )}
            {fileError && <p className="text-xs text-red-400">{fileError}</p>}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">
                Title <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <span
                className={`text-right text-xs ${descriptionWords > MAX_DESCRIPTION_WORDS ? "text-red-400" : "text-text-dim"}`}
              >
                {descriptionWords}/{MAX_DESCRIPTION_WORDS}
              </span>
            </label>

            {thumbnail ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4">
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-text">
                    {thumbnail.name}
                  </span>
                  <span className="shrink-0 text-xs text-text-dim">
                    {formatSize(thumbnail.size)}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove thumbnail"
                    onClick={removeThumbnail}
                    className="cursor-pointer rounded-full p-1.5 text-text-dim transition hover:bg-surface-hover hover:text-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-bg px-4 py-4 transition hover:border-accent">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onThumbnailChange}
                />
                <ImagePlus className="h-5 w-5 shrink-0 text-text-dim" />
                <span className="text-sm text-text-dim">
                  Add a thumbnail · jpg, png or webp · up to 5 MB
                </span>
              </label>
            )}
            {thumbnailError && <p className="text-xs text-red-400">{thumbnailError}</p>}

            <div>
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">
                Visibility
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["PUBLIC", "PRIVATE"] as Visibility[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVisibility(option)}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      visibility === option
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-text-dim hover:border-text-dim"
                    }`}
                  >
                    {option === "PUBLIC" ? "Public" : "Private"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-text-dim">Private videos are only visible to you.</p>
            </div>

            <button
              type="submit"
              disabled={busy != null || !canUploadVideo}
              className="mt-6 h-10 cursor-pointer rounded-full bg-accent text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "video" ? `Uploading… ${uploadProgress}%` : "Upload"}
            </button>
            {submitError && <p className="text-xs text-red-400">{submitError}</p>}
          </form>
        ) : (
          <form onSubmit={submitPost} className="mt-6 flex flex-col gap-5" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-text-dim uppercase">
                Post <span className="text-red-400">*</span>
              </span>
              <textarea
                value={postText}
                maxLength={1000}
                onChange={(e) => setPostText(e.target.value)}
                rows={6}
                placeholder="Share something with your subscribers"
                className="resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent placeholder:text-text-dim"
              />
              <span className="text-right text-xs text-text-dim">{postText.length}/1000</span>
            </label>

            {postImages.length > 0 && (
              <div className="flex flex-col gap-2">
                {postImages.map((image, index) => (
                  <div
                    key={`${image.name}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-text">
                      {image.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-dim">
                      {formatSize(image.size)}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeImage(index)}
                      className="cursor-pointer rounded-full p-1.5 text-text-dim transition hover:bg-surface-hover hover:text-text"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {postImages.length < MAX_POST_IMAGES && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-bg px-4 py-4 transition hover:border-accent">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={onImageChange}
                />
                <ImagePlus className="h-5 w-5 shrink-0 text-text-dim" />
                <span className="text-sm text-text-dim">
                  Add images · jpg, png or webp · up to 5 MB each, max 4{" "}
                  <span className="text-red-400">*</span>
                </span>
              </label>
            )}
            {imageError && <p className="text-xs text-red-400">{imageError}</p>}

            <p className="text-xs text-text-dim">At least one text / image is required.</p>

            <button
              type="submit"
              disabled={busy != null || !canPublishPost}
              className="mt-6 h-10 cursor-pointer rounded-full bg-accent text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "post" ? `Uploading… ${uploadProgress}%` : "Upload"}
            </button>
            {submitError && <p className="text-xs text-red-400">{submitError}</p>}
            {postPublished && <p className="text-xs text-emerald-400">Post published</p>}
          </form>
        )}
      </div>
    </main>
  );
}
