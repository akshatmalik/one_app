export const metadata = {
  title: 'Survivor Deck-Builder',
  description: 'A tactical zombie survival game with card-based expeditions',
};

export default function SurvivorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
