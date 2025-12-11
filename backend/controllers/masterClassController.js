const crypto = require("crypto");
const {
  createMasterClass,
  listMasterClasses,
  findMasterClassById,
  upsertAttendee,
  deleteMasterClass,
} = require("../models/masterClassModel");
const { findUserById } = require("../models/userModel");
const {
  listMessages: listMasterClassMessages,
  createMessage: createMasterClassMessage,
} = require("../models/masterClassMessageModel");
const {
  createVideoCall,
  createStreamToken,
  isStreamEnabled,
  ensureCallMember,
} = require("../services/streamService");

const STREAM_TEMPLATE = process.env.STREAM_VIDEO_TEMPLATE || "default";

const normalizeIngredients = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
};

exports.create = async (req, res) => {
  const {
    title,
    description,
    startTime,
    durationMinutes = 60,
    ingredients,
    videoMode = "stream",
    conferenceUrl,
  } = req.body;

  if (!title || !startTime) {
    return res.status(400).json({ message: "Title and startTime are required" });
  }

  const safeTitle = String(title).trim();
  const safeDescription = description ? String(description).trim() : "";
  const safeDuration = Number(durationMinutes);

  if (safeTitle.length > 30) {
    return res.status(400).json({ message: "Название мастер-класса не может превышать 30 символов" });
  }

  if (!Number.isFinite(safeDuration) || safeDuration <= 0 || safeDuration > 360) {
    return res.status(400).json({ message: "Длительность должна быть в минутах и не больше 360" });
  }

  if (safeDescription.length > 500) {
    return res.status(400).json({ message: "Описание не может превышать 500 символов" });
  }

  if (videoMode === "link" && !conferenceUrl) {
    return res
      .status(400)
      .json({ message: "conferenceUrl is required when videoMode is 'link'" });
  }

  if (videoMode === "stream" && !isStreamEnabled()) {
    return res
      .status(400)
      .json({ message: "Stream API is not configured on the server" });
  }

  try {
    const host = await findUserById(req.user.id);

    const sanitizedIngredients = normalizeIngredients(ingredients);
    const startDate = new Date(startTime);
    const streamCallId =
      videoMode === "stream" ? `masterclass_${crypto.randomUUID()}` : null;

    if (videoMode === "stream") {
      await createVideoCall({
        template: STREAM_TEMPLATE,
        callId: streamCallId,
        createdById: String(req.user.id),
        startsAt: startDate.toISOString(),
      });
    }

    const record = await createMasterClass({
      title: safeTitle,
      description: safeDescription,
      ingredients: sanitizedIngredients,
      start_time: startDate.toISOString(),
      duration_minutes: safeDuration,
      video_mode: videoMode,
      conference_url: conferenceUrl,
      stream_call_id: streamCallId,
      stream_call_template: STREAM_TEMPLATE,
      created_by: req.user.id,
    });

    const response = { masterClass: record };

    if (videoMode === "stream") {
      response.stream = {
        apiKey: process.env.STREAM_API_KEY,
        token: createStreamToken(String(req.user.id)),
        callId: streamCallId,
        callTemplate: STREAM_TEMPLATE,
        user: {
          id: String(req.user.id),
          name: host?.name || host?.email || `host_${req.user.id}`,
        },
      };
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("[MASTER CLASS][CREATE] Failed:", error);
    res
      .status(500)
      .json({ message: "Не удалось создать мастер-класс", detail: error.message });
  }
};

exports.list = async (req, res) => {
  try {
    const filter = req.query.filter;
    const masterClasses = await listMasterClasses({
      filter,
      userId: req.user.id,
    });
    res.json({ items: masterClasses });
  } catch (error) {
    console.error("[MASTER CLASS][LIST] Failed:", error);
    res
      .status(500)
      .json({ message: "Не удалось получить список мастер-классов" });
  }
};

exports.getById = async (req, res) => {
  try {
    const record = await findMasterClassById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Мастер-класс не найден" });
    }

    res.json({ masterClass: record });
  } catch (error) {
    console.error("[MASTER CLASS][GET] Failed:", error);
    res
      .status(500)
      .json({ message: "Не удалось получить мастер-класс" });
  }
};

exports.issueToken = async (req, res) => {
  try {
    const record = await findMasterClassById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Мастер-класс не найден" });
    }

    const role = record.created_by === req.user.id ? "host" : "guest";

    await upsertAttendee({
      masterClassId: record.id,
      userId: req.user.id,
      role,
    });

    if (record.video_mode === "link") {
      return res.json({
        masterClass: record,
        videoMode: record.video_mode,
        conferenceUrl: record.conference_url,
      });
    }

    if (!isStreamEnabled()) {
      return res.status(400).json({ message: "Stream API is not configured" });
    }

    await ensureCallMember({
      template: record.stream_call_template || STREAM_TEMPLATE,
      callId: record.stream_call_id,
      userId: String(req.user.id),
      role,
      startsAt: record.start_time,
    });

    const host = await findUserById(req.user.id);

    res.json({
      masterClass: record,
      videoMode: record.video_mode,
      apiKey: process.env.STREAM_API_KEY,
      callId: record.stream_call_id,
      callTemplate: record.stream_call_template || STREAM_TEMPLATE,
      token: createStreamToken(String(req.user.id)),
      streamUser: {
        id: String(req.user.id),
        name: host?.name || host?.email || `user_${req.user.id}`,
      },
    });
  } catch (error) {
    console.error("[MASTER CLASS][TOKEN] Failed:", error);
    res
      .status(500)
      .json({ message: "Не удалось выдать токен для мастер-класса" });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await findMasterClassById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Мастер-класс не найден" });
    }
    if (record.created_by !== req.user.id) {
      return res.status(403).json({ message: "Удаление доступно только автору" });
    }
    await deleteMasterClass(record.id);
    res.json({ message: "Мастер-класс удалён" });
  } catch (error) {
    console.error("[MASTER CLASS][DELETE] Failed:", error);
    res.status(500).json({ message: "Не удалось удалить мастер-класс" });
  }
};

exports.listMessages = async (req, res) => {
  try {
    const record = await findMasterClassById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Мастер-класс не найден" });
    }
    const messages = await listMasterClassMessages(record.id);
    res.json({ items: messages });
  } catch (error) {
    console.error("[MASTER CLASS][CHAT][LIST] Failed:", error);
    res.status(500).json({ message: "Не удалось получить сообщения" });
  }
};

exports.createMessage = async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Сообщение не может быть пустым" });
  }
  if (message.length > 1000) {
    return res.status(400).json({ message: "Сообщение слишком длинное (макс. 1000 символов)" });
  }

  try {
    const record = await findMasterClassById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Мастер-класс не найден" });
    }
    const entry = await createMasterClassMessage({
      masterClassId: record.id,
      userId: req.user.id,
      message: message.trim(),
    });
    res.status(201).json({ message: entry });
  } catch (error) {
    console.error("[MASTER CLASS][CHAT][CREATE] Failed:", error);
    res.status(500).json({ message: "Не удалось отправить сообщение" });
  }
};

