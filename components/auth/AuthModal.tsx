"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const router = useRouter();

  const resetForm = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log('=== Login attempt ===');
    console.log('Email:', loginEmail);

    try {
      const result = await signIn("credentials", {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        console.error('SignIn error:', result.error);
        if (result.error === 'CredentialsSignin') {
          setError("Неверный email или пароль");
        } else {
          setError("Ошибка при входе: " + result.error);
        }
      } else if (result?.ok) {
        console.log('Login successful, closing modal');
        setSuccess("Вход выполнен успешно!");
        handleClose();
        // Принудительное обновление страницы для получения новой сессии
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Произошла ошибка при входе");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Проверка паролей
    if (registerPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      setIsLoading(false);
      return;
    }

    if (registerPassword.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name: registerName, 
          email: registerEmail, 
          password: registerPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Аккаунт создан! Выполняем вход...");
        
        // Автоматически входим в систему после регистрации
        const loginResult = await signIn("credentials", {
          email: registerEmail,
          password: registerPassword,
          redirect: false,
        });

        if (loginResult?.ok) {
          handleClose();
          // Принудительное обновление страницы для получения новой сессии
          window.location.reload();
        } else {
          setError("Ошибка входа после регистрации");
          setActiveTab("login");
          setLoginEmail(registerEmail);
        }
      } else {
        setError(data.error || "Произошла ошибка при регистрации");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Произошла ошибка при регистрации");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100 mx-auto my-auto z-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">
            Добро пожаловать
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="login" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Вход
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              Регистрация
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-800 mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/20 border-green-800 mt-4">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-300 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Пароль
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Вхожу..." : "Войти"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name" className="text-slate-300 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Имя
                </Label>
                <Input
                  id="register-name"
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Ваше имя"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-slate-300 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="register-email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Пароль
                </Label>
                <Input
                  id="register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Подтвердите пароль
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-linear-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Регистрируем..." : "Зарегистрироваться"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}