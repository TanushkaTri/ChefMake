import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";

const parseHashParams = (hash: string) => {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return {
    access_token: params.get("access_token") || undefined,
    refresh_token: params.get("refresh_token") || undefined,
    type: params.get("type") || undefined,
    error: params.get("error") || undefined,
    error_code: params.get("error_code") || undefined,
    error_description: params.get("error_description") || undefined,
  };
};

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithSupabaseToken, user } = useAuth();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [stage, setStage] = useState<"init" | "ready" | "success" | "error">("init");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hashParams = useMemo(() => parseHashParams(location.hash), [location.hash]);

  useEffect(() => {
    const bootstrap = async () => {
      // Проверяем наличие ошибки в URL
      if (hashParams.error) {
        const errorDesc = hashParams.error_description 
          ? decodeURIComponent(hashParams.error_description.replace(/\+/g, " "))
          : "Ссылка недействительна или просрочена";
        setErrorMessage(errorDesc);
        setStage("error");
        setLoading(false);
        return;
      }

      if (hashParams.type !== "recovery" || !hashParams.access_token || !hashParams.refresh_token) {
        // Если пользователь уже авторизован, разрешаем ручной сброс
        if (user?.token) {
          setStage("ready");
        } else {
          setErrorMessage("Ссылка для сброса пароля не найдена. Запросите новую ссылку.");
          setStage("error");
        }
        return;
      }
      try {
        setLoading(true);
        await supabase.auth.setSession({
          access_token: hashParams.access_token,
          refresh_token: hashParams.refresh_token,
        });
        setAccessToken(hashParams.access_token);
        setRefreshToken(hashParams.refresh_token);
        const ok = await loginWithSupabaseToken(hashParams.access_token);
        if (!ok) {
          setErrorMessage("Не удалось подтвердить ссылку. Запросите новую ссылку для сброса пароля.");
          setStage("error");
        } else {
          setStage("ready");
        }
      } catch (err) {
        console.error("Reset bootstrap failed", err);
        setErrorMessage("Не удалось подтвердить ссылку. Запросите новую ссылку для сброса пароля.");
        setStage("error");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [hashParams, loginWithSupabaseToken, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        title: "Пароли не совпадают",
        description: "Убедитесь, что оба поля совпадают.",
        variant: "destructive",
      });
      return;
    }
    if (!user?.token) {
      toast({
        title: "Нет активной сессии",
        description: "Перейдите по ссылке из письма ещё раз.",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiUrl) {
        throw new Error("API_BASE_URL is not configured");
      }
      const response = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ newPassword: password }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Change password failed: Server returned non-JSON response", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: text.substring(0, 200),
        });
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Не удалось сменить пароль");
      }
      setStage("success");
      toast({
        title: "Пароль обновлён",
        description: "Теперь можно войти с новым паролем.",
      });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      toast({
        title: "Ошибка",
        description: err?.message || "Не удалось сменить пароль",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 dark:bg-[#121826]">
      <Card className="w-full max-w-lg border border-border bg-card dark:bg-[#2c2c3d] dark:border-gray-700">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            {stage === "success" ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : stage === "error" ? (
              <AlertCircle className="h-12 w-12 text-destructive" />
            ) : (
              <Lock className="h-12 w-12 text-orange-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {stage === "success" 
              ? "Пароль обновлён" 
              : stage === "error"
              ? "Ошибка восстановления"
              : "Сброс пароля"}
          </CardTitle>
          <CardDescription>
            {stage === "success"
              ? "Теперь можно войти с новым паролем."
              : stage === "error"
              ? "Не удалось восстановить доступ. Запросите новую ссылку."
              : "Введите новый пароль для вашего аккаунта."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Новый пароль</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Повторите пароль</label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сменить пароль"}
              </Button>
            </form>
          )}

          {stage === "init" && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Подтверждаем ссылку...
            </div>
          )}

          {stage === "success" && (
            <div className="flex items-center justify-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" /> Перенаправляем к входу...
            </div>
          )}

          {stage === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-destructive">Ссылка недействительна</p>
                  <p className="text-xs text-muted-foreground">
                    {errorMessage || "Ссылка для сброса пароля просрочена или уже была использована."}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full"
                variant="default"
              >
                Запросить новую ссылку
              </Button>
              <Button
                onClick={() => navigate("/login")}
                className="w-full"
                variant="outline"
              >
                Вернуться к входу
              </Button>
            </div>
          )}

          {stage !== "success" && stage !== "error" && !accessToken && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Если ссылка устарела, запросите сброс пароля ещё раз.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

