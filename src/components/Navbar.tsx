import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, Search, X } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { defaultAvatar } from "../data/user";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { accessToken } = useAuth();
  const hasToken = accessToken !== null;
  const showAuthLinks = !hasToken && location.pathname !== "/login" && location.pathname !== "/signup";

  const search = () => {
    const name = query.trim();
    setMobileSearchOpen(false);
    if (name) navigate(`/search?name=${encodeURIComponent(name)}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-bg px-4">
      {mobileSearchOpen ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-2 sm:hidden"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setMobileSearchOpen(false)}
            className="cursor-pointer rounded-full p-2 hover:bg-surface-hover"
          >
            <ArrowLeft size={20} />
          </button>
          <input
            autoFocus
            type="text"
            placeholder="Search videos"
            aria-label="Search videos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Search"
            className="cursor-pointer rounded-full p-2 hover:bg-surface-hover"
          >
            <Search size={20} />
          </button>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <button
              aria-label="Menu"
              onClick={() => {
                setMobileSearchOpen(false);
                onMenuClick();
              }}
              className="cursor-pointer rounded-full p-2 hover:bg-surface-hover"
            >
              <Menu size={20} />
            </button>
            <Link to="/" className="flex items-center gap-2 font-bold tracking-wide">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-black text-white">
                V
              </span>
              <span className="text-lg">
                VSP<span className="text-accent">.</span>
              </span>
            </Link>
          </div>

          <form
            className="mx-auto hidden w-full max-w-xl items-center sm:flex"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search videos"
                aria-label="Search videos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-l-full border border-border bg-surface px-4 pr-9 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-text-dim transition hover:text-text"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              aria-label="Search"
              className="flex h-10 cursor-pointer items-center justify-center rounded-r-full border border-l-0 border-border bg-surface-hover px-4 text-text hover:bg-border"
            >
              <Search size={18} />
            </button>
          </form>

          <button
            type="button"
            aria-label="Search"
            onClick={() => setMobileSearchOpen(true)}
            className="ml-auto cursor-pointer rounded-full p-2 hover:bg-surface-hover sm:hidden"
          >
            <Search size={20} />
          </button>
        </>
      )}

      {hasToken ? (
        <Link
          to="/me"
          aria-label="Your profile"
          className="cursor-pointer rounded-full"
        >
          <img
            src={defaultAvatar}
            alt="Profile"
            className="h-8 w-8 rounded-full"
          />
        </Link>
      ) : showAuthLinks ? (
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-full border border-border bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      ) : null}
    </header>
  );
}
