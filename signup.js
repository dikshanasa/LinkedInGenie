document.addEventListener('DOMContentLoaded', function() {
    // Get form and buttons
    const signupForm = document.querySelector('.signup-form');
    const returnButton = document.getElementById('return-to-login');

    // Add form submit handler
    signupForm?.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevent form from submitting normally
        await handleSignup(e);
    });

    // Add return to login handler
    returnButton?.addEventListener('click', function() {
        window.close();
    });
});

async function handleSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showStatus('Please fill in all fields', 'error');
        return;
    }

    try {
        showStatus('Creating your account...', 'processing');
        
        // Get existing users
        const result = await chrome.storage.local.get(['users']);
        const users = result.users || {};
        
        if (users[email]) {
            showStatus('Email already registered', 'error');
            return;
        }

        const hashedPassword = btoa(password);
        users[email] = {
            password: hashedPassword,
            resumeData: null // Initialize with null, will be updated later
        };

        await chrome.storage.local.set({ 
            'users': users,
            'userData': { email, resumeData: null }
        });
        
        showStatus('Account created successfully! Please add your resume.', 'success');

        // Open resume update window
        chrome.windows.create({
            url: chrome.runtime.getURL('resume-update.html'),
            type: 'popup',
            width: 600,
            height: 800,
            left: Math.round((screen.width - 600) / 2),
            top: Math.round((screen.height - 800) / 2)
        });

    } catch (error) {
        console.error('Signup error:', error);
        showStatus(error.message || 'Failed to create account', 'error');
    }
}

function showStatus(message, type) {
    const statusContainer = document.createElement('div');
    statusContainer.className = `status-message ${type}`;
    statusContainer.innerHTML = `
        <div class="status-content">
            ${type === 'processing' ? '<div class="loading-spinner"></div>' : ''}
            <span>${message}</span>
        </div>
    `;

    // Remove any existing status messages
    const existingStatus = document.querySelector('.status-message');
    if (existingStatus) {
        existingStatus.remove();
    }

    document.body.appendChild(statusContainer);

    if (type !== 'processing') {
        setTimeout(() => {
            statusContainer.remove();
        }, 3000);
    } else {
        return statusContainer;
    }
}
