class AuthService {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.initializeAuthListeners();
        this.checkAuthState();
    }

    initializeAuthListeners() {
        document.getElementById('login-button')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openSignupWindow();
        });
        document.getElementById('logout')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('update-resume')?.addEventListener('click', () => this.openResumeUpdateWindow());
    }

    async checkAuthState() {
        try {
            const result = await chrome.storage.local.get('userData');
            if (result.userData) {
                this.isAuthenticated = true;
                this.currentUser = result.userData;
                this.showAuthenticatedUI();
            } else {
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.showLoginForm();
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
    
        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }
    
        try {
            const result = await chrome.storage.local.get(['users']);
            const users = result.users || {};
            console.log('Retrieved users:', users); // Debug log
    
            const hashedPassword = this.hashPassword(password);
            const user = users[email];
            
            console.log('Attempting login for:', email); // Debug log
            console.log('Stored user data:', user); // Debug log
            console.log('Provided password hash:', hashedPassword); // Debug log
    
            if (user && user.password === hashedPassword) {
                this.currentUser = {
                    email,
                    resumeData: user.resumeData
                };
                
                await chrome.storage.local.set({ 'userData': this.currentUser });
                console.log('Login successful, user data stored'); // Debug log
                
                this.isAuthenticated = true;
                this.showAuthenticatedUI();
            } else {
                console.log('Login failed - invalid credentials'); // Debug log
                this.showError('Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        }
    }
    

    async handleLogout() {
        try {
            await chrome.storage.local.remove('userData');
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showLoginForm();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    openSignupWindow() {
        chrome.windows.create({
            url: chrome.runtime.getURL('signup.html'),
            type: 'popup',
            width: 400,
            height: 600,
            left: Math.round((screen.width - 400) / 2),
            top: Math.round((screen.height - 600) / 2)
        });
    }

    openResumeUpdateWindow() {
        chrome.windows.create({
            url: chrome.runtime.getURL('resume-update.html'),
            type: 'popup',
            width: 400,
            height: 400,
            left: Math.round((screen.width - 400) / 2),
            top: Math.round((screen.height - 400) / 2)
        });
    }

    showAuthenticatedUI() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.updateResumeDisplay(this.currentUser.resumeData);
    }

    showLoginForm() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    updateResumeDisplay(resumeData) {
        const resumeInfo = document.getElementById('resume-info');
        if (resumeData) {
            resumeInfo.innerHTML = `
                <p><strong>Current Role:</strong> ${resumeData.title}</p>
                <p><strong>Skills:</strong> ${resumeData.skills.join(', ')}</p>
                <p><strong>Recent Experience:</strong> ${resumeData.experience[0].title} at ${resumeData.experience[0].company}</p>
            `;
        }
    }

    showError(message) {
        const status = document.createElement('div');
        status.className = 'status error';
        status.textContent = message;
        
        const container = document.querySelector('.auth-section');
        container.insertBefore(status, container.firstChild);
        
        setTimeout(() => status.remove(), 3000);
    }

    hashPassword(password) {
        return btoa(password);
    }
}

// Initialize auth on load
const auth = new AuthService();
