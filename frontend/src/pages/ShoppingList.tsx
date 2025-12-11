import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button"; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { shoppingListService } from '@/services/shoppingListService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const ShoppingList = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [shoppingListContent, setShoppingListContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Function to process the raw shopping list string and apply bold formatting
    const formatContent = (content: string) => {
        if (!content) return '';
        
        // Split content into lines for better formatting
        const lines = content.split('\n');
        let formattedHtml = '';
        
        lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                formattedHtml += '<br/>';
                return;
            }
            
            // Check if line is a header (starts with ** or is in uppercase)
            if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                const headerText = trimmedLine.replace(/\*\*/g, '');
                formattedHtml += `<div class="font-bold text-lg text-green-400 mb-2 mt-4">${headerText}</div>`;
            } else if (trimmedLine.match(/^[A-Z\s]+$/)) {
                // Uppercase line - likely a header
                formattedHtml += `<div class="font-bold text-lg text-green-400 mb-2 mt-4">${trimmedLine}</div>`;
            } else {
                // Regular line with potential bold formatting
                const formattedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-300">$1</strong>');
                formattedHtml += `<div class="mb-1">${formattedLine}</div>`;
            }
        });
        
        return formattedHtml;
    };

    const loadShoppingList = async () => {
        if (!user?.token) {
            setShoppingListContent(null);
            setLoading(false);
            setError("Войдите, чтобы увидеть список покупок.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await shoppingListService.getLatestList(user.token);
            console.log('Shopping list response:', response); // Debug log
            
            if (response && response.shoppingList) {
                let content: string | null = null;
                const shoppingList = response.shoppingList;
                
                // Direct check: if shoppingList is an object with content property
                if (typeof shoppingList === 'object' && shoppingList !== null && !Array.isArray(shoppingList)) {
                    if ('content' in shoppingList && typeof (shoppingList as any).content === 'string') {
                        content = (shoppingList as { content: string; dishes?: string[] }).content;
                    }
                }
                // If shoppingList is a string, use it directly
                else if (typeof shoppingList === 'string') {
                    content = shoppingList;
                }
                // If shoppingList is an array, get first item's content
                else if (Array.isArray(shoppingList) && shoppingList.length > 0) {
                    const firstItem = shoppingList[0];
                    if (typeof firstItem === 'object' && firstItem !== null && 'content' in firstItem) {
                        content = (firstItem as { content: string }).content;
                    }
                }
                
                console.log('Extracted content:', content ? content.substring(0, 100) + '...' : 'null'); // Debug log
                
                if (content && typeof content === 'string' && content.trim().length > 0) {
                    // Final check: if content looks like JSON string, try to parse it
                    const trimmed = content.trim();
                    if (trimmed.startsWith('{') && trimmed.includes('"content"')) {
                        console.warn('Content appears to be JSON string, parsing...');
                        try {
                            const parsed = JSON.parse(trimmed);
                            if (parsed && parsed.content && typeof parsed.content === 'string') {
                                console.log('Successfully extracted content from JSON string');
                                setShoppingListContent(parsed.content);
                            } else {
                                setShoppingListContent(content);
                            }
                        } catch (e) {
                            console.error('Failed to parse JSON string:', e);
                            setShoppingListContent(content);
                        }
                    } else {
                        setShoppingListContent(content);
                    }
                } else {
                    console.warn('Could not extract valid content from response');
                    setShoppingListContent(null);
                }
            } else {
                setShoppingListContent(null);
            }
        } catch (err: any) {
            console.error('Error loading shopping list:', err);
            setError(err.message || "Failed to load shopping list.");
            toast({
                title: "Ошибка",
                description: err.message || "Не удалось загрузить список покупок.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShoppingList();
    }, [user?.token]);

    // Debug: Log when shoppingListContent changes
    useEffect(() => {
        if (shoppingListContent) {
            console.log('Shopping list content updated, length:', shoppingListContent.length);
            console.log('First 100 chars:', shoppingListContent.substring(0, 100));
        }
    }, [shoppingListContent]);
    
    const handleCopyToClipboard = useCallback(async () => {
        if (!shoppingListContent) {
            toast({
                title: "Нечего копировать",
                description: "Список покупок пуст.",
            });
            return;
        }
        try {
            await navigator.clipboard.writeText(shoppingListContent);
            toast({
                title: "Скопировано!",
                description: "Список покупок скопирован в буфер.",
                variant: "success",
            });
        } catch (err) {
            console.error("Failed to copy:", err);
            toast({
                title: "Не удалось скопировать",
                description: "Не удалось записать в буфер. Попробуйте снова.",
                variant: "destructive",
            });
        }
    }, [shoppingListContent, toast]);

    const handleDownloadAsFile = useCallback(async () => {
        if (!shoppingListContent) {
            toast({
                title: "Нечего скачивать",
                description: "Список покупок пуст.",
            });
            return;
        }

        try {
            // Parse the shopping list content
            const lines = shoppingListContent.split('\n').filter(line => line.trim());
            const docChildren: Paragraph[] = [];
            
            // Add title
            docChildren.push(
                new Paragraph({
                    text: "Список покупок",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                })
            );
            
            // Add date
            const currentDate = new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            docChildren.push(
                new Paragraph({
                    text: currentDate,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 600 },
                })
            );
            
            // Process lines
            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) {
                    docChildren.push(new Paragraph({ text: "" }));
                    return;
                }
                
                // Check if line is a header (starts with ** or is in uppercase)
                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                    const headerText = trimmedLine.replace(/\*\*/g, '');
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: headerText,
                                    bold: true,
                                    size: 28, // 14pt
                                    color: "2d8659", // Green color
                                }),
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 200 },
                        })
                    );
                } else if (trimmedLine.match(/^[A-Z\s]+$/) && trimmedLine.length > 3) {
                    // Uppercase line - likely a header
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: trimmedLine,
                                    bold: true,
                                    size: 28,
                                    color: "2d8659",
                                }),
                            ],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 200 },
                        })
                    );
                } else {
                    // Regular line - handle bold text
                    const parts: TextRun[] = [];
                    let boldRegex = /\*\*(.*?)\*\*/g;
                    let match;
                    let lastIndex = 0;
                    
                    while ((match = boldRegex.exec(trimmedLine)) !== null) {
                        // Add text before bold
                        if (match.index > lastIndex) {
                            parts.push(
                                new TextRun({
                                    text: trimmedLine.substring(lastIndex, match.index),
                                })
                            );
                        }
                        // Add bold text
                        parts.push(
                            new TextRun({
                                text: match[1],
                                bold: true,
                                color: "4ade80", // Light green
                            })
                        );
                        lastIndex = match.index + match[0].length;
                    }
                    
                    // Add remaining text
                    if (lastIndex < trimmedLine.length) {
                        parts.push(
                            new TextRun({
                                text: trimmedLine.substring(lastIndex),
                            })
                        );
                    }
                    
                    // If no bold formatting found, add as regular text
                    if (parts.length === 0) {
                        parts.push(new TextRun({ text: trimmedLine }));
                    }
                    
                    docChildren.push(
                        new Paragraph({
                            children: parts,
                            spacing: { after: 100 },
                        })
                    );
                }
            });
            
            // Create document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: docChildren,
                }],
            });
            
            // Generate and save file
            const blob = await Packer.toBlob(doc);
            const timestamp = new Date().toISOString().split('T')[0];
            saveAs(blob, `shopping-list-${timestamp}.docx`);
            
            toast({
                title: "Скачано!",
                description: "Список сохранён в формате Word.",
                variant: "success",
            });
        } catch (err) {
            console.error("Failed to download:", err);
            toast({
                title: "Не удалось скачать",
                description: "Файл не скачался. Попробуйте снова.",
                variant: "destructive",
            });
        }
    }, [shoppingListContent, toast]);

    if (loading) {
        return (
            <div className="text-center py-12 text-white">
                <p>Загружаем список покупок...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Список покупок</h1>
                    <p className="text-gray-400">Здесь появится сформированный список покупок.</p>
                </div>
                <Card className="bg-[#2c2c3d] border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-white">
                            <ShoppingCart className="h-5 w-5 text-green-500" />
                            <span>Список покупок</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12 text-red-400">
                            <p>Ошибка: {error}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const formattedContent = shoppingListContent ? formatContent(shoppingListContent) : null;

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Список покупок</h1>
                <p className="text-gray-400">Здесь появится сформированный список покупок.</p>
            </div>

            <Card className="bg-[#2c2c3d] border-gray-700">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center space-x-2 text-white">
                            <ShoppingCart className="h-5 w-5 text-green-500" />
                            <span>Список покупок</span>
                        </CardTitle>
                        {shoppingListContent && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleDownloadAsFile}
                                    size="sm"
                                    variant="default"
                                    className="h-8"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Скачать
                                </Button>
                                <Button
                                    onClick={handleCopyToClipboard}
                                    size="sm"
                                    variant="secondary"
                                    className="h-8"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Копировать
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {shoppingListContent ? (
                        <div className="p-4 rounded-md bg-gray-800 max-h-[60vh] overflow-y-auto">
                            {formattedContent && formattedContent.trim() ? (
                                <div 
                                    className="text-gray-200 space-y-1"
                                    dangerouslySetInnerHTML={{ __html: formattedContent }} 
                                />
                            ) : (
                                <pre className="text-gray-200 whitespace-pre-wrap font-mono text-sm">
                                    {shoppingListContent}
                                </pre>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ShoppingCart className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400 mb-2">
                                Список покупок не найден.
                            </p>
                            <p className="text-gray-500 text-sm">
                                Сформируйте список в планировщике питания, чтобы увидеть позиции.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ShoppingList;