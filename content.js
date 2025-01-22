console.log('LinkedIn Conversation Starter content script loaded');

// Notify background script that content script is loaded
chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === "captureProfile") {
    try {
      console.log('Capturing profile content...');
      const rawContent = document.body.innerText || document.body.textContent;
      console.log('Raw content length:', rawContent.length);
      
      const processedContent = preprocessContent(rawContent);
      console.log('Processed content length:', processedContent.length);
      
      sendResponse({pageContent: processedContent});
      console.log('Content sent to popup');
    } catch (error) {
      console.error('Error capturing profile:', error);
      sendResponse({error: error.message});
    }
  }
  return true;  // Keep the message channel open for async response
});

function preprocessContent(content) {
  console.log('Preprocessing content...');
  
  // Remove URLs and links
  content = content.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
  
  // Remove image descriptions and brackets
  content = content.replace(/\[.*?\]/g, '');
  
  // Remove special characters and emojis
  content = content.replace(/[^\x00-\x7F]/g, '');
  
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
