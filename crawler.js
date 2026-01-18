const puppeteer = require('puppeteer-core');
const { identifyElement, identifyFormFields, EXTRACT_ELEMENTS_SCRIPT } = require('./lib/anthropic');

const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;

// Navigation configuration
const NAVIGATION_CONFIG = {
  maxPages: 5,
  maxDepth: 3,
  waitBetweenActions: 1500,
  actionTimeout: 5000,
};

// E-commerce journey selectors (prioritized order)
const JOURNEY_SELECTORS = {
  // Product interaction selectors
  addToCart: [
    'button[data-action="add-to-cart"]',
    'button.add-to-cart',
    'button#add-to-cart',
    '[data-testid="add-to-cart"]',
    'button[name="add"]',
    '.product-form__submit',
    '.btn-add-to-cart',
    'button:has-text("Add to Cart")',
    'button:has-text("Add to Bag")',
    'button:has-text("Add to Basket")',
    'input[value="Add to Cart"]',
    '[class*="addToCart"]',
    '[class*="add-to-cart"]',
    '[id*="addToCart"]',
  ],

  // Checkout/cart selectors
  checkout: [
    'a[href*="checkout"]',
    'button[data-action="checkout"]',
    '.checkout-button',
    '#checkout',
    '[data-testid="checkout"]',
    'a:has-text("Checkout")',
    'button:has-text("Checkout")',
    'a:has-text("Proceed to Checkout")',
    '.cart__checkout',
    '[class*="checkout"]',
  ],

  // View cart selectors
  viewCart: [
    'a[href*="cart"]',
    '.cart-link',
    '#cart-icon',
    '[data-testid="cart"]',
    'a:has-text("View Cart")',
    'a:has-text("Cart")',
    '.mini-cart',
    '[class*="cart-icon"]',
  ],

  // Product page selectors (to click on products)
  productLink: [
    '.product-card a',
    '.product-item a',
    '.product a',
    '[data-testid="product-link"]',
    '.product-title a',
    '.product-image a',
    'a[href*="/product"]',
    'a[href*="/p/"]',
    '.collection-product a',
  ],

  // Form submit selectors
  formSubmit: [
    'form button[type="submit"]',
    'form input[type="submit"]',
    '.newsletter-form button',
    '[data-testid="submit"]',
    'form .btn-primary',
  ],

  // CTA buttons (general call-to-action)
  cta: [
    '.cta-button',
    '.btn-cta',
    '[data-testid="cta"]',
    'a.btn-primary',
    'button.btn-primary',
    '.hero-cta',
    'a:has-text("Shop Now")',
    'a:has-text("Browse")',
    'a:has-text("Learn More")',
    'a:has-text("Get Started")',
  ],

  // Cookie consent selectors
  cookieConsent: [
    '#onetrust-accept-btn-handler',
    '.cookie-accept',
    '[data-testid="cookie-accept"]',
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("Accept Cookies")',
    '.cc-accept',
    '#accept-cookies',
    '[class*="cookie"] button',
    '.consent-accept',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  ],
};

const trackingDomains = [
  // Google Analytics & Tag Manager
  'google-analytics.com',
  'google.com',
  'stats.g.doubleclick.net',
  'googletagmanager.com',
  'googlesyndication.com',
  'googleadservices.com',
  'doubleclick.net',

  // Facebook
  'connect.facebook.net',
  'facebook.net',
  'pixel.facebook.com',
  'facebook.com',

  // CMPs (Consent Management Platforms)
  'cdn.cookielaw.org',
  'cookielaw.org',
  'onetrust.com',
  'trustarc.com',
  'quantcast.com',
  'sourcepoint.com',
  'consentmanager.net',

  // Other Analytics & AdTech
  'ads.twitter.com',
  'linkedin.com',
  'tiktok.com',
  'bat.bing.com',
  'analytics.yahoo.com',
  'adinserve.com',
  'adform.net',
  'adroll.com',
  'criteo.com',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'appnexus.com',
  'outbrain.com',
  'taboola.com',
  'ensighten.com',
  'tealiumiq.com',
  'hotjar.com',
  'segment.com',
  'amplitude.com',
  'mixpanel.com',
  // More tracking domains
  'newrelic.com',
  'nr-data.net',
  'adobedtm.com',
  'omtrdc.net',
  'demdex.net',
  'everesttech.net',
  'adsrvr.org',
  'casalemedia.com',
  'scorecardresearch.com',
  'chartbeat.com',
  'clicktale.net',
  'fullstory.com',
  'heap.io',
  'mouseflow.com',
  'sessioncam.com',
  'crazyegg.com',
  'optimizely.com',
  'abtasty.com',
];

// Special paths to check (regardless of domain)
const trackingPaths = [
  '/g/collect',
  '/gtag/js',
  '/analytics.js',
  '/gtm.js',
  '/fbevents.js',
  '/pixel',
  '/collect',
  '/track',
  '/beacon',
];

async function crawlWithFunction(url) {
  console.log('[CRAWLER] Using /function endpoint with intelligent navigation...');

  const crawlerFunction = `export default async function ({ page }) {
    const trackingDomains = ${JSON.stringify(trackingDomains)};
    const trackingPaths = ${JSON.stringify(trackingPaths)};
    const journeySelectors = ${JSON.stringify(JOURNEY_SELECTORS)};
    const config = ${JSON.stringify(NAVIGATION_CONFIG)};
    const targetUrl = "${url}";

    const requests = [];
    const allRequests = [];
    const journey = [];
    const visitedUrls = new Set();
    let currentStep = 0;

    // Helper to add journey step
    const addJourneyStep = (action, details) => {
      journey.push({
        step: ++currentStep,
        action,
        timestamp: new Date().toISOString(),
        url: page.url(),
        ...details
      });
    };

    // Helper to find and click element
    const findAndClick = async (selectors, actionName) => {
      for (const selector of selectors) {
        try {
          // Handle :has-text() pseudo-selector
          if (selector.includes(':has-text(')) {
            const match = selector.match(/:has-text\\("([^"]+)"\\)/);
            if (match) {
              const tag = selector.split(':')[0] || '*';
              const text = match[1];
              const element = await page.evaluateHandle((tag, text) => {
                const elements = document.querySelectorAll(tag);
                for (const el of elements) {
                  if (el.textContent.toLowerCase().includes(text.toLowerCase()) && el.offsetParent !== null) {
                    return el;
                  }
                }
                return null;
              }, tag, text);

              if (element && await element.evaluate(el => el !== null)) {
                await element.click();
                await new Promise(r => setTimeout(r, config.waitBetweenActions));
                return { success: true, selector, element: tag + ':has-text("' + text + '")' };
              }
            }
          } else {
            const element = await page.$(selector);
            if (element) {
              const isVisible = await element.evaluate(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
              });

              if (isVisible) {
                await element.click();
                await new Promise(r => setTimeout(r, config.waitBetweenActions));
                return { success: true, selector };
              }
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      return { success: false };
    };

    // Helper to wait for navigation or network idle
    const waitForLoad = async () => {
      try {
        await page.waitForLoadState ?
          await page.waitForLoadState('networkidle') :
          await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
      } catch (e) {
        await new Promise(r => setTimeout(r, 2000));
      }
    };

    // Setup request interception
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      try {
        const requestUrl = request.url();
        const parsedUrl = new URL(requestUrl);
        const domain = parsedUrl.hostname;
        const pathname = parsedUrl.pathname;

        allRequests.push(domain);

        const isDomainTracking = trackingDomains.some(trackingDomain =>
          domain === trackingDomain || domain.endsWith('.' + trackingDomain)
        );

        const isPathTracking = trackingPaths.some(trackingPath =>
          pathname.includes(trackingPath)
        );

        if (isDomainTracking || isPathTracking) {
          requests.push({
            url: requestUrl,
            domain,
            method: request.method(),
            payload: request.postData() || '',
            params: parsedUrl.search.substring(1) || '',
            status: null,
            journeyStep: currentStep,
            pageUrl: page.url(),
          });
        }

        request.continue();
      } catch (error) {
        try { request.continue(); } catch (e) {}
      }
    });

    page.on('response', (response) => {
      try {
        const responseUrl = response.url();
        const request = requests.find(req => req.url === responseUrl && req.status === null);
        if (request) request.status = response.status();
      } catch (error) {}
    });

    // Set realistic user agent and browser fingerprint
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
    });

    // STEP 1: Navigate to initial URL
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    const initialTitle = await page.title();
    visitedUrls.add(page.url());
    addJourneyStep('page_load', { title: initialTitle, type: 'landing' });

    await new Promise(r => setTimeout(r, 2000));

    // STEP 2: Handle cookie consent if present
    const consentResult = await findAndClick(journeySelectors.cookieConsent, 'cookie_consent');
    if (consentResult.success) {
      addJourneyStep('cookie_consent', { selector: consentResult.selector, action: 'accepted' });
      await new Promise(r => setTimeout(r, 1500));
    }

    // STEP 3: Detect site type and plan journey
    const siteType = await page.evaluate(() => {
      const html = document.documentElement.innerHTML.toLowerCase();
      const hasProducts = html.includes('add to cart') || html.includes('add to bag') ||
                         html.includes('product') || html.includes('shop') ||
                         document.querySelectorAll('[class*="product"]').length > 0;
      const hasCheckout = html.includes('checkout') || html.includes('cart');
      const hasForms = document.querySelectorAll('form').length > 1;

      if (hasProducts && hasCheckout) return 'ecommerce';
      if (hasForms) return 'lead-gen';
      return 'content';
    });

    addJourneyStep('site_detection', { siteType });

    // STEP 4: Execute journey based on site type
    if (siteType === 'ecommerce') {
      // Try to find and click a product
      const productResult = await findAndClick(journeySelectors.productLink, 'product_click');
      if (productResult.success) {
        await waitForLoad();
        const productTitle = await page.title();
        visitedUrls.add(page.url());
        addJourneyStep('product_view', { title: productTitle, selector: productResult.selector });
        await new Promise(r => setTimeout(r, 2000));

        // Try to add to cart
        const addToCartResult = await findAndClick(journeySelectors.addToCart, 'add_to_cart');
        if (addToCartResult.success) {
          await new Promise(r => setTimeout(r, 2000));
          addJourneyStep('add_to_cart', { selector: addToCartResult.selector });

          // Try to view cart
          const viewCartResult = await findAndClick(journeySelectors.viewCart, 'view_cart');
          if (viewCartResult.success) {
            await waitForLoad();
            visitedUrls.add(page.url());
            addJourneyStep('view_cart', { selector: viewCartResult.selector });
            await new Promise(r => setTimeout(r, 2000));

            // Try to initiate checkout
            const checkoutResult = await findAndClick(journeySelectors.checkout, 'checkout');
            if (checkoutResult.success) {
              await waitForLoad();
              visitedUrls.add(page.url());
              addJourneyStep('initiate_checkout', { selector: checkoutResult.selector });
              await new Promise(r => setTimeout(r, 2000));
            }
          } else {
            // Try checkout directly
            const checkoutResult = await findAndClick(journeySelectors.checkout, 'checkout');
            if (checkoutResult.success) {
              await waitForLoad();
              visitedUrls.add(page.url());
              addJourneyStep('initiate_checkout', { selector: checkoutResult.selector });
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      }
    } else if (siteType === 'lead-gen') {
      // Try CTA buttons
      const ctaResult = await findAndClick(journeySelectors.cta, 'cta_click');
      if (ctaResult.success) {
        await waitForLoad();
        visitedUrls.add(page.url());
        addJourneyStep('cta_click', { selector: ctaResult.selector });
        await new Promise(r => setTimeout(r, 2000));
      }
    } else {
      // Content site - just try CTAs
      const ctaResult = await findAndClick(journeySelectors.cta, 'cta_click');
      if (ctaResult.success) {
        await waitForLoad();
        visitedUrls.add(page.url());
        addJourneyStep('cta_click', { selector: ctaResult.selector });
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Final wait to capture any delayed tracking
    await new Promise(r => setTimeout(r, 3000));

    addJourneyStep('crawl_complete', {
      pagesVisited: visitedUrls.size,
      trackingRequestsCaptured: requests.length
    });

    return {
      data: {
        requests,
        totalRequests: allRequests.length,
        uniqueDomains: [...new Set(allRequests)].length,
        allDomains: [...new Set(allRequests)],
        pageTitle: initialTitle,
        journey,
        siteType,
        pagesVisited: [...visitedUrls]
      },
      type: 'application/json'
    };
  }`;

  const response = await fetch(`https://production-sfo.browserless.io/function?token=${BROWSERLESS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: crawlerFunction })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserless API error: ${response.status} - ${errorText}`);
  }

  const response_data = await response.json();
  return response_data.data || response_data;
}

async function crawlWithUnblock(url) {
  console.log('[CRAWLER] Using /unblock endpoint for bot-protected site with intelligent navigation...');

  let browser;
  const requests = [];
  const allRequests = [];
  const journey = [];
  const visitedUrls = new Set();
  let currentStep = 0;

  const addJourneyStep = (page, action, details) => {
    journey.push({
      step: ++currentStep,
      action,
      timestamp: new Date().toISOString(),
      url: page.url(),
      ...details
    });
  };

  try {
    const unblockResponse = await fetch(`https://production-sfo.browserless.io/unblock?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        browserWSEndpoint: true,
        ttl: 60000
      })
    });

    if (!unblockResponse.ok) {
      const errorText = await unblockResponse.text();
      throw new Error(`Browserless /unblock API error: ${unblockResponse.status} - ${errorText}`);
    }

    const unblockData = await unblockResponse.json();
    console.log('[CRAWLER] Got unblocked session, connecting via WebSocket...');

    browser = await puppeteer.connect({ browserWSEndpoint: unblockData.browserWSEndpoint });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    const pageTitle = await page.title();
    console.log(`[CRAWLER] Page title: ${pageTitle}`);
    visitedUrls.add(page.url());

    await page.setRequestInterception(true);

    page.on('request', (request) => {
      try {
        const requestUrl = request.url();
        const parsedUrl = new URL(requestUrl);
        const domain = parsedUrl.hostname;
        const pathname = parsedUrl.pathname;

        allRequests.push(domain);

        const isDomainTracking = trackingDomains.some(trackingDomain =>
          domain === trackingDomain || domain.endsWith('.' + trackingDomain)
        );

        const isPathTracking = trackingPaths.some(trackingPath =>
          pathname.includes(trackingPath)
        );

        if (isDomainTracking || isPathTracking) {
          requests.push({
            url: requestUrl,
            domain,
            method: request.method(),
            payload: request.postData() || '',
            params: parsedUrl.search.substring(1) || '',
            status: null,
            journeyStep: currentStep,
            pageUrl: page.url(),
          });
        }

        request.continue();
      } catch (error) {
        try { request.continue(); } catch (e) {}
      }
    });

    page.on('response', (response) => {
      try {
        const responseUrl = response.url();
        const request = requests.find(req => req.url === responseUrl && req.status === null);
        if (request) request.status = response.status();
      } catch (error) {}
    });

    addJourneyStep(page, 'page_load', { title: pageTitle, type: 'landing', unblocked: true });

    console.log('[CRAWLER] Reloading page to capture all tracking requests...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try cookie consent
    for (const selector of JOURNEY_SELECTORS.cookieConsent) {
      try {
        if (!selector.includes(':has-text(')) {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.evaluate(el => el.offsetParent !== null);
            if (isVisible) {
              await element.click();
              addJourneyStep(page, 'cookie_consent', { selector, action: 'accepted' });
              await new Promise(r => setTimeout(r, 1500));
              break;
            }
          }
        }
      } catch (e) {}
    }

    // Detect site type
    const siteType = await page.evaluate(() => {
      const html = document.documentElement.innerHTML.toLowerCase();
      const hasProducts = html.includes('add to cart') || html.includes('product');
      const hasCheckout = html.includes('checkout') || html.includes('cart');
      if (hasProducts && hasCheckout) return 'ecommerce';
      if (document.querySelectorAll('form').length > 1) return 'lead-gen';
      return 'content';
    });

    addJourneyStep(page, 'site_detection', { siteType });

    // Try e-commerce journey
    if (siteType === 'ecommerce') {
      // Try product click
      for (const selector of JOURNEY_SELECTORS.productLink) {
        try {
          if (!selector.includes(':has-text(')) {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
              visitedUrls.add(page.url());
              addJourneyStep(page, 'product_view', { selector });
              await new Promise(r => setTimeout(r, 2000));

              // Try add to cart
              for (const cartSelector of JOURNEY_SELECTORS.addToCart) {
                try {
                  if (!cartSelector.includes(':has-text(')) {
                    const cartBtn = await page.$(cartSelector);
                    if (cartBtn) {
                      await cartBtn.click();
                      addJourneyStep(page, 'add_to_cart', { selector: cartSelector });
                      await new Promise(r => setTimeout(r, 2000));

                      // Try checkout
                      for (const checkoutSelector of JOURNEY_SELECTORS.checkout) {
                        try {
                          if (!checkoutSelector.includes(':has-text(')) {
                            const checkoutBtn = await page.$(checkoutSelector);
                            if (checkoutBtn) {
                              await checkoutBtn.click();
                              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
                              visitedUrls.add(page.url());
                              addJourneyStep(page, 'initiate_checkout', { selector: checkoutSelector });
                              break;
                            }
                          }
                        } catch (e) {}
                      }
                      break;
                    }
                  }
                } catch (e) {}
              }
              break;
            }
          }
        } catch (e) {}
      }
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    addJourneyStep(page, 'crawl_complete', {
      pagesVisited: visitedUrls.size,
      trackingRequestsCaptured: requests.length
    });

    return {
      requests,
      totalRequests: allRequests.length,
      uniqueDomains: [...new Set(allRequests)].length,
      allDomains: [...new Set(allRequests)],
      pageTitle,
      journey,
      siteType,
      pagesVisited: [...visitedUrls]
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

/**
 * AI-powered intelligent crawler
 * Uses Claude to identify interactive elements instead of hardcoded selectors
 *
 * @param {string} url - URL to crawl
 * @param {string} journeyType - Type of journey: 'ecommerce', 'newsletter', 'signup', 'explore'
 * @returns {Object} Crawl results with requests and journey
 */
async function crawlWithAI(url, journeyType = 'ecommerce') {
  console.log(`[AI-CRAWLER] Starting intelligent crawl for: ${url}`);
  console.log(`[AI-CRAWLER] Journey type: ${journeyType}`);

  let browser;
  const requests = [];
  const allRequests = [];
  const journey = [];
  const visitedUrls = new Set();
  let currentStep = 0;

  const addJourneyStep = (action, details = {}) => {
    journey.push({
      step: ++currentStep,
      action,
      timestamp: new Date().toISOString(),
      ...details
    });
    console.log(`[AI-CRAWLER] Step ${currentStep}: ${action}`);
  };

  try {
    // Use /unblock for best compatibility with bot protection
    console.log('[AI-CRAWLER] Connecting via /unblock endpoint...');
    const unblockResponse = await fetch(`https://production-sfo.browserless.io/unblock?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        browserWSEndpoint: true,
        ttl: 120000 // 2 minute session
      })
    });

    if (!unblockResponse.ok) {
      const errorText = await unblockResponse.text();
      throw new Error(`Browserless /unblock API error: ${unblockResponse.status} - ${errorText}`);
    }

    const unblockData = await unblockResponse.json();
    console.log('[AI-CRAWLER] Got unblocked session, connecting via WebSocket...');

    browser = await puppeteer.connect({ browserWSEndpoint: unblockData.browserWSEndpoint });
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    // Setup request interception
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      try {
        const requestUrl = request.url();
        const parsedUrl = new URL(requestUrl);
        const domain = parsedUrl.hostname;
        const pathname = parsedUrl.pathname;

        allRequests.push(domain);

        const isDomainTracking = trackingDomains.some(trackingDomain =>
          domain === trackingDomain || domain.endsWith('.' + trackingDomain)
        );

        const isPathTracking = trackingPaths.some(trackingPath =>
          pathname.includes(trackingPath)
        );

        if (isDomainTracking || isPathTracking) {
          requests.push({
            url: requestUrl,
            domain,
            method: request.method(),
            payload: request.postData() || '',
            params: parsedUrl.search.substring(1) || '',
            status: null,
            journeyStep: currentStep,
            pageUrl: page.url(),
          });
        }

        request.continue();
      } catch (error) {
        try { request.continue(); } catch (e) {}
      }
    });

    page.on('response', (response) => {
      try {
        const responseUrl = response.url();
        const request = requests.find(req => req.url === responseUrl && req.status === null);
        if (request) request.status = response.status();
      } catch (error) {}
    });

    const pageTitle = await page.title();
    visitedUrls.add(page.url());
    addJourneyStep('page_load', { title: pageTitle, url: page.url(), type: 'landing' });

    // Reload to capture requests from fresh
    console.log('[AI-CRAWLER] Reloading page to capture tracking requests...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Helper function: Extract elements and use AI to find + click
    const aiClickElement = async (action, stepContext) => {
      try {
        // Extract interactive elements from page
        const elements = await page.evaluate(new Function('return ' + EXTRACT_ELEMENTS_SCRIPT)());
        console.log(`[AI-CRAWLER] Extracted ${elements.length} interactive elements`);

        // Ask Claude to identify the element
        const result = await identifyElement(elements, action, {
          pageUrl: page.url(),
          step: stepContext
        });

        if (result.found && result.idx !== null) {
          const targetElement = elements[result.idx];
          console.log(`[AI-CRAWLER] Found ${action}: "${targetElement.text || targetElement.ariaLabel || targetElement.id}" (confidence: ${result.confidence})`);

          // Click the element using its index
          await page.evaluate((idx) => {
            const allElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [onclick], [data-action]');
            let visibleIdx = 0;
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) continue;
              if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') continue;
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

              if (visibleIdx === idx) {
                el.click();
                return true;
              }
              visibleIdx++;
            }
            return false;
          }, result.idx);

          await new Promise(r => setTimeout(r, 2000));
          return { success: true, element: targetElement, result };
        }

        return { success: false, result };
      } catch (e) {
        console.error(`[AI-CRAWLER] Error in aiClickElement for ${action}:`, e.message);
        return { success: false, error: e.message };
      }
    };

    // Helper: Fill form field
    const fillFormField = async (idx, value) => {
      await page.evaluate((idx, value) => {
        const inputs = document.querySelectorAll('input, select, textarea');
        let visibleIdx = 0;
        for (const el of inputs) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (el.offsetParent === null) continue;

          if (visibleIdx === idx) {
            el.focus();
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
          visibleIdx++;
        }
      }, idx, value);
    };

    // Step 1: Handle cookie consent
    const cookieResult = await aiClickElement('cookie_consent', 'initial');
    if (cookieResult.success) {
      addJourneyStep('cookie_consent', { selector: cookieResult.element?.id || 'AI-identified', action: 'accepted' });
      await new Promise(r => setTimeout(r, 1500));
    }

    // Execute journey based on type
    if (journeyType === 'ecommerce') {
      // E-commerce journey: Product -> Add to Cart -> Cart -> Checkout

      // Step 2: Find and click a product
      const productResult = await aiClickElement('product_link', 'browsing');
      if (productResult.success) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        visitedUrls.add(page.url());
        addJourneyStep('product_view', { url: page.url(), title: await page.title() });
        await new Promise(r => setTimeout(r, 2000));

        // Step 3: Add to cart
        const cartResult = await aiClickElement('add_to_cart', 'product_page');
        if (cartResult.success) {
          addJourneyStep('add_to_cart', { element: cartResult.element?.text || 'AI-identified' });
          await new Promise(r => setTimeout(r, 2000));

          // Step 4: View cart
          const viewCartResult = await aiClickElement('view_cart', 'added_to_cart');
          if (viewCartResult.success) {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
            visitedUrls.add(page.url());
            addJourneyStep('view_cart', { url: page.url() });
            await new Promise(r => setTimeout(r, 2000));
          }

          // Step 5: Checkout
          const checkoutResult = await aiClickElement('checkout', 'cart_page');
          if (checkoutResult.success) {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
            visitedUrls.add(page.url());
            addJourneyStep('initiate_checkout', { url: page.url() });
          }
        }
      }
    } else if (journeyType === 'newsletter') {
      // Newsletter journey: Find form -> Fill email -> Submit

      // Extract form elements
      const elements = await page.evaluate(new Function('return ' + EXTRACT_ELEMENTS_SCRIPT)());
      const formInfo = await identifyFormFields(elements, 'newsletter');

      if (formInfo.fields && formInfo.fields.length > 0) {
        const emailField = formInfo.fields.find(f => f.fieldType === 'email');
        if (emailField) {
          await fillFormField(emailField.idx, 'test@taginsight.io');
          addJourneyStep('fill_newsletter_email', { value: 'test@taginsight.io' });
          await new Promise(r => setTimeout(r, 1000));

          // Submit
          if (formInfo.submitIdx !== null) {
            const submitResult = await aiClickElement('newsletter_submit', 'form_filled');
            if (submitResult.success) {
              addJourneyStep('submit_newsletter', { element: submitResult.element?.text || 'AI-identified' });
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      } else {
        addJourneyStep('newsletter_not_found', { reason: 'No newsletter form detected' });
      }
    } else if (journeyType === 'signup') {
      // Signup journey: Find signup link -> Fill form

      const signupResult = await aiClickElement('signup_link', 'initial');
      if (signupResult.success) {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        visitedUrls.add(page.url());
        addJourneyStep('signup_page', { url: page.url() });
        await new Promise(r => setTimeout(r, 2000));

        // Extract form elements
        const elements = await page.evaluate(new Function('return ' + EXTRACT_ELEMENTS_SCRIPT)());
        const formInfo = await identifyFormFields(elements, 'signup');

        if (formInfo.fields && formInfo.fields.length > 0) {
          const testValues = {
            email: 'test@taginsight.io',
            password: 'TestPass123!',
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            phone: '5551234567'
          };

          for (const field of formInfo.fields) {
            if (testValues[field.fieldType]) {
              await fillFormField(field.idx, testValues[field.fieldType]);
              await new Promise(r => setTimeout(r, 500));
            }
          }
          addJourneyStep('fill_signup_form', { fieldsCount: formInfo.fields.length });
        }
      } else {
        addJourneyStep('signup_not_found', { reason: 'No signup link detected' });
      }
    } else {
      // Explore mode: Just click some CTAs
      const ctaActions = ['product_link', 'login_link', 'signup_link'];
      for (const action of ctaActions) {
        const result = await aiClickElement(action, 'exploring');
        if (result.success) {
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
          visitedUrls.add(page.url());
          addJourneyStep('explore_click', { action, url: page.url() });
          break;
        }
      }
    }

    // Final wait to capture any delayed tracking
    await new Promise(r => setTimeout(r, 3000));

    addJourneyStep('crawl_complete', {
      pagesVisited: visitedUrls.size,
      trackingRequestsCaptured: requests.length
    });

    return {
      requests,
      totalRequests: allRequests.length,
      uniqueDomains: [...new Set(allRequests)].length,
      allDomains: [...new Set(allRequests)],
      pageTitle,
      journey,
      siteType: journeyType,
      pagesVisited: [...visitedUrls],
      aiPowered: true
    };

  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

async function crawl(url, options = {}) {
  const { journeyType = 'ecommerce', useAI = false } = options;

  if (!BROWSERLESS_API_KEY) {
    throw new Error('BROWSERLESS_API_KEY is not set');
  }

  console.log(`[CRAWLER] Starting crawl for: ${url}`);
  console.log(`[CRAWLER] Options: journeyType=${journeyType}, useAI=${useAI}`);

  // If AI mode is requested, use the AI-powered crawler
  if (useAI) {
    console.log('[CRAWLER] Using AI-powered intelligent crawler...');
    try {
      const aiResult = await crawlWithAI(url, journeyType);
      console.log(`[CRAWLER] AI crawl complete. Captured ${aiResult.requests.length} tracking requests.`);
      return aiResult;
    } catch (aiError) {
      console.error('[CRAWLER] AI crawl failed:', aiError.message);
      console.log('[CRAWLER] Falling back to selector-based crawl...');
      // Fall through to regular crawl
    }
  }

  try {
    // First try the regular /function endpoint
    const result = await crawlWithFunction(url);

    console.log(`[CRAWLER] Page title: ${result.pageTitle}`);
    console.log(`[CRAWLER] Total requests captured: ${result.totalRequests}`);
    console.log(`[CRAWLER] Unique domains: ${result.uniqueDomains}`);
    console.log(`[CRAWLER] Tracking requests found: ${result.requests ? result.requests.length : 0}`);
    console.log(`[CRAWLER] Site type detected: ${result.siteType}`);
    console.log(`[CRAWLER] Journey steps: ${result.journey ? result.journey.length : 0}`);

    // Check if we got blocked (common bot detection page titles)
    const blockedTitles = ['access denied', 'blocked', 'captcha', 'robot', 'verification'];
    const isBlocked = blockedTitles.some(blocked =>
      result.pageTitle && result.pageTitle.toLowerCase().includes(blocked)
    );

    if (isBlocked) {
      console.log('[CRAWLER] Detected bot protection, trying /unblock...');
      try {
        const unblockResult = await crawlWithUnblock(url);

        console.log(`[CRAWLER] Page title (unblock): ${unblockResult.pageTitle}`);
        console.log(`[CRAWLER] Total requests captured: ${unblockResult.totalRequests}`);
        console.log(`[CRAWLER] Unique domains: ${unblockResult.uniqueDomains}`);
        console.log(`[CRAWLER] Tracking requests found: ${unblockResult.requests ? unblockResult.requests.length : 0}`);
        console.log(`[CRAWLER] Journey steps: ${unblockResult.journey ? unblockResult.journey.length : 0}`);

        // Return full result object with journey
        return {
          requests: unblockResult.requests || [],
          journey: unblockResult.journey || [],
          siteType: unblockResult.siteType || 'unknown',
          pagesVisited: unblockResult.pagesVisited || [],
          pageTitle: unblockResult.pageTitle,
          totalRequests: unblockResult.totalRequests,
          uniqueDomains: unblockResult.uniqueDomains,
          allDomains: unblockResult.allDomains
        };
      } catch (unblockError) {
        console.error('[CRAWLER] /unblock also failed:', unblockError.message);
        throw new Error(`This site uses advanced bot protection (likely Akamai, Cloudflare, or similar) that cannot be bypassed. Try again later or contact the site owner for access.`);
      }
    }

    // Return full result object with journey
    return {
      requests: result.requests || [],
      journey: result.journey || [],
      siteType: result.siteType || 'unknown',
      pagesVisited: result.pagesVisited || [],
      pageTitle: result.pageTitle,
      totalRequests: result.totalRequests,
      uniqueDomains: result.uniqueDomains,
      allDomains: result.allDomains
    };
  } catch (error) {
    console.error('Error during crawl:', error);
    throw error;
  }
}

module.exports = {
  crawl,
};
