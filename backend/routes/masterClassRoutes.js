const express = require("express");
const controller = require("../controllers/masterClassController");
const { authMiddleware } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.post("/:id/token", controller.issueToken);
router.delete("/:id", controller.remove);
router.get("/:id/messages", controller.listMessages);
router.post("/:id/messages", controller.createMessage);

module.exports = router;

