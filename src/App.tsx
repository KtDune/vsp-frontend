import { useCallback, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChannelPage from "./pages/ChannelPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
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
          <Route path="/me" element={<UserPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/channel/:username" element={<ChannelPage />} />
          <Route path="/search" element={<VideoSearchPage />} />
          <Route path="/users" element={<UserSearchPage />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
