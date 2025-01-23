let selectedFile = null;

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('resume');
    const uploadArea = document.getElementById('upload-area');
    const filePreview = document.getElementById('file-preview');
    const parseButton = document.getElementById('parse-resume');
    const parseStatus = document.getElementById('parse-status');

    // File Upload Handlers
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    parseButton.addEventListener('click', handleParse);
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        validateAndPreviewFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file) {
        validateAndPreviewFile(file);
    }
}

function validateAndPreviewFile(file) {
    const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(fileExtension)) {
        showParseStatus('Please upload a PDF, DOC, DOCX, or TXT file', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showParseStatus('File size should be less than 5MB', 'error');
        return;
    }

    selectedFile = file;
    displayFilePreview(file);
    document.getElementById('parse-resume').disabled = false;
}

function displayFilePreview(file) {
    const uploadArea = document.getElementById('upload-area');
    const filePreview = document.getElementById('file-preview');
    const parseStatus = document.getElementById('parse-status');

    // Hide upload area and status
    uploadArea.classList.add('hidden');
    parseStatus.classList.add('hidden');

    // Show file preview
    filePreview.classList.remove('hidden');
    filePreview.innerHTML = `
        <div class="file-preview-content">
            <div class="file-info">
                <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
            </div>
            <button class="remove-file">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;

    // Add event listener for remove button
    filePreview.querySelector('.remove-file').addEventListener('click', removeFile);
}

function removeFile() {
    selectedFile = null;
    const fileInput = document.getElementById('resume');
    const uploadArea = document.getElementById('upload-area');
    const filePreview = document.getElementById('file-preview');
    const parseStatus = document.getElementById('parse-status');
    const parseButton = document.getElementById('parse-resume');

    fileInput.value = '';
    uploadArea.classList.remove('hidden');
    filePreview.classList.add('hidden');
    parseStatus.classList.add('hidden');
    parseButton.disabled = true;
}

async function handleParse() {
    if (!selectedFile) return;

    const parseButton = document.getElementById('parse-resume');
    parseButton.disabled = true;

    showParseStatus('Parsing your resume...', 'parsing');

    try {
        let resumeText;
        if (selectedFile.type === 'application/pdf') {
            // Handle PDF files
            resumeText = await extractPDFContent(selectedFile);
        } else {
            // Handle other file types (doc, docx, txt)
            resumeText = await readFileContent(selectedFile);
        }

        console.log('Extracted text:', resumeText); // Debug log

        // Send to AI for parsing through background script
        const response = await chrome.runtime.sendMessage({
            action: "parseResume",
            content: resumeText
        });

        if (response.error) {
            throw new Error(response.error);
        }

        console.log('Parsed resume data:', response.resumeData); // Debug log

        showParseStatus('Resume parsed successfully!', 'success');

        // Store the parsed data
        await chrome.storage.local.set({ 
            'tempResumeData': response.resumeData,
            'originalResumeText': resumeText
        });

        // Open resume preview in a new window
        setTimeout(() => {
            chrome.windows.create({
                url: chrome.runtime.getURL('resume-preview.html'),
                type: 'popup',
                width: 800,
                height: 600,
                left: Math.round((screen.width - 800) / 2),
                top: Math.round((screen.height - 600) / 2)
            });
        }, 1500);

    } catch (error) {
        console.error('Parse error:', error);
        showParseStatus(error.message || 'Error parsing resume. Please try again.', 'error');
        parseButton.disabled = false;
    }
}

async function extractPDFContent(file) {
    try {
        // Load PDF.js if not already loaded
        if (!pdfjsLib) {
            pdfjsLib = window.pdfjsLib;
        }

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

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}


function showParseStatus(message, type) {
    const parseStatus = document.getElementById('parse-status');
    parseStatus.classList.remove('hidden', 'parsing', 'success', 'error');
    parseStatus.classList.add(type);

    parseStatus.innerHTML = `
        <div class="status-content">
            ${type === 'parsing' ? 
                '<svg class="loading-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>' 
                : type === 'success' ?
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path d="M20 6L9 17l-5-5"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>'
            }
            <span>${message}</span>
        </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
