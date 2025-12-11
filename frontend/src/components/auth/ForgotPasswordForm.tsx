
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { forgotPassword, isLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await forgotPassword(email);
    
    if (success) {
      setIsSubmitted(true);
      toast({
        title: "Ссылка отправлена!",
        description: "Проверьте почту и следуйте инструкциям.",
      });
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить письмо. Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 dark:bg-[#121826]">
        <Card className="w-full max-w-md bg-card border border-border dark:bg-[#2c2c3d] dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-foreground">Проверьте почту</CardTitle>
            <p className="text-muted-foreground">
              Мы отправили инструкции на адрес {email}
            </p>
          </CardHeader>
          <CardContent>
            <Link to="/login">
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться ко входу
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 dark:bg-[#121826]">
      <Card className="w-full max-w-md bg-card border border-border dark:bg-[#2c2c3d] dark:border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ChefHat className="h-12 w-12 text-orange-500" />
          </div>
          <CardTitle className="text-2xl text-foreground">Сброс пароля</CardTitle>
          <p className="text-muted-foreground">Введите e-mail, чтобы получить инструкции</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={isLoading}
            >
              {isLoading ? 'Отправляем...' : 'Отправить ссылку'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-orange-500 hover:text-orange-400 flex items-center justify-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться ко входу
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordForm;
