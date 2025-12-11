import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Mail, Lock, User, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Github, LogIn } from 'lucide-react';

/**
 * RegisterForm Component
 * Facilitates new user registration, including name, email, and password.
 * Integrates with AuthContext for registration logic and provides user feedback.
 */
const RegisterForm = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const { register, isLoading } = useAuth();
  const { loginWithProvider } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // Hook for programmatic navigation


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    if (!emailPattern.test(email)) {
      toast({
        title: "Некорректный e-mail",
        description: "Введите адрес в формате имя@домен.зона",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Пароли не совпадают",
        description: 'Убедитесь, что оба поля совпадают.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Длина пароля не должна быть менее 8 символов",
        variant: "destructive",
      });
      return;
    }

    if (!/[A-ZА-ЯЁ]/.test(password)) {
      toast({
        title: "Пароль должен содержать хотя бы одну заглавную букву",
        variant: "destructive",
      });
      return;
    }

    if (!/[a-zа-яё]/.test(password)) {
      toast({
        title: "Пароль должен содержать хотя бы одну строчную букву",
        variant: "destructive",
      });
      return;
    }

    const result = await register(name, email, password); // AuthContext now returns { success, message }

    if (result.success) {
      toast({
        title: 'Регистрация прошла успешно',
        description: 'Аккаунт создан. Перенаправляем на панель.',
      });
      navigate('/dashboard'); // Navigate to dashboard on successful registration
    } else {
      toast({
        title: 'Не удалось зарегистрироваться',
        description: result.message || 'Произошла ошибка. Попробуйте ещё раз.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background with blur and gradient overlay for visual depth */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
        }}
      >
        {/* Changed opacity from /60 to /30 and backdrop-blur-sm to backdrop-blur-xs for less blur */}
        <div className="absolute inset-0 backdrop-blur-xs bg-black/30"></div>
      </div>

      {/* Stylized overlay with floating shapes and grid pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--background))]/90 via-[hsl(var(--background))]/85 to-[hsl(var(--card))]/90 dark:from-[#1f1f2e]/90 dark:via-[#121825]/85 dark:to-[#0f1419]/90">
        <div className="absolute top-20 right-20 w-32 h-32 bg-green-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-60 left-32 w-24 h-24 bg-blue-400/10 rounded-full blur-lg animate-pulse delay-700"></div>
        <div className="absolute bottom-32 right-32 w-40 h-40 bg-purple-600/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-28 h-28 bg-pink-500/10 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDM)”] opacity-20"></div>
      </div>

      {/* Main registration card container */}
      <div className="relative z-10 animate-fade-in">
        <Card className="w-full max-w-lg backdrop-blur-xl border border-border rounded-2xl shadow-2xl bg-card/90 dark:bg-[#2c2f3d]/90 dark:border-gray-700/50">
          <CardHeader className="text-center pb-2">
            {/* ChefMake logo and title */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full">
                  <ChefHat className="h-12 w-12 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
              Присоединяйтесь к ChefMake
            </CardTitle>
            <p className="text-gray-400 text-lg font-medium">Ваш AI-помощник на кухне</p>
            <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
              Начните своё кулинарное приключение уже сегодня! <span className="text-orange-400"></span>
            </p>
          </CardHeader>
          <CardContent className="pt-6 px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Full name input field */}
                <div className="relative group">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-orange-400 transition-colors" />
                  <Input
                    type="text"
                    placeholder="Введите имя полностью"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all dark:bg-[#1e1e2f]/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                </div>

                {/* Email input field */}
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-orange-400 transition-colors" />
                  <Input
                    type="email"
                    placeholder="Введите e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all dark:bg-[#1e1e2f]/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                </div>

                {/* Password input field */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-orange-400 transition-colors" />
                  <Input
                    type="password"
                    placeholder="Придумайте пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all dark:bg-[#1e1e2f]/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                </div>

                {/* Confirm password input field */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-orange-400 transition-colors" />
                  <Input
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all dark:bg-[#1e1e2f]/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Submit button with loading state */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-orange-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                    <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Создаём аккаунт...</span>
                  </div>
                ) : (
                  'Создать аккаунт'
                )}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => loginWithProvider("google")}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Войти с Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => loginWithProvider("github")}
                >
                  <Github className="h-4 w-4 mr-2" />
                  Войти с GitHub
                </Button>
              </div>
            </form>

            {/* Login link and value proposition */}
            <div className="mt-8 text-center space-y-4">
              <p className="text-gray-400">
                Уже есть аккаунт?{' '}
                <Link
                  to="/login"
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                >
                  Войти
                </Link>
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <span>Присоединяйтесь к тысячам домашних поваров!</span>
                <span className="text-orange-400">👨‍🍳👩‍🍳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterForm;