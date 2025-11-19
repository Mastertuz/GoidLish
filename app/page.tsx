import TrainingCard from "@/components/shared/training-modes/training_card";
import DefinitionModeCard from "@/components/shared/training-modes/definition-mode";
import GapFillModeCard from "@/components/shared/training-modes/gap-fill-mode";
import ImageModeCard from "@/components/shared/training-modes/image-mode";
import AuthButton from "@/components/auth/AuthButton";
import UserDictionary from "@/components/user/UserDictionary";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Header with authentication button */}
        <div className="flex flex-col lg:flex-row justify-between items-center mb-12 mt-4 gap-4">
          <div className="flex-1 w-full">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">English Learning Platform</h1>
              <p className="text-slate-400 text-base md:text-lg">Выберите режим тренировки для изучения английского</p>
            </div>
          </div>
          <div className="w-full lg:w-auto lg:ml-4">
            <AuthButton />
          </div>
        </div>

        {/* Training modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-12 w-full">
          <TrainingCard />
          <DefinitionModeCard />
          <GapFillModeCard />
          <ImageModeCard />
        </div>

        {/* User dictionary */}
        <div className="mt-8 w-full max-w-4xl mx-auto">
          <UserDictionary />
        </div>

      </div>
    </main>
  );
}
