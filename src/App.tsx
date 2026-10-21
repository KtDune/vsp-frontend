import { useCallback, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChannelPage from "./pages/ChannelPage";
import CreateVideoPage from "./pages/CreateVideoPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PostPage from "./pages/PostPage";
import SignupPage from "./pages/SignupPage";
import UserPage from "./pages/UserPage";
import UserSearchPage from "./pages/UserSearchPage";
import VideoSearchPage from "./pages/VideoSearchPage";
import WatchPage from "./pages/WatchPage";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <AuthProvider>
      <div className="min-h-svh bg-bg text-text">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/watch/:id" element={<WatchPage />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/me" element={<UserPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/channel/:username" element={<ChannelPage />} />
          <Route path="/search" element={<VideoSearchPage />} />
          <Route path="/users" element={<UserSearchPage />} />
          <Route path="/create" element={<CreateVideoPage />} />
        </Routes>

        <CreateFab />
      </div>
    </AuthProvider>
  );
}

function CreateFab() {
  const { accessToken } = useAuth();
  const { pathname } = useLocation();

  if (accessToken == null || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <Link
      to="/create"
      className="fixed right-8 bottom-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:opacity-90"
    >
      <Plus className="h-7 w-7" />
    </Link>
  );
}
