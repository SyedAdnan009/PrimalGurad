//backend\autocti_chrome_ext\content_script.js
console.log("[✅ Content Script] LOADED");

// Intercept ALL link clicks with highest priority
document.addEventListener("click", function handleClick(e) {
  try {
    const target = e.target.closest('a');
    
    if (!target || !target.href) {
      return;
    }
    
    const href = target.href.trim();
    
    console.log("[📎 Link Click] URL:", href);
    
    // Only process HTTP/HTTPS
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
      console.log("[⏭️  Skipping] Non-HTTP URL");
      return;
    }
    
    // Send to background immediately
    const message = {
      type: "link_click",
      url: href,
      timestamp: new Date().toISOString()
    };
    
    console.log("[📤 Sending] to background:", message);
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        console.log("[✅ Response] from background:", response);
      });
    } catch (err) {
      console.error("[❌ Error sending message]", err);
    }
    
  } catch (error) {
    console.error("[❌ Error in click handler]", error);
  }
}, true); // Capture phase - catches ALL clicks

console.log("[✅ Content Script] Event listener attached");
