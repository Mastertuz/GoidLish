"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Book, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Upload,
  X
} from "lucide-react";
import { Word, WordFormData } from "@/types";

const initialFormData: WordFormData = {
  english: "",
  russian: "",
  definition: "",
  example: "",
  imageUrl: ""
};

export default function UserDictionary() {
  const { data: session } = useSession();
  const [words, setWords] = useState<Word[]>([]);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [formData, setFormData] = useState<WordFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Загрузка слов пользователя
  const fetchUserWords = useCallback(async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      const response = await fetch("/api/user/dictionary", {
        cache: "no-store",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setWords(data);
        setFilteredWords(data);
      } else {
        setError("Ошибка при загрузке словаря");
      }
    } catch (error) {
      console.error("Error fetching user words:", error);
      setError("Ошибка при загрузке словаря");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Поиск по словам
  useEffect(() => {
    if (searchTerm) {
      const filtered = words.filter(word =>
        word.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.russian.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWords(filtered);
    } else {
      setFilteredWords(words);
    }
  }, [searchTerm, words]);

  // Функции для работы с изображениями
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData(prev => ({ ...prev, imageUrl: "" }));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.imageUrl;
      }
    } catch (error) {
      console.error("Ошибка при загрузке изображения:", error);
    }

    return null;
  };

  useEffect(() => {
    if (session) {
      fetchUserWords();
    }
  }, [session, fetchUserWords]);

  // Обработка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      let imageUrl = formData.imageUrl;

      // Загружаем изображение если оно выбрано
      if (imageFile) {
        const uploadedImageUrl = await uploadImage(imageFile);
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        }
      }

      const url = editingWord 
        ? `/api/user/dictionary/${editingWord.id}`
        : "/api/user/dictionary";
      
      const method = editingWord ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: imageUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (editingWord) {
          setWords(words.map(w => w.id === editingWord.id ? data : w));
          setSuccess("Слово обновлено!");
        } else {
          setWords([data, ...words]);
          setSuccess("Слово добавлено в словарь!");
        }
        setIsDialogOpen(false);
        setFormData(initialFormData);
        setEditingWord(null);
        setImageFile(null);
        setImagePreview("");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Ошибка при сохранении слова");
      }
    } catch (error) {
      console.error("Error saving word:", error);
      setError("Ошибка при сохранении слова");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Удаление слова
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/user/dictionary/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWords(words.filter(word => word.id !== id));
        setSuccess("Слово удалено из словаря!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Ошибка при удалении слова");
      }
    } catch (error) {
      console.error("Error deleting word:", error);
      setError("Ошибка при удалении слова");
    }
  };

  // Открыть диалог редактирования
  const openEditDialog = (word: Word) => {
    setEditingWord(word);
    setFormData({
      english: word.english,
      russian: word.russian,
      definition: word.definition || "",
      example: word.example || "",
      imageUrl: word.imageUrl || ""
    });
    setImageFile(null);
    setImagePreview(word.imageUrl || "");
    setIsDialogOpen(true);
  };

  // Открыть диалог создания
  const openCreateDialog = () => {
    setEditingWord(null);
    setFormData(initialFormData);
    setImageFile(null);
    setImagePreview("");
    setIsDialogOpen(true);
  };

  if (!session) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
        <div className="flex items-center justify-center">
          <p className="text-slate-400">Войдите в аккаунт, чтобы увидеть свой словарь</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
        <div className="flex items-center justify-center">
          <div className="text-lg text-slate-300">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-2">
        <Book className="h-6 w-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Мой словарь</h2>
      </div>

      {/* Уведомления */}
      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-900/20 border-green-800 text-green-300">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Поиск и кнопка добавления */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Поиск по словам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Добавить слово
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100"
            style={{
              position: 'fixed',
              top: '50vh',
              left: '50vw',
              transform: 'translate(-50%, -50%)',
              zIndex: 50
            }}
          >
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  {editingWord ? "Редактировать слово" : "Добавить новое слово"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Заполните поля для {editingWord ? "обновления" : "создания"} слова
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="english" className="text-slate-300">Английское слово *</Label>
                    <Input
                      id="english"
                      value={formData.english}
                      onChange={(e) => setFormData(prev => ({ ...prev, english: e.target.value }))}
                      placeholder="cat"
                      required
                      className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="russian" className="text-slate-300">Русский перевод *</Label>
                    <Input
                      id="russian"
                      value={formData.russian}
                      onChange={(e) => setFormData(prev => ({ ...prev, russian: e.target.value }))}
                      placeholder="кот"
                      required
                      className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="definition" className="text-slate-300">Определение на английском</Label>
                  <Textarea
                    id="definition"
                    value={formData.definition}
                    onChange={(e) => setFormData(prev => ({ ...prev, definition: e.target.value }))}
                    placeholder="A small domesticated carnivorous mammal..."
                    rows={2}
                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label htmlFor="example" className="text-slate-300">Пример предложения</Label>
                  <Textarea
                    id="example"
                    value={formData.example}
                    onChange={(e) => setFormData(prev => ({ ...prev, example: e.target.value }))}
                    placeholder="The cat is sleeping on the couch."
                    rows={2}
                    className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400"
                  />
                </div>

                {/* Загрузка изображения */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Изображение
                  </Label>
                  
                  {!imagePreview ? (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <Upload className="h-10 w-10 text-slate-400" />
                        <span className="text-slate-400">
                          Нажмите для выбора изображения
                        </span>
                        <span className="text-xs text-slate-500">
                          PNG, JPG, GIF до 5MB
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <Image
                        src={imagePreview}
                        alt="Предварительный просмотр"
                        width={400}
                        height={192}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isSubmitting ? "Сохранение..." : editingWord ? "Обновить" : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400">Всего слов</h3>
          <p className="text-2xl font-bold text-white">{words.length}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400">С определениями</h3>
          <p className="text-2xl font-bold text-white">
            {words.filter(w => w.definition).length}
          </p>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400">С примерами</h3>
          <p className="text-2xl font-bold text-white">
            {words.filter(w => w.example).length}
          </p>
        </div>
      </div>

      {/* Таблица слов */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Английский</TableHead>
              <TableHead className="text-slate-300">Русский</TableHead>
              <TableHead className="text-slate-300">Определение</TableHead>
              <TableHead className="text-slate-300">Пример</TableHead>
              <TableHead className="text-slate-300">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWords.length === 0 ? (
              <TableRow className="border-slate-700">
                <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                  {searchTerm ? "Слова не найдены" : "Словарь пуст. Добавьте первое слово!"}
                </TableCell>
              </TableRow>
            ) : (
              filteredWords.map((word) => (
                <TableRow key={word.id} className="border-slate-700 hover:bg-slate-750">
                  <TableCell className="font-medium text-white">{word.english}</TableCell>
                  <TableCell className="text-slate-300">{word.russian}</TableCell>
                  <TableCell className="max-w-xs text-slate-300">
                    <div className="truncate" title={word.definition || undefined}>
                      {word.definition || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs text-slate-300">
                    <div className="truncate" title={word.example || undefined}>
                      {word.example || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(word)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Удалить слово</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              Вы уверены, что хотите удалить слово &quot;<strong>{word.english}</strong>&quot; из вашего словаря?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
                              Отмена
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(word.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

