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
    document.getElementById('name').value = data.name || '';
    document.getElementById('title').value = data.title || '';
    document.getElementById('skills').value = data.skills?.join(', ') || '';
    
    // Populate experience
    const container = document.getElementById('experience-container');
    data.experience?.forEach((exp, index) => {
        container.appendChild(createExperienceFields(exp, index));
    });

    // Populate education
    document.getElementById('degree').value = data.education?.degree || '';
    document.getElementById('field').value = data.education?.field || '';
    document.getElementById('school').value = data.education?.school || '';
}

function createExperienceFields(exp, index) {
    const div = document.createElement('div');
    div.className = 'experience-entry';
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
            <textarea name="experience[${index}].description" class="form-input" rows="2">${exp.description || ''}</textarea>
        </div>
        <button type="button" class="text-button remove-experience">Remove</button>
    `;
    return div;
}

function setupEventListeners() {
    document.getElementById('resume-form').addEventListener('submit', handleSubmit);
    document.getElementById('add-experience').addEventListener('click', addExperienceFields);
    document.getElementById('cancel').addEventListener('click', () => window.close());
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        title: document.getElementById('title').value,
        skills: document.getElementById('skills').value.split(',').map(s => s.trim()),
        experience: Array.from(document.querySelectorAll('.experience-entry')).map(entry => ({
            company: entry.querySelector('[name$=".company"]').value,
            title: entry.querySelector('[name$=".title"]').value,
            duration: entry.querySelector('[name$=".duration"]').value,
            description: entry.querySelector('[name$=".description"]').value
        })),
        education: {
            degree: document.getElementById('degree').value,
            field: document.getElementById('field').value,
            school: document.getElementById('school').value
        }
    };

    try {
        await chrome.storage.local.set({ 'finalResumeData': formData });
        window.close();
    } catch (error) {
        console.error('Error saving resume data:', error);
    }
}
