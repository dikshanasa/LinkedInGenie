let profileData = null;
let selectedIceBreaker = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Popup DOM loaded');
    
    // Check authentication state
    const result = await chrome.storage.local.get('userData');
    if (result.userData) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        updateResumeDisplay(result.userData.resumeData);
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    // Add event listeners
    document.getElementById('login-button')?.addEventListener('click', handleLogin);
    document.getElementById('show-signup')?.addEventListener('click', handleSignupClick);
    document.getElementById('logout')?.addEventListener('click', handleLogout);
    document.getElementById('capture-profile')?.addEventListener('click', captureProfile);
    document.getElementById('message-goal')?.addEventListener('change', generateIceBreakers);
    document.getElementById('generate-message')?.addEventListener('click', generateMessage);
    document.getElementById('update-resume')?.addEventListener('click', openResumeUpdateWindow);
});

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showStatus('Please enter both email and password', 'error');
        return;
    }

    try {
        const result = await chrome.storage.local.get(['users']);
        const users = result.users || {};
        const user = users[email];
        const hashedPassword = btoa(password);

        if (user && user.password === hashedPassword) {
            const userData = {
                email,
                resumeData: user.resumeData
            };
            
            await chrome.storage.local.set({ 'userData': userData });
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            updateResumeDisplay(user.resumeData);
            showStatus('Login successful!', 'success');
        } else {
            showStatus('Invalid email or password', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatus('Login failed. Please try again.', 'error');
    }
}

function handleSignupClick(e) {
    e.preventDefault();
    chrome.windows.create({
        url: chrome.runtime.getURL('signup.html'),
        type: 'popup',
        width: 400,
        height: 600,
        left: Math.round((screen.width - 400) / 2),
        top: Math.round((screen.height - 600) / 2)
    });
}

async function handleLogout() {
    try {
        await chrome.storage.local.remove('userData');
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        showStatus('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showStatus('Error logging out', 'error');
    }
}

function openResumeUpdateWindow() {
    chrome.windows.create({
        url: chrome.runtime.getURL('resume-update.html'),
        type: 'popup',
        width: 400,
        height: 600,
        left: Math.round((screen.width - 400) / 2),
        top: Math.round((screen.height - 600) / 2)
    });
}

function updateResumeDisplay(resumeData) {
    if (!resumeData) return;

    const resumeInfo = document.getElementById('resume-info');
    resumeInfo.innerHTML = `
        <div class="resume-section">
            <h4>Current Role</h4>
            <p>${resumeData.title || 'Not specified'}</p>
        </div>
        <div class="resume-section">
            <h4>Skills</h4>
            <p>${resumeData.skills.join(', ') || 'No skills listed'}</p>
        </div>
        <div class="resume-section">
            <h4>Experience</h4>
            ${resumeData.experience.map(exp => `
                <div class="experience-item">
                    <p><strong>${exp.title}</strong> at ${exp.company}</p>
                    <p>${exp.duration}</p>
                    <p>${exp.description}</p>
                </div>
            `).join('')}
        </div>
    `;
}

async function captureProfile() {
    console.log('Starting profile capture...');
    const statusElement = document.getElementById('status');
    const profileInfo = document.getElementById('profile-info');

    try {
        // Check if we're on LinkedIn
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab?.url?.includes('linkedin.com')) {
            throw new Error('Please navigate to a LinkedIn profile page');
        }

        showStatus('Capturing profile...', 'processing');

        // Inject content script
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        } catch (error) {
            console.error('Script injection error:', error);
            throw new Error('Failed to initialize profile capture');
        }

        // Capture profile content
        const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: "captureProfile" }, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (!result) {
                    reject(new Error('No response from page'));
                } else {
                    resolve(result);
                }
            });
        });

        if (!response?.pageContent) {
            throw new Error('No profile content captured');
        }

        showStatus('Processing profile data...', 'processing');
        
        // Process the captured data
        profileData = await processProfileData(response.pageContent);
        
        if (!profileData) {
            throw new Error('Failed to process profile data');
        }

        // Display the processed data
        displayProfileInfo(profileData);
        document.getElementById('message-options').classList.remove('hidden');
        showStatus('Profile captured successfully!', 'success');

    } catch (error) {
        console.error('Profile capture error:', error);
        showStatus(error.message || 'Failed to capture profile', 'error');
        if (profileInfo) {
            profileInfo.classList.add('hidden');
        }
    }
}

async function processProfileData(content) {
    try {
        // Add a Promise wrapper around the message sending
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "processProfileData",
                content: content
            }, function(response) {
                // Check for runtime error immediately
                const lastError = chrome.runtime.lastError;
                if (lastError) {
                    reject(new Error(lastError.message));
                    return;
                }
                resolve(response);
            });
        });

        // Validate response
        if (!response || !response.profileData) {
            throw new Error('Invalid response from background script');
        }

        return response.profileData;

    } catch (error) {
        console.error('Profile processing error:', error);
        throw new Error(`Failed to process profile data: ${error.message}`);
    }
}




function displayProfileInfo(profileData) {
    const profileInfo = document.getElementById('profile-info');
    if (!profileInfo || !profileData) return;

    profileInfo.innerHTML = `
        <div class="profile-section">
            <h4>${profileData.name || 'Name not available'}</h4>
            <p><strong>Title:</strong> ${profileData.title || 'Title not available'}</p>
            <p><strong>Company:</strong> ${profileData.company || 'Company not available'}</p>
            <p><strong>Skills:</strong> ${profileData.skills ? profileData.skills.join(', ') : 'No skills listed'}</p>
            <p><strong>About:</strong> ${profileData.about ? 
                (profileData.about.length > 200 ? profileData.about.substring(0, 200) + '...' : profileData.about) 
                : 'No about section available'}</p>
            ${profileData.recentPost ? 
                `<p><strong>Recent Activity:</strong> ${profileData.recentPost.substring(0, 100)}...</p>` 
                : ''}
        </div>
    `;
    profileInfo.classList.remove('hidden');
}

async function generateIceBreakers() {
    if (!profileData) {
        showStatus('Please capture a LinkedIn profile first', 'error');
        return;
    }

    const goal = document.getElementById('message-goal').value;
    if (!goal) {
        showStatus('Please select a message goal', 'error');
        return;
    }

    try {
        const result = await chrome.storage.local.get('userData');
        const resumeData = result.userData?.resumeData;

        if (!resumeData) {
            throw new Error('Resume data not found. Please update your resume.');
        }

        showStatus('Generating ice breakers...', 'processing');

        const response = await chrome.runtime.sendMessage({
            action: "generateIceBreakers",
            data: {
                profileData: profileData,
                resumeData: resumeData,
                goal: goal
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }

        displayIceBreakers(response.iceBreakers);
        showStatus('Ice breakers generated!', 'success');
    } catch (error) {
        console.error('Ice breaker generation error:', error);
        showStatus(error.message || 'Failed to generate ice breakers', 'error');
    }
}

function displayIceBreakers(iceBreakers) {
    const container = document.getElementById('ice-breakers');
    container.innerHTML = '<h3>Ice Breaker Options</h3>';
    
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'ice-breakers-container';

    Object.entries(iceBreakers).forEach(([category, options]) => {
        const categorySection = document.createElement('div');
        categorySection.className = 'ice-breaker-category';
        
        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = category;
        categorySection.appendChild(categoryTitle);

        const iceBreakersArray = Array.isArray(options) ? options : [options];
        iceBreakersArray.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'ice-breaker-btn';
            button.addEventListener('click', () => selectIceBreaker(option, button));
            categorySection.appendChild(button);
        });

        categoriesContainer.appendChild(categorySection);
    });

    container.appendChild(categoriesContainer);
    container.classList.remove('hidden');
    document.getElementById('message-length-option').classList.remove('hidden');
}

function selectIceBreaker(iceBreaker, button) {
    selectedIceBreaker = iceBreaker;
    
    document.querySelectorAll('.ice-breaker-btn').forEach(btn => 
        btn.classList.remove('selected')
    );
    
    button.classList.add('selected');
}

async function generateMessage() {
    if (!profileData || !selectedIceBreaker) {
        showStatus('Please complete all steps before generating a message', 'error');
        return;
    }

    const goal = document.getElementById('message-goal').value;
    const length = document.getElementById('message-length').value;
    const messageElement = document.getElementById('generated-message');

    try {
        const result = await chrome.storage.local.get('userData');
        const resumeData = result.userData?.resumeData;

        if (!resumeData) {
            throw new Error('Resume data not found. Please update your resume.');
        }

        showStatus('Generating message...', 'processing');

        const response = await chrome.runtime.sendMessage({
            action: "generateMessage",
            data: {
                profileData: profileData,
                resumeData: resumeData,
                iceBreaker: selectedIceBreaker,
                goal: goal,
                length: length
            }
        });

        if (response.error) {
            throw new Error(response.error);
        }

        messageElement.innerHTML = `
            <div class="message-container">
                <div class="message-content">${response.message}</div>
                <button id="copy-message" class="copy-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Message
                </button>
            </div>`;
        messageElement.classList.remove('hidden');
        
        document.getElementById('copy-message').addEventListener('click', copyMessageToClipboard);
        showStatus('Message generated successfully!', 'success');
    } catch (error) {
        console.error('Message generation error:', error);
        showStatus(error.message || 'Failed to generate message', 'error');
    }
}

async function copyMessageToClipboard() {
    const messageContent = document.querySelector('.message-content').textContent;
    const copyButton = document.getElementById('copy-message');

    try {
        await navigator.clipboard.writeText(messageContent);
        copyButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copied!`;
        copyButton.classList.add('copied');
        
        setTimeout(() => {
            copyButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Message`;
            copyButton.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.error('Failed to copy message:', err);
        showStatus('Failed to copy message', 'error');
    }
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    
    if (type !== 'processing') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }, 3000);
    }
}
