import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/index";
import Auth from "./pages/auth";
import Feed from "./pages/feed";
import Profile from "./pages/profile";
import Notifications from "./pages/notifications";
import Explore from "./pages/explore";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";
import Chat from "./pages/chat";
import ChatThread from "./pages/chat/thread";
import Feeds from "./pages/feeds";
import Lists from "./pages/lists";
import Saved from "./pages/saved";
import Hashtag from "./pages/hashtag";
import PostDetail from "./pages/post/detail";
import ProfileRedirect from "./pages/profile/redirect";
import FeedDetail from "./pages/feed/detail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/profile" element={<ProfileRedirect />} />
              <Route path="/profile/:handle" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:convoId" element={<ChatThread />} />
              <Route path="/feeds" element={<Feeds />} />
              <Route path="/profile/:handle/feed/:feedId" element={<FeedDetail />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/hashtag/:tag" element={<Hashtag />} />
              <Route path="/profile/:handle/post/:postId" element={<PostDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
