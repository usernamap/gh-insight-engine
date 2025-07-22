"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("@/controllers");
const middleware_1 = require("@/middleware");
const middleware_2 = require("@/middleware");
const middleware_3 = require("@/middleware");
const middleware_4 = require("@/middleware");
const middleware_5 = require("@/middleware");
const middleware_6 = require("@/middleware");
const router = (0, express_1.Router)();
router.get('/search', middleware_2.optionalJWT, middleware_5.validateUserSearch, controllers_1.UserController.searchUsers);
router.get('/stats', middleware_2.optionalJWT, controllers_1.UserController.getUsersStats);
router.get('/:username', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.UserController.getUserProfile);
router.get('/:username/repositories', middleware_2.optionalJWT, middleware_6.validateUserWithPagination, controllers_1.UserController.getUserRepositories);
router.get('/:username/status', middleware_2.optionalJWT, middleware_4.validateUserParams, controllers_1.UserController.getUserAnalysisStatus);
router.delete('/:username', middleware_1.authenticateJWT, middleware_4.validateUserParams, middleware_3.requireOwnership, controllers_1.UserController.deleteUserData);
exports.default = router;
//# sourceMappingURL=users.js.map