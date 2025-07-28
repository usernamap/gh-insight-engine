#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for github-insight-engine-api v0.1.73
 */
import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type Tool,
    type CallToolResult,
    type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

type JsonObject = Record<string, any>;

interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
    method: string;
    pathTemplate: string;
    executionParameters: { name: string, in: string }[];
    requestBodyContentType?: string;
    securityRequirements: any[];
}

export const SERVER_NAME = "github-insight-engine-api";
export const SERVER_VERSION = "0.1.73";
export const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);

const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([

    ["healthCheck", {
        name: "healthCheck",
        description: `Returns API health status and system information`,
        inputSchema: { "type": "object", "properties": {} },
        method: "get",
        pathTemplate: "/health",
        executionParameters: [],
        requestBodyContentType: undefined,
        securityRequirements: []
    }],
    ["ping", {
        name: "ping",
        description: `Basic connectivity test endpoint`,
        inputSchema: { "type": "object", "properties": {} },
        method: "get",
        pathTemplate: "/ping",
        executionParameters: [],
        requestBodyContentType: undefined,
        securityRequirements: []
    }],
    ["login", {
        name: "login",
        description: `Authenticate with GitHub Classic token to obtain JWT for API access.
Supports graceful degradation during GitHub API outages.

**Required GitHub token scopes:**
- \`repo\` - Private repository access
- \`user\` - User profile information  
- \`read:org\` - Organization data access

**Used by scheduling service**: This endpoint is automatically called by the
scheduling service to obtain authentication tokens for automated operations.
`,
        inputSchema: { "type": "object", "properties": { "requestBody": { "type": "object", "required": ["username", "fullName", "githubToken"], "properties": { "username": { "type": "string", "description": "GitHub username" }, "fullName": { "type": "string", "description": "User full name (required for scheduling service)" }, "githubToken": { "type": "string", "description": "GitHub Classic token with required scopes" } }, "description": "The JSON request body." } }, "required": ["requestBody"] },
        method: "post",
        pathTemplate: "/auth/login",
        executionParameters: [],
        requestBodyContentType: "application/json",
        securityRequirements: []
    }],
    ["getCurrentUser", {
        name: "getCurrentUser",
        description: `Check if the current user is authenticated and return minimal user information.
This endpoint is useful for client-side authentication state management.

**Authentication**: Optional - returns different responses based on authentication status
**Response**: Always returns a consistent structure with authentication status
`,
        inputSchema: { "type": "object", "properties": {} },
        method: "get",
        pathTemplate: "/auth/me",
        executionParameters: [],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }, {}]
    }],
    ["collectUserData", {
        name: "collectUserData",
        description: `Fetch and store GitHub user profile data from GitHub API`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "post",
        pathTemplate: "/users/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getUserProfile", {
        name: "getUserProfile",
        description: `Retrieve stored user profile and analysis status`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "get",
        pathTemplate: "/users/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["deleteUserData", {
        name: "deleteUserData",
        description: `Delete user profile and all associated repositories and AI analyses`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "delete",
        pathTemplate: "/users/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["collectRepositoriesData", {
        name: "collectRepositoriesData",
        description: `Start repository collection process. Returns immediately with status 202 Accepted.
Use GET /repositories/{username}/status to monitor progress.`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "post",
        pathTemplate: "/repositories/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getUserRepositories", {
        name: "getUserRepositories",
        description: `Retrieve stored repositories and analytics`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "get",
        pathTemplate: "/repositories/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["deleteUserRepositories", {
        name: "deleteUserRepositories",
        description: `Delete all stored repositories for a user from the database`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "delete",
        pathTemplate: "/repositories/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getCollectionStatus", {
        name: "getCollectionStatus",
        description: `Get the status of repository collection for a user`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "get",
        pathTemplate: "/repositories/{username}/status",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getDeveloperSummary", {
        name: "getDeveloperSummary",
        description: `Generate comprehensive developer analytics from stored data`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "get",
        pathTemplate: "/summary/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getAIServiceStatus", {
        name: "getAIServiceStatus",
        description: `Get AI service availability and configuration`,
        inputSchema: { "type": "object", "properties": {} },
        method: "get",
        pathTemplate: "/ai/status",
        executionParameters: [],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getAIAnalysis", {
        name: "getAIAnalysis",
        description: `Retrieve existing AI analysis results`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "get",
        pathTemplate: "/ai/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["performAIAnalysis", {
        name: "performAIAnalysis",
        description: `Execute AI-powered code quality and security analysis`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "post",
        pathTemplate: "/ai/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["deleteAIAnalysis", {
        name: "deleteAIAnalysis",
        description: `Delete all stored AI analyses for a user from the database`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "delete",
        pathTemplate: "/ai/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["refreshUserData", {
        name: "refreshUserData",
        description: `Complete data refresh for a user by chaining all collection steps:
1. User profile data collection (POST /users/{username})
2. Repository data collection (POST /repositories/{username})
3. AI analysis execution (POST /ai/{username})

This operation can take several minutes. In case of partial failure,
successfully collected data is preserved.

**Scheduling Integration**: This endpoint is used by the automatic
scheduling service with automatic token management. The scheduling
service calls \`/auth/login\` to obtain fresh JWT tokens before
executing this refresh operation.
`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "post",
        pathTemplate: "/refresh/{username}",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
    ["getRefreshStatus", {
        name: "getRefreshStatus",
        description: `Get the status of data refresh for a user`,
        inputSchema: { "type": "object", "properties": { "username": { "type": "string", "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]){0,38}$", "description": "GitHub username" } }, "required": ["username"] },
        method: "get",
        pathTemplate: "/refresh/{username}/status",
        executionParameters: [{ "name": "username", "in": "path" }],
        requestBodyContentType: undefined,
        securityRequirements: [{ "BearerAuth": [] }]
    }],
]);

const securitySchemes = {
    "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token obtained from /auth/login (24h validity).\nUsed by both manual API calls and the automatic scheduling service.\n"
    }
};


server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema
    }));
    return { tools: toolsForClient };
});


server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
    const { name: toolName, arguments: toolArgs } = request.params;
    const toolDefinition = toolDefinitionMap.get(toolName);
    if (!toolDefinition) {
        console.error(`Error: Unknown tool requested: ${toolName}`);
        return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
    }
    return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});



interface TokenCacheEntry {
    token: string;
    expiresAt: number;
}

interface JWTCacheEntry {
    token: string;
    expiresAt: number;
    username: string;
}

declare global {
    var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
    var __jwtTokenCache: Record<string, JWTCacheEntry> | undefined;
}

/**
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(schemeName: string, scheme: any): Promise<string | null | undefined> {
    try {
        const clientId = process.env[`OAUTH_CLIENT_ID_SCHEMENAME`];
        const clientSecret = process.env[`OAUTH_CLIENT_SECRET_SCHEMENAME`];
        const scopes = process.env[`OAUTH_SCOPES_SCHEMENAME`];

        if (!clientId || !clientSecret) {
            console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
            return null;
        }

        if (typeof global.__oauthTokenCache === 'undefined') {
            global.__oauthTokenCache = {};
        }

        const cacheKey = `${schemeName}_${clientId}`;
        const cachedToken = global.__oauthTokenCache[cacheKey];
        const now = Date.now();

        if (cachedToken && cachedToken.expiresAt > now) {
            console.error(`Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor((cachedToken.expiresAt - now) / 1000)} seconds)`);
            return cachedToken.token;
        }

        let tokenUrl = '';
        if (scheme.flows?.clientCredentials?.tokenUrl) {
            tokenUrl = scheme.flows.clientCredentials.tokenUrl;
            console.error(`Using client credentials flow for '${schemeName}'`);
        } else if (scheme.flows?.password?.tokenUrl) {
            tokenUrl = scheme.flows.password.tokenUrl;
            console.error(`Using password flow for '${schemeName}'`);
        } else {
            console.error(`No supported OAuth2 flow found for '${schemeName}'`);
            return null;
        }

        let formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');

        if (scopes) {
            formData.append('scope', scopes);
        }

        console.error(`Requesting OAuth2 token from ${tokenUrl}`);

        const response = await axios({
            method: 'POST',
            url: tokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            data: formData.toString()
        });

        if (response.data?.access_token) {
            const token = response.data.access_token;
            const expiresIn = response.data.expires_in || 3600;

            global.__oauthTokenCache[cacheKey] = {
                token,
                expiresAt: now + (expiresIn * 1000) - 60000
            };

            console.error(`Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`);
            return token;
        } else {
            console.error(`Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`);
            return null;
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
        return null;
    }
}

/**
 * @returns Cached JWT token or null if not available/expired
 */
function getCachedJWT(): string | null {
    if (typeof global.__jwtTokenCache === 'undefined') {
        global.__jwtTokenCache = {};
        return null;
    }

    const now = Date.now();
    // Find any valid cached token
    for (const [key, entry] of Object.entries(global.__jwtTokenCache)) {
        if (entry.expiresAt > now) {
            return entry.token;
        } else {
            delete global.__jwtTokenCache[key];
        }
    }
    return null;
}

/**
 * @returns Promise<boolean> - true if authentication successful, false otherwise
 */
async function autoAuthenticate(): Promise<boolean> {
    const githubToken = process.env.GH_TOKEN;
    const githubUsername = process.env.GITHUB_USERNAME;
    const githubFullName = process.env.GITHUB_FULL_NAME;

    if (!githubToken || !githubUsername || !githubFullName) {
        console.error('Auto-authentication failed: Missing required environment variables');
        console.error('Required: GH_TOKEN, GITHUB_USERNAME, GITHUB_FULL_NAME');
        return false;
    }

    const cachedToken = getCachedJWT();
    if (cachedToken) {
        console.error(`Auto-authentication: Using cached JWT token for ${githubUsername}`);
        return true;
    }

    try {
        console.error(`Auto-authentication: Attempting to login with GitHub token for ${githubUsername}`);

        const loginData = {
            username: githubUsername,
            fullName: githubFullName,
            githubToken: githubToken
        };

        const response = await axios({
            method: 'POST',
            url: `${API_BASE_URL}/auth/login`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: loginData
        });

        if (response.status === 200 && response.data) {
            const responseData = response.data;
            if (responseData.tokens?.accessToken && responseData.user?.username) {
                const token = responseData.tokens.accessToken;
                const username = responseData.user.username;
                const expiresIn = responseData.tokens.expiresIn || 86400;

                let expiresInSeconds = expiresIn;
                if (typeof expiresIn === 'string') {
                    if (expiresIn.endsWith('h')) {
                        expiresInSeconds = parseInt(expiresIn.slice(0, -1)) * 3600;
                    } else if (expiresIn.endsWith('m')) {
                        expiresInSeconds = parseInt(expiresIn.slice(0, -1)) * 60;
                    } else if (expiresIn.endsWith('s')) {
                        expiresInSeconds = parseInt(expiresIn.slice(0, -1));
                    }
                }

                cacheJWT(token, username, expiresInSeconds);
                console.error(`Auto-authentication successful: Cached JWT token for ${username}`);
                return true;
            }
        }

        console.error('Auto-authentication failed: Invalid response from login endpoint');
        return false;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Auto-authentication failed: ${errorMessage}`);
        return false;
    }
}

/**
 * @param token JWT token
 * @param username Username associated with the token
 * @param expiresIn Expiration time in seconds
 */
function cacheJWT(token: string, username: string, expiresIn: number): void {
    if (typeof global.__jwtTokenCache === 'undefined') {
        global.__jwtTokenCache = {};
    }

    const now = Date.now();
    const expiresAt = now + (expiresIn * 1000) - 60000;

    global.__jwtTokenCache[username] = {
        token,
        expiresAt,
        username
    };
}

/**
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
    toolName: string,
    definition: McpToolDefinition,
    toolArgs: JsonObject,
    allSecuritySchemes: Record<string, any>
): Promise<CallToolResult> {
    try {
        let validatedArgs: JsonObject;
        try {
            const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
            const argsToParse = (typeof toolArgs === 'object' && toolArgs !== null) ? toolArgs : {};
            validatedArgs = zodSchema.parse(argsToParse);
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join('.')} (${e.code}): ${e.message}`).join(', ')}`;
                return { content: [{ type: 'text', text: validationErrorMessage }] };
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return { content: [{ type: 'text', text: `Internal error during validation setup: ${errorMessage}` }] };
            }
        }

        let urlPath = definition.pathTemplate;
        const queryParams: Record<string, any> = {};
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        let requestBodyData: any = undefined;

        definition.executionParameters.forEach((param) => {
            const value = validatedArgs[param.name];
            if (typeof value !== 'undefined' && value !== null) {
                if (param.in === 'path') {
                    urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
                }
                else if (param.in === 'query') {
                    queryParams[param.name] = value;
                }
                else if (param.in === 'header') {
                    headers[param.name.toLowerCase()] = String(value);
                }
            }
        });

        if (urlPath.includes('{')) {
            throw new Error(`Failed to resolve path parameters: ${urlPath}`);
        }

        const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

        if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
            requestBodyData = validatedArgs['requestBody'];
            headers['content-type'] = definition.requestBodyContentType;
        }

        let appliedSecurity = definition.securityRequirements?.find(req => {
            return Object.entries(req).every(([schemeName, scopesArray]) => {
                const scheme = allSecuritySchemes[schemeName];
                if (!scheme) return false;

                if (scheme.type === 'apiKey') {
                    return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }

                if (scheme.type === 'http') {
                    if (scheme.scheme?.toLowerCase() === 'bearer') {
                        const cachedToken = getCachedJWT();
                        if (cachedToken) {
                            return true;
                        }
                        return !!process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    }
                    else if (scheme.scheme?.toLowerCase() === 'basic') {
                        return !!process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                            !!process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    }
                }

                if (scheme.type === 'oauth2') {
                    if (process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                        return true;
                    }

                    if (process.env[`OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`] &&
                        process.env[`OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]) {
                        if (scheme.flows?.clientCredentials || scheme.flows?.password) {
                            return true;
                        }
                    }

                    return false;
                }

                if (scheme.type === 'openIdConnect') {
                    return !!process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                }

                return false;
            });
        });

        if (!appliedSecurity && definition.securityRequirements?.some(req => req.BearerAuth)) {
            console.error('No BearerAuth found, attempting auto-authentication...');
            const authSuccess = await autoAuthenticate();
            if (authSuccess) {
                const cachedToken = getCachedJWT();
                if (cachedToken) {
                    appliedSecurity = { BearerAuth: [] };
                }
            }
        }

        if (appliedSecurity) {
            for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
                const scheme = allSecuritySchemes[schemeName];

                if (scheme?.type === 'apiKey') {
                    const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (apiKey) {
                        if (scheme.in === 'header') {
                            headers[scheme.name.toLowerCase()] = apiKey;
                            console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
                        }
                        else if (scheme.in === 'query') {
                            queryParams[scheme.name] = apiKey;
                            console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
                        }
                        else if (scheme.in === 'cookie') {
                            headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
                            console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
                        }
                    }
                }
                else if (scheme?.type === 'http') {
                    if (scheme.scheme?.toLowerCase() === 'bearer') {
                        const cachedToken = getCachedJWT();
                        if (cachedToken) {
                            headers['authorization'] = `Bearer ${cachedToken}`;
                            console.error(`Applied cached JWT token for '${schemeName}'`);
                        } else {
                            const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                            if (token) {
                                headers['authorization'] = `Bearer ${token}`;
                                console.error(`Applied Bearer token for '${schemeName}'`);
                            }
                        }
                    }
                    else if (scheme.scheme?.toLowerCase() === 'basic') {
                        const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                        const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                        if (username && password) {
                            headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
                            console.error(`Applied Basic authentication for '${schemeName}'`);
                        }
                    }
                }
                else if (scheme?.type === 'oauth2') {
                    let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];

                    if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
                        console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
                        token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
                    }

                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied OAuth2 token for '${schemeName}'`);

                        const scopes = scopesArray as string[];
                        if (scopes && scopes.length > 0) {
                            console.error(`Requested scopes: ${scopes.join(', ')}`);
                        }
                    }
                }
                else if (scheme?.type === 'openIdConnect') {
                    const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
                    if (token) {
                        headers['authorization'] = `Bearer ${token}`;
                        console.error(`Applied OpenID Connect token for '${schemeName}'`);

                        const scopes = scopesArray as string[];
                        if (scopes && scopes.length > 0) {
                            console.error(`Requested scopes: ${scopes.join(', ')}`);
                        }
                    }
                }
            }
        }
        else if (definition.securityRequirements?.length > 0) {
            const securityRequirementsString = definition.securityRequirements
                .map(req => {
                    const parts = Object.entries(req)
                        .map(([name, scopesArray]) => {
                            const scopes = scopesArray as string[];
                            if (scopes.length === 0) return name;
                            return `${name} (scopes: ${scopes.join(', ')})`;
                        })
                        .join(' AND ');
                    return `[${parts}]`;
                })
                .join(' OR ');

            console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
        }


        const config: AxiosRequestConfig = {
            method: definition.method.toUpperCase(),
            url: requestUrl,
            params: queryParams,
            headers: headers,
            ...(requestBodyData !== undefined && { data: requestBodyData }),
        };

        console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);

        const response = await axios(config);

        if (toolName === 'login' && response.status === 200 && response.data) {
            try {
                const responseData = response.data;
                if (responseData.tokens?.accessToken && responseData.user?.username) {
                    const token = responseData.tokens.accessToken;
                    const username = responseData.user.username;
                    const expiresIn = responseData.tokens.expiresIn || 86400;

                    let expiresInSeconds = expiresIn;
                    if (typeof expiresIn === 'string') {
                        if (expiresIn.endsWith('h')) {
                            expiresInSeconds = parseInt(expiresIn.slice(0, -1)) * 3600;
                        } else if (expiresIn.endsWith('m')) {
                            expiresInSeconds = parseInt(expiresIn.slice(0, -1)) * 60;
                        } else if (expiresIn.endsWith('s')) {
                            expiresInSeconds = parseInt(expiresIn.slice(0, -1));
                        }
                    }

                    cacheJWT(token, username, expiresInSeconds);
                    console.error(`Cached JWT token from login response for '${username}'`);
                }
            } catch (error) {
                console.error('Error caching JWT token from login response:', error);
            }
        }

        let responseText = '';
        const contentType = response.headers['content-type']?.toLowerCase() || '';

        if (contentType.includes('application/json') && typeof response.data === 'object' && response.data !== null) {
            try {
                responseText = JSON.stringify(response.data, null, 2);
            } catch (e) {
                responseText = "[Stringify Error]";
            }
        }
        else if (typeof response.data === 'string') {
            responseText = response.data;
        }
        else if (response.data !== undefined && response.data !== null) {
            responseText = String(response.data);
        }
        else {
            responseText = `(Status: ${response.status} - No body content)`;
        }

        return {
            content: [
                {
                    type: "text",
                    text: `API Response (Status: ${response.status}):\n${responseText}`
                }
            ],
        };

    } catch (error: unknown) {
        let errorMessage: string;

        if (axios.isAxiosError(error)) {
            errorMessage = formatApiError(error);
        }
        else if (error instanceof Error) {
            errorMessage = error.message;
        }
        else {
            errorMessage = 'Unexpected error: ' + String(error);
        }

        console.error(`Error during execution of tool '${toolName}':`, errorMessage);

        return { content: [{ type: "text", text: errorMessage }] };
    }
}


async function main() {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error(`${SERVER_NAME} MCP Server (v${SERVER_VERSION}) running on stdio${API_BASE_URL ? `, proxying API at ${API_BASE_URL}` : ''}`);

        const authSuccess = await autoAuthenticate();
        if (authSuccess) {
            console.error('Auto-authentication successful on startup');
        } else {
            console.error('Auto-authentication failed on startup - will retry when needed');
        }
    } catch (error) {
        console.error("Error during server startup:", error);
        process.exit(1);
    }
}

async function cleanup() {
    console.error("Shutting down MCP server...");
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().catch((error) => {
    console.error("Fatal error in main execution:", error);
    process.exit(1);
});

/**
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = `API Error: Status ${error.response.status} (${error.response.statusText || 'Status text not available'}). `;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') {
            message += `Response: ${responseData.substring(0, MAX_LEN)}${responseData.length > MAX_LEN ? '...' : ''}`;
        }
        else if (responseData) {
            try {
                const jsonString = JSON.stringify(responseData);
                message += `Response: ${jsonString.substring(0, MAX_LEN)}${jsonString.length > MAX_LEN ? '...' : ''}`;
            } catch {
                message += 'Response: [Could not serialize data]';
            }
        }
        else {
            message += 'No response body received.';
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += ` (Code: ${error.code})`;
    } else {
        message += `API Request Setup Error: ${error.message}`;
    }
    return message;
}

/**
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) {
        return z.object({}).passthrough();
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') {
            throw new Error('Eval did not produce a valid Zod schema.');
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
        return z.object({}).passthrough();
    }
}
