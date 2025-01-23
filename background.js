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
    // Log the raw content for debugging
    console.log('Raw content received:', content);

    // Handle the content whether it's a string or object
    let profileData = content;
    if (typeof content === 'string') {
      try {
        profileData = JSON.parse(content);
      } catch (parseError) {
        console.log('Content is not JSON, using as is');
        // If it's not JSON, we'll use the string directly
      }
    }
    
    console.log('Profile data to process:', profileData);

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
            content: "Extract LinkedIn profile information and return only the requested JSON structure."
          },
          {
            role: "user",
            content: `Extract these exact fields from the LinkedIn profile data and return as JSON:
            {
              "name": "Full Name",
              "title": "Current Title",
              "company": "Company Name",
              "skills": ["Skill 1", "Skill 2", "Skill 3"],
              "about": "Brief about section",
              "recentPost": "Most recent post or null"
            }
            
            Profile data: ${typeof profileData === 'string' ? profileData : JSON.stringify(profileData)}`
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
    
    try {
      // Extract JSON from response
      const content = data.choices[0].message.content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonString = content.slice(jsonStart, jsonEnd);
      
      const parsedContent = JSON.parse(jsonString);
      console.log('Successfully parsed profile data:', parsedContent);
      return parsedContent;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('Raw AI response:', data.choices[0].message.content);
      throw new Error('Invalid response format from AI');
    }
  } catch (error) {
    console.error('Error in AI processing:', error);
    throw new Error(`Failed to process profile data: ${error.message}`);
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
                      content: `You are a precise resume parser. Extract information from the resume and ensure experience entries are in chronological order with proper date formatting (MM.YY). For current positions, use 'Present' as the end date.`
                  },
                  {
                      role: "user",
                      content: `Parse this resume and return a JSON object with chronologically ordered experiences. If any field is not found, use "Not specified". Format:
                      {
                          "name": "Full name or 'Not specified'",
                          "title": "Current job title or 'Not specified'",
                          "skills": ["Skill 1", "Skill 2"] or [],
                          "experience": [{
                              "company": "Company name or 'Not specified'",
                              "title": "Job title or 'Not specified'",
                              "duration": "MM.YY - MM.YY or MM.YY - Present",
                              "description": "Description or ''"
                          }],
                          "education": {
                              "degree": "Degree or 'Not specified'",
                              "field": "Field of study or 'Not specified'",
                              "school": "School name or 'Not specified'"
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

      // Sort experience entries by end date
      if (parsedData.experience && Array.isArray(parsedData.experience)) {
          parsedData.experience.sort((a, b) => {
              const getEndDate = (duration) => {
                  if (!duration || duration === 'Not specified') return new Date(0);
                  const endPart = duration.split(' - ')[1];
                  if (endPart.toLowerCase().includes('present')) {
                      return new Date('2025-01-23'); // Current date
                  }
                  const [month, year] = endPart.split('.');
                  return new Date(2000 + parseInt(year), parseInt(month) - 1);
              };

              return getEndDate(b.duration) - getEndDate(a.duration);
          });
      }

      console.log('Parsed and sorted resume data:', parsedData);
      validateParsedData(parsedData);
      
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

  // Log the parsed data for debugging
  console.log('Validating parsed data:', data);

  // Name validation - less strict
  if (!data.name || defaultValues.includes(data.name)) {
    console.warn('Warning: Generic or missing name');
    data.name = 'Not specified';
  }

  // Title validation - less strict
  if (!data.title || defaultValues.includes(data.title)) {
    console.warn('Warning: Generic or missing title');
    data.title = 'Not specified';
  }

  // Skills validation - ensure array exists
  if (!Array.isArray(data.skills)) {
    data.skills = [];
  }

  // Experience validation - ensure array exists and has basic structure
  if (!Array.isArray(data.experience)) {
    data.experience = [];
  }

  // Normalize experience entries
  data.experience = data.experience.map((exp, index) => {
    return {
      company: exp.company || 'Not specified',
      title: exp.title || 'Not specified',
      duration: exp.duration || 'Not specified',
      description: exp.description || ''
    };
  });

  // Education validation - ensure object exists with basic structure
  if (!data.education || typeof data.education !== 'object') {
    data.education = {
      degree: 'Not specified',
      field: 'Not specified',
      school: 'Not specified'
    };
  } else {
    data.education = {
      degree: data.education.degree || 'Not specified',
      field: data.education.field || 'Not specified',
      school: data.education.school || 'Not specified'
    };
  }

  // Log the validated data
  console.log('Validated data:', data);

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
            content: "You are an expert at creating personalized LinkedIn ice breakers. Always return responses in valid JSON format with exactly three categories and two options each."
          },
          {
            role: "user",
            content: `Create personalized ice breakers for a ${goal} message to ${profileData.name}. Return in this exact JSON format:
            {
              "Skills & Experience": [
                "A specific comment about their technical skills and your related experience",
                "A targeted observation about their career progression and your similar interests"
              ],
              "Recent Activity": [
                "A thoughtful response to their recent post or achievement",
                "A connection between their recent activity and your current work"
              ],
              "Company & Role": [
                "A specific observation about their current role and your relevant experience",
                "A targeted comment about their company's work and your related background"
              ]
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
            
            Requirements:
            - Each ice breaker must be specific and reference actual details
            - Maximum 150 characters per ice breaker`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    try {
      // Extract JSON from response
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonString = content.slice(jsonStart, jsonEnd);
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing ice breakers:', parseError);
      console.log('Raw AI response:', content);
      throw new Error('Invalid ice breaker format from AI');
    }
  } catch (error) {
    console.error('Error generating ice breakers:', error);
    throw error;
  }
}


async function generateMessage({ profileData, resumeData, iceBreaker, goal, length }) {
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  
  // Implement exponential backoff
  const maxRetries = 5;
  let retryCount = 0;
  let delay = 1000; // Start with 1 second delay

  while (retryCount < maxRetries) {
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
              content: `You are an expert at crafting professional LinkedIn messages that:
              1. Are highly personalized and demonstrate genuine interest
              2. Show clear value proposition and mutual benefit
              3. Have a specific purpose aligned with the goal
              4. Maintain professional tone while being conversational
              5. End with a clear, actionable next step`
            },
            {
              role: "user",
              content: `Write a ${length} LinkedIn ${goal} message that achieves its purpose effectively.
              
              Context:
              - Recipient: ${profileData.name} (${profileData.title} at ${profileData.company})
              - Their Recent Post: ${profileData.recentPost || 'None'}
              - Selected Ice Breaker: "${iceBreaker}"
              - My Background: ${resumeData.title}
              - My Skills: ${resumeData.skills.join(', ')}
              - My Experience: ${resumeData.experience[0].title} at ${resumeData.experience[0].company}
              
              Requirements:
              - Start with a personalized greeting
              - Incorporate the ice breaker naturally
              - Highlight specific shared interests or experiences
              - Demonstrate clear value proposition
              - Include specific details from both backgrounds
              - End with a clear call to action
              - Match the specified length (${length})
              - Maintain professional yet friendly tone
              - Focus on mutual benefit
              - Align with ${goal} purpose`
            }
          ],
          max_tokens: 500,
          temperature: 0.4
        })
      });

      if (response.status === 429) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error('Maximum retries reached. Please try again later.');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();

    } catch (error) {
      if (error.message.includes('429')) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
}


