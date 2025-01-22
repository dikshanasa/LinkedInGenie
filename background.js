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
            content: "You are a professional LinkedIn profile analyzer. Extract information and format as a valid JSON object with specific fields."
          },
          {
            role: "user",
            content: `Extract the following information from this LinkedIn profile and return as a single JSON object:
            {
              "name": "Full Name",
              "title": "Current Title",
              "company": "Company Name",
              "skills": ["Skill 1", "Skill 2", "Skill 3"],
              "about": "Brief about section",
              "recentPost": "Most recent post or null"
            }
            
            Profile content: ${content}`
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
    const aiResponse = data.choices[0].message.content;
    
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const cleanJson = aiResponse.slice(jsonStart, jsonEnd);
        return JSON.parse(cleanJson);
      }
      throw new Error('Failed to parse AI response as valid JSON');
    }
  } catch (error) {
    console.error('Error in AI processing:', error);
    throw error;
  }
}
