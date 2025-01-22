let selectedFile = null;

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('resume');
    const fileName = document.getElementById('file-name');
    const signupButton = document.getElementById('signup-button');
    const closeButton = document.getElementById('close-signup');

    fileInput.addEventListener('change', function(e) {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            fileName.textContent = selectedFile.name;
        }
    });

    signupButton.addEventListener('click', handleSignup);
    closeButton.addEventListener('click', closeSignupWindow);
});

async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const statusElement = document.getElementById('status');

    if (!email || !password || !selectedFile) {
        showStatus('Please fill in all fields and upload a resume', 'error');
        return;
    }

    try {
        showStatus('Processing signup...', 'processing');
        
        // Get existing users
        const result = await chrome.storage.local.get(['users']);
        const users = result.users || {};
        
        // Check if user already exists
        if (users[email]) {
            showStatus('Email already registered', 'error');
            return;
        }

        const resumeContent = await readFileContent(selectedFile);
        const response = await chrome.runtime.sendMessage({
            action: "parseResume",
            content: resumeContent
        });

        if (response.error) {
            throw new Error(response.error);
        }

        // Hash password
        const hashedPassword = btoa(password); // Using same hash method as login

        // Create new user
        users[email] = {
            password: hashedPassword,
            resumeData: response.resumeData
        };

        // Store updated users
        await chrome.storage.local.set({ 'users': users });
        console.log('User registered:', email); // Debug log
        console.log('Updated users:', users); // Debug log

        showStatus('Account created successfully!', 'success');
        setTimeout(() => window.close(), 1500);

    } catch (error) {
        console.error('Signup error:', error);
        showStatus(error.message || 'Failed to create account', 'error');
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

async function hashPassword(password) {
    // In a real application, use a proper hashing algorithm
    // This is just for demonstration
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
}

function closeSignupWindow() {
    window.close();
}
