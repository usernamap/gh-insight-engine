/**
 * GitHub Insight Engine - Frontend JavaScript
 * Gestion de l'interface utilisateur et de l'authentification
 */

// Configuration
const API_BASE_URL = window.location.origin + '/api';
const TOKEN_KEY = 'gh_insight_token';
const USER_KEY = 'gh_insight_user';

// État global de l'application
const AppState = {
    isLoading: false,
    isAuthenticated: false,
    user: null,
    token: null,
};

// Utilitaires
const Utils = {
    /**
     * Sauvegarde sécurisée des données dans le localStorage
     */
    saveToStorage: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
            return false;
        }
    },

    /**
     * Récupération des données du localStorage
     */
    getFromStorage: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erreur de récupération:', error);
            return null;
        }
    },

    /**
     * Suppression des données du localStorage
     */
    removeFromStorage: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Erreur de suppression:', error);
            return false;
        }
    },

    /**
     * Validation du format du token GitHub
     */
    validateGitHubToken: (token) => {
        const githubTokenPattern = /^gh[pousr]_[A-Za-z0-9_]{36,251}$/;
        return githubTokenPattern.test(token);
    },

    /**
     * Validation du nom d'utilisateur GitHub
     */
    validateGitHubUsername: (username) => {
        const usernamePattern = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
        return usernamePattern.test(username);
    },

    /**
     * Affichage des messages d'erreur ou de succès
     */
    showMessage: (type, message) => {
        const errorElement = document.getElementById('errorMessage');
        const successElement = document.getElementById('successMessage');
        
        // Masquer tous les messages
        errorElement.style.display = 'none';
        successElement.style.display = 'none';
        
        // Afficher le message approprié
        if (type === 'error') {
            errorElement.querySelector('.message-text').textContent = message;
            errorElement.style.display = 'flex';
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (type === 'success') {
            successElement.querySelector('.message-text').textContent = message;
            successElement.style.display = 'flex';
        }
        
        // Auto-masquage après 10 secondes pour les messages de succès
        if (type === 'success') {
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 10000);
        }
    },

    /**
     * Gestion de l'état de chargement du bouton
     */
    setLoadingState: (loading) => {
        const button = document.getElementById('loginButton');
        const normalText = button.querySelector('.login-button-text');
        const loadingText = button.querySelector('.login-button-loading');
        
        AppState.isLoading = loading;
        button.disabled = loading;
        
        if (loading) {
            normalText.style.display = 'none';
            loadingText.style.display = 'flex';
        } else {
            normalText.style.display = 'block';
            loadingText.style.display = 'none';
        }
    },
};

// Service API
const ApiService = {
    /**
     * Requête API générique
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        // Ajouter le token JWT si disponible
        if (AppState.token) {
            config.headers['Authorization'] = `Bearer ${AppState.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Erreur HTTP: ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erreur API:', error);
            return { 
                success: false, 
                error: error.message || 'Une erreur inattendue s\'est produite' 
            };
        }
    },

    /**
     * Connexion utilisateur
     */
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    /**
     * Validation du token JWT
     */
    async validateToken() {
        return this.request('/auth/validate');
    },

    /**
     * Récupération des informations utilisateur
     */
    async getUserInfo() {
        return this.request('/auth/me');
    },

    /**
     * Déconnexion
     */
    async logout() {
        return this.request('/auth/logout', {
            method: 'DELETE',
        });
    },

    /**
     * Test de connectivité de l'API
     */
    async ping() {
        return this.request('/ping');
    },
};

// Gestionnaire de formulaire de connexion
const LoginForm = {
    /**
     * Initialisation du formulaire
     */
    init() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        // Validation en temps réel
        this.setupRealTimeValidation();
    },

    /**
     * Configuration de la validation en temps réel
     */
    setupRealTimeValidation() {
        const usernameInput = document.getElementById('username');
        const tokenInput = document.getElementById('githubToken');

        if (usernameInput) {
            usernameInput.addEventListener('blur', this.validateUsername.bind(this));
            usernameInput.addEventListener('input', () => {
                if (usernameInput.classList.contains('invalid')) {
                    this.validateUsername();
                }
            });
        }

        if (tokenInput) {
            tokenInput.addEventListener('blur', this.validateToken.bind(this));
            tokenInput.addEventListener('input', () => {
                if (tokenInput.classList.contains('invalid')) {
                    this.validateToken();
                }
            });
        }
    },

    /**
     * Validation du nom d'utilisateur
     */
    validateUsername() {
        const input = document.getElementById('username');
        const value = input.value.trim();
        
        if (!value) {
            this.setFieldError(input, 'Le nom d\'utilisateur est requis');
            return false;
        }
        
        if (!Utils.validateGitHubUsername(value)) {
            this.setFieldError(input, 'Format de nom d\'utilisateur GitHub invalide');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    },

    /**
     * Validation du token GitHub
     */
    validateToken() {
        const input = document.getElementById('githubToken');
        const value = input.value.trim();
        
        if (!value) {
            this.setFieldError(input, 'Le token GitHub est requis');
            return false;
        }
        
        if (!Utils.validateGitHubToken(value)) {
            this.setFieldError(input, 'Format de token GitHub invalide (doit commencer par ghp_, gho_, ghu_, ghs_, ou ghr_)');
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    },

    /**
     * Affichage d'erreur sur un champ
     */
    setFieldError(input, message) {
        input.classList.add('invalid');
        input.style.borderColor = 'var(--danger)';
        
        // Créer ou mettre à jour le message d'erreur
        let errorElement = input.parentElement.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('small');
            errorElement.className = 'field-error';
            errorElement.style.color = 'var(--danger)';
            errorElement.style.fontSize = '0.8rem';
            errorElement.style.marginTop = 'var(--space-1)';
            input.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
    },

    /**
     * Suppression d'erreur sur un champ
     */
    clearFieldError(input) {
        input.classList.remove('invalid');
        input.style.borderColor = '';
        
        const errorElement = input.parentElement.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    },

    /**
     * Validation complète du formulaire
     */
    validateForm() {
        const isUsernameValid = this.validateUsername();
        const isTokenValid = this.validateToken();
        
        const fullNameInput = document.getElementById('fullName');
        let isFullNameValid = true;
        
        if (!fullNameInput.value.trim()) {
            this.setFieldError(fullNameInput, 'Le nom complet est requis');
            isFullNameValid = false;
        } else {
            this.clearFieldError(fullNameInput);
        }
        
        return isUsernameValid && isTokenValid && isFullNameValid;
    },

    /**
     * Gestion de la soumission du formulaire
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        // Masquer les messages précédents
        Utils.showMessage('', '');
        
        // Validation du formulaire
        if (!this.validateForm()) {
            Utils.showMessage('error', 'Veuillez corriger les erreurs dans le formulaire');
            return;
        }
        
        // État de chargement
        Utils.setLoadingState(true);
        
        // Récupération des données
        const formData = new FormData(event.target);
        const credentials = {
            username: formData.get('username').trim(),
            fullName: formData.get('fullName').trim(),
            githubToken: formData.get('githubToken').trim(),
        };
        
        try {
            // Tentative de connexion
            const result = await ApiService.login(credentials);
            
            if (result.success) {
                const { user, tokens } = result.data;
                
                // Sauvegarde des données de session
                AppState.token = tokens.accessToken;
                AppState.user = user;
                AppState.isAuthenticated = true;
                
                Utils.saveToStorage(TOKEN_KEY, tokens.accessToken);
                Utils.saveToStorage(USER_KEY, user);
                
                // Message de succès
                Utils.showMessage('success', `Connexion réussie ! Bienvenue ${user.name} (@${user.username})`);
                
                // Redirection vers le dashboard (à implémenter)
                setTimeout(() => {
                    this.redirectToDashboard(user);
                }, 2000);
                
            } else {
                Utils.showMessage('error', result.error || 'Erreur de connexion');
            }
            
        } catch (error) {
            Utils.showMessage('error', 'Erreur de connexion: ' + error.message);
            
        } finally {
            Utils.setLoadingState(false);
        }
    },

    /**
     * Redirection vers le dashboard (à implémenter)
     */
    redirectToDashboard(user) {
        // Pour l'instant, afficher les informations dans la console
        console.log('Utilisateur connecté:', user);
        
        // TODO: Rediriger vers le dashboard ou afficher l'interface d'analyse
        Utils.showMessage('success', 'Connexion réussie ! Interface d\'analyse à venir...');
        
        // Exemple de redirection (à adapter selon vos besoins)
        // window.location.href = `/dashboard/${user.username}`;
    },
};

// Gestionnaire d'état de l'application
const AppManager = {
    /**
     * Initialisation de l'application
     */
    async init() {
        console.log('🚀 Initialisation de GitHub Insight Engine Frontend');
        
        // Vérifier la connectivité de l'API
        await this.checkApiHealth();
        
        // Restaurer la session si elle existe
        this.restoreSession();
        
        // Initialiser les composants
        LoginForm.init();
        
        console.log('✅ Application initialisée');
    },

    /**
     * Vérification de la santé de l'API
     */
    async checkApiHealth() {
        try {
            const result = await ApiService.ping();
            if (result.success) {
                console.log('✅ API connectée:', result.data);
            } else {
                console.warn('⚠️ API non disponible:', result.error);
                Utils.showMessage('error', 'API temporairement indisponible. Veuillez réessayer plus tard.');
            }
        } catch (error) {
            console.error('❌ Erreur API:', error);
        }
    },

    /**
     * Restauration de la session utilisateur
     */
    restoreSession() {
        const savedToken = Utils.getFromStorage(TOKEN_KEY);
        const savedUser = Utils.getFromStorage(USER_KEY);
        
        if (savedToken && savedUser) {
            AppState.token = savedToken;
            AppState.user = savedUser;
            AppState.isAuthenticated = true;
            
            console.log('🔄 Session restaurée pour:', savedUser.username);
            
            // Valider le token de façon asynchrone
            this.validateStoredSession();
        }
    },

    /**
     * Validation de la session stockée
     */
    async validateStoredSession() {
        try {
            const result = await ApiService.validateToken();
            
            if (!result.success) {
                console.log('❌ Session expirée, nettoyage...');
                this.clearSession();
            } else {
                console.log('✅ Session valide');
            }
        } catch (error) {
            console.error('Erreur de validation de session:', error);
            this.clearSession();
        }
    },

    /**
     * Suppression de la session
     */
    clearSession() {
        AppState.token = null;
        AppState.user = null;
        AppState.isAuthenticated = false;
        
        Utils.removeFromStorage(TOKEN_KEY);
        Utils.removeFromStorage(USER_KEY);
        
        console.log('🧹 Session nettoyée');
    },
};

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
    
    if (!AppState.isLoading) {
        Utils.showMessage('error', 'Une erreur inattendue s\'est produite');
    }
});

// Gestion des promesses rejetées
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    
    if (!AppState.isLoading) {
        Utils.showMessage('error', 'Une erreur de traitement s\'est produite');
    }
});

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    AppManager.init();
});

// Export pour les tests (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Utils,
        ApiService,
        LoginForm,
        AppManager,
        AppState,
    };
} 