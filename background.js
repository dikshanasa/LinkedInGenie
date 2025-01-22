const config = {
  GROQ_API_KEY: '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'
};


console.log('LinkedIn Conversation Starter background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processProfileData") {
    processProfileData(request.content)
      .then(profileData => {
        console.log('Profile data processed successfully');
        sendResponse({profileData: profileData});
      })
      .catch(error => {
        console.error('Error processing profile data:', error);
        sendResponse({error: error.message});
      });
    return true;
  }
});

async function processProfileData(content) {
  console.log('Processing profile data with AI...');
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  try {
    const response = await fetch(apiUrl, {
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
            content: "You are a professional LinkedIn profile analyzer. Extract key information and always return valid JSON."
          },
          {
            role: "user",
            content: `Analyze this LinkedIn profile and extract: name, title, company, skills (focus on top 5-7 most relevant skills), a concise about section summary, and any recent posts or activities. Return as JSON with fields: name (string), title (string), company (string), skills (array), about (string), and recentPost (string or null). Content: ${content}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error in AI processing:', error);
    throw error;
  }
}
