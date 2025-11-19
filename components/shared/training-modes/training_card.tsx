import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Play, BookOpen } from "lucide-react";

function TrainingCard() {
  return (
    <Card className="w-full bg-linear-to-br from-gray-900 via-black to-gray-800 border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 group">
      <CardHeader className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="relative flex items-center justify-center p-4 md:p-8">
          <div className="bg-linear-to-br from-blue-500 to-purple-600 p-4 md:p-6 rounded-2xl shadow-lg">
            <BookOpen className="w-12 h-12 md:w-16 md:h-16 text-white" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse delay-150"></div>
          </div>
          
          <h4 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Карточки
          </h4>
          
          <p className="text-gray-300 text-sm leading-relaxed">
            Переводите слова в обе стороны
          </p>
          
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 pt-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full opacity-50"></div>
              <span>Английский ↔ Русский</span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300 border-0 group" 
          asChild
        >
          <Link href="/training/flashcard?setup=true" className="flex items-center justify-center space-x-2">
            <Play className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            <span>Начать</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default TrainingCard;
