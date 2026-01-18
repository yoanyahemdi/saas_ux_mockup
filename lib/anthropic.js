/**
 * Anthropic API Integration for Tag Insight Crawler
 *
 * Provides AI-powered analysis of tracking requests using Claude.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { getFacebookPrompt, getGA4Prompt, getGoogleAdsPrompt } = require('./prompts');

// Initialize Anthropic client
let client = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
      throw new Error('ANTHROPIC_API_KEY is not configured. Please add your API key to .env file.');
    }
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return client;
}

/**
 * Get the appropriate system prompt for a vendor
 */
function getSystemPrompt(vendor) {
  switch (vendor) {
    case 'meta':
    case 'facebook':
      return getFacebookPrompt();
    case 'ga4':
    case 'google-analytics':
      return getGA4Prompt();
    case 'gads':
    case 'google-ads':
      return getGoogleAdsPrompt();
    default:
      return getFacebookPrompt(); // Default to Facebook
  }
}

/**
 * Format raw crawler requests into the format expected by the audit prompt
 */
function formatRequestsForAnalysis(requests, vendor) {
  return requests.map((req, index) => {
    // Parse query parameters from URL
    let queryParams = {};
    let postParams = {};

    try {
      const url = new URL(req.url);
      for (const [key, value] of url.searchParams.entries()) {
        queryParams[key] = value;
      }
    } catch (e) {
      // Invalid URL
    }

    // Parse payload if present
    if (req.payload) {
      try {
        postParams = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
      } catch (e) {
        // Payload might be URL-encoded
        try {
          const params = new URLSearchParams(req.payload);
          for (const [key, value] of params.entries()) {
            postParams[key] = value;
          }
        } catch (e2) {
          // Keep as string
          postParams = { raw: req.payload };
        }
      }
    }

    return {
      id: index + 1,
      created_at: new Date().toISOString(),
      page_url: req.pageUrl || '',
      hostname: req.domain,
      path: (() => {
        try {
          return new URL(req.url).pathname;
        } catch (e) {
          return '';
        }
      })(),
      method: req.method || 'GET',
      query: queryParams,
      posts: postParams,
      body: {},
      url: req.url
    };
  });
}

/**
 * Analyze tracking requests using Claude AI
 *
 * @param {Array} requests - Raw crawler requests
 * @param {string} vendor - Vendor type (meta, ga4, gads)
 * @returns {Object} Structured audit report
 */
async function analyzeTrackingRequests(requests, vendor) {
  const anthropicClient = getClient();
  const systemPrompt = getSystemPrompt(vendor);
  const formattedRequests = formatRequestsForAnalysis(requests, vendor);

  // Limit requests to avoid truncated responses (max 8 requests per analysis)
  const MAX_REQUESTS = 8;
  const limitedRequests = formattedRequests.slice(0, MAX_REQUESTS);
  if (formattedRequests.length > MAX_REQUESTS) {
    console.log(`[Anthropic] Limiting analysis to first ${MAX_REQUESTS} of ${formattedRequests.length} requests`);
  }

  // Simplify request data to reduce token usage
  const simplifiedRequests = limitedRequests.map(req => ({
    id: req.id,
    url: req.url,
    method: req.method,
    query: req.query,
    posts: req.posts
  }));

  console.log(`[Anthropic] Analyzing ${simplifiedRequests.length} ${vendor} requests...`);

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: systemPrompt + '\n\nIMPORTANT: Keep your response concise. For event_details, only include events that have issues. Limit issue_preview to max 2 items per event.',
      messages: [
        {
          role: 'user',
          content: JSON.stringify(simplifiedRequests, null, 2)
        }
      ]
    });

    // Check if response was truncated
    if (response.stop_reason === 'max_tokens') {
      console.warn('[Anthropic] Response was truncated due to max_tokens limit');
      throw new Error('AI response was truncated. Try analyzing fewer requests.');
    }

    // Extract the text content from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Parse the JSON response
    let auditReport;
    try {
      // Remove any markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      auditReport = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error('[Anthropic] Failed to parse JSON response:', parseError);
      console.error('[Anthropic] Raw response:', content.text.substring(0, 500));
      throw new Error('Failed to parse audit report from Claude response');
    }

    console.log(`[Anthropic] Analysis complete. Score: ${auditReport.score}/100`);
    return auditReport;

  } catch (error) {
    console.error('[Anthropic] API Error:', error.message);
    throw error;
  }
}

/**
 * Check if Anthropic API is configured
 */
function isConfigured() {
  return process.env.ANTHROPIC_API_KEY &&
         process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here';
}

/**
 * DOM extraction script to run in browser context
 * Extracts interactive elements with their properties
 */
const EXTRACT_ELEMENTS_SCRIPT = `() => {
  const elements = [];
  const selectors = 'button, a, input, select, textarea, [role="button"], [onclick], [data-action]';

  document.querySelectorAll(selectors).forEach((el, idx) => {
    const rect = el.getBoundingClientRect();
    // Skip invisible elements
    if (rect.width === 0 || rect.height === 0) return;
    if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') return;

    // Skip hidden elements
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

    elements.push({
      idx,
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      text: (el.innerText || el.value || '').slice(0, 100).trim(),
      ariaLabel: el.getAttribute('aria-label'),
      placeholder: el.placeholder || null,
      name: el.name || null,
      id: el.id || null,
      className: (el.className || '').toString().slice(0, 80),
      href: el.href ? (() => { try { return new URL(el.href, location.origin).pathname; } catch(e) { return el.href; } })() : null,
      dataAction: el.dataset.action || null,
      dataTestId: el.dataset.testid || el.dataset.testId || null,
      role: el.getAttribute('role'),
      isInForm: !!el.closest('form'),
      rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) }
    });
  });

  return elements.slice(0, 60);
}`;

/**
 * Ask Claude to identify a specific element for an action
 * Uses Haiku for fast, cheap responses
 *
 * @param {Array} elements - Array of extracted DOM elements
 * @param {string} action - Action type (cookie_consent, add_to_cart, etc.)
 * @param {Object} context - Additional context (pageUrl, step, etc.)
 * @returns {Object} { found: boolean, idx: number|null, confidence: string, reason: string }
 */
async function identifyElement(elements, action, context = {}) {
  const anthropicClient = getClient();

  const actionPrompts = {
    cookie_consent: 'Find the button to accept/dismiss cookies or consent banner. Look for text like "Accept", "Accept All", "Got it", "OK", "Allow", "Agree".',
    product_link: 'Find a link to a product detail page. Look for product cards, product images, or product titles that link to individual product pages. NOT category links, NOT "Shop All" links.',
    add_to_cart: 'Find the "Add to Cart", "Add to Bag", "Add to Basket", or "Buy Now" button. This is typically a prominent button on a product page.',
    view_cart: 'Find the cart icon, "View Cart" link, cart badge, or shopping bag button. Usually in the header/navigation area.',
    checkout: 'Find the "Checkout", "Proceed to Checkout", "Continue to Checkout", or "Buy" button. Usually on the cart page.',
    newsletter_email: 'Find the email input field for newsletter subscription. Look for inputs with placeholder like "Enter your email", type="email", or near text about "newsletter", "subscribe", "updates".',
    newsletter_submit: 'Find the submit button for the newsletter form. Look for buttons with text like "Subscribe", "Sign Up", "Submit", "Join".',
    login_link: 'Find a "Login", "Sign In", "Log In", or "My Account" link. Usually in the header.',
    signup_link: 'Find a "Sign Up", "Create Account", "Register", or "Join" link/button.'
  };

  const prompt = actionPrompts[action] || action;

  console.log(`[AI] Identifying element for: ${action}`);

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: `You analyze webpage elements to find specific interactive elements.
Return ONLY valid JSON with this exact structure:
{"found": true, "idx": 5, "confidence": "high", "reason": "Found button with text 'Add to Cart'"}
or
{"found": false, "idx": null, "confidence": "low", "reason": "No matching element found"}

Rules:
- idx must be the exact index from the elements array
- confidence: "high" (exact match), "medium" (likely match), "low" (uncertain)
- If multiple matches exist, pick the most prominent/visible one (larger size, higher position)
- Consider element position: header elements are usually navigation, main content has primary actions`,
      messages: [{
        role: 'user',
        content: `Page: ${context.pageUrl || 'unknown'}
Current step: ${context.step || 'browsing'}

TASK: ${prompt}

Elements (${elements.length} total):
${JSON.stringify(elements, null, 2)}`
      }]
    });

    const text = response.content[0].text.trim();
    // Remove markdown code blocks if present
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);

    console.log(`[AI] Result for ${action}: found=${result.found}, idx=${result.idx}, confidence=${result.confidence}`);
    return result;
  } catch (e) {
    console.error(`[AI] Error identifying ${action}:`, e.message);
    return { found: false, idx: null, confidence: 'low', reason: `AI error: ${e.message}` };
  }
}

/**
 * Identify form fields for filling out forms
 *
 * @param {Array} elements - Array of extracted DOM elements
 * @param {string} formType - Type of form (newsletter, login, signup, checkout)
 * @returns {Object} { fields: [{idx, fieldType, required}], submitIdx: number|null }
 */
async function identifyFormFields(elements, formType) {
  const anthropicClient = getClient();

  const formPrompts = {
    newsletter: 'Find the email input field for newsletter subscription',
    login: 'Find email/username input and password input for login form',
    signup: 'Find all required fields for account creation: email, password, name fields, phone (if present)',
    checkout: 'Find shipping/billing form fields: name, email, phone, address, city, zip/postal code, country'
  };

  console.log(`[AI] Identifying form fields for: ${formType}`);

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system: `You analyze form elements to identify input fields.
Return ONLY valid JSON:
{
  "fields": [
    {"idx": 3, "fieldType": "email", "required": true},
    {"idx": 5, "fieldType": "password", "required": true}
  ],
  "submitIdx": 7
}

fieldType values: email, password, name, firstName, lastName, phone, address, city, state, zip, country, text
submitIdx is the index of the form submit button (can be null if not found)`,
      messages: [{
        role: 'user',
        content: `TASK: ${formPrompts[formType] || formType}

Elements:
${JSON.stringify(elements.filter(el => el.tag === 'input' || el.tag === 'button' || el.tag === 'select' || el.tag === 'textarea'), null, 2)}`
      }]
    });

    const text = response.content[0].text.trim();
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanJson);

    console.log(`[AI] Found ${result.fields?.length || 0} form fields, submitIdx: ${result.submitIdx}`);
    return result;
  } catch (e) {
    console.error(`[AI] Error identifying form fields:`, e.message);
    return { fields: [], submitIdx: null };
  }
}

module.exports = {
  analyzeTrackingRequests,
  isConfigured,
  formatRequestsForAnalysis,
  identifyElement,
  identifyFormFields,
  EXTRACT_ELEMENTS_SCRIPT
};
