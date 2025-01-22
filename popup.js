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
});

async function captureProfile() {
  console.log('Capturing profile...');
  const statusElement = document.getElementById('status');
  const profileInfo = document.getElementById('profile-info');
  statusElement.textContent = 'Capturing profile content...';
  profileInfo.classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab.url.includes('linkedin.com')) {
      throw new Error('Please navigate to a LinkedIn profile page');
    }

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
    <p><strong>Title:</strong> ${profileData.title || 'Title not available'}</p>
    <p><strong>Company:</strong> ${profileData.company || 'Company not available'}</p>
    <p><strong>Skills:</strong> ${profileData.skills ? profileData.skills.join(', ') : 'No skills listed'}</p>
    <p><strong>About:</strong> ${profileData.about ? profileData.about.substring(0, 200) + '...' : 'No about section available'}</p>
    ${profileData.recentPost ? `<p><strong>Recent Post:</strong> ${profileData.recentPost.substring(0, 100)}...</p>` : ''}
  `;
  profileInfo.classList.remove('hidden');
  console.log('Profile info displayed');
}

async function generateIceBreakers() {
  if (!profileData) {
    console.warn('No profile data available for ice breakers');
    return;
  }

  const goal = document.getElementById('message-goal').value;
  const iceBreakers = document.getElementById('ice-breakers');
  iceBreakers.innerHTML = '<h3>Ice Breaker Categories:</h3>';
  iceBreakers.classList.remove('hidden');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: `Generate categorized ice breakers for LinkedIn messages. 
            Categories should be:
            - Skills & Experience
            - Recent Activity
            - Company & Role
            Each category should have one concise ice breaker.`
          },
          {
            role: "user",
            content: `Create categorized ice breakers for ${goal} to ${profileData.name}.
            Profile:
            - Role: ${profileData.title} at ${profileData.company}
            - Recent Activity: ${profileData.recentPost}
            - Skills: ${profileData.skills.slice(0, 3).join(', ')}
            - About: ${profileData.about}

            Return as JSON object with categories as keys and ice breakers as values.
            Keep each ice breaker under 100 characters.`
          }
        ],
        max_tokens: 250,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const iceBreakersObj = JSON.parse(data.choices[0].message.content);

    // Create a container for categories
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'ice-breaker-categories';

    // Create sections for each category
    Object.entries(iceBreakersObj).forEach(([category, iceBreaker]) => {
      const categorySection = document.createElement('div');
      categorySection.className = 'ice-breaker-category';
      
      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = category;
      categorySection.appendChild(categoryTitle);

      const button = document.createElement('button');
      button.textContent = iceBreaker;
      button.className = 'ice-breaker-btn';
      button.addEventListener('click', () => selectIceBreaker(iceBreaker));
      categorySection.appendChild(button);

      categoriesContainer.appendChild(categorySection);
    });

    iceBreakers.appendChild(categoriesContainer);
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
  if (!profileData || !selectedIceBreaker) {
    console.warn('No profile data or ice breaker selected');
    return;
  }

  const goal = document.getElementById('message-goal').value;
  const length = document.getElementById('message-length').value;
  const messageElement = document.getElementById('generated-message');

  const messageTemplates = {
    'follow-up': {
      short: `Hi ${profileData.name},

{ice_breaker}

I'd appreciate the opportunity to discuss my application and how my experience aligns with the team's needs.

Best regards`,
      
      medium: `Hi ${profileData.name},

{ice_breaker}

With my background in {relevant_skills}, I'm particularly excited about contributing to {company}'s initiatives in this space. I'd appreciate the opportunity to discuss my application and how my experience aligns with the team's needs.

Best regards`,
      
      long: `Hi ${profileData.name},

{ice_breaker}

With my background in {relevant_skills}, I'm particularly excited about contributing to {company}'s initiatives in this space. I believe my experience in {specific_skill} would be valuable for the team.

I'd appreciate the opportunity to discuss my application and how my experience aligns with the team's needs.

Best regards`
    },
    'connection': {
      short: `Hi ${profileData.name},

{ice_breaker}

Would you be open to connecting?

Best regards`,
      
      medium: `Hi ${profileData.name},

{ice_breaker}

I believe we could have some interesting discussions about {shared_interest}. Would you be open to connecting?

Best regards`,
      
      long: `Hi ${profileData.name},

{ice_breaker}

I believe we could have some interesting discussions about {shared_interest}, and I'd love to learn more about your experiences in {specific_area}.

Would you be open to connecting?

Best regards`
    },
    'referral': {
      short: `Hi ${profileData.name},

{ice_breaker}

Would you be open to a brief conversation about opportunities at {company}?

Best regards`,
      
      medium: `Hi ${profileData.name},

{ice_breaker}

I've been following {company}'s work in {specific_area} and would love to learn more about the team. Would you be open to a brief conversation about potential opportunities?

Best regards`,
      
      long: `Hi ${profileData.name},

{ice_breaker}

I've been following {company}'s work in {specific_area} and am particularly impressed by {specific_project}. I believe my experience in {relevant_skills} could be valuable for the team.

Would you be open to a brief conversation about potential opportunities?

Best regards`
    }
  };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: `You are a professional LinkedIn message writer creating natural, conversational messages.
            Focus on:
            - Professional but friendly tone
            - Clear purpose
            - Specific details
            - Natural language
            - No hashtags or links
            - No marketing language`
          },
          {
            role: "user",
            content: `Create a ${length} LinkedIn message using this template:
            ${messageTemplates[goal][length]}

            Context:
            - Ice Breaker: ${selectedIceBreaker}
            - Their Role: ${profileData.title} at ${profileData.company}
            - Their Skills: ${profileData.skills.join(', ')}
            - Recent Post: ${profileData.recentPost}

            Replace template variables with relevant, specific details.
            Keep the tone professional and natural.`
          }
        ],
        max_tokens: 350,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0].message.content.trim();

    messageElement.innerHTML = `
      <div class="message-container">
        <div class="message-content">${message}</div>
        <button id="copy-message" class="copy-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Message
        </button>
      </div>`;
    messageElement.classList.remove('hidden');
    
    document.getElementById('copy-message').addEventListener('click', async function() {
      try {
        await navigator.clipboard.writeText(message);
        this.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!`;
        this.classList.add('copied');
        setTimeout(() => {
          this.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Message`;
          this.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy message:', err);
      }
    });
  } catch (error) {
    console.error('Error generating message:', error);
    showError(messageElement, "Failed to generate message. Please try again.");
  }
}


function showError(element, message) {
  console.error('Showing error:', message);
  element.innerHTML = `<p class="error">${message}</p>`;
  element.classList.remove('hidden');
}
