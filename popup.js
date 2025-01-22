let profileData = null;
let selectedIceBreaker = null;

document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup DOM loaded');
  const captureButton = document.getElementById('capture-profile');
  const generateButton = document.getElementById('generate-message');
  const messageGoal = document.getElementById('message-goal');
  const messageLengthOption = document.getElementById('message-length-option');

  captureButton.addEventListener('click', captureProfile);
  generateButton.addEventListener('click', generateMessage);
  messageGoal.addEventListener('change', generateIceBreakers);
  displaySavedMessages();
});

async function captureProfile() {
  console.log('Capturing profile...');
  const statusElement = document.getElementById('status');
  const profileInfo = document.getElementById('profile-info');
  statusElement.textContent = 'Capturing profile content...';
  profileInfo.classList.add('hidden');

  try {
    // Check if we're on LinkedIn
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab.url.includes('linkedin.com')) {
      throw new Error('Please navigate to a LinkedIn profile page');
    }

    // Ensure content script is injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    console.log('Sending message to content script...');
    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, {action: "captureProfile"}, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.pageContent) {
      console.log('Received page content, processing...');
      statusElement.textContent = 'Content captured. Processing with AI...';
      profileData = await processProfileData(response.pageContent);
      console.log('Profile data processed:', profileData);
      statusElement.textContent = 'Profile processed successfully!';
      displayProfileInfo(profileData);
      document.getElementById('message-options').classList.remove('hidden');
    } else {
      throw new Error('Failed to capture profile content');
    }
  } catch (error) {
    console.error('Error in captureProfile:', error);
    statusElement.textContent = `Error: ${error.message}`;
    showError(profileInfo, "Unable to capture profile. Make sure you're on a LinkedIn profile page.");
  }
}

// ... rest of your popup.js code remains the same


async function processProfileData(content) {
  console.log('Processing profile data...');
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: "processProfileData", content: content}, function(response) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response.profileData);
      }
    });
  });
}

function displayProfileInfo(profileData) {
  console.log('Displaying profile info...');
  const profileInfo = document.getElementById('profile-info');
  profileInfo.innerHTML = `
    <h3>${profileData.name || 'Name not available'}</h3>
    <p><strong>Skills:</strong> ${profileData.skills ? profileData.skills.join(', ') : 'No skills listed'}</p>
    <p><strong>About:</strong> ${profileData.about ? profileData.about.substring(0, 200) + '...' : 'No about section available'}</p>
    ${profileData.recentPost ? `<p><strong>Recent Post:</strong> ${typeof profileData.recentPost === 'string' ? profileData.recentPost.substring(0, 100) + '...' : 'Post content not available'}</p>` : ''}
  `;
  profileInfo.classList.remove('hidden');
  console.log('Profile info displayed');
}

async function generateIceBreakers() {
  console.log('Generating ice breakers...');
  if (!profileData) {
    console.warn('No profile data available for ice breakers');
    return;
  }

  const goal = document.getElementById('message-goal').value;
  const iceBreakers = document.getElementById('ice-breakers');
  iceBreakers.innerHTML = '<h3>Ice Breaker Suggestions:</h3>';
  iceBreakers.classList.remove('hidden');

  try {
    const prompt = `Generate 3 unique ice breakers for a ${goal} message to ${profileData.name}. 
    Their skills include ${profileData.skills.join(', ')}. 
    About them: ${profileData.about}
    ${profileData.recentPost ? `They recently posted about: ${profileData.recentPost}` : ''}
    
    The ice breakers should be professional, personalized, and engaging.`;

    const iceBreakersArray = [
      `I noticed your experience in ${profileData.skills[0]}. How has this skill been valuable in your current role?`,
      `Your background in ${profileData.skills[1] || profileData.skills[0]} caught my attention. I'd love to learn more about your work.`,
      `I see you've worked extensively in ${profileData.about ? profileData.about.substring(0, 30) + '...' : 'your field'}. Would you be open to connecting?`
    ];

    iceBreakersArray.forEach((iceBreaker, index) => {
      const button = document.createElement('button');
      button.textContent = iceBreaker;
      button.classList.add('ice-breaker-btn');
      button.addEventListener('click', () => selectIceBreaker(iceBreaker));
      iceBreakers.appendChild(button);
    });

    document.getElementById('message-length-option').classList.remove('hidden');
  } catch (error) {
    console.error('Error generating ice breakers:', error);
    iceBreakers.innerHTML = '<p>Error generating ice breakers. Please try again.</p>';
  }
}

function selectIceBreaker(iceBreaker) {
  selectedIceBreaker = iceBreaker;
  const buttons = document.querySelectorAll('.ice-breaker-btn');
  buttons.forEach(btn => btn.style.fontWeight = 'normal');
  event.target.style.fontWeight = 'bold';
}

async function generateMessage() {
  console.log('Generating message...');
  const statusElement = document.getElementById('status');
  if (!profileData || !selectedIceBreaker) {
    console.warn('No profile data or ice breaker selected');
    statusElement.textContent = 'Error: Please capture profile and select an ice breaker first.';
    return;
  }

  const messageElement = document.getElementById('generated-message');
  statusElement.textContent = 'Generating message...';
  messageElement.classList.add('hidden');

  try {
    const goal = document.getElementById('message-goal').value;
    const length = document.getElementById('message-length').value;
    console.log('Message parameters:', { goal, length, selectedIceBreaker });

    const prompt = `Generate a ${length} LinkedIn message for ${goal} to ${profileData.name}. 
    Their skills include ${profileData.skills.join(', ')}. 
    About them: ${profileData.about}
    ${profileData.recentPost ? `They recently posted about: ${profileData.recentPost}` : ''}
    
    Use this ice breaker as the opening line: "${selectedIceBreaker}"
    
    The message should be professional, personalized, and engaging.`;

    const message = `Dear ${profileData.name},\n\n${selectedIceBreaker}\n\nI came across your profile and was impressed by your experience in ${profileData.skills.join(', ')}. Your work in ${profileData.about ? profileData.about.substring(0, 50) + '...' : 'your field'} aligns with my interests, and I would love to connect and learn more about your experiences.\n\nLooking forward to your response.\n\nBest regards`;

    messageElement.innerHTML = `<h3>Generated Message:</h3><p>${message}</p>
      <button id="save-message">Save Message</button>`;
    messageElement.classList.remove('hidden');
    statusElement.textContent = 'Message generated successfully!';
    
    document.getElementById('save-message').addEventListener('click', function() {
      saveMessage(message);
      displaySavedMessages();
    });
  } catch (error) {
    console.error('Error generating message:', error);
    statusElement.textContent = 'Error: Failed to generate message.';
    showError(messageElement, "Failed to generate message. Please try again.");
  }
}

function showError(element, message) {
  console.error('Showing error:', message);
  element.innerHTML = `<p class="error">${message}</p>`;
  element.classList.remove('hidden');
}

function saveMessage(message) {
  console.log('Saving message...');
  chrome.storage.local.get({savedMessages: []}, function(result) {
    let savedMessages = result.savedMessages;
    savedMessages.push({
      message: message,
      timestamp: new Date().toISOString()
    });
    chrome.storage.local.set({savedMessages: savedMessages}, function() {
      console.log('Message saved successfully');
    });
  });
}

function displaySavedMessages() {
  console.log('Displaying saved messages...');
  chrome.storage.local.get({savedMessages: []}, function(result) {
    const savedMessagesElement = document.getElementById('saved-messages');
    if (result.savedMessages.length > 0) {
      const messageList = result.savedMessages.map(item => 
        `<li>${item.message} <small>(${new Date(item.timestamp).toLocaleString()})</small></li>`
      ).join('');
      savedMessagesElement.innerHTML = `<h3>Saved Messages:</h3><ul>${messageList}</ul>`;
      console.log(`Displayed ${result.savedMessages.length} saved messages`);
    } else {
      savedMessagesElement.innerHTML = '<p>No saved messages yet.</p>';
      console.log('No saved messages to display');
    }
  });
}
