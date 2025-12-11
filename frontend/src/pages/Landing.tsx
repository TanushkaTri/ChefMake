
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, Bot, Trophy, Calendar, Star, Users, Sparkles } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: <Bot className="h-12 w-12 text-orange-500" />,
      title: "Умный подбор по запасам",
      description: "Вводите ингредиенты и мгновенно получайте персональные рецепты."
    },
    {
      icon: <Sparkles className="h-12 w-12 text-orange-500" />,
      title: "AI-переписывание рецептов",
      description: "Преобразуйте любой рецепт в веганский, полезный или быстрый вариант."
    },
    {
      icon: <Trophy className="h-12 w-12 text-orange-500" />,
      title: "Геймифицированный прогресс",
      description: "Зарабатывайте XP, открывайте значки и повышайте кулинарные навыки."
    },
    {
      icon: <Calendar className="h-12 w-12 text-orange-500" />,
      title: "Умное планирование питания",
      description: "Планируйте меню на неделю в пару кликов."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Домашний повар",
      content: "ChefMake полностью изменил мои кулинарные привычки! Я открыла десятки рецептов из того, что уже лежало дома.",
      rating: 5
    },
    {
      name: "Mike Rodriguez",
      role: "Занятый родитель",
      content: "AI-переписчик потрясающий — любой рецепт адаптирую под семейные ограничения.",
      rating: 5
    },
    {
      name: "Emma Thompson",
      role: "Любитель готовить",
      content: "Обожаю геймификацию! Значки и уровни делают готовку осознаннее и веселее.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--card))] dark:from-[#1a1f2e] dark:to-[#1f2636]">
      {/* Navigation */}
      <nav className="bg-card/80 border-b border-border px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 dark:bg-[#242c3c] dark:border-gray-700">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-foreground dark:text-white">ChefMake</span>
          </div>
          <div className="flex space-x-4">
            <Link to="/login">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Войти
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-orange-500 hover:bg-orange-600">
                Начать
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-orange-500/20 px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="text-orange-300 text-sm font-medium">AI-помощник на кухне</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Ваш персональный
              <span className="text-orange-500 block">кулинарный спутник</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Преобразите готовку с помощью AI-рекомендаций, умного планирования и игрового прогресса.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/register">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-3">
                Готовьте бесплатно 🍳
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 text-lg px-8 py-3">
                У меня уже есть аккаунт
              </Button>
            </Link>
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative">
            <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 p-8 rounded-2xl border border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-6xl">
                <div className="animate-bounce" style={{ animationDelay: '0s' }}>🍳</div>
                <div className="animate-bounce" style={{ animationDelay: '0.1s' }}>🥘</div>
                <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>🍲</div>
                <div className="animate-bounce" style={{ animationDelay: '0.3s' }}>👨‍🍳</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-[#1e1e2f]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Всё, что нужно для уверенной готовки
            </h2>
            <p className="text-xl text-gray-400">
              Мощные инструменты, которые делают готовку проще и приятнее
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-[#2a2f45] border-gray-700 hover:border-orange-500/50 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-center">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Любим ChefMake по всему миру
            </h2>
            <p className="text-xl text-gray-400">
              Что говорит сообщество о ChefMake
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-[#2a2f45] border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{testimonial.name}</p>
                      <p className="text-gray-400 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-orange-500/10 to-yellow-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Готовы изменить подход к готовке?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Присоединяйтесь к тысячам домашних поваров, которые уже готовят умнее с ChefMake
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-3">
              Начните кулинарное путешествие уже сегодня 🚀
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#242c3c] border-t border-gray-700 px-6 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ChefHat className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-bold text-white">ChefMake</span>
          </div>
          <p className="text-gray-400">
            © 2024 ChefMake. Все права защищены. Создано с ❤️ для домашних поваров.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
