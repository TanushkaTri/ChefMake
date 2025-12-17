const { StreamClient } = require("@stream-io/node-sdk");

const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;
const APP_ID = process.env.STREAM_APP_ID;

let streamClient;

const ensureConfigured = () => {
  if (!API_KEY || !API_SECRET) {
    throw new Error("Stream credentials are missing. Please set STREAM_API_KEY and STREAM_API_SECRET.");
  }
  if (!streamClient) {
    streamClient = new StreamClient(API_KEY, API_SECRET, APP_ID);
  }
  return streamClient;
};

exports.isStreamEnabled = () => Boolean(API_KEY && API_SECRET);

exports.createStreamToken = (userId) => {
  const client = ensureConfigured();
  return client.createToken(userId);
};

exports.createVideoCall = async ({ template = "default", callId, createdById, startsAt }) => {
  const client = ensureConfigured();
  const call = client.video.call(template, callId);
  await call.getOrCreate({
    data: {
      created_by_id: createdById,
      starts_at: startsAt,
      settings_override: {
        recording: { mode: "available", quality: "720p" },
        backstage: { enabled: false },
        limits: { max_participants: 200 },
      },
    },
  });
  return call;
};

const ensureCallExists = async ({ template, callId, startsAt }) => {
  const client = ensureConfigured();
  const call = client.video.call(template, callId);
  try {
    await call.get();
  } catch (error) {
    const responseCode = error?.metadata?.responseCode;
    if (responseCode && responseCode !== 404) {
      throw error;
    }
    await call.getOrCreate({
      data: {
        starts_at: startsAt,
        settings_override: {
          recording: { mode: "available", quality: "720p" },
          backstage: { enabled: false },
          limits: { max_participants: 200 },
        },
      },
    });
  }
};

exports.ensureCallMember = async ({ template = "default", callId, userId, role = "guest", startsAt }) => {
  const client = ensureConfigured();
  const call = client.video.call(template, callId);
  await ensureCallExists({ template, callId, startsAt });

  // В Stream Video используются собственные роли с политиками доступа.
  // Чтобы не упираться в ограничения нестандартных ролей ("host"/"guest"),
  // всегда подключаем пользователя как обычного участника звонка.
  const streamRole = "user";

  // Гарантируем, что пользователь существует в Stream перед добавлением в участники звонка
  try {
    await client.upsertUsers([
      {
        id: userId,
        role: streamRole,
      },
    ]);
  } catch (err) {
    console.error("[STREAM][UPSERT USER] Failed:", err);
    // Не прерываем выполнение, попробуем всё равно добавить в звонок,
    // так как пользователь мог быть создан ранее.
  }
  try {
    await call.updateCallMembers({
      update_members: [
        {
          user_id: userId,
          role: streamRole,
        },
      ],
    });
  } catch (err) {
    console.error("[STREAM][UPDATE CALL MEMBERS] Failed:", err);
    const msg = err?.message || "";
    const code = err?.metadata?.responseCode;
    // Если Stream по-прежнему считает, что пользователь не существует,
    // не роняем весь запрос токена, чтобы не блокировать подключение.
    if (!(code === 400 && msg.includes("don't exist"))) {
      throw err;
    }
  }
};

