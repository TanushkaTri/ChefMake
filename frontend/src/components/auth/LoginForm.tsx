import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Mail, Lock, Sparkles, Github, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * LoginForm Component
 * Renders the login UI and handles authentication using email and password.
 * Integrates with AuthContext and displays toast feedback.
 */
const LoginForm = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const { login, isLoading } = useAuth();
  const { loginWithProvider } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  /**
   * Handle login form submission.
   * Calls the login function from context and navigates or shows error accordingly.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);

    if (result.success) {
      toast({
        title: 'Вход выполнен',
        description: 'Перенаправляем на панель управления.',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Не удалось войти',
        description: result.message || 'Проверьте данные и попробуйте снова.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background image with gradient and blur overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyNBlm0E4vN5IhRoaucKAsxpPFeniNGk2WeEeVlGKCu4wUbuxecsZxybKTWEJAPgpfuCc&usqp=CAU')`,
        }}
      >
        {/* Changed opacity from /60 to /30 and backdrop-blur-sm to backdrop-blur-xs for less blur */}
        <div className="absolute inset-0 backdrop-blur-xs bg-black/30"></div>
      </div>

      {/* Floating decorative shapes and SVG grid background */}
    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--background))]/90 via-[hsl(var(--background))]/85 to-[hsl(var(--card))]/90 dark:from-[#1f1f2e]/90 dark:via-[#121825]/85 dark:to-[#0f1419]/90">
        <div className="absolute top-20 left-20 w-32 h-32 bg-orange-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-yellow-400/10 rounded-full blur-lg animate-pulse delay-700"></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-orange-600/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-red-500/10 rounded-full blur-lg animate-pulse delay-500"></div>

        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,...')] opacity-20"></div>
      </div>

      {/* Main login card */}
      <div className="relative z-10 animate-fade-in">
        <Card className="w-full max-w-lg backdrop-blur-xl rounded-2xl shadow-2xl border border-border bg-card/90 dark:bg-[#2c2f3d]/90 dark:border-gray-700/50">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <div className="flex justify-center mb-6 text-foreground">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-full">
                  <ChefHat className="h-12 w-12 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-400 animate-pulse" />
              </div>
            </div>
            {/* Title & Subtext */}
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
              ChefMake
            </CardTitle>
            <p className="text-gray-400 text-lg font-medium">Ваш AI-помощник на кухне</p>
            <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
              Ваше кулинарное путешествие начинается здесь <span className="text-orange-400">🍲</span>
            </p>
          </CardHeader>

          <CardContent className="pt-6 px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Email input */}
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

                {/* Password input */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-orange-400 transition-colors" />
                  <Input
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all dark:bg-[#1e1e2f]/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-orange-400 hover:text-orange-300 transition-colors font-medium"
                >
                  Забыли пароль?
                </Link>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-orange-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                    <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Выполняем вход...</span>
                  </div>
                ) : (
                  'Войти'
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

            {/* Registration link */}
            <div className="mt-8 text-center space-y-4">
              <p className="text-gray-400">
                Нет аккаунта?{' '}
                <Link
                  to="/register"
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                >
                  Зарегистрируйтесь
                </Link>
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <span>Сохраняйте рецепты, получайте XP и открывайте значки!</span>
                <span className="text-yellow-400">🏆</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;