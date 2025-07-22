"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("@/controllers");
const middleware_1 = require("@/middleware");
const middleware_2 = require("@/middleware");
const middleware_3 = require("@/middleware");
const router = (0, express_1.Router)();
router.post('/login', middleware_2.validateAuth, middleware_3.validateGitHubToken, controllers_1.AuthController.login);
router.post('/refresh', middleware_1.authenticateJWT, controllers_1.AuthController.refresh);
router.delete('/logout', middleware_1.authenticateJWT, controllers_1.AuthController.logout);
router.get('/validate', middleware_1.authenticateJWT, controllers_1.AuthController.validateToken);
router.get('/me', middleware_1.authenticateJWT, controllers_1.AuthController.getCurrentUser);
exports.default = router;
//# sourceMappingURL=auth.js.map