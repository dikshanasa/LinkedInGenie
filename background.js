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
            content: "You are a helpful assistant that extracts structured data from LinkedIn profiles. Always return valid JSON."
          },
          {
            role: "user",
            content: `Extract and return a JSON object with these fields: name (string), skills (array of strings), about (string), and recentPost (string or null) from this profile: ${content}`
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
      // Attempt to parse the AI response as JSON
      const parsedData = JSON.parse(aiResponse);
      return parsedData;
    } catch (parseError) {
      // If JSON parsing fails, return a structured object with the raw text
      console.error('Failed to parse AI response as JSON:', parseError);
      return {
        name: "Unknown",
        skills: [],
        about: aiResponse,
        recentPost: null
      };
    }
  } catch (error) {
    console.error('Error in AI processing:', error);
    throw error;
  }
}
