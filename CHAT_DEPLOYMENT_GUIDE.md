# Theracowch Chat - Deployment & Integration Guide

## Overview
A standalone, WhatsApp/Telegram-inspired chat interface for AI Mandy on Mandy's website (thoughtsonlifeandlove.com).

---

## Files Created

```
/theracowch/
├── chat.html                      # Main chat page
├── assets/
│   ├── chat-styles.css            # Chat-specific styles
│   └── chat-script.js             # Chat functionality
├── api/chat.js                    # Already exists (Vercel serverless)
└── public/imagine-framework-prompts.txt  # Enhanced training (already created)
```

---

## Deployment Options

### **OPTION 1: Dedicated Subdomain (RECOMMENDED)** ⭐

**URL:** `chat.thoughtsonlifeandlove.com` or `mandy.thoughtsonlifeandlove.com`

**Benefits:**
- Clean, memorable URL
- Professional appearance
- Easy to share
- Can be PWA (installable app)

**Steps:**

1. **Deploy to Vercel:**
   ```bash
   cd /Users/tomcassidy/theracowch
   vercel --prod
   ```

2. **Add Custom Domain in Vercel:**
   - Go to Vercel project settings
   - Add domain: `chat.thoughtsonlifeandlove.com`
   - Copy the DNS records provided

3. **Update WordPress DNS:**
   - Log into hosting provider (where thoughtsonlifeandlove.com is hosted)
   - Add CNAME record:
     ```
     Name: chat
     Type: CNAME
     Value: cname.vercel-dns.com
     TTL: 3600
     ```

4. **Link from Main Site:**
   ```html
   <!-- Add to WordPress menu or sidebar -->
   <a href="https://chat.thoughtsonlifeandlove.com"
      target="_blank"
      class="chat-with-mandy-button">
      💬 Chat with AI Mandy
   </a>
   ```

---

### **OPTION 2: WordPress Page**

**URL:** `thoughtsonlifeandlove.com/chat-with-mandy`

**Benefits:**
- Integrated with existing site
- No subdomain setup required
- Appears in WordPress navigation

**Steps:**

1. **Create New WordPress Page:**
   - Dashboard → Pages → Add New
   - Title: "Chat with AI Mandy"
   - Permalink: `/chat-with-mandy`

2. **Use HTML Block (Elementor or Block Editor):**
   ```html
   <div class="mandy-chat-container" style="width: 100%; height: 80vh;">
     <iframe
       src="https://theracowch.com/chat.html"
       width="100%"
       height="100%"
       frameborder="0"
       style="border-radius: 10px;"
       allow="clipboard-write">
     </iframe>
   </div>
   ```

3. **Optional: Add Intro Section:**
   ```html
   <div style="text-align: center; margin: 2rem 0;">
     <h1>Chat with AI Mandy</h1>
     <p>Get instant CBT-focused support using the IMAGINE framework</p>
     <p><small>⚠️ This is an AI tool, not a replacement for professional therapy</small></p>
   </div>
   ```

---

### **OPTION 3: Chat Widget Bubble**

**URL:** Appears on all pages as floating button

**Benefits:**
- Always accessible
- Non-intrusive
- Familiar UX pattern

**Steps:**

1. **Add to WordPress Footer:**
   - Appearance → Theme Editor → footer.php (or use plugin like "Insert Headers and Footers")

2. **Add This Code:**
   ```html
   <!-- Mandy Chat Widget -->
   <div id="mandy-chat-widget">
     <button id="mandy-chat-bubble" onclick="openMandyChat()" style="
       position: fixed;
       bottom: 20px;
       right: 20px;
       width: 60px;
       height: 60px;
       border-radius: 50%;
       background: linear-gradient(135deg, #F0E6DC 0%, #E8DED3 100%);
       border: 2px solid #A67C52;
       font-size: 30px;
       cursor: pointer;
       box-shadow: 0 4px 12px rgba(0,0,0,0.15);
       z-index: 9999;
       display: flex;
       align-items: center;
       justify-content: center;
     ">
       🐮
     </button>

     <!-- Chat Overlay (initially hidden) -->
     <div id="mandy-chat-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9998; backdrop-filter: blur(4px);" onclick="closeMandyChat()">
       <div style="position: absolute; right: 20px; bottom: 100px; width: 400px; height: 600px; max-width: 90vw; max-height: 90vh; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); overflow: hidden;" onclick="event.stopPropagation()">
         <iframe
           src="https://theracowch.com/chat.html"
           width="100%"
           height="100%"
           frameborder="0">
         </iframe>
       </div>
     </div>
   </div>

   <script>
     function openMandyChat() {
       document.getElementById('mandy-chat-overlay').style.display = 'block';
       document.getElementById('mandy-chat-bubble').style.display = 'none';
     }

     function closeMandyChat() {
       document.getElementById('mandy-chat-overlay').style.display = 'none';
       document.getElementById('mandy-chat-bubble').style.display = 'flex';
     }
   </script>
   ```

---

## Testing Locally

### **Before Deployment:**

1. **Start Local Server:**
   ```bash
   cd /Users/tomcassidy/theracowch
   npx serve
   ```

2. **Open Browser:**
   ```
   http://localhost:3000/chat.html
   ```

3. **Test Features:**
   - [ ] Messages send successfully
   - [ ] Typing indicator appears
   - [ ] Quick prompts work
   - [ ] Menu opens
   - [ ] Clear chat works
   - [ ] Mobile responsive (use DevTools)
   - [ ] iOS Safari (if available)

---

## API Configuration

The chat uses the existing `/api/chat.js` endpoint that's already deployed.

**Verify it's working:**
```bash
curl -X POST https://theracowch.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Mandy", "history": []}'
```

**Expected Response:**
```json
{
  "response": "Thanks for sharing - how are you feeling today?",
  "pattern": "general"
}
```

---

## Mobile Optimization

The chat is already optimized for mobile:

✅ **iOS Safari:**
- Safe area insets for notch/Dynamic Island
- Prevents zoom on input focus
- Smooth scrolling
- Keyboard appearance handling

✅ **Android:**
- Material Design patterns
- Back button support
- Chrome PWA compatible

✅ **PWA (Progressive Web App):**
- Can be "installed" to home screen
- Works offline (conversation history)
- App-like experience

---

## Customization Options

### **Change Colors (Brand Matching):**

Edit `/assets/chat-styles.css`:
```css
:root {
    --bg-primary: #FAF6F3;       /* Main background */
    --accent-primary: #A67C52;    /* Buttons, accents */
    /* ... other variables */
}
```

### **Change Quick Prompts:**

Edit `/chat.html` line ~30:
```html
<button class="quick-prompt-btn" data-prompt="Your custom prompt">
    😊 Your label
</button>
```

### **Change Welcome Message:**

Edit `/assets/chat-script.js` function `showWelcomeMessage()`:
```javascript
welcomeDiv.innerHTML = `
    <h2>🐮 Your Custom Welcome</h2>
    <p>Your custom text...</p>
`;
```

---

## WordPress Integration Examples

### **In Blog Post:**
```html
<!-- Add this shortcode to any post -->
<a href="/chat-with-mandy" class="button">
  💬 Chat with AI Mandy about this topic
</a>
```

### **In Sidebar Widget:**
```html
<div class="widget chat-widget">
  <h3>Need Support?</h3>
  <p>Chat with AI Mandy for instant CBT-focused guidance</p>
  <a href="/chat-with-mandy" class="button">Start Chat</a>
</div>
```

### **As Popup (using WordPress plugin like "Popup Maker"):**
- Create popup with iframe
- Trigger on exit intent or time delay
- Link to chat page

---

## Security & Privacy

✅ **Data Storage:**
- Conversation history stored in browser localStorage only
- No server-side storage of conversations
- User can clear at any time

✅ **API Security:**
- Rate limiting enabled (Vercel)
- CORS configured for thoughtsonlifeandlove.com
- No PII collected

⚠️ **Disclaimers to Add:**

```html
<div class="disclaimer">
  <p><strong>Important:</strong></p>
  <ul>
    <li>This is an AI assistant, not a replacement for professional therapy</li>
    <li>For crisis support, contact emergency services immediately</li>
    <li>Not suitable for clinical diagnosis or treatment decisions</li>
  </ul>
</div>
```

---

## Analytics Tracking

Add to chat.html before `</body>`:

```html
<script>
  // Track chat interactions
  function trackChatEvent(action) {
    if (window.gtag) {
      gtag('event', action, {
        'event_category': 'AI Chat',
        'event_label': 'Mandy Chat'
      });
    }
  }

  // Track when chat starts
  document.getElementById('send-button').addEventListener('click', function() {
    trackChatEvent('message_sent');
  }, { once: true });
</script>
```

---

## Troubleshooting

### **Chat not loading:**
- Check API endpoint is accessible
- Verify CORS settings in vercel.json
- Check browser console for errors

### **Messages not sending:**
- Test API directly with curl
- Check network tab in DevTools
- Verify Anthropic API key is set

### **Styling issues:**
- Clear browser cache
- Check /assets/chat-styles.css is loading
- Verify no WordPress theme conflicts

### **Mobile issues:**
- Test in iOS Simulator / Android Emulator
- Check viewport meta tag
- Verify safe-area-inset CSS

---

## Next Steps

1. **Test locally** using `npx serve`
2. **Deploy to Vercel** if using subdomain approach
3. **Choose integration method** (subdomain, page, or widget)
4. **Add to WordPress navigation**
5. **Test on mobile devices**
6. **Add analytics tracking**
7. **Monitor API usage** (Claude API costs)

---

## Support & Updates

**Codebase:** `/Users/tomcassidy/theracowch`
**API Endpoint:** `/api/chat.js`
**Training Data:** `/public/imagine-framework-prompts.txt`
**Documentation:** `/MANDY_AI_TRAINING_SUMMARY.md`

For questions or modifications, refer to the main project documentation.

---

## Example URLs

**Option 1 (Subdomain):**
- Main site: `https://thoughtsonlifeandlove.com`
- Chat: `https://chat.thoughtsonlifeandlove.com`

**Option 2 (Page):**
- Main site: `https://thoughtsonlifeandlove.com`
- Chat: `https://thoughtsonlifeandlove.com/chat-with-mandy`

**Option 3 (Widget):**
- Appears on all pages as floating button
- Opens overlay on click

---

*Created: 2025-11-03*
*Platform: WordPress + Vercel Serverless*
*Style: WhatsApp/Telegram-inspired messaging interface*