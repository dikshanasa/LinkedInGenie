let profileData = null;
let selectedIceBreaker = null;
let selectedGoal = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Popup DOM loaded');
    
    // Initial check for logged-in state
    const result = await chrome.storage.local.get('userData');
    if (result.userData) {
        document.getElementById('auth-section')?.classList.add('hidden');
        document.getElementById('main-app')?.classList.remove('hidden');
        document.getElementById('logout')?.classList.remove('hidden');
        updateResumeDisplay(result.userData.resumeData);
    }

    // Initialize UI and setup basic event listeners
    await initializeUI();
    setupEventListeners();

    // Login button click handler
    const loginButton = document.getElementById('login-button');
    loginButton?.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showStatus('Please enter both email and password', 'error');
            return;
        }

        try {
            const result = await chrome.storage.local.get(['users']);
            const users = result.users || {};
            const hashedPassword = btoa(password);
            const user = users[email];

            if (user && user.password === hashedPassword) {
                const userData = {
                    email,
                    resumeData: user.resumeData
                };
                
                await chrome.storage.local.set({ 'userData': userData });
                
                // Update UI elements
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                document.getElementById('logout').classList.remove('hidden');
                
                if (user.resumeData) {
                    updateResumeDisplay(user.resumeData);
                }
                
                showStatus('Login successful!', 'success');
            } else {
                showStatus('Invalid email or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showStatus('Login failed. Please try again.', 'error');
        }
    });
    // Add this after the DOMContentLoaded event listener
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.finalResumeData) {
        const userData = {
            email: changes.finalResumeData.newValue.email,
            resumeData: changes.finalResumeData.newValue
        };
        
        // Update storage with new resume data
        chrome.storage.local.get(['userData'], function(result) {
            if (result.userData) {
                result.userData.resumeData = changes.finalResumeData.newValue;
                chrome.storage.local.set({ 'userData': result.userData }, function() {
                    // Update the display
                    updateResumeDisplay(changes.finalResumeData.newValue);
                });
            }
        });
    }
});


    // Add logout button handler
    const logoutButton = document.getElementById('logout');
    logoutButton?.addEventListener('click', handleLogout);

    // Add sign-up button handler
    const signupButton = document.getElementById('show-signup');
    signupButton?.addEventListener('click', function(e) {
        e.preventDefault();
        
        chrome.windows.create({
            url: chrome.runtime.getURL('signup.html'),
            type: 'popup',
            width: 400,
            height: 600,
            left: Math.round((screen.width - 400) / 2),
            top: Math.round((screen.height - 600) / 2)
        });
    });
});

// Logout handler function
async function handleLogout() {
    try {
        await chrome.storage.local.remove('userData');
        
        // Update UI elements
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('logout').classList.add('hidden');
        
        // Clear any input fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        showStatus('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showStatus('Error logging out', 'error');
    }
}


// Logout handler function
async function handleLogout() {
    try {
        await chrome.storage.local.remove('userData');
        
        // Update UI elements
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('logout').classList.add('hidden'); // Hide logout button
        
        // Clear any input fields
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
        showStatus('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showStatus('Error logging out', 'error');
    }
}


async function initializeUI() {
    try {
        const result = await chrome.storage.local.get('userData');
        if (result.userData) {
            document.getElementById('auth-section')?.classList.add('hidden');
            document.getElementById('main-app')?.classList.remove('hidden');
            updateResumeDisplay(result.userData.resumeData);
        }

        // Initialize collapsible sections
        const toggleButtons = document.querySelectorAll('.section-toggle');
        toggleButtons.forEach(button => {
            const sectionId = button.getAttribute('data-section');
            const content = document.getElementById(sectionId);
            
            // Set initial state
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            if (content) {
                content.style.display = isExpanded ? 'block' : 'none';
            }
            
            button.addEventListener('click', () => toggleSection(button, content));
        });

    } catch (error) {
        console.error('UI initialization error:', error);
        showStatus('Failed to initialize UI', 'error');
    }
}

function setupEventListeners() {
    document.getElementById('capture-profile')?.addEventListener('click', captureProfile);
    document.getElementById('generate-message')?.addEventListener('click', generateMessage);
    document.getElementById('update-resume')?.addEventListener('click', openResumeUpdateWindow);
    document.getElementById('logout')?.addEventListener('click', handleLogout);

    // Goal options
    document.querySelectorAll('.goal-option').forEach(option => {
        option.addEventListener('click', (e) => handleGoalSelection(e));
    });
}

function toggleSection(button, content) {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', !isExpanded);
    
    const chevron = button.querySelector('.chevron');
    if (chevron) {
        chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    }
    
    if (content) {
        content.style.display = isExpanded ? 'none' : 'block';
        if (!isExpanded) {
            content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}
function updateResumeDisplay(resumeData) {
    if (!resumeData) return;

    // Current Role Card
    const currentRoleContent = document.getElementById('current-role-content');
    if (currentRoleContent) {
        currentRoleContent.innerHTML = `
            <div class="grid-2">
                <div class="form-field">
                    <label>Role Title</label>
                    <div class="field-value">${resumeData.title || 'Not specified'}</div>
                </div>
                <div class="form-field">
                    <label>Company</label>
                    <div class="field-value">${resumeData.experience?.[0]?.company || 'Not specified'}</div>
                </div>
            </div>
        `;
    }

    // Skills Card
    const skillsContent = document.getElementById('skills-content');
    if (skillsContent && resumeData.skills) {
        skillsContent.innerHTML = resumeData.skills
            .map(skill => `<span class="skill-tag">${skill}</span>`)
            .join('');
    }

    // Experience Timeline
    const experienceContent = document.getElementById('experience-content');
    if (experienceContent && resumeData.experience) {
        experienceContent.innerHTML = resumeData.experience
            .map(exp => `
                <div class="timeline-entry">
                    <div class="entry-header">
                        <h4 class="entry-title">${exp.title}</h4>
                        <span class="entry-duration">${exp.duration}</span>
                    </div>
                    <div class="entry-company">${exp.company}</div>
                    <p class="entry-description">${exp.description}</p>
                </div>
            `)
            .join('');
    }
}

async function captureProfile() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab?.url?.includes('linkedin.com')) {
            throw new Error('Please navigate to a LinkedIn profile page');
        }

        showStatus('Capturing profile...', 'processing');

        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (error) {
            throw new Error('Failed to inject content script: ' + error.message);
        }

        const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: "captureProfile" }, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!result) {
                    reject(new Error('No response from content script'));
                    return;
                }
                resolve(result);
            });
        });

        if (!response.pageContent) {
            throw new Error('No profile content captured');
        }

        showStatus('Processing profile data...', 'processing');

        const processedData = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "processProfileData",
                content: response.pageContent
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response.profileData);
            });
        });

        profileData = processedData;
        displayProfileInfo(profileData);
        showStatus('Profile captured successfully!', 'success');

        // Expand message goal section
        const messageToggle = document.querySelector('[data-section="message-section"]');
        if (messageToggle) {
            messageToggle.click();
        }

    } catch (error) {
        console.error('Profile capture error:', error);
        showStatus(error.message || 'Failed to capture profile', 'error');
        const profileInfo = document.getElementById('profile-info');
        if (profileInfo) {
            profileInfo.classList.add('hidden');
        }
    }
}

function displayProfileInfo(data) {
    if (!data) return;

    const profileInfo = document.getElementById('profile-info');
    if (!profileInfo) return;

    profileInfo.innerHTML = `
        <div class="info-card">
            <div class="card-header">
                <h4>${data.name || 'Name not available'}</h4>
            </div>
            <div class="card-content">
                <div class="profile-field">
                    <label>Current Role</label>
                    <div>${data.title || 'Not available'}</div>
                </div>
                <div class="profile-field">
                    <label>Company</label>
                    <div>${data.company || 'Not available'}</div>
                </div>
                <div class="profile-field">
                    <label>Skills</label>
                    <div class="skills-container">
                        ${data.skills ? data.skills.map(skill => 
                            `<span class="skill-tag">${skill}</span>`
                        ).join('') : 'No skills listed'}
                    </div>
                </div>
                ${data.about ? `
                    <div class="profile-field">
                        <label>About</label>
                        <div class="about-content">${data.about.substring(0, 200)}...</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    profileInfo.classList.remove('hidden');
}
function handleGoalSelection(event) {
    const goalButton = event.currentTarget;
    selectedGoal = goalButton.getAttribute('data-goal');
    
    // Update UI
    document.querySelectorAll('.goal-option').forEach(btn => {
        btn.classList.remove('selected');
    });
    goalButton.classList.add('selected');
    
    // Generate ice breakers if profile is captured
    if (profileData) {
        generateIceBreakers();
    }
}

async function generateIceBreakers() {
    if (!profileData || !selectedGoal) {
        showStatus('Please capture a profile and select a message goal first', 'error');
        return;
    }

    const iceBreakersSection = document.getElementById('ice-breakers');
    
    try {
        const result = await chrome.storage.local.get('userData');
        const resumeData = result.userData?.resumeData;

        if (!resumeData) {
            throw new Error('Resume data not found. Please update your resume.');
        }

        showStatus('Generating ice breakers...', 'processing');

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "generateIceBreakers",
                data: {
                    profileData: profileData,
                    resumeData: resumeData,
                    goal: selectedGoal
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response.iceBreakers);
            });
        });

        displayIceBreakers(response);
        showStatus('Ice breakers generated!', 'success');
        
        // Scroll to ice breakers section
        iceBreakersSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Ice breaker generation error:', error);
        showStatus(error.message || 'Failed to generate ice breakers', 'error');
    }
}

function displayIceBreakers(iceBreakers) {
    const container = document.getElementById('ice-breakers');
    if (!container) return;

    const iceBreakersContainer = container.querySelector('.ice-breakers-container');
    if (!iceBreakersContainer) return;

    // Set up tab functionality
    const tabs = container.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            displayCategoryIceBreakers(tab.dataset.category, iceBreakers);
        });
    });

    // Display initial category
    displayCategoryIceBreakers('skills', iceBreakers);
    container.classList.remove('hidden');
}

function displayCategoryIceBreakers(category, iceBreakers) {
    const container = document.querySelector('.ice-breakers-container');
    if (!container) return;

    const categoryMap = {
        'skills': 'Skills & Experience',
        'recent': 'Recent Activity',
        'company': 'Company & Role'
    };

    const options = iceBreakers[categoryMap[category]] || [];
    
    container.innerHTML = options.map(option => `
        <div class="ice-breaker-card" data-icebreaker="${option}">
            <div class="ice-breaker-content">
                ${option}
            </div>
            <div class="ice-breaker-footer">
                <span>Click to select</span>
                <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.ice-breaker-card').forEach(card => {
        card.addEventListener('click', () => {
            container.querySelectorAll('.ice-breaker-card').forEach(c => 
                c.classList.remove('selected')
            );
            card.classList.add('selected');
            selectedIceBreaker = card.dataset.icebreaker;
        });
    });
}

async function generateMessage() {
    if (!profileData || !selectedIceBreaker || !selectedGoal) {
        showStatus('Please complete all steps before generating a message', 'error');
        return;
    }

    const messageSection = document.getElementById('generated-message');
    const contentWrapper = messageSection?.querySelector('.message-content-wrapper');
    
    try {
        const result = await chrome.storage.local.get('userData');
        const resumeData = result.userData?.resumeData;

        if (!resumeData) {
            throw new Error('Resume data not found. Please update your resume.');
        }

        // Show loading state with exponential backoff
        let retryCount = 0;
        const maxRetries = 3;
        let delay = 1000;

        while (retryCount < maxRetries) {
            try {
                messageSection?.classList.remove('hidden');
                if (contentWrapper) {
                    contentWrapper.innerHTML = `
                        <div class="loading-state">
                            <span class="loading-spinner"></span>
                            <span>Generating your message...</span>
                        </div>
                    `;
                }

                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        action: "generateMessage",
                        data: {
                            profileData: profileData,
                            resumeData: resumeData,
                            iceBreaker: selectedIceBreaker,
                            goal: selectedGoal,
                            length: 'medium'
                        }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        if (response.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        resolve(response.message);
                    });
                });

                displayGeneratedMessage(response);
                showStatus('Message generated successfully!', 'success');
                break;

            } catch (error) {
                if (error.message.includes('429')) {
                    retryCount++;
                    if (retryCount === maxRetries) {
                        throw new Error('Rate limit exceeded. Please try again later.');
                    }
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }
                throw error;
            }
        }

    } catch (error) {
        console.error('Message generation error:', error);
        if (contentWrapper) {
            contentWrapper.innerHTML = `
                <div class="error-state">
                    ${error.message || 'Failed to generate message'}
                </div>
            `;
        }
        showStatus(error.message || 'Failed to generate message', 'error');
    }
}
async function openResumeUpdateWindow() {
    try {
        const width = 600;
        const height = 800;
        const left = Math.round((screen.width - width) / 2);
        const top = Math.round((screen.height - height) / 2);

        chrome.windows.create({
            url: chrome.runtime.getURL('resume-update.html'),
            type: 'popup',
            width: width,
            height: height,
            left: left,
            top: top
        });
    } catch (error) {
        console.error('Error opening resume update window:', error);
        showStatus('Failed to open resume update window', 'error');
    }
}

// Also add handleLogout function if missing
async function handleLogout() {
    try {
        await chrome.storage.local.remove('userData');
        document.getElementById('auth-section')?.classList.remove('hidden');
        document.getElementById('main-app')?.classList.add('hidden');
        showStatus('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showStatus('Error logging out', 'error');
    }
}

function displayGeneratedMessage(message) {
    const messageSection = document.getElementById('generated-message');
    if (!messageSection) return;

    const contentElement = messageSection.querySelector('.message-content');
    if (contentElement) {
        contentElement.textContent = message;
    }

    // Ensure copy button is properly set up
    const copyButton = document.getElementById('copy-message');
    if (copyButton) {
        copyButton.addEventListener('click', copyMessageToClipboard);
    }

    messageSection.classList.remove('hidden');
    messageSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function copyMessageToClipboard() {
    const messageContent = document.querySelector('.message-content')?.textContent;
    if (!messageContent) return;

    const copyButton = document.getElementById('copy-message');
    
    try {
        await navigator.clipboard.writeText(messageContent);
        
        if (copyButton) {
            const originalContent = copyButton.innerHTML;
            copyButton.innerHTML = `
                <svg class="icon copy-success" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Copied!
            `;
            copyButton.classList.add('copied');
            
            setTimeout(() => {
                copyButton.innerHTML = originalContent;
                copyButton.classList.remove('copied');
            }, 2000);
        }
    } catch (error) {
        console.error('Copy error:', error);
        showStatus('Failed to copy message', 'error');
    }
}


function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    statusElement.innerHTML = `
        <div class="status-icon">
            ${type === 'success' ? `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
            ` : type === 'error' ? `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            ` : `
                <svg class="icon loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
            `}
        </div>
        <span>${message}</span>
    `;
    
    statusElement.className = `status ${type}`;
    
    if (type !== 'processing') {
        setTimeout(() => {
            statusElement.innerHTML = '';
            statusElement.className = 'status';
        }, 3000);
    }
}
