export const metadata = {
  title: 'Survivor Deck-Builder',
  description: 'A tactical zombie survival game with card-based expeditions',
};

export default function SurvivorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black flex items-start justify-center overflow-y-auto">
      <div className="relative w-full max-w-[430px] min-h-full bg-stone-950">
        {children}
      </div>
    </div>
  );
}
