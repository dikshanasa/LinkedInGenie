let resumeData = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Get parsed resume data from storage
    const result = await chrome.storage.local.get('tempResumeData');
    resumeData = result.tempResumeData;
    
    if (resumeData) {
        populateForm(resumeData);
    }

    setupEventListeners();
});

function populateForm(data) {
    // Basic Information
    document.getElementById('name').value = data.name || '';
    document.getElementById('title').value = data.title || '';
    
    // Skills
    if (data.skills && Array.isArray(data.skills)) {
        const skillsContainer = document.getElementById('skills-container');
        data.skills.forEach(skill => addSkillTag(skill));
    }
    
    // Experience
    const experienceContainer = document.getElementById('experience-container');
    if (data.experience && Array.isArray(data.experience)) {
        data.experience.forEach((exp, index) => {
            experienceContainer.appendChild(createExperienceEntry(exp, index));
        });
    }

    // Education
    if (data.education) {
        document.getElementById('degree').value = data.education.degree || '';
        document.getElementById('field').value = data.education.field || '';
        document.getElementById('school').value = data.education.school || '';
    }
}

function createExperienceEntry(exp, index) {
    const div = document.createElement('div');
    div.className = 'experience-entry fade-in';
    div.innerHTML = `
        <div class="form-group">
            <label>Company</label>
            <input type="text" name="experience[${index}].company" value="${exp.company || ''}" class="form-input">
        </div>
        <div class="form-group">
            <label>Title</label>
            <input type="text" name="experience[${index}].title" value="${exp.title || ''}" class="form-input">
        </div>
        <div class="form-group">
            <label>Duration</label>
            <input type="text" name="experience[${index}].duration" value="${exp.duration || ''}" class="form-input">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea name="experience[${index}].description" class="form-input" rows="3">${exp.description || ''}</textarea>
        </div>
        <button type="button" class="button-secondary remove-experience">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Entry
        </button>
    `;
    return div;
}

function createEducationEntry() {
    const div = document.createElement('div');
    div.className = 'education-entry fade-in';
    div.innerHTML = `
        <div class="form-group">
            <label>Degree</label>
            <input type="text" class="form-input" value="">
        </div>
        <div class="form-group">
            <label>Field of Study</label>
            <input type="text" class="form-input" value="">
        </div>
        <div class="form-group">
            <label>School</label>
            <input type="text" class="form-input" value="">
        </div>
        <button type="button" class="button-secondary remove-education">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Entry
        </button>
    `;
    return div;
}

function addSkillTag(skillText) {
    const skillsContainer = document.getElementById('skills-container');
    const skillTag = document.createElement('div');
    skillTag.className = 'skill-tag fade-in';
    skillTag.innerHTML = `
        <span>${skillText}</span>
        <button type="button" class="remove-skill">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>
    `;
    skillsContainer.appendChild(skillTag);

    skillTag.querySelector('.remove-skill').addEventListener('click', () => {
        skillTag.remove();
    });
}

function setupEventListeners() {
    // Back button
    document.getElementById('back-button')?.addEventListener('click', () => window.close());
    
    // Add skill
    const newSkillInput = document.getElementById('new-skill');
    document.getElementById('add-skill')?.addEventListener('click', () => {
        const skillText = newSkillInput.value.trim();
        if (skillText) {
            addSkillTag(skillText);
            newSkillInput.value = '';
        }
    });

    // Add new skill on Enter key
    newSkillInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const skillText = newSkillInput.value.trim();
            if (skillText) {
                addSkillTag(skillText);
                newSkillInput.value = '';
            }
        }
    });
    
    // Add experience
    document.getElementById('add-experience')?.addEventListener('click', () => {
        const experienceContainer = document.getElementById('experience-container');
        const newIndex = document.querySelectorAll('.experience-entry').length;
        const emptyExperience = { company: '', title: '', duration: '', description: '' };
        const newEntry = createExperienceEntry(emptyExperience, newIndex);
        experienceContainer.appendChild(newEntry);
        newEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Add education
    document.getElementById('add-education')?.addEventListener('click', () => {
        const educationContainer = document.getElementById('education-container');
        const newEntry = createEducationEntry();
        educationContainer.appendChild(newEntry);
        newEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    
    // Remove experience/education entries
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-experience') || 
            e.target.closest('.remove-experience')) {
            e.target.closest('.experience-entry').remove();
        }
        if (e.target.classList.contains('remove-education') || 
            e.target.closest('.remove-education')) {
            e.target.closest('.education-entry').remove();
        }
    });

    // Save and Cancel buttons
    document.getElementById('save')?.addEventListener('click', handleSave);
    document.getElementById('cancel')?.addEventListener('click', () => window.close());
}

async function handleSave() {
    try {
        // Get the current user's email from storage
        const userData = await chrome.storage.local.get('userData');
        const email = userData.userData?.email;

        const formData = {
            name: document.getElementById('name')?.value || '',
            title: document.getElementById('title')?.value || '',
            skills: Array.from(document.querySelectorAll('.skill-tag'))
                .map(tag => tag.querySelector('span')?.textContent)
                .filter(Boolean),
            experience: Array.from(document.querySelectorAll('.experience-entry'))
                .map(entry => ({
                    company: entry.querySelector('[name$=".company"]')?.value || '',
                    title: entry.querySelector('[name$=".title"]')?.value || '',
                    duration: entry.querySelector('[name$=".duration"]')?.value || '',
                    description: entry.querySelector('[name$=".description"]')?.value || ''
                })),
            education: Array.from(document.querySelectorAll('.education-entry'))
                .map(entry => ({
                    degree: entry.querySelector('input:nth-of-type(1)')?.value || '',
                    field: entry.querySelector('input:nth-of-type(2)')?.value || '',
                    school: entry.querySelector('input:nth-of-type(3)')?.value || ''
                }))
        };

        // Basic validation
        if (!formData.name || !formData.title) {
            throw new Error('Name and title are required fields');
        }

        // Update both finalResumeData and userData
        await chrome.storage.local.set({
            'finalResumeData': formData,
            'userData': { ...userData.userData, resumeData: formData }
        });

        // Show success message before closing
        const footer = document.querySelector('.card-footer');
        const successMsg = document.createElement('div');
        successMsg.className = 'success-message fade-in';
        successMsg.textContent = 'Changes saved successfully!';
        footer.insertBefore(successMsg, footer.firstChild);

        // Close window after brief delay
        setTimeout(() => window.close(), 1500);

    } catch (error) {
        console.error('Error saving resume data:', error);
        const footer = document.querySelector('.card-footer');
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message fade-in';
        errorMsg.textContent = error.message || 'Failed to save changes. Please try again.';
        footer.insertBefore(errorMsg, footer.firstChild);
        setTimeout(() => errorMsg.remove(), 3000);
    }
}

