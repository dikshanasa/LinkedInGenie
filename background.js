const config = {
  GROQ_API_KEY: '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'
};

console.log('LinkedIn Conversation Starter background script loaded');

let screenWidth = 1920;
let screenHeight = 1080;

chrome.windows.getAll({ windowTypes: ['normal'] }, (windows) => {
  if (windows.length > 0) {
    chrome.windows.get(windows[0].id, { populate: true }, (window) => {
      screenWidth = window.width || screenWidth;
      screenHeight = window.height || screenHeight;
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  chrome.storage.local.get(['users'], result => {
    if (!result.users) {
      chrome.storage.local.set({ users: {} });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse(true);
    return true;
  }

  if (request.action === "processProfileData") {
    (async () => {
      try {
        const profileData = await processProfileData(request.content);
        sendResponse({ profileData });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (request.action === "parseResume") {
    (async () => {
      try {
        const resumeData = await parseResume(request.content);
        sendResponse({ resumeData });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (request.action === "generateIceBreakers") {
    (async () => {
      try {
        const iceBreakers = await generateIceBreakers(request.data);
        sendResponse({ iceBreakers });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  if (request.action === "generateMessage") {
    (async () => {
      try {
        const message = await generateMessage(request.data);
        sendResponse({ message });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});

async function processProfileData(content) {
  console.log('Processing profile data with AI...');
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  try {
    let profileData = typeof content === 'string' ? JSON.parse(content) : content;
    
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
            content: "Extract key information from LinkedIn profiles and return as valid JSON."
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
            
            Profile data: ${JSON.stringify(profileData)}`
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




async function parseResume(content) {
    console.log('Parsing resume with AI...');
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    try {
        if (!content || typeof content !== 'string') {
            throw new Error('Invalid resume content');
        }

        const cleanContent = content.trim()
            .replace(/\s+/g, ' ')
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
            .replace(/[^\x20-\x7E\n]/g, '');

        if (cleanContent.length === 0) {
            throw new Error('Empty resume content');
        }

        console.log('Cleaned content sample:', cleanContent.substring(0, 200));
        
        const truncatedContent = cleanContent.substring(0, 4000);

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
                        content: `You are a precise resume parser. Extract ONLY the information that exists in this resume. Do not generate or assume any information. If a field cannot be found, mark it as 'Not specified'.`
                    },
                    {
                        role: "user",
                        content: `Extract ONLY the information that exists in this resume text. Return as JSON with these exact fields:
                        {
                            "name": "EXACT full name as written or 'Not specified'",
                            "title": "EXACT current job title as written or 'Not specified'",
                            "skills": ["EXACT skill 1", "EXACT skill 2"],
                            "experience": [{
                                "company": "EXACT company name",
                                "title": "EXACT job title",
                                "duration": "EXACT duration",
                                "description": "EXACT brief description"
                            }],
                            "education": {
                                "degree": "EXACT degree name",
                                "field": "EXACT field of study",
                                "school": "EXACT school name"
                            }
                        }

                        Resume content: ${truncatedContent}`
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const parsedData = JSON.parse(data.choices[0].message.content);
        console.log('Parsed resume data:', parsedData);

        return parsedData;

    } catch (error) {
        console.error('Resume parsing error:', error);
        throw new Error('Failed to parse resume: ' + (error.message || 'Unknown error'));
    }
}

// Keep existing functions for ice breakers and message generation


function validateParsedData(data) {
  const defaultValues = [
    'John Doe', 'Jane Doe', 'Software Engineer', 'Developer',
    'Company Name', 'Unknown', 'Not Known', 'Sample Company'
  ];

  if (!data) {
    throw new Error('No data parsed from resume');
  }

  if (defaultValues.includes(data.name)) {
    throw new Error('Generic name detected - parsing failed');
  }

  if (defaultValues.includes(data.title)) {
    throw new Error('Generic title detected - parsing failed');
  }

  if (!data.name || data.name === 'Not specified') {
    throw new Error('Could not extract name from resume');
  }

  if (!data.title || data.title === 'Not specified') {
    throw new Error('Could not extract current title from resume');
  }

  if (!Array.isArray(data.skills) || data.skills.length === 0) {
    throw new Error('No skills extracted from resume');
  }

  if (!Array.isArray(data.experience) || data.experience.length === 0) {
    throw new Error('No experience extracted from resume');
  }

  data.experience.forEach((exp, index) => {
    if (!exp.company || !exp.title || !exp.duration) {
      throw new Error(`Incomplete experience data at position ${index + 1}`);
    }
    if (defaultValues.includes(exp.company)) {
      throw new Error(`Generic company name detected in experience ${index + 1}`);
    }
  });

  if (!data.education || !data.education.degree || !data.education.school) {
    throw new Error('Incomplete education information');
  }

  return true;
}

async function generateIceBreakers({ profileData, resumeData, goal }) {
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
            content: `Generate professional and personalized LinkedIn ice breakers based on shared background and interests. 
            Focus on creating genuine connections.`
          },
          {
            role: "user",
            content: `Create personalized ice breakers for a ${goal} message to ${profileData.name}.
            Return them in this JSON format:
            {
              "Skills & Experience": ["ice breaker 1", "ice breaker 2"],
              "Recent Activity": ["ice breaker 1", "ice breaker 2"],
              "Company & Role": ["ice breaker 1", "ice breaker 2"]
            }

            Profile Information:
            - Name: ${profileData.name}
            - Role: ${profileData.title}
            - Company: ${profileData.company}
            - Skills: ${profileData.skills.join(', ')}
            - Recent Activity: ${profileData.recentPost || 'None'}
            
            Sender's Background:
            - Current Role: ${resumeData.title}
            - Skills: ${resumeData.skills.join(', ')}
            - Experience: ${resumeData.experience[0].title} at ${resumeData.experience[0].company}
            
            Guidelines:
            - Keep each ice breaker under 150 characters
            - Make them personal and specific
            - Focus on shared interests and experiences
            - Avoid generic statements
            - Be professional but conversational`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Ice breakers response:', data.choices[0].message.content);
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Error generating ice breakers:', error);
    throw error;
  }
}

async function generateMessage({ profileData, resumeData, iceBreaker, goal, length }) {
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
            content: `Generate a professional LinkedIn message that is:
            - Natural and conversational
            - Focused on relevant experience and mutual value
            - Clear in purpose
            - Free of marketing language or hashtags
            - Properly formatted for LinkedIn`
          },
          {
            role: "user",
            content: `Write a ${length} LinkedIn ${goal} message.
            
            Context:
            - Recipient: ${profileData.name} (${profileData.title} at ${profileData.company})
            - Their Recent Post: ${profileData.recentPost ||             'None'}
            - Selected Ice Breaker: "${iceBreaker}"
            - My Background: ${resumeData.title}
            - My Skills: ${resumeData.skills.join(', ')}
            - My Experience: ${resumeData.experience[0].title} at ${resumeData.experience[0].company}
            
            Length Guide:
            - short: 2-3 sentences
            - medium: 4-5 sentences
            - long: 6-7 sentences
            
            Guidelines:
            - Start with the ice breaker
            - Make it personal and specific
            - Focus on mutual value
            - End with a clear call to action
            - Keep it professional but friendly`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating message:', error);
    throw error;
  }
}

