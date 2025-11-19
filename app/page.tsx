import TrainingCard from "@/components/shared/training-modes/training_card";
import DefinitionModeCard from "@/components/shared/training-modes/definition-mode";
import GapFillModeCard from "@/components/shared/training-modes/gap-fill-mode";
import ImageModeCard from "@/components/shared/training-modes/image-mode";
import AuthButton from "@/components/auth/AuthButton";
import UserDictionary from "@/components/user/UserDictionary";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with authentication button */}
        <div className="flex justify-between items-start mb-12 mt-4">
          <div className="flex-1">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-white mb-2">English Learning Platform</h1>
              <p className="text-slate-400 text-lg">Выберите режим тренировки для изучения английского</p>
            </div>
          </div>
          <div className="ml-4">
            <AuthButton />
          </div>
        </div>

        {/* Training modes */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <TrainingCard />
          <DefinitionModeCard />
          <GapFillModeCard />
          <ImageModeCard />
        </div>

        {/* User dictionary */}
        <div className="mt-8">
          <UserDictionary />
        </div>

      </div>
    </main>
  );
}
