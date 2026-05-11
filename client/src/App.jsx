import { Suspense, lazy } from "react";
import { AuthProviderWrapper } from "./app/AuthProviderWrapper";
import { Navbar } from "./app/components/Navbar";
import { usePathname } from "./lib/navigation";
import { routeLoaders } from "./lib/routePreloaders";

const HomePage = lazy(routeLoaders.home);
const BrowsePage = lazy(routeLoaders.browse);
const WritePage = lazy(routeLoaders.write);
const LoginPage = lazy(routeLoaders.login);
const RegisterPage = lazy(routeLoaders.register);
const ProfilePage = lazy(routeLoaders.profile);
const PublicProfilePage = lazy(routeLoaders.publicProfile);
const ProfileSearchPage = lazy(routeLoaders.profileSearch);
const AdminPage = lazy(routeLoaders.admin);
const PostPage = lazy(routeLoaders.post);
const SeriesPage = lazy(routeLoaders.series);
const SeriesDetailPage = lazy(routeLoaders.seriesDetail);
const TagsPage = lazy(routeLoaders.tags);
const TagDetailPage = lazy(routeLoaders.tagDetail);
const ChallengesPage = lazy(routeLoaders.challenges);
const ChallengeDetailPage = lazy(routeLoaders.challengeDetail);
const GroupsPage = lazy(routeLoaders.groups);
const GroupDetailPage = lazy(routeLoaders.groupDetail);
const AnalyticsPage = lazy(routeLoaders.analytics);
const LeaderboardPage = lazy(routeLoaders.leaderboard);
const MessagesPage = lazy(routeLoaders.messages);

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
      <div className="flex-1">
        <Suspense
          fallback={
            <main className="editorial-shell py-12" style={{ color: "var(--text2)" }}>
              Loading...
            </main>
          }
        >
          <RouteView />
        </Suspense>
      </div>
    </AuthProviderWrapper>
  );
}
