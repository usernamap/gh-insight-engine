"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("@/controllers");
const middleware_1 = require("@/middleware");
const middleware_2 = require("@/middleware");
const middleware_3 = require("@/middleware");
const middleware_4 = require("@/middleware");
const router = (0, express_1.Router)();
router.get('/search', middleware_2.optionalJWT, middleware_4.validateRepoSearch, controllers_1.RepoController.searchRepositories);
router.get('/languages/stats', middleware_2.optionalJWT, controllers_1.RepoController.getLanguagesStats);
router.get('/trending', middleware_2.optionalJWT, controllers_1.RepoController.getTrendingRepositories);
router.get('/:owner/:repo', middleware_2.optionalJWT, middleware_3.validateRepoParams, controllers_1.RepoController.getRepository);
router.post('/:owner/:repo/enrich', middleware_1.authenticateJWT, middleware_3.validateRepoParams, controllers_1.RepoController.enrichRepository);
exports.default = router;
//# sourceMappingURL=repositories.js.map