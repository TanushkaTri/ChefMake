import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ChefHat, User } from "lucide-react";
import { chatService } from "@/services/chatService"; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from "@/components/ChatMessages";

interface LLMMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface DisplayMessage { 
    id: string; 
    role: 'user' | 'assistant';
    content: string; 
    timestamp: Date;
    isUser: boolean; 
}

const ChiefMateChat = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const initialGreetingContent = "Здравствуйте! 👋 Я ChiefMake — ваш персональный кулинарный ассистент. Напишите «Покажи избранные», чтобы увидеть сохранённые рецепты, или отправьте название избранного блюда, и я пришлю его описание. Чем могу помочь?";
        const initialGreeting: DisplayMessage = {
            id: "initial-greeting",
            role: "assistant", 
            content: initialGreetingContent,
            isUser: false,
            timestamp: new Date()
        };
        setMessages([initialGreeting]);
    }, []);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user?.token) {
            toast({ title: "Нужна авторизация", description: "Войдите, чтобы общаться с ChiefMate.", variant: "destructive" });
            return;
        }

        const userMessageContent = newMessage.trim();
        const userDisplayMessage: DisplayMessage = {
            id: Date.now().toString(),
            role: "user", 
            content: userMessageContent,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userDisplayMessage]);
        setNewMessage(""); 
        setIsTyping(true);

        try {
            const response = await chatService.sendMessage(userMessageContent, user.token); 
            
            const aiDisplayMessage: DisplayMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.reply,
                isUser: false,
                timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, aiDisplayMessage]);

        } catch (error: any) {
            console.error("Error sending message to AI:", error);
            toast({
                title: "Ошибка чата",
                description: `Не удалось получить ответ ChiefMate: ${error.message}. Попробуйте ещё раз.`,
                variant: "destructive",
            });
            setMessages(prev => prev.filter(msg => msg.id !== userDisplayMessage.id)); 
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[80vh]"> 
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">👨‍🍳 Общайтесь с ChiefMake</h1>
                <p className="text-black-400">Ваш персональный помощник — задавайте вопросы о готовке, рецептах и планировании питания!</p>
            </div>

            {/* FIX: Card with proper flex structure for scrolling */}
            <Card className="bg-[#2c2c3d] border-gray-700 flex flex-col h-[65vh] max-h-[80vh]">
                <CardHeader className="pb-4 flex-shrink-0">
                    <CardTitle className="flex items-center space-x-2 text-white">
                        <ChefHat className="h-5 w-5 text-orange-500" />
                        <span>Ассистент ChiefMate</span>
                        <div className="ml-auto flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full "></div>
                            <span className="text-sm text-green-400">Онлайн</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <ChatMessages messages={messages} isTyping={isTyping} />
                    </div>

                    <div className="border-t border-gray-700 p-4 flex-shrink-0">
                        <div className="flex space-x-2">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Спросите о готовке, рецептах или планировании..."
                                className="flex-1 bg-gray-700 border-gray-600 text-black placeholder-gray-400"
                                disabled={isTyping || !user}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isTyping || !user}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ChiefMateChat;