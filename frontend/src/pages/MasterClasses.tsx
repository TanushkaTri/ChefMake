import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock3, Loader2, Plus, Users, Video, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { masterClassService, type MasterClass } from "@/services/masterClassService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FilterType = "upcoming" | "past" | "mine" | "all" | "live";

const statusColorMap: Record<string, string> = {
  live: "bg-red-500",
  scheduled: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-gray-500",
};

const determineStatus = (masterClass: MasterClass): "scheduled" | "live" | "completed" => {
  if (masterClass.status === "live") return "live";
  const start = new Date(masterClass.start_time).getTime();
  const end = start + masterClass.duration_minutes * 60 * 1000;
  const now = Date.now();
  if (now < start) return "scheduled";
  if (now >= start && now <= end) return "live";
  return "completed";
};

const defaultForm = {
  title: "",
  description: "",
  startTime: "",
  durationMinutes: 60,
  ingredientsInput: "",
  videoMode: "stream" as "stream" | "link",
  conferenceUrl: "",
};

const MasterClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [formValues, setFormValues] = useState(defaultForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MasterClass | null>(null);

  const token = user?.token;

  const backendFilter = filter === "all" || filter === "live" ? undefined : filter;

  const { data: masterClasses = [], isLoading } = useQuery({
    queryKey: ["master-classes", backendFilter || "all"],
    queryFn: () => {
      if (!token) return Promise.resolve([]);
      return masterClassService.list(token, backendFilter);
    },
    enabled: Boolean(token),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Нет токена");
      const ingredients = formValues.ingredientsInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      return masterClassService.create(
        {
          title: formValues.title,
          description: formValues.description,
          startTime: new Date(formValues.startTime).toISOString(),
          durationMinutes: formValues.durationMinutes,
          ingredients,
          videoMode: formValues.videoMode,
          conferenceUrl: formValues.videoMode === "link" ? formValues.conferenceUrl : undefined,
        },
        token
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["master-classes"] });
      setIsDialogOpen(false);
      setFormValues(defaultForm);
      toast({
        title: "Мастер-класс создан",
        description: "Он появится в списке и будет доступен для участников.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка создания",
        description: error?.message || "Попробуйте снова чуть позже.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (!token) throw new Error("Нет токена");
      return masterClassService.remove(id, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-classes"] });
      toast({
        title: "Мастер-класс удалён",
        description: "Он исчез из списка и больше недоступен.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Не удалось удалить",
        description: error?.message || "Попробуйте позже.",
        variant: "destructive",
      });
    },
    onSettled: () => setPendingDelete(null),
  });

  const confirmDelete = (session: MasterClass) => {
    setPendingDelete(session);
  };

  const handleJoin = async (masterClass: MasterClass) => {
    if (!token) return;
    setIsJoining(true);
    try {
      const payload = await masterClassService.join(masterClass.id, token);
      if (payload.videoMode === "link" && payload.conferenceUrl) {
        window.open(payload.conferenceUrl, "_blank", "noopener");
        toast({
          title: "Переход по ссылке",
          description: "Конференция откроется в новом окне.",
        });
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

      navigate(`/master-classes/${payload.masterClass.id}/live`);
    } catch (error: any) {
      toast({
        title: "Ошибка подключения",
        description: error?.message || "Попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const filteredClasses = useMemo(() => {
    const enriched = masterClasses.map((mc) => ({
      ...mc,
      computedStatus: determineStatus(mc),
    }));

    if (filter === "live") {
      return enriched.filter((mc) => mc.computedStatus === "live");
    }
    return enriched;
  }, [masterClasses, filter]);

  const canSubmit =
    formValues.title.trim().length > 3 &&
    formValues.startTime &&
    (formValues.videoMode === "stream" || formValues.conferenceUrl.trim().length > 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Мастер-классы</h1>
          <p className="text-muted-foreground">
            Создавайте, проводите и присоединяйтесь к живым мастер-классам ChefMake.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Новый мастер-класс
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Создать мастер-класс</DialogTitle>
              <DialogDescription>
                Заполните данные о встрече, добавьте ингредиенты и выберите формат подключения.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={formValues.title}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Например, итальянская паста"
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Дата и время</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formValues.startTime}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="duration">Длительность (мин)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    step={15}
                    value={formValues.durationMinutes}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        durationMinutes: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Формат</Label>
                  <Select
                    value={formValues.videoMode}
                    onValueChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        videoMode: value as "stream" | "link",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите формат" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stream">Stream-видеозвонок</SelectItem>
                      <SelectItem value="link">Внешняя ссылка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formValues.description}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Расскажите участникам, что будет происходить на мастер-классе."
                />
              </div>
              <div>
                <Label htmlFor="ingredients">Ингредиенты (каждый с новой строки)</Label>
                <Textarea
                  id="ingredients"
                  rows={4}
                  value={formValues.ingredientsInput}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, ingredientsInput: e.target.value }))
                  }
                  placeholder={"Помидоры\nБазилик\nМоцарелла"}
                />
              </div>
              {formValues.videoMode === "link" && (
                <div>
                  <Label htmlFor="conferenceUrl">Ссылка на конференцию</Label>
                  <Input
                    id="conferenceUrl"
                    placeholder="https://meet.google.com/..."
                    value={formValues.conferenceUrl}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, conferenceUrl: e.target.value }))
                    }
                  />
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!canSubmit || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
        <TabsList className="w-full max-w-xl">
          <TabsTrigger value="upcoming">Предстоящие</TabsTrigger>
          <TabsTrigger value="live">Прямой эфир</TabsTrigger>
          <TabsTrigger value="mine">Мои</TabsTrigger>
          <TabsTrigger value="past">Прошедшие</TabsTrigger>
          <TabsTrigger value="all">Все</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <Card className="h-48 animate-pulse" />}
        {!isLoading && filteredClasses.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Пока пусто</CardTitle>
              <CardDescription>
                Создайте первый мастер-класс или измените фильтр, чтобы увидеть другие события.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {filteredClasses.map((mc) => {
          const startsAt = format(new Date(mc.start_time), "dd MMMM HH:mm");
          const status = mc.computedStatus;
          const isHost = mc.created_by === user?.id;
          const canJoin = status !== "completed";

          return (
            <Card key={mc.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{mc.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColorMap[status] || "bg-slate-500"} text-white`}>
                      {status}
                    </Badge>
                    {isHost && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(mc)}
                        disabled={deleteMutation.isPending && pendingDelete?.id === mc.id}
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription className="line-clamp-3 break-words">
                  {mc.description || "Без описания"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {startsAt} ·{" "}
                  <span className="flex items-center gap-1">
                    <Clock3 className="h-4 w-4" />
                    {mc.duration_minutes} мин
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Ведущий: {mc.host_name || mc.host_email}
                </div>
                <div className="flex flex-wrap gap-2">
                  {mc.ingredients?.slice(0, 6).map((ing) => (
                    <Badge key={ing} variant="secondary">
                      {ing}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {mc.video_mode === "stream" ? "Stream" : "Внешняя ссылка"}
                  </div>
                  <Button
                    variant={isHost ? "default" : "secondary"}
                    onClick={() => handleJoin(mc)}
                    disabled={!canJoin || isJoining}
                  >
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isHost
                      ? "Открыть"
                      : "Присоединиться"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить мастер-класс?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Вы действительно хотите удалить мастер-класс «${pendingDelete.title}»? Это действие нельзя отменить.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete && !deleteMutation.isPending) {
                  deleteMutation.mutate(pendingDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterClasses;

