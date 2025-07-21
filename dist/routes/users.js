"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("@/controllers");
const middleware_1 = require("@/middleware");
const router = (0, express_1.Router)();
router.get('/search', middleware_1.optionalJWT, middleware_1.validateUserSearch, controllers_1.UserController.searchUsers);
router.get('/stats', middleware_1.optionalJWT, controllers_1.UserController.getUsersStats);
router.get('/:username', middleware_1.optionalJWT, middleware_1.validateUserParams, controllers_1.UserController.getUserProfile);
router.get('/:username/repositories', middleware_1.optionalJWT, middleware_1.validateUserWithPagination, controllers_1.UserController.getUserRepositories);
router.get('/:username/status', middleware_1.optionalJWT, middleware_1.validateUserParams, controllers_1.UserController.getUserAnalysisStatus);
router.delete('/:username', middleware_1.authenticateJWT, middleware_1.validateUserParams, middleware_1.requireOwnership, controllers_1.UserController.deleteUserData);
exports.default = router;
//# sourceMappingURL=users.js.map