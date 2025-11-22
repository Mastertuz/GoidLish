import TrainingCard from "@/components/shared/training-modes/training_card";
import DefinitionModeCard from "@/components/shared/training-modes/definition-mode";
import GapFillModeCard from "@/components/shared/training-modes/gap-fill-mode";
import ImageModeCard from "@/components/shared/training-modes/image-mode";
import AuthButton from "@/components/auth/AuthButton";
import UserDictionary from "@/components/user/UserDictionary";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-center gap-8 mb-16">
          <div className="text-center lg:text-left flex-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              English Learning Platform
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-300">
              Выберите режим тренировки и начните изучать английский прямо сейчас
            </p>
          </div>
            <AuthButton />

        </header>
        {/* Training Modes Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 mb-20">
          <TrainingCard />
          <DefinitionModeCard />
          <GapFillModeCard />
          <ImageModeCard />
        </section>

        {/* User Dictionary */}
        <section className="max-w-5xl mx-auto">
          <UserDictionary />

        </section>
      </div>

    </main>
  );
}