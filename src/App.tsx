import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import Navbar from "./components/Navbar";
import ChannelPage from "./pages/ChannelPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import UserPage from "./pages/UserPage";
import UserSearchPage from "./pages/UserSearchPage";
import VideoSearchPage from "./pages/VideoSearchPage";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-svh bg-bg text-text">
        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
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
