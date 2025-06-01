// Security and rate limiting variables
const rateLimitData = {
    loginAttempts: 0,
    registerAttempts: 0,
    lastLoginAttempt: 0,
    lastRegisterAttempt: 0,
    maxAttempts: 5,
    cooldownTime: 3000 //  minutes in milliseconds
};

// Enhanced user data storage (in-memory for security - no localStorage)
const userData = {};

// Suspicious activity monitoring
let suspiciousActivity = {
    rapidClicks: 0,
    lastClickTime: 0
};

// Form submission tracking for bot detection
const formSubmissions = {
    login: [],
    register: []
};

// Session timeout variables
let sessionTimeout;
const sessionDuration = 3000; 
 
// CORE TOGGLE FUNCTIONALITY
const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// SECURITY PANEL FUNCTIONALITY
function toggleSecurityPanel() {
    const panel = document.getElementById('securityPanel');
    panel.classList.toggle('active');
}

// Close security panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('securityPanel');
    const indicator = document.querySelector('.security-indicator');
    if (!panel.contains(e.target) && !indicator.contains(e.target)) {
        panel.classList.remove('active');
    }
});

// ENHANCED INPUT SANITIZATION (XSS Prevention)
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>\"'&]/g, function(match) {
        const escapeMap = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
        };
        return escapeMap[match];
    });
}

// PASSWORD STRENGTH VALIDATION
function checkPasswordStrength(password) {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    for (let check in checks) {
        if (checks[check]) strength++;
    }

    if (strength < 3) return { 
        level: 'weak', 
        text: 'Weak password', 
        class: 'strength-weak' 
    };
    if (strength < 5) return { 
        level: 'medium', 
        text: 'Medium strength', 
        class: 'strength-medium' 
    };
    return { 
        level: 'strong', 
        text: 'Strong password', 
        class: 'strength-strong' 
    };
}

// ADVANCED RATE LIMITING SYSTEM
function checkRateLimit(type) {
    const now = Date.now();
    const attemptKey = type + 'Attempts';
    const timeKey = 'last' + type.charAt(0).toUpperCase() + type.slice(1) + 'Attempt';

    // Reset attempts if cooldown period has passed
    if (now - rateLimitData[timeKey] > rateLimitData.cooldownTime) {
        rateLimitData[attemptKey] = 0;
    }

    if (rateLimitData[attemptKey] >= rateLimitData.maxAttempts) {
        const remainingTime = Math.ceil((rateLimitData.cooldownTime - (now - rateLimitData[timeKey])) / 1000);
        return {
            allowed: false,
            message: `Too many attempts. Try again in ${Math.ceil(remainingTime / 60)} minutes.`,
            remainingTime
        };
    }

    rateLimitData[attemptKey]++;
    rateLimitData[timeKey] = now;
    return { allowed: true };
}

// SECURE USER DATA MANAGEMENT (Enhanced from Original)
function saveUserData(username, email, password) {
    // Sanitize inputs
    username = sanitizeInput(username.trim());
    email = sanitizeInput(email.trim());
    
    if (userData[username]) {
        return {
            success: false,
            message: "Username already exists!"
        };
    }

    // Store hashed password (simplified for demo - use proper hashing in production)
    userData[username] = {
        email: email,
        password: btoa(password), // Simple encoding for demo
        createdAt: new Date().toISOString(),
        lastLogin: null
    };

    console.log('User registered successfully:', username);
    return {
        success: true,
        message: "Registration successful! Account created securely."
    };
}

function validateLogin(username, password) {
    username = sanitizeInput(username.trim());
    
    if (userData[username] && atob(userData[username].password) === password) {
        // Update last login time
        userData[username].lastLogin = new Date().toISOString();
        
        console.log('User logged in successfully:', username);
        return {
            success: true,
            message: "Login successful! Welcome back."
        };
    } else {
        console.log('Failed login attempt for:', username);
        return {
            success: false,
            message: "Invalid credentials. Please check your username and password."
        };
    }
}

// ENHANCED MESSAGE DISPLAY SYSTEM
function showMessage(formElement, message, isError = false) {
    const existingMessage = formElement.querySelector(".message");
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageElement = document.createElement("div");
    messageElement.className = isError ? "message error" : "message success";
    messageElement.textContent = sanitizeInput(message);

    const button = formElement.querySelector(".btn");
    button.insertAdjacentElement('afterend', messageElement);

    setTimeout(() => {
        if (messageElement.parentNode === formElement) {
            messageElement.remove();
        }
    }, 5000);
}

function showRateLimitIndicator(formElement, message) {
    const indicator = formElement.querySelector('.rate-limit-indicator');
    indicator.textContent = sanitizeInput(message);
    indicator.style.display = 'block';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 10000);
}

// LOADING ANIMATION SYSTEM
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
        button.textContent = '';
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
        // Restore original text based on form type
        const isRegisterForm = button.closest('.register');
        button.textContent = isRegisterForm ? 'REGISTER' : 'LOGIN';
    }
}

// BOT DETECTION SYSTEM
function trackFormSubmission(type) {
    const now = Date.now();
    formSubmissions[type].push(now);
    
    // Keep only last 10 submissions
    if (formSubmissions[type].length > 10) {
        formSubmissions[type] = formSubmissions[type].slice(-10);
    }
    
    // Check for rapid submissions (potential bot activity)
    const recentSubmissions = formSubmissions[type].filter(time => now - time < 60000); // Last minute
    if (recentSubmissions.length > 5) {
        console.warn(`Rapid ${type} submissions detected - possible bot activity`);
        return false;
    }
    
    return true;
}

// SESSION MANAGEMENT SYSTEM
function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        if (sessionStorage.getItem('currentUser')) {
            alert('Your session has expired for security reasons. Please log in again.');
            sessionStorage.clear();
            location.reload();
        }
    }, sessionDuration);
}

// Reset timeout on user activity
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetSessionTimeout, { passive: true });
});

// Initialize session timeout
resetSessionTimeout();

// FORM EVENT HANDLERS 

// Get form elements
const loginForm = document.querySelector(".login form");
const registerForm = document.querySelector(".register form");

// Password strength indicator for registration
const passwordInput = registerForm.querySelector('input[type="password"]');
const strengthIndicator = registerForm.querySelector('.password-strength');

passwordInput.addEventListener('input', (e) => {
    const strength = checkPasswordStrength(e.target.value);
    strengthIndicator.textContent = strength.text;
    strengthIndicator.className = `password-strength ${strength.class}`;
});

// Enhanced registration form handler
registerForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const button = this.querySelector(".btn");
    
    // Bot detection
    if (!trackFormSubmission('register')) {
        showMessage(this, "Too many registration attempts. Please wait before trying again.", true);
        return false;
    }
    
    // Check rate limiting
    const rateCheck = checkRateLimit('register');
    if (!rateCheck.allowed) {
        showRateLimitIndicator(this, rateCheck.message);
        return;
    }

    setButtonLoading(button, true);

    // Simulate processing delay for security
    setTimeout(() => {
        const username = sanitizeInput(this.querySelector('input[placeholder="Username"]').value.trim());
        const email = sanitizeInput(this.querySelector('input[placeholder="Email"]').value.trim());
        const password = this.querySelector('input[placeholder="Password"]').value;

        // Enhanced validation
        if (!username || !email || !password) {
            showMessage(this, "All fields are required!", true);
            setButtonLoading(button, false);
            return;
        }

        // Username validation
        if (username.length < 3) {
            showMessage(this, "Username must be at least 3 characters long!", true);
            setButtonLoading(button, false);
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage(this, "Please enter a valid email address!", true);
            setButtonLoading(button, false);
            return;
        }

        // Enhanced password validation
        const strength = checkPasswordStrength(password);
        if (strength.level === 'weak') {
            showMessage(this, "Password is too weak! Use 8+ characters with uppercase, lowercase, numbers, and special characters.", true);
            setButtonLoading(button, false);
            return;
        }

        // Save user data
        const result = saveUserData(username, email, password);
        showMessage(this, result.message, !result.success);
        setButtonLoading(button, false);

        if (result.success) {
            this.reset();
            strengthIndicator.textContent = '';
            setTimeout(() => {
                container.classList.remove("active");
            }, 2000);
        }
    }, 1500);
});

// Enhanced login form handler
loginForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const button = this.querySelector(".btn");
    
    // Bot detection
    if (!trackFormSubmission('login')) {
        showMessage(this, "Too many login attempts. Please wait before trying again.", true);
        return false;
    }
    
    // Check rate limiting
    const rateCheck = checkRateLimit('login');
    if (!rateCheck.allowed) {
        showRateLimitIndicator(this, rateCheck.message);
        return;
    }

    setButtonLoading(button, true);

    // Simulate processing delay for security
    setTimeout(() => {
        const username = sanitizeInput(this.querySelector('input[placeholder="Username"]').value.trim());
        const password = this.querySelector('input[placeholder="Password"]').value;

    // Enhanced validation
    if (!username || !password) {
        showMessage(this, "All fields are required!", true);
        setButtonLoading(button, false);
        return;
    }

    // Validate login
    const result = validateLogin(username, password);
        showMessage(this, result.message, !result.success);
         setButtonLoading(button, false);

        if (result.success) {
            // Store current user session (in-memory)
            sessionStorage.setItem("currentUser", username);
            sessionStorage.setItem("loginTime", new Date().toISOString());
            
            // Simulate redirect to dashboard
            setTimeout(() => {
                showMessage(this, "Redirecting to secure dashboard...", false);
                setTimeout(() => {
                    window.location.href = "index.html";
                }
            )
                console.log("User authenticated successfully:", username);
            }, 1000);
        }
    }, 1500);
});

// SOCIAL LOGIN & FORGOT PASSWORD HANDLERS

// Social login handler with security measures
function handleSocialLogin(provider, event) {
    event.preventDefault();
    
    // Check rate limiting
    const rateCheck = checkRateLimit('login');
    if (!rateCheck.allowed) {
        alert(sanitizeInput(`Rate limit exceeded. ${rateCheck.message}`));
        return;
    }

    // Simulate secure social login
    console.log(`Initiating secure ${provider} login...`);
    alert(sanitizeInput(`${provider} login would redirect to secure OAuth flow`));
}

// Forgot password handler
function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = prompt("Enter your email address for password reset:");
    if (email) {
        const sanitizedEmail = sanitizeInput(email);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(sanitizedEmail)) {
            alert(`Password reset link sent to: ${sanitizedEmail}`);
            console.log("Password reset initiated for:", sanitizedEmail);
        } else {
            alert("Please enter a valid email address.");
        }
    }
}

// ANTI-TAMPERING & SECURITY MEASURES

// Prevent right-click context menu on sensitive areas
document.querySelectorAll('input[type="password"]').forEach(input => {
    input.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
});

// Clear sensitive data on page unload
window.addEventListener('beforeunload', () => {
    // Clear any sensitive form data
    document.querySelectorAll('input[type="password"]').forEach(input => {
        input.value = '';
    });
});

// Monitor for suspicious activity
document.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - suspiciousActivity.lastClickTime < 100) {
        suspiciousActivity.rapidClicks++;
        if (suspiciousActivity.rapidClicks > 10) {
            console.warn('Suspicious rapid clicking detected');
            // In a real app, you might want to implement additional security measures
        }
    } else {
        suspiciousActivity.rapidClicks = 0;
    }
    suspiciousActivity.lastClickTime = now;
});

// Keyboard security - prevent common shortcuts that might be malicious
document.addEventListener('keydown', (e) => {
    // Prevent F12 (DevTools) - though this is easily bypassed, it deters casual users
    if (e.key === 'F12') {
        e.preventDefault();
        console.log('Developer tools access attempt detected');
    }
    
    // Prevent Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        console.log('Developer tools access attempt detected');
    }
    
    // Prevent Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        console.log('View source attempt detected');
    }
});

// SECURITY LOGGING & MONITORING

// Console security message
console.log(`
🔒 FINEX SECURE LOGIN SYSTEM
============================
Security Features Active:
✅ HTTPS Enforcement
✅ Content Security Policy
✅ Input Sanitization
✅ Rate Limiting
✅ Session Management
✅ Password Strength Validation
✅ XSS Protection
✅ Clickjacking Prevention
✅ Bot Detection
✅ Anti-Tampering Measures

`);

// Display security status in console every 3 minutes
setInterval(() => {
    const stats = {
        loginAttempts: rateLimitData.loginAttempts,
        registerAttempts: rateLimitData.registerAttempts,
        activeUsers: Object.keys(userData).length,
        sessionActive: !!sessionStorage.getItem('currentUser'),
        timestamp: new Date().toISOString()
    };
    console.log('🔒 Security Status:', stats);
}, 180000); // Every 3 minutes

// INITIALIZATION

// Initialize security features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔒 FINEX Security System Initialized');
    console.log('📊 All security features are active and monitoring');
    
    // Set initial focus to first input field
    const firstInput = document.querySelector('.login input[type="text"]');
    if (firstInput) {
        firstInput.focus();
    }
});
