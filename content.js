console.log('LinkedIn Conversation Starter content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === "captureProfile") {
        try {
            console.log('Capturing profile content...');
            const profileContent = extractProfileContent();
            const processedContent = preprocessContent(profileContent);
            console.log('Processed content:', processedContent);
            sendResponse({pageContent: processedContent});
        } catch (error) {
            console.error('Error capturing profile:', error);
            sendResponse({error: error.message});
        }
    }
    return true;
});

function extractProfileContent() {
    // Name
    const name = document.querySelector('h1.text-heading-xlarge')?.innerText || 
                 document.querySelector('h1.inline.t-24')?.innerText || '';

    // Title
    const title = document.querySelector('div.text-body-medium')?.innerText || 
                  document.querySelector('.pv-text-details__left-panel')?.innerText || '';

    // Company
    const company = document.querySelector('.pv-text-details__right-panel')?.innerText || 
                   document.querySelector('.pv-entity__secondary-title')?.innerText || '';

    // About section
    const about = document.querySelector('#about ~ div .display-flex .visually-hidden')?.innerText || 
                 document.querySelector('.pv-shared-text-with-see-more')?.innerText || '';

    // Experience section
    const experienceSection = document.querySelector('#experience');
    const experienceItems = experienceSection ? 
        Array.from(experienceSection.querySelectorAll('.pvs-list__item-container')).map(item => {
            const position = item.querySelector('.visually-hidden')?.innerText || '';
            const company = item.querySelector('.t-14.t-normal')?.innerText || '';
            const description = item.querySelector('.pv-entity__description')?.innerText || '';
            return `${position} at ${company}\n${description}`;
        }).join('\n') : '';

    // Skills section
    const skillsSection = document.querySelector('#skills');
    const skills = skillsSection ? 
        Array.from(skillsSection.querySelectorAll('.pvs-list .visually-hidden')).map(skill => 
            skill.innerText.trim()
        ).filter(skill => skill !== '') : [];

    // Recent activity/posts
    const recentPost = document.querySelector('.feed-shared-update-v2__description-wrapper')?.innerText || 
                      document.querySelector('.update-components-text')?.innerText || 
                      document.querySelector('.share-update-card__update-text')?.innerText || '';

    // Combine all data
    const profileData = {
        name: name.trim(),
        title: title.trim(),
        company: company.trim(),
        about: about.trim(),
        experience: experienceItems,
        skills: skills,
        recentPost: recentPost.trim()
    };

    console.log('Extracted profile data:', profileData);
    return JSON.stringify(profileData);
}

function preprocessContent(content) {
    try {
        const parsedContent = JSON.parse(content);
        
        // Clean each field
        Object.keys(parsedContent).forEach(key => {
            if (typeof parsedContent[key] === 'string') {
                parsedContent[key] = cleanText(parsedContent[key]);
            } else if (Array.isArray(parsedContent[key])) {
                parsedContent[key] = parsedContent[key].map(item => 
                    typeof item === 'string' ? cleanText(item) : item
                );
            }
        });

        return JSON.stringify(parsedContent);
    } catch (error) {
        console.error('Error preprocessing content:', error);
        return cleanText(content);
    }
}

function cleanText(text) {
    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
        .replace(/(Like|Comment|Share|Send|Connect|Follow|Message)/g, '') // Remove LinkedIn UI text
        .replace(/\d+\s*(likes?|comments?|views?|reactions?)/gi, '') // Remove engagement metrics
        .replace(/\s+/g, ' ') // Clean up any resulting multiple spaces
        .trim();
}
