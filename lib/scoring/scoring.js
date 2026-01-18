/**
 * Scoring Module for Tag Insight Crawler
 *
 * Implements the scoring methodology for tracking solution audits:
 * - Overall solution score (0-100 with gauge visualization)
 * - Per-event scoring (success/warning/error counts shown as colored circles)
 * - Problem diagnosis grouping by severity
 */

// Severity levels for validation rules
const SEVERITY_LEVELS = {
  CRITICAL: {
    level: 'critical',
    priority: 1,
    label: 'Critical',
    description: 'Must be fixed immediately - blocking tracking functionality'
  },
  IMPORTANT: {
    level: 'important',
    priority: 2,
    label: 'Important',
    description: 'Should be addressed soon - impacting data quality'
  },
  OPTIMIZATION: {
    level: 'optimization',
    priority: 3,
    label: 'Optimization',
    description: 'Nice to have - improve tracking accuracy'
  }
};

// List of Facebook standard events for validation
const FB_STANDARD_EVENTS = [
  'PageView', 'ViewContent', 'Search', 'AddToCart', 'AddToWishlist',
  'InitiateCheckout', 'AddPaymentInfo', 'Purchase', 'Lead',
  'CompleteRegistration', 'Contact', 'CustomizeProduct', 'Donate',
  'FindLocation', 'Schedule', 'StartTrial', 'SubmitApplication', 'Subscribe'
];

// Valid ISO 4217 currency codes (common subset)
const VALID_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'RUB', 'KRW',
  'PLN', 'THB', 'IDR', 'MYR', 'PHP', 'CZK', 'HUF', 'ILS', 'CLP', 'AED',
  'SAR', 'TWD', 'TRY', 'VND', 'PKR', 'EGP', 'NGN', 'BDT', 'ARS', 'COP'
];

/**
 * Facebook Pixel Validation Rules (21 rules)
 * Based on Meta Pixel documentation and best practices
 */
const FB_VALIDATION_RULES = {
  'FB-001': {
    ruleId: 'FB-001',
    solutionName: 'Facebook Pixel',
    ruleName: 'Pixel ID Presence',
    description: 'Checks if the `id` parameter (Pixel ID) is present, not empty and numeric.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['id'],
    checkLogic: (event) => {
      const pixelId = event.params?.id;
      if (!pixelId) return { passed: false, detail: 'missing' };
      if (!/^\d{15,16}$/.test(String(pixelId))) return { passed: false, detail: 'invalid format' };
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.CRITICAL,
    scoreDeduction: 30,
    errorMessage: 'Facebook Pixel ID missing or invalid. The event will not be attributed.',
    errorMessageTemplate: 'Facebook Pixel ID missing or invalid in {event_name} event.',
    recommendation: 'Check the Pixel base code installation. Make sure your Pixel ID is correctly configured and included.',
    docUrl: 'https://www.facebook.com/business/help/952192354843755'
  },

  'FB-002': {
    ruleId: 'FB-002',
    solutionName: 'Facebook Pixel',
    ruleName: 'Event Name Presence',
    description: 'Checks if the `ev` parameter (Event Name) is present and not empty.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['ev'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      if (!eventName || eventName === '') return { passed: false };
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 15,
    errorMessage: "Event name ('ev') missing. Facebook cannot identify the tracked action.",
    errorMessageTemplate: "Event name missing from Meta Pixel request on {url}.",
    recommendation: "Make sure each `fbq('track', ...)` call includes the standard or custom event name.",
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#standard-events'
  },

  'FB-003': {
    ruleId: 'FB-003',
    solutionName: 'Facebook Pixel',
    ruleName: 'Duplicate PageView Event',
    description: 'Detects if the `PageView` event is sent multiple times identically during the same page load.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'cross_request_validation',
    targetElements: ['id', 'ev', 'dl'],
    checkLogic: (event, allEvents) => {
      if (event.params?.ev !== 'PageView' && event.event_name !== 'PageView') {
        return { passed: true, skipped: true };
      }
      const pageUrl = event.params?.dl || event.url;
      const pixelId = event.params?.id;
      const timestamp = new Date(event.timestamp).getTime();

      const duplicates = allEvents.filter(e => {
        if (e.event_id === event.event_id) return false;
        const eEventName = e.params?.ev || e.event_name;
        if (eEventName !== 'PageView') return false;
        const ePageUrl = e.params?.dl || e.url;
        const ePixelId = e.params?.id;
        const eTimestamp = new Date(e.timestamp).getTime();
        return ePageUrl === pageUrl && ePixelId === pixelId && Math.abs(eTimestamp - timestamp) < 500;
      });

      if (duplicates.length > 0) {
        return { passed: false, detail: `${duplicates.length + 1} identical PageView events` };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.CRITICAL,
    scoreDeduction: 25,
    errorMessage: 'PageView event triggered multiple times on the same page. Risk of skewing statistics.',
    errorMessageTemplate: 'Duplicate PageView event detected on {url}.',
    recommendation: 'Check your Tag Manager or code to avoid multiple triggers of the PageView tag. Make sure it only triggers once per page load.',
    docUrl: 'https://www.facebook.com/business/help/952192354843755'
  },

  'FB-004': {
    ruleId: 'FB-004',
    solutionName: 'Facebook Pixel',
    ruleName: 'Standard Event Verification',
    description: 'Checks if the `ev` value corresponds to a known standard event.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['ev'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      if (!eventName) return { passed: true, skipped: true };
      if (FB_STANDARD_EVENTS.includes(eventName)) return { passed: true };
      // Custom events are okay, just flag for awareness
      return { passed: false, detail: eventName };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "Event '{event_name}' is non-standard. (Ok if it's a custom event).",
    errorMessageTemplate: "Event '{event_name}' is not a standard Meta event.",
    recommendation: 'Use standard events when possible to benefit from Facebook optimizations. Check the spelling of standard events.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#standard-events'
  },

  'FB-005': {
    ruleId: 'FB-005',
    solutionName: 'Facebook Pixel',
    ruleName: 'Multiple Different Pixel IDs',
    description: 'Detects if requests with *different* Pixel `id`s are sent from the same site.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'cross_request_validation',
    targetElements: ['id'],
    checkLogic: (event, allEvents) => {
      const currentPixelId = event.params?.id;
      if (!currentPixelId) return { passed: true, skipped: true };

      const uniquePixelIds = new Set(
        allEvents
          .map(e => e.params?.id)
          .filter(id => id && id !== '')
      );

      if (uniquePixelIds.size > 1) {
        return { passed: false, detail: Array.from(uniquePixelIds).join(', ') };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 15,
    errorMessage: 'Multiple different Facebook Pixel IDs detected.',
    errorMessageTemplate: 'Multiple Pixel IDs detected: {detail}.',
    recommendation: 'Confirm if using multiple Pixels is intentional (e.g., agency). Otherwise, remove redundant Pixels to avoid data fragmentation.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/get-started'
  },

  'FB-006': {
    ruleId: 'FB-006',
    solutionName: 'Facebook Pixel',
    ruleName: 'FBP Parameter Presence',
    description: 'Checks if the `fbp` parameter (`_fbp` cookie) is present and correctly formatted.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['fbp'],
    checkLogic: (event) => {
      const fbp = event.params?.fbp;
      if (!fbp) return { passed: false, detail: 'missing' };
      // Format: fb.X.XXXXXXXXXX.XXXXXXXXXX
      if (!/^fb\.\d\.\d+\.\d+$/.test(fbp)) return { passed: false, detail: 'invalid format' };
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "'fbp' parameter missing or invalid. May reduce Facebook's matching capability.",
    errorMessageTemplate: "'fbp' parameter missing or invalid in {event_name} event.",
    recommendation: "Make sure the `_fbp` cookie is correctly created. Check cookie/script policies.",
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation/cookie-usage#_fbp-cookie'
  },

  'FB-007': {
    ruleId: 'FB-007',
    solutionName: 'Facebook Pixel',
    ruleName: 'FBC Parameter Presence',
    description: 'Checks if `fbc` (`_fbc` cookie) is present *if* `fbclid` was in the landing URL.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['fbc'],
    checkLogic: (event) => {
      const pageUrl = event.params?.dl || event.url || '';
      const hasFbclid = pageUrl.includes('fbclid=');
      if (!hasFbclid) return { passed: true, skipped: true };

      const fbc = event.params?.fbc;
      if (!fbc) return { passed: false, detail: 'fbclid present but fbc missing' };
      // Format: fb.X.XXXXXXXXXX.XXXXX...
      if (!/^fb\.\d\.\d+\./.test(fbc)) return { passed: false, detail: 'invalid format' };
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "'fbc' parameter missing when `fbclid` was present. May affect ad click attribution.",
    errorMessageTemplate: "'fbc' parameter missing on {url} where fbclid was present.",
    recommendation: 'Check that the Pixel loads early enough to capture the `fbclid` and generate the `_fbc` cookie.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation/cookie-usage#_fbc-cookie'
  },

  'FB-008': {
    ruleId: 'FB-008',
    solutionName: 'Facebook Pixel',
    ruleName: 'Purchase - Value/Currency (Required)',
    description: 'If `ev=Purchase`, checks that `value` (>0) and `currency` (valid) are present (Required by FB).',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['value', 'currency'],
    appliesTo: ['Purchase'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      if (eventName !== 'Purchase') return { passed: true, skipped: true };

      const value = event.params?.value;
      const currency = event.params?.currency;
      const missing = [];

      if (value === undefined || value === null || value === '') {
        missing.push('value');
      } else if (isNaN(Number(value)) || Number(value) <= 0) {
        missing.push('value (must be > 0)');
      }

      if (!currency || currency === '') {
        missing.push('currency');
      } else if (!/^[A-Z]{3}$/.test(String(currency).toUpperCase())) {
        missing.push('currency (invalid ISO code)');
      }

      if (missing.length > 0) {
        return { passed: false, detail: missing.join(', ') };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.CRITICAL,
    scoreDeduction: 25,
    errorMessage: 'REQUIRED transaction data missing/invalid for Purchase event.',
    errorMessageTemplate: 'Purchase event missing required data: {detail}.',
    recommendation: 'The `value` and `currency` parameters are MANDATORY for the `Purchase` event. Make sure they are always transmitted and correct.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#purchase'
  },

  'FB-009': {
    ruleId: 'FB-009',
    solutionName: 'Facebook Pixel',
    ruleName: 'Ecom - Content (Dyn. Ads)',
    description: 'If `ev` is `ViewContent`, `AddToCart`, `Purchase`, `Search`, checks that `content_ids` or `contents` is present (Required for Dynamic Ads).',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['content_ids', 'contents'],
    appliesTo: ['ViewContent', 'AddToCart', 'Purchase', 'Search'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      const ecomEvents = ['ViewContent', 'AddToCart', 'Purchase', 'Search'];
      if (!ecomEvents.includes(eventName)) return { passed: true, skipped: true };

      const contentIds = event.params?.content_ids || event.params?.cd?.content_ids;
      const contents = event.params?.contents || event.params?.cd?.contents;

      if (!contentIds && !contents) {
        return { passed: false, detail: 'neither content_ids nor contents found' };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 15,
    errorMessage: "Content IDs ('content_ids' or 'contents') missing. Required for dynamic ads.",
    errorMessageTemplate: "Content IDs missing for '{event_name}' event.",
    recommendation: 'Include product IDs for key e-commerce events to enable dynamic retargeting and detailed reporting. Check the format.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation/commerce'
  },

  'FB-010': {
    ruleId: 'FB-010',
    solutionName: 'Facebook Pixel',
    ruleName: 'Advanced Matching Parameters Check',
    description: 'Checks the presence of Advanced Matching parameters (e.g., `em`, `ph`).',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['em', 'ph', 'fn', 'ln', 'ge', 'db', 'ct', 'st', 'zp', 'country'],
    checkLogic: (event) => {
      const params = event.params || {};
      const advancedMatchingParams = ['em', 'ph', 'fn', 'ln', 'ge', 'db', 'ct', 'st', 'zp', 'country'];

      // Check both direct params and nested ud object
      const hasDirectParams = advancedMatchingParams.some(p => params[p] && params[p] !== '');
      const hasUdParams = params.ud && typeof params.ud === 'object' &&
        advancedMatchingParams.some(p => params.ud[p] && params.ud[p] !== '');

      if (hasDirectParams || hasUdParams) return { passed: true };
      return { passed: false, detail: 'no advanced matching params found' };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 10,
    errorMessage: 'No Advanced Matching parameters detected (e.g., email, phone).',
    errorMessageTemplate: 'No Advanced Matching parameters in {event_name} event.',
    recommendation: "If you use Advanced Matching, make sure parameters are correctly hashed and sent (e.g., `fbq('init', 'ID', {em: '...'});`).",
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation/advanced-matching'
  },

  'FB-011': {
    ruleId: 'FB-011',
    solutionName: 'Facebook Pixel',
    ruleName: 'Consent Parameters Check',
    description: 'Checks the presence/value of consent-related parameters.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['coo', 'npa', 'gdpr_consent'],
    checkLogic: (event) => {
      const params = event.params || {};
      // Check for common consent parameters
      const consentParams = ['coo', 'npa', 'gdpr', 'gdpr_consent', 'consent'];
      const hasConsent = consentParams.some(p => params[p] !== undefined);

      if (hasConsent) return { passed: true };
      return { passed: false, detail: 'no consent parameters detected' };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 15,
    errorMessage: 'Consent parameters not detected or potentially incorrect.',
    errorMessageTemplate: 'No consent parameters in {event_name} event.',
    recommendation: 'Check your Pixel integration with your CMP to ensure GDPR/ePrivacy compliance.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/implementation/gdpr'
  },

  'FB-012': {
    ruleId: 'FB-012',
    solutionName: 'Facebook Pixel',
    ruleName: 'Request Method Verification',
    description: 'Checks if the HTTP method (GET/POST) is appropriate.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'request_property',
    targetElements: ['method'],
    checkLogic: (event) => {
      const method = (event.method || 'GET').toUpperCase();
      // GET is standard, POST is used for large payloads
      if (method === 'GET' || method === 'POST') return { passed: true, detail: method };
      return { passed: false, detail: method };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: 'Request uses unexpected HTTP method.',
    errorMessageTemplate: 'Request uses {detail} method.',
    recommendation: 'GET is common. POST is possible. Make sure the method is appropriate and does not cause data loss if the GET URL is too long.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference'
  },

  'FB-013': {
    ruleId: 'FB-013',
    solutionName: 'Facebook Pixel',
    ruleName: 'InitiateCheckout - Num Items',
    description: 'If `ev=InitiateCheckout`, checks for the presence of the `num_items` parameter.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['num_items'],
    appliesTo: ['InitiateCheckout'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      if (eventName !== 'InitiateCheckout') return { passed: true, skipped: true };

      const numItems = event.params?.num_items || event.params?.cd?.num_items;
      if (numItems === undefined || numItems === null || numItems === '') {
        return { passed: false };
      }
      if (!Number.isInteger(Number(numItems))) {
        return { passed: false, detail: 'not an integer' };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "'num_items' parameter missing for InitiateCheckout event.",
    errorMessageTemplate: "'num_items' missing for InitiateCheckout on {url}.",
    recommendation: 'Add the `num_items` parameter to the `InitiateCheckout` event to indicate the number of items in the cart.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#initiatecheckout'
  },

  'FB-014': {
    ruleId: 'FB-014',
    solutionName: 'Facebook Pixel',
    ruleName: 'Search - Search String',
    description: 'If `ev=Search`, checks for the presence of the `search_string` parameter.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['search_string'],
    appliesTo: ['Search'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      if (eventName !== 'Search') return { passed: true, skipped: true };

      const searchString = event.params?.search_string || event.params?.cd?.search_string;
      if (!searchString || searchString === '') {
        return { passed: false };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "'search_string' parameter missing for Search event.",
    errorMessageTemplate: "'search_string' missing for Search event on {url}.",
    recommendation: 'Add the `search_string` parameter to the `Search` event to record the term searched by the user.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#search'
  },

  'FB-015': {
    ruleId: 'FB-015',
    solutionName: 'Facebook Pixel',
    ruleName: 'Subscribe/StartTrial - Value',
    description: 'If `ev=Subscribe` or `StartTrial`, checks for the presence of `value` or `predicted_ltv`.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['value', 'predicted_ltv'],
    appliesTo: ['Subscribe', 'StartTrial'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      if (!['Subscribe', 'StartTrial'].includes(eventName)) return { passed: true, skipped: true };

      const value = event.params?.value || event.params?.cd?.value;
      const predictedLtv = event.params?.predicted_ltv || event.params?.cd?.predicted_ltv;

      const hasValue = value !== undefined && value !== null && value !== '' && !isNaN(Number(value));
      const hasPredictedLtv = predictedLtv !== undefined && predictedLtv !== null && predictedLtv !== '' && !isNaN(Number(predictedLtv));

      if (hasValue || hasPredictedLtv) return { passed: true };
      return { passed: false };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "'value' or 'predicted_ltv' parameter missing for subscription event.",
    errorMessageTemplate: "'value' or 'predicted_ltv' missing for {event_name} event.",
    recommendation: 'Add `value` (monetary value) or `predicted_ltv` (predicted lifetime value) to `Subscribe` or `StartTrial` events to measure their impact.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#subscribe'
  },

  'FB-016': {
    ruleId: 'FB-016',
    solutionName: 'Facebook Pixel',
    ruleName: 'Ecom - Content Type',
    description: "If `content_ids` or `contents` is present, checks that `content_type` ('product' or 'product_group') is also present.",
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'conditional_validation',
    targetElements: ['content_type'],
    checkLogic: (event) => {
      const params = event.params || {};
      const contentIds = params.content_ids || params.cd?.content_ids;
      const contents = params.contents || params.cd?.contents;

      if (!contentIds && !contents) return { passed: true, skipped: true };

      const contentType = params.content_type || params.cd?.content_type;
      if (!contentType || contentType === '') {
        return { passed: false, detail: 'content_type missing' };
      }
      if (!['product', 'product_group'].includes(contentType)) {
        return { passed: false, detail: `invalid value: ${contentType}` };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 10,
    errorMessage: "'content_type' parameter missing or invalid when 'content_ids'/'contents' is present.",
    errorMessageTemplate: "'content_type' issue in {event_name}: {detail}.",
    recommendation: "Specify `content_type` ('product' or 'product_group') when sending `content_ids` or `contents` to improve the accuracy of dynamic ads.",
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#object-properties'
  },

  'FB-017': {
    ruleId: 'FB-017',
    solutionName: 'Facebook Pixel',
    ruleName: 'Event ID Presence (Deduplication)',
    description: 'Checks for the presence of the `eventID` parameter used for deduplication with the Conversions API.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['eid', 'eventID'],
    appliesTo: ['Purchase', 'Lead', 'AddToCart', 'InitiateCheckout', 'CompleteRegistration', 'ViewContent'],
    checkLogic: (event) => {
      const eventName = event.params?.ev || event.event_name;
      const conversionEvents = ['Purchase', 'Lead', 'AddToCart', 'InitiateCheckout', 'CompleteRegistration', 'ViewContent'];
      if (!conversionEvents.includes(eventName)) return { passed: true, skipped: true };

      const eventId = event.params?.eid || event.params?.eventID || event.params?.event_id;
      if (!eventId || eventId === '') {
        return { passed: false };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.OPTIMIZATION,
    scoreDeduction: 5,
    errorMessage: "'eventID' parameter missing. Useful for deduplication with the Conversions API.",
    errorMessageTemplate: "'eventID' missing for {event_name} event.",
    recommendation: 'If you use the Conversions API alongside the Pixel, add a unique `eventID` to each event to enable deduplication by Meta.',
    docUrl: 'https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events'
  },

  'FB-018': {
    ruleId: 'FB-018',
    solutionName: 'Facebook Pixel',
    ruleName: 'Value Type Validation',
    description: 'Checks if the `value` parameter, when present, contains a valid numeric value.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['value'],
    checkLogic: (event) => {
      const value = event.params?.value || event.params?.cd?.value;
      if (value === undefined || value === null || value === '') return { passed: true, skipped: true };

      if (isNaN(Number(value))) {
        return { passed: false, detail: value };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 10,
    errorMessage: "The 'value' parameter contains a non-numeric value.",
    errorMessageTemplate: "Invalid 'value' parameter: '{detail}'.",
    recommendation: 'Make sure the `value` parameter always contains a number (integer or decimal). Use a period as the decimal separator.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#object-properties'
  },

  'FB-019': {
    ruleId: 'FB-019',
    solutionName: 'Facebook Pixel',
    ruleName: 'Currency Type Validation',
    description: 'Checks if the `currency` parameter, when present, contains a valid ISO 4217 currency code (3 letters).',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['currency'],
    checkLogic: (event) => {
      const currency = event.params?.currency || event.params?.cd?.currency;
      if (currency === undefined || currency === null || currency === '') return { passed: true, skipped: true };

      const upperCurrency = String(currency).toUpperCase();
      if (!/^[A-Z]{3}$/.test(upperCurrency)) {
        return { passed: false, detail: currency };
      }
      if (!VALID_CURRENCY_CODES.includes(upperCurrency)) {
        // Still valid format, just not in our common list - pass with note
        return { passed: true, detail: 'uncommon currency code' };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 10,
    errorMessage: "The 'currency' parameter contains an invalid code. Must be an ISO 4217 code (e.g., EUR, USD).",
    errorMessageTemplate: "Invalid 'currency' parameter: '{detail}'.",
    recommendation: 'Always use a standard ISO 4217 currency code (3 uppercase letters) for the `currency` parameter.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#object-properties'
  },

  'FB-020': {
    ruleId: 'FB-020',
    solutionName: 'Facebook Pixel',
    ruleName: 'Content IDs Format Validation',
    description: 'Checks if `content_ids` is a valid JSON array of strings or numbers.',
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['content_ids'],
    checkLogic: (event) => {
      let contentIds = event.params?.content_ids || event.params?.cd?.content_ids;
      if (contentIds === undefined || contentIds === null || contentIds === '') return { passed: true, skipped: true };

      // Try to parse if it's a string
      if (typeof contentIds === 'string') {
        try {
          contentIds = JSON.parse(contentIds);
        } catch {
          return { passed: false, detail: 'not valid JSON' };
        }
      }

      if (!Array.isArray(contentIds)) {
        return { passed: false, detail: 'not an array' };
      }

      const allValid = contentIds.every(id =>
        typeof id === 'string' || typeof id === 'number'
      );

      if (!allValid) {
        return { passed: false, detail: 'contains non-string/number elements' };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 10,
    errorMessage: "The format of the 'content_ids' parameter is invalid. Must be a JSON array (e.g., ['ID1', 'ID2']).",
    errorMessageTemplate: "'content_ids' format issue: {detail}.",
    recommendation: 'Make sure `content_ids` is correctly formatted as a JSON array of strings or numbers representing product IDs.',
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#object-properties'
  },

  'FB-021': {
    ruleId: 'FB-021',
    solutionName: 'Facebook Pixel',
    ruleName: 'Contents Format Validation',
    description: "Checks if `contents` is a valid JSON array of objects containing at least `id` and `quantity`.",
    urlPattern: /facebook\.com\/tr/,
    checkMethod: 'parameter_validation',
    targetElements: ['contents'],
    checkLogic: (event) => {
      let contents = event.params?.contents || event.params?.cd?.contents;
      if (contents === undefined || contents === null || contents === '') return { passed: true, skipped: true };

      // Try to parse if it's a string
      if (typeof contents === 'string') {
        try {
          contents = JSON.parse(contents);
        } catch {
          return { passed: false, detail: 'not valid JSON' };
        }
      }

      if (!Array.isArray(contents)) {
        return { passed: false, detail: 'not an array' };
      }

      const allValid = contents.every(item => {
        if (typeof item !== 'object' || item === null) return false;
        return item.id !== undefined && item.quantity !== undefined;
      });

      if (!allValid) {
        return { passed: false, detail: "objects missing 'id' or 'quantity'" };
      }
      return { passed: true };
    },
    severity: SEVERITY_LEVELS.IMPORTANT,
    scoreDeduction: 10,
    errorMessage: "The format of the 'contents' parameter is invalid. Must be a JSON array of objects (e.g., [{'id':'ID1', 'quantity':1}]).",
    errorMessageTemplate: "'contents' format issue: {detail}.",
    recommendation: "Make sure `contents` is correctly formatted as a JSON array of objects, each object containing at least the 'id' and 'quantity' keys.",
    docUrl: 'https://developers.facebook.com/docs/meta-pixel/reference#object-properties'
  }
};

// Legacy validation rules for backward compatibility
const VALIDATION_RULES = {
  facebook: {
    Purchase: {
      required: ['value', 'currency', 'content_ids'],
      recommended: ['content_type', 'num_items', 'event_id']
    },
    AddToCart: {
      required: ['content_ids', 'value', 'currency'],
      recommended: ['content_type']
    },
    ViewContent: {
      required: ['content_ids'],
      recommended: ['content_type', 'value', 'currency']
    },
    InitiateCheckout: {
      required: ['content_ids', 'value', 'currency'],
      recommended: ['content_type', 'num_items']
    },
    PageView: {
      required: [],
      recommended: ['fbp']
    }
  },
  ga4: {
    purchase: {
      required: ['transaction_id', 'value', 'currency'],
      recommended: ['items', 'coupon', 'shipping', 'tax']
    },
    add_to_cart: {
      required: ['items'],
      recommended: ['value', 'currency']
    },
    view_item: {
      required: ['items'],
      recommended: ['value', 'currency']
    },
    begin_checkout: {
      required: ['items'],
      recommended: ['value', 'currency', 'coupon']
    },
    page_view: {
      required: [],
      recommended: ['page_title', 'page_location']
    }
  },
  tiktok: {
    CompletePayment: {
      required: ['value', 'currency', 'contents'],
      recommended: ['content_type', 'event_id']
    },
    AddToCart: {
      required: ['contents'],
      recommended: ['value', 'currency', 'content_type']
    },
    ViewContent: {
      required: ['contents'],
      recommended: ['value', 'currency', 'content_type']
    },
    InitiateCheckout: {
      required: ['contents', 'value', 'currency'],
      recommended: ['content_type']
    },
    Pageview: {
      required: [],
      recommended: []
    }
  }
};

// Issue type definitions
const ISSUE_TYPES = {
  missing_parameter: 'missing_parameter',
  malformed_value: 'malformed_value',
  duplicate: 'duplicate',
  consent_violation: 'consent_violation',
  attribution_break: 'attribution_break',
  inaccessible_page: 'inaccessible_page',
  missing_metadata: 'missing_metadata',
  // New types for rule-based validation
  rule_violation: 'rule_violation',
  cross_request_issue: 'cross_request_issue'
};

/**
 * Interpolate message templates with event data
 */
function interpolateMessage(template, event, result = {}) {
  const eventName = event.params?.ev || event.event_name || 'Unknown';
  const url = event.params?.dl || event.url || 'Unknown';
  const detail = result.detail || '';

  return template
    .replace(/\{event_name\}/g, eventName)
    .replace(/\{url\}/g, url)
    .replace(/\{detail\}/g, detail)
    .replace(/\{pixel_id\}/g, event.params?.id || 'Unknown');
}

/**
 * Calculate overall solution score based on rule violations
 */
function calculateOverallScore(errorCount, warningCount, optimizationCount = 0) {
  // Each error = -10, each warning = -5, each optimization = -2
  const penalty = (errorCount * 10) + (warningCount * 5) + (optimizationCount * 2);
  return Math.max(0, 100 - penalty);
}

/**
 * Calculate score based on rule deductions
 */
function calculateScoreFromDeductions(totalDeductions) {
  return Math.max(0, 100 - totalDeductions);
}

/**
 * Get score label based on score value
 */
function getScoreLabel(score) {
  if (score >= 90) return 'High';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Critical';
}

/**
 * Validate currency format
 */
function validateCurrency(value) {
  if (!value) {
    return { valid: false, status: 'error', message: 'Missing currency' };
  }

  const upperValue = String(value).toUpperCase();

  if (VALID_CURRENCY_CODES.includes(upperValue)) {
    if (value !== upperValue) {
      return { valid: true, status: 'warning', message: `Should be uppercase: ${upperValue}` };
    }
    return { valid: true, status: 'success' };
  }

  if (/^[a-zA-Z]{3}$/.test(value)) {
    if (value !== upperValue) {
      return { valid: true, status: 'warning', message: `Should be uppercase: ${upperValue}` };
    }
    return { valid: true, status: 'success' };
  }

  return { valid: false, status: 'error', message: 'Invalid currency code format' };
}

/**
 * Validate numeric value
 */
function validateNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, status: 'error', message: 'Missing value' };
  }

  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, status: 'error', message: 'Value must be numeric' };
  }

  if (num < 0) {
    return { valid: true, status: 'warning', message: 'Negative value detected' };
  }

  return { valid: true, status: 'success' };
}

/**
 * Detect duplicate events (legacy function for backward compatibility)
 */
function detectDuplicates(events) {
  const duplicates = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      if (a.event_name !== b.event_name) continue;

      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      const timeDelta = Math.abs(timeB - timeA);

      if (timeDelta < 100) {
        const criticalMatch =
          a.params?.value === b.params?.value &&
          a.params?.currency === b.params?.currency;

        if (criticalMatch) {
          duplicates.push({
            event_ids: [a.event_id, b.event_id],
            event_name: a.event_name,
            is_revenue_event: ['Purchase', 'CompletePayment', 'purchase'].includes(a.event_name)
          });
        }
      }
    }
  }

  return duplicates;
}

/**
 * Validate a single event against Facebook Pixel rules
 */
function validateEventWithRules(event, allEvents = [], vendor = 'facebook') {
  const issues = [];
  const parameters = [];
  let totalDeduction = 0;
  let criticalCount = 0;
  let importantCount = 0;
  let optimizationCount = 0;

  if (vendor === 'facebook') {
    // Run each rule against the event
    Object.values(FB_VALIDATION_RULES).forEach(rule => {
      // Skip if rule doesn't apply to this event type
      if (rule.appliesTo) {
        const eventName = event.params?.ev || event.event_name;
        if (!rule.appliesTo.includes(eventName)) return;
      }

      // Run the check logic
      let result;
      if (rule.checkMethod === 'cross_request_validation') {
        result = rule.checkLogic(event, allEvents);
      } else {
        result = rule.checkLogic(event);
      }

      // Skip if check was skipped (not applicable)
      if (result.skipped) return;

      if (!result.passed) {
        const message = interpolateMessage(rule.errorMessageTemplate, event, result);

        issues.push({
          ruleId: rule.ruleId,
          type: ISSUE_TYPES.rule_violation,
          severity: rule.severity.level,
          severityMeta: rule.severity,
          field: rule.targetElements.join(', '),
          message: message,
          description: rule.description,
          recommendation: rule.recommendation,
          docUrl: rule.docUrl,
          scoreDeduction: rule.scoreDeduction
        });

        totalDeduction += rule.scoreDeduction;

        if (rule.severity.level === 'critical') criticalCount++;
        else if (rule.severity.level === 'important') importantCount++;
        else optimizationCount++;
      }
    });
  }

  // Determine overall event status
  let status = 'success';
  if (criticalCount > 0) {
    status = 'error';
  } else if (importantCount > 0) {
    status = 'warning';
  } else if (optimizationCount > 0) {
    status = 'warning';
  }

  // Generate issue preview (max 3 short messages)
  const issuePreview = issues.slice(0, 3).map(issue => {
    if (issue.ruleId) {
      return `${issue.ruleId}: ${issue.message.substring(0, 40)}...`;
    }
    return issue.message.substring(0, 50);
  });

  // Build parameters list from event.params
  if (event.params) {
    for (const [key, value] of Object.entries(event.params)) {
      const paramIssue = issues.find(i => i.field && i.field.includes(key));
      parameters.push({
        name: key,
        value,
        status: paramIssue ? (paramIssue.severity === 'critical' ? 'error' : 'warning') : 'success',
        message: paramIssue ? paramIssue.message : null
      });
    }
  }

  return {
    event_id: event.event_id,
    event_name: event.params?.ev || event.event_name,
    status,
    timestamp: event.timestamp,
    url: event.params?.dl || event.url,
    scoring: {
      success_count: parameters.filter(p => p.status === 'success').length,
      warning_count: importantCount + optimizationCount,
      error_count: criticalCount
    },
    scoreDeduction: totalDeduction,
    issue_preview: issuePreview,
    parameters,
    issues
  };
}

/**
 * Legacy validateEvent function for backward compatibility
 */
function validateEvent(event, vendor = 'facebook') {
  const rules = VALIDATION_RULES[vendor]?.[event.event_name] || { required: [], recommended: [] };
  const issues = [];
  const parameters = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  // Check required parameters
  for (const param of rules.required) {
    const value = event.params?.[param];
    if (value === undefined || value === null || value === '') {
      issues.push({
        type: ISSUE_TYPES.missing_parameter,
        severity: 'error',
        field: param,
        message: `Missing required parameter: ${param}`,
        recommendation: `Add ${param} parameter to your ${event.event_name} event`
      });
      parameters.push({ name: param, value: null, status: 'error', message: 'Required parameter missing' });
      errorCount++;
    } else {
      if (param === 'currency') {
        const validation = validateCurrency(value);
        parameters.push({ name: param, value, status: validation.status, message: validation.message });
        if (validation.status === 'error') {
          issues.push({
            type: ISSUE_TYPES.malformed_value,
            severity: 'error',
            field: param,
            message: validation.message,
            recommendation: 'Use ISO 4217 3-letter currency code in uppercase (e.g., USD, EUR)'
          });
          errorCount++;
        } else if (validation.status === 'warning') {
          issues.push({
            type: ISSUE_TYPES.malformed_value,
            severity: 'warning',
            field: param,
            message: validation.message,
            recommendation: 'Use uppercase currency code'
          });
          warningCount++;
        } else {
          successCount++;
        }
      } else if (param === 'value') {
        const validation = validateNumericValue(value);
        parameters.push({ name: param, value, status: validation.status, message: validation.message });
        if (validation.status === 'error') {
          issues.push({
            type: ISSUE_TYPES.malformed_value,
            severity: 'error',
            field: param,
            message: validation.message,
            recommendation: 'Ensure value is a valid number'
          });
          errorCount++;
        } else if (validation.status === 'warning') {
          warningCount++;
        } else {
          successCount++;
        }
      } else {
        parameters.push({ name: param, value, status: 'success' });
        successCount++;
      }
    }
  }

  // Check recommended parameters
  for (const param of rules.recommended) {
    const value = event.params?.[param];
    if (value === undefined || value === null || value === '') {
      issues.push({
        type: ISSUE_TYPES.missing_parameter,
        severity: 'warning',
        field: param,
        message: `Missing recommended parameter: ${param}`,
        recommendation: `Consider adding ${param} to improve tracking accuracy`
      });
      parameters.push({ name: param, value: null, status: 'warning', message: 'Recommended parameter missing' });
      warningCount++;
    } else {
      parameters.push({ name: param, value, status: 'success' });
      successCount++;
    }
  }

  // Add any other parameters found
  if (event.params) {
    for (const [key, value] of Object.entries(event.params)) {
      if (!rules.required.includes(key) && !rules.recommended.includes(key)) {
        parameters.push({ name: key, value, status: 'success' });
        successCount++;
      }
    }
  }

  let status = 'success';
  if (errorCount > 0) {
    status = 'error';
  } else if (warningCount > 0) {
    status = 'warning';
  }

  const issuePreview = issues.slice(0, 3).map(issue => {
    if (issue.type === ISSUE_TYPES.missing_parameter) {
      return `Missing: ${issue.field}`;
    }
    if (issue.type === ISSUE_TYPES.malformed_value) {
      return `Invalid: ${issue.field}`;
    }
    return issue.message.substring(0, 30);
  });

  return {
    event_id: event.event_id,
    event_name: event.event_name,
    status,
    timestamp: event.timestamp,
    url: event.url,
    scoring: {
      success_count: successCount,
      warning_count: warningCount,
      error_count: errorCount
    },
    issue_preview: issuePreview,
    parameters,
    issues
  };
}

/**
 * Generate full audit report from crawled tracking requests
 * Now includes bySeverity grouping for the new UI
 */
function generateAuditReport(requests, solutionName = 'Facebook Pixel', pixelId = 'unknown') {
  // Determine vendor from solution name
  let vendor = 'facebook';
  if (solutionName.toLowerCase().includes('ga4') || solutionName.toLowerCase().includes('google analytics')) {
    vendor = 'ga4';
  } else if (solutionName.toLowerCase().includes('tiktok')) {
    vendor = 'tiktok';
  }

  // Prepare events for validation
  const eventsForValidation = requests.map((req, index) => ({
    event_id: req.id || index + 1,
    event_name: req.event_name || req.ev || 'PageView',
    timestamp: req.timestamp || req.created_at || new Date().toISOString(),
    url: req.url || req.page_url || '',
    params: req.params || req.query || {},
    method: req.method || 'GET'
  }));

  // Validate each event with the new rule-based system for Facebook
  const validatedEvents = eventsForValidation.map(event => {
    if (vendor === 'facebook') {
      return validateEventWithRules(event, eventsForValidation, vendor);
    }
    // Fall back to legacy validation for other vendors
    return validateEvent(event, vendor);
  });

  // Calculate totals
  let totalSuccess = 0;
  let totalWarnings = 0;
  let totalErrors = 0;
  let totalDeductions = 0;

  const eventsByStatus = { success: 0, warning: 0, error: 0 };

  for (const event of validatedEvents) {
    totalSuccess += event.scoring.success_count;
    totalWarnings += event.scoring.warning_count;
    totalErrors += event.scoring.error_count;
    totalDeductions += event.scoreDeduction || 0;
    eventsByStatus[event.status]++;
  }

  // Calculate overall score
  const overallScore = vendor === 'facebook'
    ? calculateScoreFromDeductions(totalDeductions)
    : calculateOverallScore(eventsByStatus.error, eventsByStatus.warning);

  // Group issues by severity for the new UI
  const bySeverity = {
    critical: [],
    important: [],
    optimization: []
  };

  // Also maintain legacy error/warning groups
  const errorGroups = {};
  const warningGroups = {};

  for (const event of validatedEvents) {
    for (const issue of event.issues) {
      const severityKey = issue.severityMeta?.level ||
        (issue.severity === 'error' ? 'critical' :
         issue.severity === 'warning' ? 'important' : 'optimization');

      // Group by ruleId for new UI
      const ruleKey = issue.ruleId || `${issue.type}:${issue.field || 'general'}`;
      let existingGroup = bySeverity[severityKey].find(g =>
        (issue.ruleId && g.ruleId === issue.ruleId) ||
        (!issue.ruleId && g.type === issue.type && g.field === issue.field)
      );

      if (!existingGroup) {
        existingGroup = {
          ruleId: issue.ruleId,
          type: issue.type,
          field: issue.field,
          severity: severityKey,
          severityMeta: issue.severityMeta || SEVERITY_LEVELS[severityKey.toUpperCase()],
          message: issue.message,
          description: issue.description,
          recommendation: issue.recommendation,
          docUrl: issue.docUrl,
          scoreDeduction: issue.scoreDeduction,
          count: 0,
          affectedEvents: []
        };
        bySeverity[severityKey].push(existingGroup);
      }

      existingGroup.count++;
      existingGroup.affectedEvents.push({
        event_id: event.event_id,
        event_name: event.event_name,
        url: event.url,
        timestamp: event.timestamp
      });

      // Also add to legacy groups
      const legacyGroups = issue.severity === 'error' || severityKey === 'critical' ? errorGroups : warningGroups;
      const legacyKey = `${issue.type}:${issue.field || 'general'}`;
      if (!legacyGroups[legacyKey]) {
        legacyGroups[legacyKey] = {
          type: issue.type,
          count: 0,
          label: '',
          affected_event_ids: [],
          field: issue.field,
          ruleId: issue.ruleId,
          severity: severityKey,
          severityMeta: issue.severityMeta,
          message: issue.message,
          description: issue.description,
          recommendation: issue.recommendation,
          docUrl: issue.docUrl,
          scoreDeduction: issue.scoreDeduction
        };
      }
      legacyGroups[legacyKey].count++;
      legacyGroups[legacyKey].affected_event_ids.push(event.event_id);
    }
  }

  // Generate labels for legacy grouped issues
  const formatGroupLabel = (group) => {
    const count = group.count;
    const eventWord = count === 1 ? 'event' : 'events';

    if (group.ruleId) {
      return `${group.ruleId}: ${group.message || group.type}`;
    }

    switch (group.type) {
      case ISSUE_TYPES.missing_parameter:
        return `${count} ${eventWord} missing ${group.field || 'required parameter'}`;
      case ISSUE_TYPES.malformed_value:
        return `${count} ${eventWord} with malformed ${group.field || 'value'}`;
      case ISSUE_TYPES.duplicate:
        return `${count} duplicate events detected`;
      case ISSUE_TYPES.inaccessible_page:
        return `${count} pages couldn't be crawled`;
      case ISSUE_TYPES.missing_metadata:
        return `${count} pages with missing metadata`;
      case ISSUE_TYPES.rule_violation:
        return group.message || `${count} ${eventWord} with rule violations`;
      default:
        return `${count} ${eventWord} with ${group.type} issues`;
    }
  };

  const errors = Object.values(errorGroups).map(g => ({
    ...g,
    label: formatGroupLabel(g)
  }));

  const warnings = Object.values(warningGroups).map(g => ({
    ...g,
    label: formatGroupLabel(g)
  }));

  // Generate labels for severity-grouped issues
  bySeverity.critical.forEach(g => { g.label = formatGroupLabel(g); });
  bySeverity.important.forEach(g => { g.label = formatGroupLabel(g); });
  bySeverity.optimization.forEach(g => { g.label = formatGroupLabel(g); });

  // Build event_details
  const eventDetails = {};
  for (const event of validatedEvents) {
    if (event.issues.length > 0) {
      eventDetails[event.event_id] = {
        event_id: event.event_id,
        event_name: event.event_name,
        status: event.status,
        timestamp: event.timestamp,
        url: event.url,
        scoring: event.scoring,
        parameters: event.parameters,
        ecommerce_items: [],
        issues: event.issues
      };
    }
  }

  return {
    solution_name: solutionName,
    pixel_id: pixelId,
    score: overallScore,
    score_label: getScoreLabel(overallScore),
    events_audited: validatedEvents.length,
    success_count: eventsByStatus.success,
    warning_count: eventsByStatus.warning,
    error_count: eventsByStatus.error,

    events: validatedEvents.map(e => ({
      event_id: e.event_id,
      event_name: e.event_name,
      status: e.status,
      timestamp: e.timestamp,
      url: e.url,
      scoring: e.scoring,
      issue_preview: e.issue_preview
    })),

    problem_diagnosis: {
      summary: {
        all_count: totalSuccess + totalWarnings + totalErrors,
        success_count: totalSuccess,
        warning_count: totalWarnings,
        error_count: totalErrors,
        total_deductions: totalDeductions
      },
      // New severity-based grouping for improved UI
      bySeverity,
      // Legacy arrays for backward compatibility
      errors,
      warnings
    },

    event_details: eventDetails
  };
}

module.exports = {
  calculateOverallScore,
  calculateScoreFromDeductions,
  getScoreLabel,
  validateCurrency,
  validateNumericValue,
  detectDuplicates,
  validateEvent,
  validateEventWithRules,
  generateAuditReport,
  interpolateMessage,
  VALIDATION_RULES,
  ISSUE_TYPES,
  SEVERITY_LEVELS,
  FB_VALIDATION_RULES,
  FB_STANDARD_EVENTS,
  VALID_CURRENCY_CODES
};
