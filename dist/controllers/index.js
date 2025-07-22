"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController =
  exports.AnalyticsController =
  exports.RepoController =
  exports.UserController =
  exports.AuthController =
    void 0;
var AuthController_1 = require("./AuthController");
Object.defineProperty(exports, "AuthController", {
  enumerable: true,
  get: function () {
    return __importDefault(AuthController_1).default;
  },
});
var UserController_1 = require("./UserController");
Object.defineProperty(exports, "UserController", {
  enumerable: true,
  get: function () {
    return __importDefault(UserController_1).default;
  },
});
var RepoController_1 = require("./RepoController");
Object.defineProperty(exports, "RepoController", {
  enumerable: true,
  get: function () {
    return __importDefault(RepoController_1).default;
  },
});
var AnalyticsController_1 = require("./AnalyticsController");
Object.defineProperty(exports, "AnalyticsController", {
  enumerable: true,
  get: function () {
    return __importDefault(AnalyticsController_1).default;
  },
});
var InsightsController_1 = require("./InsightsController");
Object.defineProperty(exports, "InsightsController", {
  enumerable: true,
  get: function () {
    return __importDefault(InsightsController_1).default;
  },
});
//# sourceMappingURL=index.js.map
