import { AuthProviderWrapper } from "./app/AuthProviderWrapper";
import { Navbar } from "./app/components/Navbar";
import HomePage from "./app/page";
import BrowsePage from "./app/browse/page";
import WritePage from "./app/write/page";
import LoginPage from "./app/login/page";
import RegisterPage from "./app/register/page";
import ProfilePage from "./app/profile/page";
import PublicProfilePage from "./app/profile/[id]/page";
import ProfileSearchPage from "./app/profile/search/[name]/page";
import AdminPage from "./app/admin/page";
import PostPage from "./app/post/[id]/page";
import SeriesPage from "./app/series/page";
import SeriesDetailPage from "./app/series/[id]/page";
import TagsPage from "./app/tags/page";
import TagDetailPage from "./app/tags/[tag]/page";
import ChallengesPage from "./app/challenges/page";
import ChallengeDetailPage from "./app/challenges/[id]/page";
import GroupsPage from "./app/groups/page";
import GroupDetailPage from "./app/groups/[id]/page";
import AnalyticsPage from "./app/analytics/page";
import LeaderboardPage from "./app/leaderboard/page";
import MessagesPage from "./app/messages/page";
import { usePathname } from "./lib/navigation";

function NotFoundPage() {
  return (
    <main className="editorial-shell py-12">
      <h1 className="serif-title text-5xl font-bold text-[#25211d]">
        Page not found
      </h1>
      <p className="mt-3 text-[#6d6155]">The requested page does not exist.</p>
    </main>
  );
}

function RouteView() {
  const pathname = usePathname();

  if (pathname === "/") return <HomePage />;
  if (pathname === "/browse") return <BrowsePage />;
  if (pathname === "/write") return <WritePage />;
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/register") return <RegisterPage />;
  if (pathname === "/profile") return <ProfilePage />;
  if (pathname === "/admin") return <AdminPage />;
  if (pathname === "/series") return <SeriesPage />;
  if (pathname === "/tags") return <TagsPage />;
  if (pathname === "/challenges") return <ChallengesPage />;
  if (pathname === "/groups") return <GroupsPage />;
  if (pathname === "/analytics") return <AnalyticsPage />;
  if (pathname === "/leaderboard") return <LeaderboardPage />;
  if (pathname === "/messages") return <MessagesPage />;

  const seriesMatch = pathname.match(/^\/series\/([^/]+)$/);
  if (seriesMatch) return <SeriesDetailPage seriesId={seriesMatch[1]} />;

  const tagMatch = pathname.match(/^\/tags\/([^/]+)$/);
  if (tagMatch) return <TagDetailPage tag={tagMatch[1]} />;

  const challengeMatch = pathname.match(/^\/challenges\/([^/]+)$/);
  if (challengeMatch) return <ChallengeDetailPage challengeId={challengeMatch[1]} />;

  const groupMatch = pathname.match(/^\/groups\/([^/]+)$/);
  if (groupMatch) return <GroupDetailPage groupId={groupMatch[1]} />;

  const profileMatch = pathname.match(/^\/profile\/([^/]+)$/);
  if (profileMatch) return <PublicProfilePage profileId={profileMatch[1]} />;

  const profileSearchMatch = pathname.match(/^\/profile\/search\/([^/]+)$/);
  if (profileSearchMatch) return <ProfileSearchPage name={profileSearchMatch[1]} />;

  const postMatch = pathname.match(/^\/post\/([^/]+)$/);
  if (postMatch) return <PostPage postId={postMatch[1]} />;

  return <NotFoundPage />;
}

export default function App() {
  return (
    <AuthProviderWrapper>
      <Navbar />
      <div className="flex-1 transition-all">
        <RouteView />
      </div>
    </AuthProviderWrapper>
  );
}
