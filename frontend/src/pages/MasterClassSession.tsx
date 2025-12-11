import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  StreamTheme,
  PaginatedGridLayout,
  type Call,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { Calendar, Clock3, Users, ArrowLeft } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { masterClassService, type MasterClass } from "@/services/masterClassService";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const MasterClassSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [masterClass, setMasterClass] = useState<MasterClass | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [participantFeed, setParticipantFeed] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    let cleanupCall: Call | null = null;
    let cleanupClient: StreamVideoClient | null = null;

    const connect = async () => {
      if (!id || !user?.token) return;

      setIsConnecting(true);
      try {
        const payload = await masterClassService.join(Number(id), user.token);

        if (payload.videoMode === "link" && payload.conferenceUrl) {
          window.open(payload.conferenceUrl, "_blank", "noopener");
          toast({
            title: "Переход по ссылке",
            description: "Конференция открыта в новом окне.",
          });
          navigate("/master-classes");
          return;
        }

        if (
          !payload.apiKey ||
          !payload.token ||
          !payload.callId ||
          !payload.streamUser ||
          !payload.masterClass
        ) {
          throw new Error("Не удалось получить данные для видеозвонка");
        }

        cleanupClient = StreamVideoClient.getOrCreateInstance({
          apiKey: payload.apiKey,
          user: payload.streamUser,
          token: payload.token,
        });

        const currentCall = cleanupClient.call(
          payload.callTemplate || "default",
          payload.callId,
          { reuseInstance: true }
        );

        const isHostUser = String(payload.masterClass.created_by) === String(user?.id);
        if (isHostUser) {
          await currentCall.join({ create: true });
        } else {
          await currentCall.join({ create: false });
          await currentCall.microphone?.disable(true).catch(() => undefined);
          await currentCall.camera?.disable(true).catch(() => undefined);
        }

        cleanupCall = currentCall;

        if (!mounted) {
          await currentCall.leave();
          await cleanupClient.disconnectUser();
          return;
        }

        setClient(cleanupClient);
        setCall(currentCall);
        setMasterClass(payload.masterClass);
        setIsHost(isHostUser);
        setParticipantCount(currentCall.state.participants?.length ?? 0);
        setParticipantFeed([]);
      } catch (error: any) {
        console.error("Failed to join master class:", error);
        toast({
          title: "Ошибка подключения",
          description: error?.message || "Попробуйте снова чуть позже.",
          variant: "destructive",
        });
        navigate("/master-classes");
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      if (cleanupCall) {
        cleanupCall.leave();
      }
      if (cleanupClient) {
        cleanupClient.disconnectUser();
      }
    };
  }, [id, navigate, toast, user?.token]);

  const handleExit = async () => {
    if (call) {
      await call.leave();
      setCall(null);
    }
    if (client) {
      await client.disconnectUser();
      setClient(null);
    }
    navigate("/master-classes");
  };

  const canFetchMessages = Boolean(id && user?.token);
  const { data: messages = [] } = useQuery({
    queryKey: ["master-class-messages", id],
    queryFn: async () => {
      if (!id || !user?.token) return [];
      return masterClassService.getMessages(Number(id), user.token);
    },
    enabled: canFetchMessages,
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: (text: string) => {
      if (!id || !user?.token) throw new Error("Нет доступа");
      return masterClassService.sendMessage(Number(id), text, user.token);
    },
    onSuccess: () => {
      setChatInput("");
      queryClient.invalidateQueries({ queryKey: ["master-class-messages", id] });
    },
    onError: (error: any) => {
      toast({
        title: "Не удалось отправить",
        description: error?.message || "Попробуйте позже.",
        variant: "destructive",
      });
    },
  });

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage.mutate(chatInput.trim());
  };

  useEffect(() => {
    if (!call) return;

    const updateCount = () => {
      setParticipantCount(call.state.participants?.length ?? 0);
    };

    const addFeedEntry = (text: string) =>
      setParticipantFeed((prev) => [...prev.slice(-19), text]);

    const joined = (payload: any) => {
      const name = payload?.participant?.name || payload?.participant?.userId || "Участник";
      addFeedEntry(`Пользователь ${name} присоединился`);
      updateCount();
    };

    const left = (payload: any) => {
      const name = payload?.participant?.name || payload?.participant?.userId || "Участник";
      addFeedEntry(`Пользователь ${name} отключился`);
      updateCount();
    };

    const unsubJoin = call.on("participantJoined", joined);
    const unsubLeft = call.on("participantLeft", left);
    updateCount();

    return () => {
      unsubJoin?.();
      unsubLeft?.();
    };
  }, [call]);

  if (isConnecting || !masterClass || !client || !call) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">Подключаемся к мастер-классу...</p>
      </div>
    );
  }

  const startsAt = new Date(masterClass.start_time);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/master-classes")}>
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{masterClass.title}</h1>
          <p className="text-muted-foreground">
            {isHost
              ? "Управляйте эфиром, делитесь видео и отвечайте на вопросы из чата."
              : "Смотрите эфир и задавайте вопросы в чате — ведущий ответит в прямом эфире."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация</CardTitle>
          <CardDescription>Основные детали мастер-класса</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {startsAt.toLocaleDateString()} · {startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {masterClass.duration_minutes} минут
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ведущий: {masterClass.host_name || masterClass.host_email}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-orange-500 shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Живой эфир</CardTitle>
                <CardDescription>
                  {isHost
                    ? "Управляйте трансляцией и отвечайте на вопросы участников."
                    : "Вы подключены как зритель и видите трансляцию ведущего."}
                </CardDescription>
              </div>
              <Button variant={isHost ? "destructive" : "outline"} onClick={handleExit}>
                {isHost ? "Завершить" : "Выйти"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StreamVideo client={client}>
              <StreamCall call={call}>
                <StreamTheme>
                  <div className="rounded-lg border bg-black">
                    <PaginatedGridLayout
                      filterParticipants={(p) =>
                        String(p.userId) === String(masterClass.created_by)
                      }
                    />
                  </div>
                  {isHost && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <ToggleAudioPublishingButton />
                      <ToggleVideoPublishingButton />
                    </div>
                  )}
                </StreamTheme>
              </StreamCall>
            </StreamVideo>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Чат вопросов</CardTitle>
            <CardDescription>
              {isHost
                ? "Читайте вопросы и отвечайте голосом."
                : "Задайте вопрос в чате — ведущий увидит его в эфире."}
            </CardDescription>
            <div className="text-sm text-muted-foreground">
              Подключено участников: {participantCount}
            </div>
            {participantFeed.length > 0 && (
              <div className="mt-2 max-h-24 overflow-y-auto rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                {participantFeed.slice(-6).map((entry, idx) => (
                  <div key={`${entry}-${idx}`}>{entry}</div>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 pr-4">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground">Сообщений пока нет.</p>
                )}
                {messages.map((msg) => {
                  const isAuthor = String(msg.user_id) === String(user?.id);
                  return (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {msg.author_name || (isAuthor ? "Вы" : "Участник")}
                        </span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          isAuthor
                            ? "bg-orange-500/20 text-orange-900 dark:text-orange-100"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <form onSubmit={handleSend} className="mt-6 space-y-2">
              <Textarea
                placeholder="Напишите вопрос..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!chatInput.trim() || sendMessage.isPending}>
                  Отправить
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterClassSession;

