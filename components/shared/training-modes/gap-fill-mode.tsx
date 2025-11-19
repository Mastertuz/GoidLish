import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import Link from "next/link";
import { Play, PenTool } from "lucide-react";

function GapFillModeCard() {
  return (
    <Card className="bg-linear-to-br from-gray-900 via-black to-gray-800 border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 group">
      <CardHeader className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-orange-600/20 to-red-600/20"></div>
        <div className="relative flex items-center justify-center p-8">
          <div className="bg-linear-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-lg">
            <PenTool className="w-16 h-16 text-white" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse delay-150"></div>
          </div>
          
          <h4 className="text-2xl font-bold bg-linear-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Заполни пропуски
          </h4>
          
          <p className="text-gray-300 text-sm leading-relaxed">
            Вставьте пропущенные слова
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 pt-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded-full opacity-50"></div>
              <span>Предложение + пропуск</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          className="w-full bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300 border-0 group" 
          asChild
        >
          <Link href="/training/gapfill?setup=true" className="flex items-center justify-center space-x-2">
            <Play className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            <span>Начать</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default GapFillModeCard;
