let selectedFile = null;

document.addEventListener('DOMContentLoaded', function() {
    const checkPdfLib = setInterval(() => {
        if (window.pdfjsLib) {
            clearInterval(checkPdfLib);
            initializeFileHandlers();
        }
    }, 100);
});

function initializeFileHandlers() {
    const fileInput = document.getElementById('resume');
    const fileName = document.getElementById('file-name');
    const parseButton = document.getElementById('parse-resume');
    const addExperienceButton = document.getElementById('add-experience');
    const addEducationButton = document.getElementById('add-education');
    const cancelEditButton = document.getElementById('cancel-edit');
    const resumeEditForm = document.getElementById('resume-edit-form');

    fileInput.addEventListener('change', function(e) {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            fileName.textContent = selectedFile.name;
            showStatus('File selected: ' + selectedFile.name, 'success');
            parseButton.disabled = false;
        }
    });

    parseButton.addEventListener('click', handleResumeUpdate);
    addExperienceButton?.addEventListener('click', addExperienceField);
    addEducationButton?.addEventListener('click', addEducationField);
    cancelEditButton?.addEventListener('click', () => window.close());
    resumeEditForm?.addEventListener('submit', handleFormSubmit);

    // Initialize container click handlers
    document.getElementById('experience-container')?.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-experience')) {
            e.target.closest('.experience-entry').remove();
        }
    });

    document.getElementById('education-container')?.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-education')) {
            e.target.closest('.education-entry').remove();
        }
    });
}

async function handleResumeUpdate() {
    if (!selectedFile) {
        showStatus('Please select a file', 'error');
        return;
    }

    try {
        showStatus('Processing resume...', 'processing');
        
        const resumeText = await extractTextFromFile(selectedFile);
        console.log('Extracted text length:', resumeText.length);

        if (!resumeText || resumeText.trim().length === 0) {
            throw new Error('No text content could be extracted from the file');
        }

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "parseResume",
                content: resumeText
            }, function(response) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                resolve(response);
            });
        });

        if (!response.resumeData) {
            throw new Error('No resume data received from parser');
        }

        showParsedContent(response.resumeData);
        document.getElementById('parse-resume').classList.add('hidden');
        showStatus('Resume parsed successfully! Please review and edit if needed.', 'success');

    } catch (error) {
        console.error('Resume update error:', error);
        showStatus(error.message || 'Failed to update resume', 'error');
    }
}

// [Previous file reading functions remain the same]

function showParsedContent(resumeData) {
    const parsedContent = document.getElementById('parsed-content');
    
    // Populate basic fields
    document.getElementById('edit-name').value = resumeData.name;
    document.getElementById('edit-title').value = resumeData.title;
    document.getElementById('edit-skills').value = resumeData.skills.join(', ');
    
    // Populate experience entries
    const experienceContainer = document.getElementById('experience-container');
    experienceContainer.innerHTML = '';
    resumeData.experience.forEach((exp) => {
        experienceContainer.appendChild(createExperienceEntry(exp));
    });
    
    // Populate education entries
    const educationContainer = document.getElementById('education-container');
    educationContainer.innerHTML = '';
    
    // Handle both single education object and array of education
    if (Array.isArray(resumeData.education)) {
        resumeData.education.forEach((edu) => {
            educationContainer.appendChild(createEducationEntry(edu));
        });
    } else if (resumeData.education) {
        educationContainer.appendChild(createEducationEntry(resumeData.education));
    }
    
    parsedContent.classList.remove('hidden');
}

function createExperienceEntry(experience = {}) {
    const div = document.createElement('div');
    div.className = 'experience-entry';
    div.innerHTML = `
        <div class="form-group">
            <label>Company:</label>
            <input type="text" class="form-input company" value="${experience.company || ''}" required>
        </div>
        <div class="form-group">
            <label>Title:</label>
            <input type="text" class="form-input title" value="${experience.title || ''}" required>
        </div>
        <div class="form-group">
            <label>Duration:</label>
            <input type="text" class="form-input duration" value="${experience.duration || ''}" required>
        </div>
        <div class="form-group">
            <label>Description:</label>
            <textarea class="form-input description" required>${experience.description || ''}</textarea>
        </div>
        <button type="button" class="remove-experience text-button">Remove</button>
    `;
    return div;
}

function createEducationEntry(education = {}) {
    const div = document.createElement('div');
    div.className = 'education-entry';
    div.innerHTML = `
        <div class="form-group">
            <label>Degree:</label>
            <input type="text" class="form-input degree" value="${education.degree || ''}" required>
        </div>
        <div class="form-group">
            <label>Field of Study:</label>
            <input type="text" class="form-input field" value="${education.field || ''}" required>
        </div>
        <div class="form-group">
            <label>School:</label>
            <input type="text" class="form-input school" value="${education.school || ''}" required>
        </div>
        <button type="button" class="remove-education text-button">Remove</button>
    `;
    return div;
}

function addExperienceField() {
    const container = document.getElementById('experience-container');
    container.appendChild(createExperienceEntry());
}

function addEducationField() {
    const container = document.getElementById('education-container');
    container.appendChild(createEducationEntry());
}

async function handleFormSubmit(e) {
    e.preventDefault();

    try {
        const updatedData = {
            name: document.getElementById('edit-name').value,
            title: document.getElementById('edit-title').value,
            skills: document.getElementById('edit-skills').value.split(',').map(s => s.trim()),
            experience: Array.from(document.querySelectorAll('.experience-entry')).map(entry => ({
                company: entry.querySelector('.company').value,
                title: entry.querySelector('.title').value,
                duration: entry.querySelector('.duration').value,
                description: entry.querySelector('.description').value
            })),
            education: Array.from(document.querySelectorAll('.education-entry')).map(entry => ({
                degree: entry.querySelector('.degree').value,
                field: entry.querySelector('.field').value,
                school: entry.querySelector('.school').value
            }))
        };

        await saveResumeData(updatedData);
    } catch (error) {
        console.error('Form submission error:', error);
        showStatus(error.message || 'Failed to save changes', 'error');
    }
}

// [Previous saveResumeData and showStatus functions remain the same]
async function extractTextFromFile(file) {
    if (file.type === 'application/pdf') {
        return extractTextFromPDF(file);
    } else {
        return readTextFile(file);
    }
}

async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}


async function saveResumeData(updatedData) {
    try {
        const result = await chrome.storage.local.get(['userData', 'users']);
        const userData = result.userData;
        const users = result.users || {};

        if (!userData?.email) {
            throw new Error('User not found. Please log in again.');
        }

        userData.resumeData = updatedData;
        users[userData.email].resumeData = updatedData;

        await chrome.storage.local.set({
            'userData': userData,
            'users': users
        });

        showStatus('Resume updated successfully!', 'success');
        setTimeout(() => window.close(), 1500);
    } catch (error) {
        throw new Error('Failed to save resume data: ' + error.message);
    }
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
}
