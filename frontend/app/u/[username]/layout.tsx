import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}'s Developer Telemetry`,
    description: `Public GitHub analytics, commit distribution, and activity cadence for @${username}.`,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `@${username} | GitStory Developer Analytics`,
      description: `Public GitHub analytics, commit distribution, and activity cadence for @${username}.`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `@${username} | GitStory Developer Analytics`,
      description: `Public GitHub analytics, commit distribution, and activity cadence for @${username}.`,
    },
  };
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
