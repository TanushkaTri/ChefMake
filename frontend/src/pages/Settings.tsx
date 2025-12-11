
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

const Settings = () => {
  const [fontSize, setFontSize] = useState('medium');
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const fontLabelMap: Record<string, string> = {
    small: 'мелкий',
    medium: 'средний',
    large: 'крупный'
  };

  useEffect(() => {
    // Load settings from localStorage
    const savedFontSize = localStorage.getItem('chefmake_font_size');
    
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
    setMounted(true);
  }, []);

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('chefmake_font_size', size);
    
    // Apply font size to document root
    const root = document.documentElement;
    switch (size) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      default:
        root.style.fontSize = '16px';
    }
    
    toast({
      title: "Размер шрифта обновлён",
      description: `Текст установлен как "${fontLabelMap[size] || size}".`,
    });
  };

  const resetSettings = () => {
    setFontSize('medium');
    localStorage.removeItem('chefmake_font_size');
    document.documentElement.style.fontSize = '16px';
    
    toast({
      title: "Настройки сброшены",
      description: "Все параметры возвращены к значениям по умолчанию.",
    });
  };

  const themeOptions = [
    { value: 'light', label: 'Светлая' },
    { value: 'dark', label: 'Тёмная' },
    { value: 'system', label: 'Системная' },
  ];

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Настройки</h1>
      <p className="text-muted-foreground mb-8">
        Управляйте предпочтениями приложения и аккаунтом.
      </p>

      <div className="max-w-2xl space-y-6">
        {/* Display Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <Type className="h-5 w-5" />
              <span>Отображение</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Размер шрифта</p>
                <p className="text-sm text-muted-foreground">
                  Настройте удобный масштаб текста
                </p>
              </div>
              <Select value={fontSize} onValueChange={handleFontSizeChange}>
                <SelectTrigger className="w-32 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="small">Мелкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="large">Крупный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">Тема интерфейса</p>
                <p className="text-sm text-muted-foreground">
                  Переключайтесь между светлой, тёмной или системной темой
                </p>
              </div>
              <Select
                value={mounted ? (theme ?? 'system') : 'system'}
                onValueChange={(value) => setTheme(value)}
                disabled={!mounted}
              >
                <SelectTrigger className="w-40 bg-background border-border text-foreground">
                  <SelectValue placeholder="Тема" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {themeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Управление аккаунтом</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-foreground font-medium mb-2">Сбросить настройки</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Верните параметры к значениям по умолчанию
                </p>
                <Button
                  onClick={resetSettings}
                  variant="outline"
                  className="border-border text-foreground hover:bg-accent"
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">О приложении</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Версия</span>
                <span className="text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Тема</span>
                <span className="text-foreground">
                  {resolvedTheme === 'system'
                    ? 'Системная'
                    : resolvedTheme === 'light'
                    ? 'Светлая'
                    : 'Тёмная'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
