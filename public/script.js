document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatHistory = document.getElementById('chat-history');

    // Function to simulate typing for the AI response
    function typeText(element, text, speed = 20) {
        let i = 0;
        element.innerHTML = ''; // Clear existing text if any (e.g., "Thinking...")
        return new Promise(resolve => {
            function type() {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll during typing
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            }
            type();
        });
    }

    // Function to add a message to the chat history
    async function addMessageToChat(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', sender);

        if (sender === 'ai') {
            const aiIcon = document.createElement('div');
            aiIcon.classList.add('ai-icon');
            aiIcon.textContent = 'Q'; // Placeholder for Qwen icon
            messageDiv.appendChild(aiIcon);

            const textContent = document.createElement('div');
            textContent.classList.add('message-text');
            messageDiv.appendChild(textContent);

            chatHistory.appendChild(messageDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            await typeText(textContent, message); // Simulate typing
        } else {
            messageDiv.innerHTML = `<div class="message-text">${message}</div>`;
            chatHistory.appendChild(messageDiv);
        }
        chatHistory.scrollTop = chatHistory.scrollHeight; // Ensure scroll to bottom after message
    }

    // Event listener for send button click
    sendButton.addEventListener('click', async () => {
        const message = userInput.value.trim();
        if (message) {
            await addMessageToChat('user', message); // Add user message to chat
            userInput.value = ''; // Clear input field
            userInput.style.height = 'auto'; // Reset textarea height

            await addMessageToChat('ai', 'Thinking...'); // Show thinking state
            
            // --- ACTUAL VERCEL API CALL ---
            try {
                const response = await fetch('/api/chat', { // Endpoint Vercel Serverless Function
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: message }),
                });
                
                if (!response.ok) {
                    // Coba baca error dari response jika ada
                    const errorData = await response.json();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || response.statusText}`);
                }
                
                const data = await response.json();
                
                // Replace 'Thinking...' with actual AI response
                const lastAiMessage = chatHistory.lastChild;
                if (lastAiMessage && lastAiMessage.classList.contains('ai')) {
                    const textContentElement = lastAiMessage.querySelector('.message-text');
                    if (textContentElement) {
                        textContentElement.innerHTML = ''; // Clear "Thinking..."
                        await typeText(textContentElement, data.response); // Type out the AI's response
                    }
                }
                
            } catch (error) {
                console.error('Error fetching AI response:', error);
                const lastAiMessage = chatHistory.lastChild;
                if (lastAiMessage && lastAiMessage.classList.contains('ai')) {
                    const textContentElement = lastAiMessage.querySelector('.message-text');
                    if (textContentElement) {
                         textContentElement.innerHTML = 'Oops! Something went wrong. Please try again or check the console for errors.';
                    }
                }
            }
            // --- END VERCEL API CALL ---
        }
    });

    // Event listener for Enter key in textarea
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) { // Shift+Enter for new line
            event.preventDefault(); // Prevent default Enter behavior (new line)
            sendButton.click(); // Trigger send button click
        }
    });

    // Adjust textarea height dynamically
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto'; // Reset height
        userInput.style.height = userInput.scrollHeight + 'px'; // Set to scroll height
    });

    // Initial greeting
    addMessageToChat('ai', 'Hello there! I am Qwen 3.5, your personal AI assistant. How can I help you today?');

    // Make suggested prompts clickable (optional, you can expand this logic)
    document.querySelectorAll('.suggested-prompt').forEach(promptDiv => {
        promptDiv.addEventListener('click', () => {
            const text = promptDiv.querySelector('p').textContent.trim();
            userInput.value = text;
            userInput.focus();
            // Optionally, trigger send if the prompt is meant to be sent immediately
            // sendButton.click();
        });
    });
});