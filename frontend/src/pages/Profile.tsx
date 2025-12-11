import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Edit, Mail, User as UserIcon, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Profile Component
 * Displays user profile information.
 */
const Profile = () => {
    const { user, updateProfile, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');

    useEffect(() => {
        if (user) {
            setEditName(user.name);
            setEditEmail(user.email);
        }
    }, [user, isEditing]);

    const handleSaveProfile = async () => {
        const updates: Partial<typeof user> = { name: editName };
        const result = await updateProfile(updates);

        if (result.success) {
            toast({
                title: 'Профиль обновлён',
                description: result.message || 'Данные успешно сохранены.',
            });
            setIsEditing(false);
        } else {
            toast({
                title: 'Не удалось обновить',
                description: result.message || 'Попробуйте сохранить данные ещё раз.',
                variant: 'destructive',
            });
        }
    };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white">Загружаем профиль...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-2">Профиль</h1>
                <p className="text-gray-400">
                    Управляйте личными данными и настройками аккаунта.
                </p>
            </div>
            
            <Card className="bg-[#2c2c3d] border-gray-700 p-8">
                <CardContent className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10">
                    <Avatar className="h-32 w-32 border-4 border-orange-500 shadow-lg">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-orange-500 text-white text-3xl font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-white">{user.name}</h2>
                        <p className="text-lg text-gray-400">
                            <span className="inline-flex items-center space-x-1">
                                <Mail className="h-5 w-5" />
                                <span>{user.email}</span>
                            </span>
                        </p>
                        <div className="flex justify-center md:justify-start pt-4">
                            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                                <DialogTrigger asChild>
                                    <Button className="bg-orange-500 hover:bg-orange-600">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Редактировать
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#2c2c3d] border-gray-700">
                                    <DialogHeader>
                                        <DialogTitle className="text-white">Редактирование профиля</DialogTitle>
                                        <CardDescription className="text-gray-400">
                                            Обновите свои данные.
                                        </CardDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right text-gray-300">Имя</Label>
                                            <Input
                                                id="name"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="col-span-3 bg-[#1e1e2f] border-gray-600 text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="email" className="text-right text-gray-300">E-mail</Label>
                                            <Input
                                                id="email"
                                                value={editEmail}
                                                className="col-span-3 bg-[#1e1e2f] border-gray-600 text-white"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditing(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                                            Отмена
                                        </Button>
                                        <Button onClick={handleSaveProfile} className="bg-orange-500 hover:bg-orange-600">
                                            Сохранить
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Telegram Bot Link Card */}
            <Card className="bg-[#2c2c3d] border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                        <MessageCircle className="h-5 w-5 text-blue-500" />
                        <span>Telegram Бот</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Используйте нашего Telegram бота для быстрого доступа к избранным рецептам
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <a
                        href="https://t.me/chefmakebot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                    >
                        <MessageCircle className="h-5 w-5" />
                        <span>Открыть @chefmakebot</span>
                    </a>
                </CardContent>
            </Card>
        </div>
    );
};
    
export default Profile;