console.log('LinkedIn Conversation Starter content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "captureProfile") {
    try {
      console.log('Capturing profile content...');
      const profileContent = extractProfileContent();
      const processedContent = preprocessContent(profileContent);
      sendResponse({pageContent: processedContent});
      console.log('Content sent to popup');
    } catch (error) {
      console.error('Error capturing profile:', error);
      sendResponse({error: error.message});
    }
  }
  return true;
});

function extractProfileContent() {
  const name = document.querySelector('.text-heading-xlarge')?.innerText || '';
  const headline = document.querySelector('.text-body-medium')?.innerText || '';
  const about = document.querySelector('#about ~ div .display-flex')?.innerText || '';
  const experienceSection = document.querySelector('#experience ~ div .pvs-list')?.innerText || '';
  const skillsSection = document.querySelector('#skills ~ div .pvs-list')?.innerText || '';
  const recentActivity = document.querySelector('.feed-shared-update-v2')?.innerText || '';

  return `
    Name: ${name}
    Headline: ${headline}
    About: ${about}
    Experience: ${experienceSection}
    Skills: ${skillsSection}
    Recent Activity: ${recentActivity}
  `;
}

function preprocessContent(content) {
  // Remove URLs and links
  content = content.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
  
  // Remove image descriptions and brackets
  content = content.replace(/\[.*?\]/g, '');
  
  // Remove special characters while keeping basic punctuation
  content = content.replace(/[^\x20-\x7E\n.,!?-]/g, '');
  
  // Normalize whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  // Limit content length
  const maxLength = 8000;
  if (content.length > maxLength) {
    console.log(`Content truncated from ${content.length} to ${maxLength} characters`);
    content = content.substring(0, maxLength);
  }
  
  return content;
}
