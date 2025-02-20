const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');
const searchContainer = document.querySelector('.search-container');
const clearSearch = document.getElementById('clear-search');
const toggleAllButton = document.getElementById('toggle-all');
const chatHeading = document.getElementById('chat-heading');

let lastSender = null; // Track the last message sender
const hasDeletePermission = true; // Message Delete permission
let isShiftPressed = false; // Track if Shift key is pressed


function updateUnreadCounts() {
    document.querySelectorAll('.chat-item').forEach(chatItem => {
        const unreadCountElement = chatItem.querySelector('.unread-count');
        const unreadCount = parseInt(unreadCountElement.textContent, 10);
        const hasUnreadMentions = chatItem.getAttribute('data-has-unread-mentions') === 'true';
        const isDM = chatItem.getAttribute('data-is-dm') === 'true';

        if (unreadCount === 0) {
            unreadCountElement.style.display = 'none'; // Hide unread count bubble with 0 unread messages
        } else {
            unreadCountElement.style.display = 'inline-block'; // Show unread count bubble with unread messages
            if (isDM) {
                unreadCountElement.style.backgroundColor = 'red'; // Red background for DMs
                unreadCountElement.style.color = 'white'; // White text for DMs
            } else if (hasUnreadMentions) {
                unreadCountElement.style.backgroundColor = 'red'; // Red background for unread mentions
                unreadCountElement.style.color = 'white'; // White text for unread mentions
            } else {
                unreadCountElement.style.backgroundColor = 'grey'; // Grey background for simple unread messages
                unreadCountElement.style.color = 'white'; // White text for simple unread messages
            }
        }
    });
}


// Function to set chat heading dynamically
function setChatHeading(name) {
    chatHeading.textContent = name;
}

// Example usage of setChatHeading
setChatHeading('Dynamic Chat Heading');

// Detect Shift key press and release
document.addEventListener('keydown', (event) => {
    if (event.key === 'Shift') {
        isShiftPressed = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
        isShiftPressed = false;
    }
});

// Message class to create message elements
class Message {
    constructor(content, sender, timestamp, user, isDefault = false, editCount = 0, lastEdited = null) {
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.user = user;
        this.isDefault = isDefault;
        this.editCount = editCount;
        this.lastEdited = lastEdited;
    }

    // Create a message element
    createElement() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        if (this.isDefault) {
            messageElement.style.fontStyle = 'italic';
        }
        
        // Create a wrapper with flex layout for profile picture and text content
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper');

        // Always render profile picture (or fallback default)
        const profilePicElement = document.createElement('img');
        profilePicElement.classList.add('profile-pic');
        profilePicElement.alt = `${this.user && this.user.fullname ? this.user.fullname : "User"}'s profile picture`;
        if (this.user && this.user.profilepicurl) {
            profilePicElement.src = this.user.profilepicurl;
            profilePicElement.onerror = () => {
                console.error("Failed to load image:", this.user.profilepicurl);
                // Optionally assign a fallback local image if desired:
                profilePicElement.src = "../images/default-avatar.png";
            };
        } else {
            // Use a local default image instead of the ui-avatars.com fallback
            profilePicElement.src = "../images/default-avatar.png";
        }
        wrapper.appendChild(profilePicElement);

        // Create container for text content
        const textContainer = document.createElement('div');
        textContainer.classList.add('message-text');

        const headerElement = document.createElement('div');
        headerElement.classList.add('message-header');
        headerElement.innerHTML = `<strong>${this.sender}</strong> <span class="message-timestamp">${this.timestamp}</span>`;
        textContainer.appendChild(headerElement);

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.textContent = this.content;
        textContainer.appendChild(contentElement);

        wrapper.appendChild(textContainer);
        messageElement.appendChild(wrapper);

        // Add edit info if the message has been edited
        if (this.editCount > 0) {
            const editInfoElement = document.createElement('div');
            editInfoElement.classList.add('edit-info');
            editInfoElement.innerHTML = `<i class="fa fa-pencil"></i> x${this.editCount}`;
            if (this.lastEdited) {
                editInfoElement.title = `Last edited: ${this.lastEdited}`;
            }
            messageElement.appendChild(editInfoElement);
        }

        /* Add delete icon if permission is granted */
        if (hasDeletePermission) {
            const deleteIcon = document.createElement('i');
            deleteIcon.classList.add('fas', 'fa-trash-alt', 'delete-icon');
            deleteIcon.title = 'Delete Message';
            // Add event listener for deletion if needed
            deleteIcon.addEventListener('click', (event) => {
                event.stopPropagation(); /* Prevent triggering message click */
                messagesContainer.removeChild(messageElement);
            });
            messageElement.appendChild(deleteIcon); /* Ensure deleteIcon is inside messageElement */

            // Change color on hover if Shift key is pressed
            messageElement.addEventListener('mouseover', () => {
                if (isShiftPressed) {
                    deleteIcon.style.color = 'red';
                }
            });

            messageElement.addEventListener('mouseout', () => {
                deleteIcon.style.color = ''; // Reset color
            });
        }

        return messageElement;
    }
}

// Function to show loading animation and hide screen contents
function showLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.querySelector('.sidebar');
    loadingScreen.style.display = 'flex';
    loadingScreen.style.opacity = '1';
    // Hide other UI elements
    if (chatContainer) chatContainer.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
}

// Function to hide loading animation with fade effect and show screen contents
function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const chatContainer = document.querySelector('.chat-container');
    const sidebar = document.querySelector('.sidebar');
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        // Show the previously hidden UI elements
        if (chatContainer) chatContainer.style.display = 'flex';
        if (sidebar) sidebar.style.display = 'block';
    }, 500); // Match the transition duration
}

// Function to retrieve and display detailed messages for a specific bubble ID
async function loadMessages(bubbleID, bubbleName) {
    // Removed showLoading() call so that hamster animation is not shown when loading messages
    try {
        console.log(`Loading local messages for bubble ID: ${bubbleID}`); // Debug statement
        const localResponse = await window.pywebview.api.get_Localmessages(bubbleID);
        console.log('Local response retrieved:', localResponse); // Debug statement

        if (!localResponse || typeof localResponse !== 'object' || !Array.isArray(localResponse.messages)) {
            console.error("Invalid local response format received:", localResponse);
            return;
        }

        const localMessages = localResponse.messages.reverse(); // Reverse the order of the messages
        messagesContainer.innerHTML = ''; // Clear existing messages

        if (localMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            localMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing local message:', msg);
                const content = msg.message || msg.content;
                const author = msg.author;
                const timestamp = msg.time_of_sending;
                const user = { fullname: msg.author, profilepicurl: msg.profilepicurl };

                if (content && author && timestamp) {
                    const message = new Message(content, author, timestamp, user, false, msg.edit_count, msg.last_edited);
                    messagesContainer.appendChild(message.createElement()); // Display message in HTML
                } else {
                    console.warn('Incomplete local message data:', msg);
                }
            });
        }

        // Clear messagesContainer before adding dynamic messages to avoid duplication
        messagesContainer.innerHTML = '';
        console.log(`Loading dynamic messages for bubble ID: ${bubbleID}`); // Debug statement
        const dynamicResponse = await window.pywebview.api.get_dynamicdetailed_messages(bubbleID);
        console.log('Dynamic response retrieved:', dynamicResponse); // Debug statement

        if (!dynamicResponse || typeof dynamicResponse !== 'object' || !Array.isArray(dynamicResponse.messages)) {
            console.error("Invalid dynamic response format received:", dynamicResponse);
            return;
        }

        const dynamicMessages = dynamicResponse.messages.reverse(); // Reverse the order of the messages

        if (dynamicMessages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.textContent = 'No messages to display.';
            messagesContainer.appendChild(noMessages);
        } else {
            dynamicMessages.forEach(msg => {
                // Verify that each message has the required properties
                console.log('Processing dynamic message:', msg);
                const content = msg.message || msg.content;
                const author = msg.author;
                const timestamp = msg.time_of_sending;
                const user = { fullname: msg.author, profilepicurl: msg.profilepicurl };

                if (content && author && timestamp) {
                    const message = new Message(content, author, timestamp, user, false, msg.edit_count, msg.last_edited);
                    messagesContainer.appendChild(message.createElement()); // Display message in HTML
                } else {
                    console.warn('Incomplete dynamic message data:', msg);
                }
            });
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        setChatHeading(bubbleName); // Update chat heading with the bubble name
    } catch (error) {
        console.error("Error loading messages:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
    // Removed hideLoading() call so that the hamster animation is only handled by bubble loading functions
}

// Function to initialize categories and chats dynamically from backend
async function initializeCategories() {
    showLoading(); // Show loading animation
    try {
        console.log("Initializing categories and chats"); // New debug statement

        const categories = await window.pywebview.api.get_Localcategories();
        const dms = await window.pywebview.api.get_Localdms();
        const categorizedBubbles = await window.pywebview.api.get_Localcategorized_bubbles();
        const uncategorizedBubbles = await window.pywebview.api.get_Localuncategorized_bubbles();
        const unreadBubbles = await window.pywebview.api.get_Localunread_bubbles();

        const unreadMap = {};
        unreadBubbles.forEach(item => {
            unreadMap[item.title] = item.unread;
        });

        // Combine all bubbles from DM, categorized and uncategorized for lookup.
        let allBubbles = [];
        if (Array.isArray(dms)) {
            allBubbles = allBubbles.concat(dms);
        }
        if (categorizedBubbles && typeof categorizedBubbles === 'object') {
            Object.values(categorizedBubbles).forEach(chats => {
                allBubbles = allBubbles.concat(chats);
            });
        }
        if (Array.isArray(uncategorizedBubbles)) {
            allBubbles = allBubbles.concat(uncategorizedBubbles);
        }

        // Process unread bubbles: if bubble.id is undefined, try to find it in allBubbles based on title.
        const processedUnreadBubbles = unreadBubbles.map(bubble => {
            if (!bubble.id) {
                const match = allBubbles.find(b => b.title === bubble.title);
                if (match && match.id) {
                    bubble.id = match.id;
                } else {
                    console.warn(`No matching bubble found for title: ${bubble.title}`);
                    // Optionally disable click functionality later by setting bubble.id to empty string.
                    bubble.id = "";
                }
            }
            return bubble;
        });

        const categoryElements = [];

        // Add unread bubbles as a separate category at the top
        if (processedUnreadBubbles.length > 0) {
            categoryElements.push(new Category('Unread', processedUnreadBubbles, unreadMap));
        }

        // Add DM category
        if (dms.length > 0) {
            categoryElements.push(new Category('Direct Messages', dms, unreadMap, true));
        }

        // Add categorized bubbles
        for (const [categoryName, chats] of Object.entries(categorizedBubbles)) {
            categoryElements.push(new Category(categoryName, chats, unreadMap));
        }

        // Add uncategorized bubbles
        if (uncategorizedBubbles.length > 0) {
            categoryElements.push(new Category('Uncategorized', uncategorizedBubbles, unreadMap));
        }

        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = ''; // Clear existing content
        categoryElements.forEach(category => {
            const categoryElement = category.createElement();
            if (categoryElement) {
                chatList.appendChild(categoryElement);
            } else {
                console.warn('Failed to create category element:', category.name);
            }
        });

        // Add event listeners for category headers and menu buttons
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isExpanded = content.classList.contains('expanded');

                // Toggle the 'expanded' and 'collapsed' classes
                content.classList.toggle('expanded');
                content.classList.toggle('collapsed');

                // Toggle the arrow direction
                header.classList.toggle('collapsed', isExpanded);
            });
        });

        document.querySelectorAll('.menu-button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const dropdown = button.nextElementSibling;
                dropdown.classList.toggle('show');
            });
        });

        window.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        });

        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });

        // Update unread counts visibility after rendering
        updateUnreadCounts();

    } catch (error) {
        console.error("Error initializing categories:", error); // Existing debug statement
    } finally {
        hideLoading(); // Hide loading animation
    }
}

// Category class to create category elements
class Category {
    constructor(name, chats, unreadCounts = {}, isDM = false) {
        this.name = name;
        this.chats = chats;
        this.unreadCounts = unreadCounts;
        this.isDM = isDM;
    }

    // Create a category element
    createElement() {
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('category');

        const headerElement = document.createElement('div');
        headerElement.classList.add('category-header');
        headerElement.textContent = this.name;

        const contentElement = document.createElement('div');
        contentElement.classList.add('category-content', 'expanded');

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.setAttribute('data-chat-id', chat.id); // Ensure chat.id is correctly set
            chatItem.setAttribute('data-has-unread-mentions', chat.hasUnreadMentions); // Set the data-has-unread-mentions attribute
            chatItem.setAttribute('data-is-dm', this.isDM || chat.isDM); // Set the data-is-dm attribute
            chatItem.innerHTML = `
                ${chat.title}
                <span class="unread-count">${this.unreadCounts[chat.title] || 0}</span>
                <button class="menu-button">⋮</button>
                <ul class="dropdown-menu">
                    ${this.createDropdownOptions(['Option 1', 'Option 2', 'Option 3', 'Option 4'])}
                </ul>
            `;
            // Add event listener to call Python function and load messages when clicked
            chatItem.addEventListener('click', () => {
                const chatID = chatItem.getAttribute('data-chat-id');
                if (chatID) {
                    window.pywebview.api.print_chat_info(chat.title, chatID);
                    loadMessages(chatID, chat.title); // Load messages for the clicked chat and update heading
                } else {
                    console.error('Chat ID is undefined');
                }
            });
            contentElement.appendChild(chatItem);
        });

        categoryElement.appendChild(headerElement);
        categoryElement.appendChild(contentElement);

        return categoryElement;
    }

    // Create dropdown options
    createDropdownOptions(options) {
        return options.map(option => `<li>${option}</li>`).join('');
    }
}

// Function to wait for pywebview API to be ready
function waitForPywebview() {
    if (window.pywebview && window.pywebview.api) {
        initializeLiveBubbles();
    } else {
        setTimeout(waitForPywebview, 100); // Check again after 100ms
    }
}

// Function to initialize live bubbles and then categories
async function initializeLiveBubbles() {
    try {
        console.log("Fetching live bubbles"); // Debug statement
        await window.pywebview.api.get_live_bubbles();
        initializeCategories(); // Call initializeCategories after fetching live bubbles
    } catch (error) {
        console.error("Error fetching live bubbles:", error);
        if (error.message.includes('401')) {
            window.location.href = 'login.html'; // Redirect to login.html on 401 error
        }
    }
}

// Display a default message when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    console.log('chat.html DOMContentLoaded');  // Debugging statement

    waitForPywebview(); // Wait for pywebview API to be ready

    // const accessTokenResponse = await window.pywebview.api.accessToken();
    // console.log('Access token response:', accessTokenResponse);
});

// Add event listener for the Enter key to send a message
messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default Enter key behavior
        const messageText = messageInput.value.trim();
        if (messageText) {
            const sender = 'You'; // Replace with dynamic sender if needed
            const timestamp = new Date().toLocaleString();
            const message = new Message(messageText, sender, timestamp);
            messagesContainer.appendChild(message.createElement());
            messageInput.value = ''; // Clear the input after sending
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
        }
    }
});

// Add event listener to toggle all categories
toggleAllButton.addEventListener('click', () => {
    const isCollapsing = toggleAllButton.textContent === 'Collapse All';

    document.querySelectorAll('.category-content').forEach(content => {
        content.classList.toggle('expanded', !isCollapsing);
        content.classList.toggle('collapsed', isCollapsing);
    });
    document.querySelectorAll('.category-header').forEach(header => {
        header.classList.toggle('collapsed', isCollapsing);
    });

    toggleAllButton.textContent = isCollapsing ? 'Expand All' : 'Collapse All';
});

// Add event listener to show search input
searchButton.addEventListener('click', () => {
    searchButton.style.display = 'none';
    searchContainer.style.display = 'flex';
    searchInput.focus();
    toggleAllButton.style.zIndex = '2'; // Ensure the toggle-all button is above the search container
});

// Add event listener to clear and exit search input
clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchContainer.style.display = 'none';
    searchButton.style.display = 'block';
    toggleAllButton.style.zIndex = ''; // Reset the z-index of the toggle-all button
});

// Remove any event listeners that might prevent text selection
document.addEventListener('mousedown', (event) => {
    // Do not call event.preventDefault()
});
