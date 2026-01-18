import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TAGINSIGHT_LOGO } from './logo.js';
import { VENDOR_LOGOS, VENDOR_NAMES, VENDOR_COLORS } from './vendor-logos.js';
import {
  Search,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Layers,
  Eye,
  X,
  Zap,
  ChevronRight,
  Lock,
  Globe,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Cookie,
  BarChart3,
  PieChart,
  Play,
  Download,
  Plus,
  ExternalLink,
  FileText,
  TrendingUp,
  Settings,
  ShoppingCart,
  MousePointer,
  Navigation,
  CreditCard,
  Store,
  MapPin,
  CheckCircle2,
  Circle,
  ArrowRight,
  Package,
  MousePointerClick,
  Target,
  ChevronDown,
  ChevronUp,
  Clock,
  Calculator,
  Users,
  DollarSign,
  Euro,
  Database,
  List
} from 'lucide-react';

// --- UTILS ---
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Decode URL-encoded strings safely
const decodeUrl = (url) => {
  if (!url) return '';
  try {
    return decodeURIComponent(url);
  } catch (e) {
    return url; // Return original if decoding fails
  }
};

// Tracking-relevant parameters by vendor/category
const TRACKING_PARAMS = {
  // Google Consent Mode
  consent: ['gcd', 'gcs', 'gcu', 'npa', 'dma', 'dma_cps', 'tag_exp'],
  // Google Analytics 4
  ga4: ['tid', 'cid', 'uid', 'en', 'ep', 'up', 'dl', 'dt', 'dr', 'sid', 'sct', 'seg', '_p', 'gtm', 'gcs', 'gcd'],
  // Facebook Pixel
  meta: ['id', 'ev', 'cd', 'ud', 'dl', 'rl', 'fbp', 'fbc', 'eid', 'es', 'tm', 'sw', 'sh'],
  // Google Ads
  gads: ['label', 'value', 'currency', 'transaction_id', 'aw_remarketing_only', 'aw_feed_country', 'items', 'send_to', 'conversion_id', 'conversion_label'],
  // Identifiers (common)
  ids: ['id', 'tid', 'cid', 'uid', 'pixel_id', 'client_id', 'user_id', 'session_id', 'sid', 'auid', 'guid', 'eid'],
  // Events
  events: ['ev', 'en', 'event', 'event_name', 'action', 't', 'hit_type', 'ec', 'ea', 'el'],
  // Ecommerce
  ecommerce: ['value', 'currency', 'transaction_id', 'items', 'content_ids', 'content_type', 'contents', 'num_items', 'order_id', 'revenue'],
  // Page info
  page: ['dl', 'dt', 'dr', 'url', 'page_url', 'page_title', 'page_location', 'page_referrer', 'page_path'],
  // User data
  user: ['ud', 'up', 'em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'external_id']
};

// Flatten all tracking params into a set for quick lookup
const ALL_TRACKING_PARAMS = new Set([
  ...TRACKING_PARAMS.consent,
  ...TRACKING_PARAMS.ga4,
  ...TRACKING_PARAMS.meta,
  ...TRACKING_PARAMS.gads,
  ...TRACKING_PARAMS.ids,
  ...TRACKING_PARAMS.events,
  ...TRACKING_PARAMS.ecommerce,
  ...TRACKING_PARAMS.page,
  ...TRACKING_PARAMS.user
]);

// Check if a parameter is tracking-relevant
const isTrackingParam = (paramName) => {
  const lowerName = paramName.toLowerCase();
  // Direct match
  if (ALL_TRACKING_PARAMS.has(lowerName)) return true;
  // Prefix match for ep.*, up.*, cd.*, u1-u99, etc.
  if (/^(ep\.|up\.|cd\.|ud\.|u\d+|_)/.test(lowerName)) return true;
  // Consent mode patterns
  if (/^(gcd|gcs|gcu|dma)/.test(lowerName)) return true;
  return false;
};

// Filter parameters to only show tracking-relevant ones
const filterTrackingParams = (params) => {
  if (!params || typeof params !== 'object') return {};
  const filtered = {};
  for (const [key, value] of Object.entries(params)) {
    if (isTrackingParam(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
};

// Categorize a parameter for display grouping
const categorizeParam = (paramName) => {
  const lowerName = paramName.toLowerCase();
  if (TRACKING_PARAMS.consent.includes(lowerName) || /^(gcd|gcs|gcu|dma)/.test(lowerName)) return 'consent';
  if (TRACKING_PARAMS.ids.some(p => lowerName.includes(p)) || /^(id|tid|cid|uid|sid|guid|eid|auid)/.test(lowerName)) return 'identifier';
  if (TRACKING_PARAMS.events.includes(lowerName) || /^(ev|en|event)/.test(lowerName)) return 'event';
  if (TRACKING_PARAMS.ecommerce.some(p => lowerName.includes(p))) return 'ecommerce';
  if (TRACKING_PARAMS.page.some(p => lowerName.includes(p)) || /^(dl|dt|dr|url|page)/.test(lowerName)) return 'page';
  if (TRACKING_PARAMS.user.some(p => lowerName.includes(p)) || /^(ud\.|up\.|em|ph|fn|ln)/.test(lowerName)) return 'user';
  return 'other';
};

// Get color for param category
const getParamCategoryColor = (category) => {
  const colors = {
    consent: 'bg-purple-100 text-purple-700 border-purple-200',
    identifier: 'bg-blue-100 text-blue-700 border-blue-200',
    event: 'bg-green-100 text-green-700 border-green-200',
    ecommerce: 'bg-amber-100 text-amber-700 border-amber-200',
    page: 'bg-slate-100 text-slate-700 border-slate-200',
    user: 'bg-pink-100 text-pink-700 border-pink-200',
    other: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  return colors[category] || colors.other;
};

// --- VENDOR CONFIGURATION (expanded) ---
const VENDOR_CONFIG = {
  meta: {
    name: 'Facebook Pixel',
    shortName: 'Meta',
    logo: 'https://cdn.simpleicons.org/meta/0866FF',
    color: '#0866FF',
    domains: ['facebook.com', 'facebook.net', 'fbcdn.net'],
    // Must have /tr in path for pixel events
    pathPattern: /\/tr/,
    eventTypes: ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Lead', 'CompleteRegistration', 'Search']
  },
  ga4: {
    name: 'Google Analytics 4',
    shortName: 'GA4',
    logo: 'https://cdn.simpleicons.org/googleanalytics/E37400',
    color: '#E37400',
    // GA4 is ONLY /g/collect endpoint OR has tid=G-XXXXX
    domains: ['google-analytics.com', 'analytics.google.com'],
    pathPattern: /\/g\/collect/,
    paramPattern: /tid=G-/,
    eventTypes: ['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'sign_up', 'login', 'search']
  },
  gtm: {
    name: 'Google Tag Manager',
    shortName: 'GTM',
    logo: 'https://cdn.simpleicons.org/googletagmanager/246FDB',
    color: '#246FDB',
    domains: ['googletagmanager.com'],
    pathPattern: /\/gtm\.js|\/gtag\/js/,
    eventTypes: ['container_load']
  },
  gads: {
    name: 'Google Ads',
    shortName: 'GAds',
    logo: 'https://cdn.simpleicons.org/googleads/4285F4',
    color: '#4285F4',
    domains: ['doubleclick.net', 'googleads.g.doubleclick.net', 'googlesyndication.com', 'googleadservices.com'],
    eventTypes: ['conversion', 'remarketing', 'page_view']
  },
  tiktok: {
    name: 'TikTok Pixel',
    shortName: 'TikTok',
    logo: 'https://cdn.simpleicons.org/tiktok/000000',
    color: '#000000',
    domains: ['tiktok.com', 'analytics.tiktok.com'],
    eventTypes: ['PageView', 'ViewContent', 'AddToCart', 'CompletePayment']
  },
  linkedin: {
    name: 'LinkedIn Insight',
    shortName: 'LinkedIn',
    logo: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    color: '#0A66C2',
    domains: ['linkedin.com', 'snap.licdn.com'],
    eventTypes: ['page_view', 'conversion']
  },
  hotjar: {
    name: 'Hotjar',
    shortName: 'Hotjar',
    logo: 'https://cdn.simpleicons.org/hotjar/FF3C00',
    color: '#FF3C00',
    domains: ['hotjar.com', 'hotjar.io'],
    eventTypes: ['session_recording', 'heatmap']
  },
  criteo: {
    name: 'Criteo',
    shortName: 'Criteo',
    logo: 'https://cdn.simpleicons.org/criteo/F85E00',
    color: '#F85E00',
    domains: ['criteo.com', 'criteo.net'],
    eventTypes: ['viewHome', 'viewItem', 'viewBasket', 'trackTransaction']
  }
};

// Vendor categorization helper
const categorizeVendor = (domain) => {
  const categories = {
    analytics: ['google-analytics', 'googletagmanager', 'hotjar', 'amplitude', 'mixpanel', 'segment', 'chartbeat', 'newrelic', 'nr-data'],
    advertising: ['doubleclick', 'googlesyndication', 'googleadservices', 'facebook', 'criteo', 'pubmatic', 'rubiconproject', 'openx', 'appnexus', 'outbrain', 'taboola', 'adsrvr', 'adform', 'adroll'],
    social: ['twitter', 'linkedin', 'pinterest', 'snapchat'],
    consent: ['cookielaw', 'onetrust', 'trustarc', 'quantcast', 'sourcepoint', 'consentmanager', 'didomi'],
    functional: ['cdn', 'static', 'fonts', 'jquery', 'bootstrap']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => domain.toLowerCase().includes(keyword))) {
      return category;
    }
  }
  return 'other';
};

// Detect vendor from domain, URL path, and params (stricter detection)
const detectVendor = (domain, url = '', params = '') => {
  const lowerDomain = domain?.toLowerCase() || '';
  const lowerUrl = url?.toLowerCase() || '';
  const lowerParams = params?.toLowerCase() || '';

  // Extract path from URL
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch (e) {
    pathname = lowerUrl;
  }

  for (const [key, config] of Object.entries(VENDOR_CONFIG)) {
    const domainMatch = config.domains.some(d => lowerDomain.includes(d));

    if (domainMatch) {
      // If vendor has pathPattern, must also match path
      if (config.pathPattern) {
        if (config.pathPattern.test(pathname)) {
          return key;
        }
        // Check paramPattern as alternative (e.g., tid=G- for GA4)
        if (config.paramPattern && config.paramPattern.test(lowerParams)) {
          return key;
        }
        // Domain matches but path doesn't - don't match this vendor
        continue;
      }
      // No pathPattern required, domain match is enough
      return key;
    }
  }
  return null; // Not a supported vendor
};

// Extract pixel/measurement ID from request
const extractPixelId = (req, vendorKey) => {
  const params = req.params || '';
  const url = req.url || '';

  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;

    switch (vendorKey) {
      case 'ga4':
        // GA4: tid=G-XXXXXXX
        return searchParams.get('tid') || params.match(/tid=([^&]+)/)?.[1] || 'N/A';
      case 'gtm':
        // GTM: id=GTM-XXXXX
        return searchParams.get('id') || params.match(/id=([^&]+)/)?.[1] || 'N/A';
      case 'meta':
        // Facebook: id=XXXXXXX
        return searchParams.get('id') || params.match(/id=(\d+)/)?.[1] || 'N/A';
      case 'gads':
        // Google Ads: conversion ID from various params
        return searchParams.get('google_conversion_id') ||
          searchParams.get('aw_conversion_id') || 'N/A';
      case 'tiktok':
        return searchParams.get('sdkid') || 'N/A';
      case 'linkedin':
        return searchParams.get('pid') || 'N/A';
      case 'hotjar':
        return searchParams.get('sv') || 'N/A';
      case 'criteo':
        return searchParams.get('a') || 'N/A';
      default:
        return searchParams.get('id') || 'N/A';
    }
  } catch (e) {
    return 'N/A';
  }
};

// Extract event name from request
const extractEventName = (req, vendorKey) => {
  const params = req.params || '';
  const url = req.url || '';
  const payload = req.payload || '';

  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;

    switch (vendorKey) {
      case 'ga4':
        // GA4: en=event_name or t=event
        return searchParams.get('en') || searchParams.get('t') || 'page_view';
      case 'gtm':
        return 'container_load';
      case 'meta':
        // Facebook: ev=EventName
        return searchParams.get('ev') || 'PageView';
      case 'gads':
        return searchParams.get('label') ? 'conversion' : 'remarketing';
      case 'tiktok':
        return searchParams.get('event') || 'PageView';
      case 'linkedin':
        return searchParams.get('conversion_id') ? 'conversion' : 'page_view';
      case 'hotjar':
        return 'recording';
      case 'criteo':
        return searchParams.get('p') || 'viewPage';
      default:
        return 'unknown';
    }
  } catch (e) {
    return 'unknown';
  }
};

// Vendor Logo component with fallback
const VendorLogo = ({ vendorKey, size = 'md', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const config = VENDOR_CONFIG[vendorKey];

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  if (!config) {
    return (
      <div className={cn(sizeClasses[size], "bg-slate-100 rounded-lg flex items-center justify-center", className)}>
        <span className="font-bold text-slate-500 text-xs">?</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={cn(sizeClasses[size], "rounded-lg flex items-center justify-center", className)}
        style={{ backgroundColor: `${config.color}20` }}
      >
        <span className="font-bold" style={{ color: config.color }}>
          {config.shortName.charAt(0)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses[size], "rounded-lg flex items-center justify-center bg-white p-1.5", className)}>
      <img
        src={config.logo}
        alt={config.name}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

// --- VALIDATION RULES ---
const VALIDATION_RULES = {
  meta: {
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
  gads: {
    conversion: {
      required: ['value', 'currency'],
      recommended: ['transaction_id', 'items']
    },
    remarketing: {
      required: [],
      recommended: ['ecomm_prodid', 'ecomm_pagetype']
    }
  }
};

// Parse tracking parameters from URL and existing params
const parseTrackingParams = (url, existingParams, vendorKey) => {
  const params = { ...existingParams };

  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;

    // Parse common params
    for (const [key, value] of searchParams.entries()) {
      if (!params[key]) {
        params[key] = value;
      }
    }

    // Parse Facebook custom data (cd parameter)
    if (vendorKey === 'meta' && params.cd) {
      try {
        const cd = typeof params.cd === 'string' ? JSON.parse(decodeURIComponent(params.cd)) : params.cd;
        Object.assign(params, cd);
      } catch (e) {
        // cd might not be JSON
      }
    }
  } catch (e) {
    // Invalid URL, use existing params
  }

  return params;
};

// Validate event parameters
const validateEvent = (vendorKey, eventName, params) => {
  const rules = VALIDATION_RULES[vendorKey]?.[eventName] || { required: [], recommended: [] };
  const issues = [];
  const parameters = [];
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  // Check required parameters
  for (const param of rules.required) {
    const value = params[param];
    if (value === undefined || value === null || value === '') {
      issues.push({
        type: 'missing_parameter',
        severity: 'error',
        field: param,
        message: `Missing required parameter: ${param}`,
        short: `Missing: ${param}`,
        recommendation: `Add ${param} parameter to your ${eventName} event`
      });
      parameters.push({ name: param, value: null, status: 'error', message: 'Required parameter missing' });
      errorCount++;
    } else {
      // Validate specific parameters
      if (param === 'currency') {
        const validation = validateCurrency(value);
        parameters.push({ name: param, value, status: validation.status, message: validation.message });
        if (validation.status === 'error') {
          issues.push({
            type: 'malformed_value',
            severity: 'error',
            field: param,
            message: validation.message,
            short: `Invalid: ${param}`,
            recommendation: 'Use ISO 4217 3-letter currency code (e.g., USD, EUR)'
          });
          errorCount++;
        } else if (validation.status === 'warning') {
          issues.push({
            type: 'malformed_value',
            severity: 'warning',
            field: param,
            message: validation.message,
            short: `Lowercase: ${param}`,
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
            type: 'malformed_value',
            severity: 'error',
            field: param,
            message: validation.message,
            short: `Invalid: ${param}`,
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
    const value = params[param];
    if (value === undefined || value === null || value === '') {
      issues.push({
        type: 'missing_parameter',
        severity: 'warning',
        field: param,
        message: `Missing recommended parameter: ${param}`,
        short: `Missing: ${param}`,
        recommendation: `Consider adding ${param} to improve tracking accuracy`
      });
      parameters.push({ name: param, value: null, status: 'warning', message: 'Recommended parameter missing' });
      warningCount++;
    } else {
      parameters.push({ name: param, value, status: 'success' });
      successCount++;
    }
  }

  // Determine overall event status
  let status = 'success';
  if (errorCount > 0) {
    status = 'error';
  } else if (warningCount > 0) {
    status = 'warning';
  }

  return {
    status,
    successCount,
    warningCount,
    errorCount,
    parameters,
    issues
  };
};

// Currency validation
const validateCurrency = (value) => {
  if (!value) {
    return { valid: false, status: 'error', message: 'Missing currency' };
  }

  const validCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW'];
  const upperValue = String(value).toUpperCase();

  if (/^[a-zA-Z]{3}$/.test(value)) {
    if (value !== upperValue) {
      return { valid: true, status: 'warning', message: `Should be uppercase: ${upperValue}` };
    }
    return { valid: true, status: 'success' };
  }

  return { valid: false, status: 'error', message: 'Invalid currency code format' };
};

// Numeric value validation
const validateNumericValue = (value) => {
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
};

const getCategoryColor = (category) => {
  const colors = {
    analytics: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    advertising: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    social: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    consent: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    functional: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
  };
  return colors[category] || colors.other;
};

// Get score color based on value
const getScoreColor = (score) => {
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-lime-500';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 25) return 'text-orange-500';
  return 'text-red-500';
};

const getScoreLabel = (score) => {
  if (score >= 90) return 'High';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Critical';
};

// --- SIDEBAR ITEMS ---
const SIDEBAR_ITEMS = [
  {
    category: "Scanner",
    items: [
      { id: 'scanner', icon: Search, label: "URL Scanner" },
      { id: 'results', icon: Eye, label: "Scan Results" },
    ]
  },
  {
    category: "Reports",
    items: [
      { id: 'reverse-report', icon: FileText, label: "Reverse Report" },
      { id: 'tracking-plan', icon: LayoutDashboard, label: "Tracking Plan" },
    ]
  },
  {
    category: "Intelligence",
    items: [
      { id: 'overview', icon: LayoutDashboard, label: "Overview" },
      { id: 'vendor-analysis', icon: PieChart, label: "Vendor Analysis" },
    ]
  },
  {
    category: "Privacy & Compliance",
    items: [
      { id: 'consent-mode', icon: Lock, label: "Consent Mode V2" },
      { id: 'vendor-list', icon: Layers, label: "Vendor List" },
      { id: 'cookie-scanner', icon: Cookie, label: "Cookie Scanner" },
    ]
  },
  {
    category: "Sales Tools",
    items: [
      { id: 'hours-simulator', icon: Clock, label: "Simulateur ROI" },
    ]
  },
  {
    category: "Project Library",
    items: [
      { id: 'project-events', icon: Activity, label: "Events" },
      { id: 'project-properties', icon: Database, label: "Properties" },
    ]
  },
];

// --- SCORE GAUGE COMPONENT ---
const ScoreGauge = ({ score, size = 'large' }) => {
  const radius = size === 'large' ? 50 : 35;
  const strokeWidth = size === 'large' ? 8 : 5;
  const svgSize = (radius + strokeWidth) * 2;
  const center = svgSize / 2;
  const circumference = Math.PI * radius; // Semi-circle
  const progress = (score / 100) * circumference;

  const getGradientColors = () => {
    if (score >= 90) return ['#22c55e', '#16a34a'];
    if (score >= 75) return ['#84cc16', '#65a30d'];
    if (score >= 50) return ['#eab308', '#ca8a04'];
    if (score >= 25) return ['#f97316', '#ea580c'];
    return ['#ef4444', '#dc2626'];
  };

  const [color1, color2] = getGradientColors();

  // Create arc path for semi-circle (180 degrees, opening upward)
  const startX = center - radius;
  const startY = center;
  const endX = center + radius;
  const endY = center;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={svgSize}
        height={center + strokeWidth}
        viewBox={`0 0 ${svgSize} ${center + strokeWidth}`}
      >
        <defs>
          <linearGradient id={`scoreGradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        {/* Background arc - semi-circle from left to right, curving upward */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke={`url(#scoreGradient-${score})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="text-center -mt-6">
        <span className={cn("text-2xl font-bold", getScoreColor(score))}>{score}</span>
        <span className="text-slate-400 text-xs">/100</span>
      </div>
    </div>
  );
};

// --- SCORING CIRCLES COMPONENT ---
const ScoringCircles = ({ success, warning, error, size = 'normal' }) => {
  const circleSize = size === 'small' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  return (
    <div className="flex items-center gap-1">
      {success > 0 && (
        <div className={cn("rounded-full bg-green-500 text-white font-bold flex items-center justify-center", circleSize)}>
          {success}
        </div>
      )}
      {warning > 0 && (
        <div className={cn("rounded-full bg-yellow-500 text-white font-bold flex items-center justify-center", circleSize)}>
          {warning}
        </div>
      )}
      {error > 0 && (
        <div className={cn("rounded-full bg-red-500 text-white font-bold flex items-center justify-center", circleSize)}>
          {error}
        </div>
      )}
      {success === 0 && warning === 0 && error === 0 && (
        <div className={cn("rounded-full bg-green-500 text-white font-bold flex items-center justify-center", circleSize)}>
          0
        </div>
      )}
    </div>
  );
};

// --- JOURNEY TIMELINE COMPONENT ---
const getJourneyIcon = (action) => {
  const icons = {
    page_load: Globe,
    cookie_consent: Cookie,
    site_detection: Target,
    product_view: Package,
    add_to_cart: ShoppingCart,
    view_cart: ShoppingCart,
    initiate_checkout: CreditCard,
    cta_click: MousePointerClick,
    form_submit: FileText,
    crawl_complete: CheckCircle2,
  };
  return icons[action] || Circle;
};

const getJourneyColor = (action) => {
  const colors = {
    page_load: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-200' },
    cookie_consent: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-200' },
    site_detection: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-200' },
    product_view: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-200' },
    add_to_cart: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-200' },
    view_cart: { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-200' },
    initiate_checkout: { bg: 'bg-pink-100', icon: 'text-pink-600', border: 'border-pink-200' },
    cta_click: { bg: 'bg-cyan-100', icon: 'text-cyan-600', border: 'border-cyan-200' },
    form_submit: { bg: 'bg-teal-100', icon: 'text-teal-600', border: 'border-teal-200' },
    crawl_complete: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-green-200' },
  };
  return colors[action] || { bg: 'bg-slate-100', icon: 'text-slate-600', border: 'border-slate-200' };
};

const getJourneyLabel = (action) => {
  const labels = {
    page_load: 'Page Loaded',
    cookie_consent: 'Cookie Consent',
    site_detection: 'Site Analyzed',
    product_view: 'Product Viewed',
    add_to_cart: 'Added to Cart',
    view_cart: 'Cart Viewed',
    initiate_checkout: 'Checkout Started',
    cta_click: 'CTA Clicked',
    form_submit: 'Form Submitted',
    crawl_complete: 'Crawl Complete',
  };
  return labels[action] || action;
};

const JourneyTimeline = ({ journey, requests, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!journey || journey.length === 0) {
    return null;
  }

  // Count tracking requests per step
  const requestsPerStep = requests?.reduce((acc, req) => {
    const step = req.journeyStep || 0;
    acc[step] = (acc[step] || 0) + 1;
    return acc;
  }, {}) || {};

  // Calculate total requests
  const totalRequests = requests?.length || 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {journey.map((step, idx) => {
          const Icon = getJourneyIcon(step.action);
          const colors = getJourneyColor(step.action);
          const requestCount = requestsPerStep[step.step] || 0;

          return (
            <div key={idx} className="flex items-center">
              <div className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full",
                colors.bg
              )}>
                <Icon className={cn("w-4 h-4", colors.icon)} />
                {requestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {requestCount}
                  </span>
                )}
              </div>
              {idx < journey.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Navigation className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800">User Journey Simulation</h3>
          <span className="text-sm text-slate-500">{journey.length} steps</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Mini journey preview when collapsed */}
          {!isExpanded && (
            <div className="hidden sm:flex items-center gap-1">
              {journey.map((step, idx) => {
                const Icon = getJourneyIcon(step.action);
                const colors = getJourneyColor(step.action);
                return (
                  <div key={idx} className="flex items-center">
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full",
                      colors.bg
                    )}>
                      <Icon className={cn("w-3 h-3", colors.icon)} />
                    </div>
                    {idx < journey.length - 1 && (
                      <ArrowRight className="w-2 h-2 text-slate-300 mx-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-slate-100">
          <div className="relative pt-4">
            {/* Vertical line */}
            <div className="absolute left-5 top-4 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {journey.map((step, idx) => {
                const Icon = getJourneyIcon(step.action);
                const colors = getJourneyColor(step.action);
                const requestCount = requestsPerStep[step.step] || 0;

                return (
                  <div key={idx} className="relative flex gap-4">
                    {/* Step icon */}
                    <div className={cn(
                      "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2",
                      colors.bg,
                      colors.border
                    )}>
                      <Icon className={cn("w-5 h-5", colors.icon)} />
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{getJourneyLabel(step.action)}</p>
                          {step.title && (
                            <p className="text-sm text-slate-600 truncate max-w-md">{step.title}</p>
                          )}
                          {step.siteType && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {step.siteType} site
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {requestCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg">
                              <Activity className="w-3 h-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-700">{requestCount} requests</span>
                            </div>
                          )}
                          <span className="text-xs text-slate-400">
                            Step {step.step}
                          </span>
                        </div>
                      </div>

                      {step.url && step.action !== 'crawl_complete' && (
                        <p className="mt-1 text-xs text-slate-400 font-mono truncate max-w-lg">{step.url}</p>
                      )}

                      {step.pagesVisited && (
                        <p className="mt-1 text-xs text-slate-500">
                          Visited {step.pagesVisited} page(s), captured {step.trackingRequestsCaptured} tracking requests
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- REQUEST BROWSER COMPONENT (Full details view) ---
const RequestBrowser = ({ requests, selectedRequest, onSelectRequest, onClose }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No requests captured</p>
      </div>
    );
  }

  // Get unique vendors
  const vendors = [...new Set(requests.map(r => detectVendor(r.domain, r.url, r.params)).filter(Boolean))];

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const vendor = detectVendor(req.domain, req.url, req.params);
    const matchesFilter = filter === 'all' || vendor === filter;
    const matchesSearch = !searchTerm ||
      req.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.domain?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-100 text-green-700',
      POST: 'bg-blue-100 text-blue-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return colors[method] || 'bg-slate-100 text-slate-700';
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-500';
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-700';
    if (status >= 300 && status < 400) return 'bg-yellow-100 text-yellow-700';
    if (status >= 400) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Request Browser
            <span className="text-sm font-normal text-slate-500">({filteredRequests.length} requests)</span>
          </h3>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search requests..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Vendor filter */}
          <select
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Vendors</option>
            {vendors.map(v => (
              <option key={v} value={v}>{VENDOR_CONFIG[v]?.name || v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex">
        {/* Request list (left side) */}
        <div className="w-1/3 border-r border-slate-200 max-h-[600px] overflow-y-auto">
          {filteredRequests.map((req, idx) => {
            const vendor = detectVendor(req.domain, req.url, req.params);
            const vendorConfig = vendor ? VENDOR_CONFIG[vendor] : null;
            const isSelected = selectedRequest?.requestId === req.requestId;

            return (
              <div
                key={req.requestId || idx}
                onClick={() => onSelectRequest(req)}
                className={cn(
                  "p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors",
                  isSelected && "bg-blue-50 border-l-4 border-l-blue-500"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">#{req.index}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", getMethodColor(req.method))}>
                    {req.method}
                  </span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", getStatusColor(req.status))}>
                    {req.status || '—'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {vendorConfig && (
                    <VendorLogo vendorKey={vendor} size="sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {vendorConfig?.shortName || req.domain}
                    </p>
                    <p className="text-xs text-slate-400 truncate font-mono">
                      {req.domain}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Request detail (right side) */}
        <div className="flex-1 max-h-[600px] overflow-y-auto">
          {selectedRequest ? (
            <RequestDetail request={selectedRequest} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 p-8">
              <div className="text-center">
                <MousePointer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select a request to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- REQUEST DETAIL COMPONENT ---
const RequestDetail = ({ request }) => {
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    url: true,
    params: true,
    allParams: false, // All params collapsed by default
    payload: false,
    headers: false
  });

  const vendor = detectVendor(request.domain, request.url, request.params);
  const vendorConfig = vendor ? VENDOR_CONFIG[vendor] : null;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Parse query parameters
  let queryParams = {};
  try {
    const url = new URL(request.url);
    for (const [key, value] of url.searchParams.entries()) {
      queryParams[key] = value;
    }
  } catch (e) { }

  // Parse payload if it's JSON or URL-encoded
  let parsedPayload = null;
  if (request.payload) {
    try {
      parsedPayload = JSON.parse(request.payload);
    } catch (e) {
      try {
        const params = new URLSearchParams(request.payload);
        parsedPayload = {};
        for (const [key, value] of params.entries()) {
          parsedPayload[key] = value;
        }
      } catch (e2) {
        parsedPayload = request.payload;
      }
    }
  }

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-green-500',
      POST: 'bg-blue-500',
      PUT: 'bg-yellow-500',
      DELETE: 'bg-red-500',
    };
    return colors[method] || 'bg-slate-500';
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-slate-400';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-yellow-600';
    if (status >= 400) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {vendorConfig && <VendorLogo vendorKey={vendor} size="lg" />}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-lg text-slate-900">
              {vendorConfig?.name || request.domain}
            </h4>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono">
              #{request.index}
            </span>
          </div>
          <p className="text-sm text-slate-500">{request.domain}</p>
        </div>
      </div>

      {/* General Info */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Method</p>
            <span className={cn("inline-block px-2 py-1 rounded text-white text-xs font-bold", getMethodColor(request.method))}>
              {request.method}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <span className={cn("text-lg font-bold", getStatusColor(request.status))}>
              {request.status || '—'}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Journey Step</p>
            <span className="text-lg font-bold text-slate-700">
              {request.journeyStep || 0}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Request ID</p>
            <span className="text-xs font-mono text-slate-600">
              {request.requestId}
            </span>
          </div>
        </div>
      </div>

      {/* Full URL (decoded) */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('url')}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="font-medium text-slate-700">Full URL (decoded)</span>
          <ChevronRight className={cn("w-4 h-4 transition-transform", expandedSections.url && "rotate-90")} />
        </button>
        {expandedSections.url && (
          <div className="p-4 bg-slate-900">
            <code className="text-xs text-green-400 font-mono break-all select-all">
              {decodeUrl(request.url)}
            </code>
          </div>
        )}
      </div>

      {/* Tracking Parameters (filtered & categorized) */}
      {(() => {
        const trackingParams = filterTrackingParams(queryParams);
        const trackingCount = Object.keys(trackingParams).length;
        const allCount = Object.keys(queryParams).length;

        if (trackingCount === 0) return null;

        // Group by category
        const grouped = {};
        Object.entries(trackingParams).forEach(([key, value]) => {
          const cat = categorizeParam(key);
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push({ key, value: decodeUrl(value) });
        });

        return (
          <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
            <button
              onClick={() => toggleSection('params')}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              <span className="font-medium text-blue-800 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Tracking Parameters
                <span className="text-xs text-blue-600">({trackingCount} of {allCount})</span>
              </span>
              <ChevronRight className={cn("w-4 h-4 text-blue-600 transition-transform", expandedSections.params && "rotate-90")} />
            </button>
            {expandedSections.params && (
              <div className="p-4 space-y-4">
                {Object.entries(grouped).map(([category, params]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">{category}</p>
                    <div className="space-y-1">
                      {params.map(({ key, value }) => (
                        <div key={key} className="flex gap-2 items-start bg-white rounded p-2 border border-slate-100">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-mono shrink-0", getParamCategoryColor(category))}>
                            {key}
                          </span>
                          <span className="text-xs font-mono text-slate-700 break-all">
                            {value || '(empty)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* All Query Parameters (collapsible) */}
      {Object.keys(queryParams).length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('allParams')}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="font-medium text-slate-700">
              All Parameters
              <span className="ml-2 text-xs text-slate-400">({Object.keys(queryParams).length})</span>
            </span>
            <ChevronRight className={cn("w-4 h-4 transition-transform", expandedSections.allParams && "rotate-90")} />
          </button>
          {expandedSections.allParams && (
            <div className="p-4 max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 text-slate-500 font-medium">Parameter</th>
                    <th className="text-left py-2 text-slate-500 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(queryParams).map(([key, value]) => {
                    const isTracking = isTrackingParam(key);
                    return (
                      <tr key={key} className={cn("border-b border-slate-100", isTracking && "bg-blue-50")}>
                        <td className={cn("py-2 pr-4 font-mono text-xs", isTracking ? "text-blue-600 font-semibold" : "text-slate-500")}>
                          {key}
                          {isTracking && <span className="ml-1 text-blue-400">*</span>}
                        </td>
                        <td className="py-2 font-mono text-slate-700 text-xs break-all">
                          {decodeUrl(value) || '(empty)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-2">* Tracking-relevant parameter</p>
            </div>
          )}
        </div>
      )}

      {/* POST Payload */}
      {request.payload && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('payload')}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="font-medium text-slate-700">
              POST Payload
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">POST</span>
            </span>
            <ChevronRight className={cn("w-4 h-4 transition-transform", expandedSections.payload && "rotate-90")} />
          </button>
          {expandedSections.payload && (
            <div className="p-4 bg-slate-900 max-h-60 overflow-y-auto">
              <pre className="text-xs text-cyan-400 font-mono whitespace-pre-wrap break-all select-all">
                {typeof parsedPayload === 'object'
                  ? JSON.stringify(parsedPayload, null, 2)
                  : request.payload}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Raw Params String */}
      {request.params && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50">
            <span className="font-medium text-slate-700">Raw Query String</span>
          </div>
          <div className="p-4 bg-slate-800">
            <code className="text-xs text-amber-400 font-mono break-all select-all">
              {request.params}
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SITE TYPE BADGE ---
const SiteTypeBadge = ({ siteType }) => {
  const configs = {
    ecommerce: { icon: Store, bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'E-commerce' },
    'lead-gen': { icon: FileText, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Lead Generation' },
    content: { icon: Globe, bg: 'bg-purple-100', text: 'text-purple-700', label: 'Content Site' },
    unknown: { icon: Globe, bg: 'bg-slate-100', text: 'text-slate-700', label: 'Unknown' },
  };

  const config = configs[siteType] || configs.unknown;
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full", config.bg)}>
      <Icon className={cn("w-4 h-4", config.text)} />
      <span className={cn("text-sm font-medium", config.text)}>{config.label}</span>
    </div>
  );
};

// --- STAT CARD COMPONENT ---
const StatCard = ({ label, value, color, icon: Icon, trend }) => (
  <div className={cn("p-4 rounded-xl border-2", color === 'green' ? 'border-green-100 bg-green-50' : color === 'yellow' ? 'border-yellow-100 bg-yellow-50' : color === 'red' ? 'border-red-100 bg-red-50' : 'border-slate-100 bg-white')}>
    <div className="flex items-center gap-2 mb-2">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : color === 'red' ? 'bg-red-500' : 'bg-slate-500')}>
        {Icon && <Icon className="w-4 h-4 text-white" />}
      </div>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
    <div className={cn("text-3xl font-bold", color === 'green' ? 'text-green-700' : color === 'yellow' ? 'text-yellow-700' : color === 'red' ? 'text-red-700' : 'text-slate-900')}>
      {value}
    </div>
  </div>
);

// --- PDF EXPORT MODAL ---
const PDFExportModal = ({ isOpen, onClose, results, aiResults }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    companyName: '',
    preparedBy: ''
  });

  if (!isOpen) return null;

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      // A4 landscape for one-pager executive summary
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Colors
      const primaryColor = [0, 0, 0]; // Black for logo match
      const secondaryColor = [100, 100, 100]; // Gray
      const successColor = [22, 163, 74]; // Green
      const warningColor = [202, 138, 4]; // Yellow/Amber
      const errorColor = [220, 38, 38]; // Red
      const lightGray = [245, 245, 245];

      // Data
      const score = results?.overall?.score || 0;
      const scoreLabel = results?.overall?.score_label || 'N/A';
      const solutions = Object.entries(results?.solutions || {});
      const siteUrl = results?.url || 'Unknown URL';

      // === HEADER SECTION ===
      // Add logo
      try {
        doc.addImage(TAGINSIGHT_LOGO, 'PNG', margin, margin, 50, 12);
      } catch (e) {
        // Fallback text if logo fails
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.text('taginsight', margin, margin + 8);
      }

      // Report title and date - right aligned
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text('Marketing Technology Audit', pageWidth - margin, margin + 5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...secondaryColor);
      const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      doc.text(reportDate, pageWidth - margin, margin + 12, { align: 'right' });

      // URL below title
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      // Truncate URL if too long
      const displayUrl = siteUrl.length > 50 ? siteUrl.substring(0, 50) + '...' : siteUrl;
      doc.text(displayUrl, pageWidth - margin, margin + 18, { align: 'right' });

      // Horizontal line - moved down to avoid overlap
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, 35, pageWidth - margin, 35);

      let yPos = 42;

      // === MAIN CONTENT - 3 COLUMN LAYOUT ===
      const colWidth = (pageWidth - margin * 2 - 20) / 3;
      const col1X = margin;
      const col2X = margin + colWidth + 10;
      const col3X = margin + (colWidth + 10) * 2;

      // --- COLUMN 1: Score & Summary ---
      // Score circle
      const scoreCircleX = col1X + colWidth / 2;
      const scoreCircleY = yPos + 25;
      const scoreRadius = 22;

      // Score circle background
      doc.setFillColor(...lightGray);
      doc.circle(scoreCircleX, scoreCircleY, scoreRadius, 'F');

      // Score border color based on score
      const scoreColor = score >= 75 ? successColor : score >= 50 ? warningColor : errorColor;
      doc.setDrawColor(...scoreColor);
      doc.setLineWidth(3);
      doc.circle(scoreCircleX, scoreCircleY, scoreRadius, 'S');

      // Score number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(...scoreColor);
      doc.text(String(score), scoreCircleX, scoreCircleY + 3, { align: 'center' });

      // Score label
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.text(scoreLabel.toUpperCase(), scoreCircleX, scoreCircleY + 12, { align: 'center' });

      // Stats below score
      const statsY = yPos + 55;
      const statsData = [
        { label: 'Requests', value: results?.requests?.length || 0, color: primaryColor },
        { label: 'Success', value: results?.overall?.success_count || 0, color: successColor },
        { label: 'Warnings', value: results?.overall?.warning_count || 0, color: warningColor },
        { label: 'Errors', value: results?.overall?.error_count || 0, color: errorColor }
      ];

      const statBoxWidth = (colWidth - 6) / 2;
      statsData.forEach((stat, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = col1X + col * (statBoxWidth + 6);
        const y = statsY + row * 22;

        doc.setFillColor(...lightGray);
        doc.roundedRect(x, y, statBoxWidth, 18, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...stat.color);
        doc.text(String(stat.value), x + statBoxWidth / 2, y + 8, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...secondaryColor);
        doc.text(stat.label, x + statBoxWidth / 2, y + 14, { align: 'center' });
      });

      // Prepared for/by section
      if (exportOptions.companyName || exportOptions.preparedBy) {
        const infoY = statsY + 50;
        doc.setFontSize(8);
        doc.setTextColor(...secondaryColor);

        if (exportOptions.companyName) {
          doc.setFont('helvetica', 'bold');
          doc.text('Prepared for:', col1X, infoY);
          doc.setFont('helvetica', 'normal');
          doc.text(exportOptions.companyName, col1X + 25, infoY);
        }
        if (exportOptions.preparedBy) {
          doc.setFont('helvetica', 'bold');
          doc.text('Prepared by:', col1X, infoY + 6);
          doc.setFont('helvetica', 'normal');
          doc.text(exportOptions.preparedBy, col1X + 25, infoY + 6);
        }
      }

      // --- COLUMN 2: Detected Solutions with Cards ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text('Detected Solutions', col2X, yPos);

      if (solutions.length > 0) {
        let solY = yPos + 8;
        const cardHeight = 28;
        const cardGap = 4;
        const logoSize = 10;

        solutions.slice(0, 5).forEach(([key, sol]) => {
          const aiData = aiResults?.[key];
          const solScore = aiData?.score ?? sol.score ?? 0;
          const errorCount = aiData?.error_count ?? sol.error_count ?? 0;
          const warningCount = aiData?.warning_count ?? sol.warning_count ?? 0;
          const eventsAudited = aiData?.events_audited ?? sol.events_audited ?? 0;
          const vendorColor = VENDOR_COLORS[key] || [100, 100, 100];
          const vendorName = VENDOR_NAMES[key] || sol.name || key;
          const vendorLogo = VENDOR_LOGOS[key];

          // Card background
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.3);
          doc.roundedRect(col2X, solY, colWidth, cardHeight, 2, 2, 'FD');

          // Color indicator bar on left
          doc.setFillColor(...vendorColor);
          doc.rect(col2X, solY, 3, cardHeight, 'F');

          // Colored circle with first letter as logo placeholder
          doc.setFillColor(...vendorColor);
          doc.circle(col2X + 11, solY + cardHeight / 2, 5, 'F');

          // First letter of vendor name
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          const firstLetter = vendorName.charAt(0).toUpperCase();
          doc.text(firstLetter, col2X + 11, solY + cardHeight / 2 + 2, { align: 'center' });

          // Solution name (after logo)
          const nameX = col2X + 6 + logoSize + 4;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(...primaryColor);
          doc.text(vendorName, nameX, solY + 8);

          // Pixel ID below name
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...secondaryColor);
          const pixelIdText = sol.pixel_id ? `ID: ${sol.pixel_id}` : 'No ID detected';
          doc.text(pixelIdText, nameX, solY + 14);

          // Events and status on same line
          let statusText = `${eventsAudited} events`;
          if (errorCount > 0) statusText += ` | ${errorCount} errors`;
          else if (warningCount > 0) statusText += ` | ${warningCount} warnings`;
          doc.setFontSize(6);
          doc.text(statusText, nameX, solY + 20);

          // Score badge on right - larger and clearer
          const scoreColor = solScore >= 75 ? successColor : solScore >= 50 ? warningColor : errorColor;
          const badgeWidth = 24;
          const badgeHeight = 18;
          const badgeX = col2X + colWidth - badgeWidth - 4;
          const badgeY = solY + (cardHeight - badgeHeight) / 2;

          doc.setFillColor(...scoreColor);
          doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');

          // Score number - centered vertically (badgeHeight/2 + font adjustment)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(255, 255, 255);
          doc.text(String(solScore), badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 2, { align: 'center' });

          solY += cardHeight + cardGap;
        });

        // Show count if more solutions
        if (solutions.length > 5) {
          doc.setFontSize(8);
          doc.setTextColor(...secondaryColor);
          doc.text(`+ ${solutions.length - 5} more solutions detected`, col2X, solY + 4);
        }
      } else {
        doc.setFontSize(9);
        doc.setTextColor(...secondaryColor);
        doc.text('No tracking solutions detected', col2X, yPos + 10);
      }

      // --- COLUMN 3: Issues & Recommendations ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text('Issues & Recommendations', col3X, yPos);

      let issueY = yPos + 8;

      // Collect all issues
      const allIssues = [];
      solutions.forEach(([key, sol]) => {
        const aiData = aiResults?.[key];
        const events = aiData?.events || sol.events || [];
        events.forEach(evt => {
          evt.issues?.forEach(issue => {
            allIssues.push({
              solution: sol.name || key,
              severity: issue.severity,
              message: issue.message || issue.type
            });
          });
        });
      });

      const errors = allIssues.filter(i => i.severity === 'error');
      const warnings = allIssues.filter(i => i.severity === 'warning');

      // Errors
      if (errors.length > 0) {
        doc.setFillColor(...errorColor);
        doc.roundedRect(col3X, issueY, colWidth, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`CRITICAL ERRORS (${errors.length})`, col3X + 3, issueY + 4);
        issueY += 9;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...secondaryColor);
        errors.slice(0, 3).forEach(err => {
          const text = `• ${err.solution}: ${err.message}`.slice(0, 60);
          doc.text(text, col3X, issueY);
          issueY += 5;
        });
        if (errors.length > 3) {
          doc.text(`  + ${errors.length - 3} more errors...`, col3X, issueY);
          issueY += 5;
        }
        issueY += 3;
      }

      // Warnings
      if (warnings.length > 0) {
        doc.setFillColor(...warningColor);
        doc.roundedRect(col3X, issueY, colWidth, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`WARNINGS (${warnings.length})`, col3X + 3, issueY + 4);
        issueY += 9;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...secondaryColor);
        warnings.slice(0, 3).forEach(warn => {
          const text = `• ${warn.solution}: ${warn.message}`.slice(0, 60);
          doc.text(text, col3X, issueY);
          issueY += 5;
        });
        if (warnings.length > 3) {
          doc.text(`  + ${warnings.length - 3} more warnings...`, col3X, issueY);
          issueY += 5;
        }
        issueY += 3;
      }

      // All good message
      if (errors.length === 0 && warnings.length === 0) {
        doc.setFillColor(...successColor);
        doc.roundedRect(col3X, issueY, colWidth, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text('ALL CHECKS PASSED', col3X + 3, issueY + 4);
        issueY += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...successColor);
        doc.text('No critical issues detected.', col3X, issueY);
        issueY += 8;
      }

      // Recommendations
      issueY += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text('Recommendations', col3X, issueY);
      issueY += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...secondaryColor);

      const recommendations = [];
      if (errors.length > 0) {
        recommendations.push(`1. Fix ${errors.length} critical error(s) immediately`);
      }
      if (warnings.length > 0) {
        recommendations.push(`${recommendations.length + 1}. Review ${warnings.length} warning(s)`);
      }
      solutions.forEach(([key, sol]) => {
        const aiData = aiResults?.[key];
        const solScore = aiData?.score ?? sol.score ?? 100;
        if (solScore < 75 && recommendations.length < 4) {
          recommendations.push(`${recommendations.length + 1}. Improve ${sol.name || key} (${solScore}/100)`);
        }
      });
      if (recommendations.length === 0) {
        recommendations.push('1. Continue monitoring tracking health');
      }

      recommendations.forEach(rec => {
        doc.text(rec, col3X, issueY);
        issueY += 5;
      });

      // === FOOTER ===
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by taginsight | taginsight.com', margin, pageHeight - 10);
      doc.text(`Report Date: ${reportDate}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

      // Save the PDF
      const filename = `taginsight-audit-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      onClose();
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Export One-Pager</h2>
              <p className="text-slate-400 text-sm mt-0.5">Executive summary PDF</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Preview */}
          <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-200">
                <span className={cn(
                  "text-xl font-bold",
                  (results?.overall?.score || 0) >= 75 ? "text-green-600" :
                    (results?.overall?.score || 0) >= 50 ? "text-yellow-600" : "text-red-600"
                )}>
                  {results?.overall?.score || 0}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{results?.url || 'Website Audit'}</p>
                <p className="text-sm text-slate-500">
                  {Object.keys(results?.solutions || {}).length} solutions • {results?.requests?.length || 0} requests
                </p>
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prepared for (optional)</label>
              <input
                type="text"
                value={exportOptions.companyName}
                onChange={(e) => setExportOptions(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Company name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prepared by (optional)</label>
              <input
                type="text"
                value={exportOptions.preparedBy}
                onChange={(e) => setExportOptions(prev => ({ ...prev, preparedBy: e.target.value }))}
                placeholder="Your name or team"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- EVENT STATUS BADGE ---
const EventStatusBadge = ({ status }) => {
  const colors = {
    Pageview: 'bg-blue-100 text-blue-700',
    ViewContent: 'bg-purple-100 text-purple-700',
    AddToCart: 'bg-orange-100 text-orange-700',
    'Add To Cart': 'bg-orange-100 text-orange-700',
    InitiateCheckout: 'bg-pink-100 text-pink-700',
    'Initiate Checkout': 'bg-pink-100 text-pink-700',
    Purchase: 'bg-green-100 text-green-700',
    CompletePayment: 'bg-green-100 text-green-700'
  };

  return (
    <span className={cn("px-2 py-1 rounded text-xs font-medium", colors[status] || 'bg-slate-100 text-slate-700')}>
      {status}
    </span>
  );
};

// --- MAIN APP ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('scanner');
  const [scanUrl, setScanUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const handleScan = async () => {
    if (!scanUrl.trim()) return;

    setIsScanning(true);
    setScanError(null);
    setScanResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(scanUrl)}`,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan URL');
      }

      // Handle new data structure with journey
      const crawlData = {
        requests: data.requests || data,
        journey: data.journey || [],
        siteType: data.siteType || 'unknown',
        pagesVisited: data.pagesVisited || [],
        pageTitle: data.pageTitle || '',
      };

      // Process results with scoring
      const processedResults = processWithScoring(crawlData, scanUrl);

      setScanResults(processedResults);
      setScanHistory(prev => [processedResults, ...prev.slice(0, 9)]);
      setCurrentView('reverse-report');
    } catch (error) {
      setScanError(error.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Process raw crawl data with scoring methodology
  const processWithScoring = (crawlData, url) => {
    // Handle both old format (array) and new format (object with requests)
    const requests = Array.isArray(crawlData) ? crawlData : (crawlData.requests || []);
    const journey = crawlData.journey || [];
    const siteType = crawlData.siteType || 'unknown';
    const pagesVisited = crawlData.pagesVisited || [];
    const pageTitle = crawlData.pageTitle || '';

    // Group requests by vendor/solution (only 3 supported vendors)
    const solutions = {};

    // Add unique request ID to each request
    const enrichedRequests = requests.map((req, idx) => ({
      ...req,
      requestId: `req_${idx + 1}`,
      index: idx + 1
    }));

    enrichedRequests.forEach((req, idx) => {
      const domain = req.domain;
      // Pass URL and params for stricter vendor detection
      const vendorKey = detectVendor(domain, req.url, req.params);

      // Skip unsupported vendors
      if (!vendorKey) return;

      const vendorConfig = VENDOR_CONFIG[vendorKey];

      if (!solutions[vendorKey]) {
        solutions[vendorKey] = {
          solution_name: vendorConfig.name,
          vendor_key: vendorKey,
          pixel_id: extractPixelId(req, vendorKey),
          events: [],
          lastCheck: new Date().toISOString()
        };
      }

      // Extract event name based on vendor
      let eventName = extractEventName(req, vendorKey);

      // Parse parameters from URL
      const params = parseTrackingParams(req.url, req.params, vendorKey);

      // Validate event and calculate scoring
      const validation = validateEvent(vendorKey, eventName, params);

      solutions[vendorKey].events.push({
        event_id: idx + 1,
        request_id: req.requestId,
        event_name: eventName,
        status: validation.status,
        timestamp: new Date().toISOString(),
        url: req.url || url,
        page_url: req.pageUrl || url,
        journey_step: req.journeyStep || 0,
        scoring: {
          success_count: validation.successCount,
          warning_count: validation.warningCount,
          error_count: validation.errorCount
        },
        parameters: validation.parameters,
        issues: validation.issues,
        issue_preview: validation.issues.slice(0, 3).map(i => i.short),
        domain: req.domain,
        method: req.method,
        http_status: req.status,
        // Store raw request data for proof
        raw_request: {
          url: req.url,
          params: req.params,
          payload: req.payload,
          query: params // Parsed query parameters
        }
      });
    });

    // Calculate solution-level stats
    Object.values(solutions).forEach(solution => {
      let totalSuccess = 0, totalWarning = 0, totalError = 0;
      let eventSuccess = 0, eventWarning = 0, eventError = 0;

      solution.events.forEach(event => {
        totalSuccess += event.scoring.success_count;
        totalWarning += event.scoring.warning_count;
        totalError += event.scoring.error_count;

        if (event.status === 'success') eventSuccess++;
        else if (event.status === 'warning') eventWarning++;
        else eventError++;
      });

      solution.events_audited = solution.events.length;
      solution.success_count = totalSuccess;
      solution.warning_count = totalWarning;
      solution.error_count = totalError;
      solution.event_success_count = eventSuccess;
      solution.event_warning_count = eventWarning;
      solution.event_error_count = eventError;

      // Calculate score
      const penalty = (eventError * 10) + (eventWarning * 5);
      solution.score = Math.max(0, 100 - penalty);
      solution.score_label = getScoreLabel(solution.score);
    });

    // Calculate overall site score
    const allSolutions = Object.values(solutions);
    const totalEvents = allSolutions.reduce((sum, s) => sum + s.events_audited, 0);
    const totalSuccess = allSolutions.reduce((sum, s) => sum + s.success_count, 0);
    const totalWarnings = allSolutions.reduce((sum, s) => sum + s.warning_count, 0);
    const totalErrors = allSolutions.reduce((sum, s) => sum + s.error_count, 0);

    // Calculate overall score as weighted average of solution scores
    let overallScore = 0;
    if (allSolutions.length > 0) {
      const totalSolutionScore = allSolutions.reduce((sum, s) => sum + s.score, 0);
      overallScore = Math.round(totalSolutionScore / allSolutions.length);
    }

    return {
      url,
      timestamp: new Date().toISOString(),
      requests: enrichedRequests,
      solutions,
      journey,
      siteType,
      pagesVisited,
      pageTitle,
      overall: {
        score: overallScore,
        score_label: getScoreLabel(overallScore),
        events_audited: totalEvents,
        success_count: totalSuccess,
        warning_count: totalWarnings,
        error_count: totalErrors
      },
      stats: {
        total: enrichedRequests.length,
        byCategory: enrichedRequests.reduce((acc, req) => {
          const cat = categorizeVendor(req.domain);
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {}),
        byMethod: enrichedRequests.reduce((acc, req) => {
          acc[req.method] = (acc[req.method] || 0) + 1;
          return acc;
        }, {}),
        byJourneyStep: enrichedRequests.reduce((acc, req) => {
          const step = req.journeyStep || 0;
          acc[step] = (acc[step] || 0) + 1;
          return acc;
        }, {}),
        byVendor: enrichedRequests.reduce((acc, req) => {
          const vendor = detectVendor(req.domain, req.url, req.params);
          if (vendor) {
            acc[vendor] = (acc[vendor] || 0) + 1;
          } else {
            acc['other'] = (acc['other'] || 0) + 1;
          }
          return acc;
        }, {})
      }
    };
  };

  const renderContent = () => {
    switch (currentView) {
      case 'scanner':
        return <ScannerPage
          scanUrl={scanUrl}
          setScanUrl={setScanUrl}
          handleScan={handleScan}
          isScanning={isScanning}
          scanError={scanError}
          scanHistory={scanHistory}
          onSelectHistory={(result) => {
            setScanResults(result);
            setCurrentView('reverse-report');
          }}
        />;
      case 'results':
        return <ResultsPage results={scanResults} onNewScan={() => setCurrentView('scanner')} />;
      case 'reverse-report':
        return <ReverseReportPage results={scanResults} onNewScan={() => setCurrentView('scanner')} />;
      case 'tracking-plan':
        return <TrackingPlanPage results={scanResults} />;
      case 'overview':
        return <OverviewPage results={scanResults} scanHistory={scanHistory} />;
      case 'vendor-analysis':
        return <VendorAnalysisPage results={scanResults} />;
      case 'consent-mode':
        return <ConsentModePage results={scanResults} />;
      case 'vendor-list':
        return <VendorListPage results={scanResults} />;
      case 'cookie-scanner':
        return <CookieScannerPage results={scanResults} />;
      case 'project-properties':
        return <PropertiesPage />;
      case 'hours-simulator':
        return <HoursSimulator />;
      default:
        return <ScannerPage
          scanUrl={scanUrl}
          setScanUrl={setScanUrl}
          handleScan={handleScan}
          isScanning={isScanning}
          scanError={scanError}
          scanHistory={scanHistory}
          onSelectHistory={(result) => {
            setScanResults(result);
            setCurrentView('reverse-report');
          }}
        />;
    }
  };

  return (
    <div className="font-sans text-slate-900 min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 flex flex-col transition-all duration-300 sticky top-0 h-screen",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-white">taginsight</h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto custom-scrollbar">
          {SIDEBAR_ITEMS.map((section, idx) => (
            <div key={idx} className="mb-4">
              {!collapsed && (
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
                  {section.category}
                </div>
              )}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1",
                    currentView === item.id
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", currentView === item.id ? "text-blue-400" : "text-slate-500")} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}

// --- PROPERTIES PAGE ---
const PropertiesPage = () => {
  const [selectedEventId, setSelectedEventId] = useState('add_to_cart');
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [activeProperties, setActiveProperties] = useState([]);

  // Mock Data
  const EVENTS = [
    { id: 'add_to_cart', name: 'add_to_cart' },
    { id: 'purchase', name: 'purchase' },
    { id: 'view_item', name: 'view_item' },
    { id: 'begin_checkout', name: 'begin_checkout' },
    { id: 'add_payment_info', name: 'add_payment_info' },
  ];

  const MOCK_PROPERTIES = {
    add_to_cart: [
      { id: 'p1', name: 'currency', type: 'string', description: 'Currency in 3-letter ISO 4217 format', example: 'USD', valueType: 'iso-code', anonymize: false, default: true },
      { id: 'p2', name: 'value', type: 'numeric', description: 'The monetary value of the event', example: '9.99', valueType: 'decimal', anonymize: false, default: true },
      { id: 'p3', name: 'items', type: 'array', description: 'The items for the event', example: '[{...}]', valueType: 'object-array', anonymize: false, default: true },
      { id: 'p4', name: 'coupon', type: 'string', description: 'The coupon name/code associated with the item', example: 'SUMMER_FUN', valueType: 'text', anonymize: false, default: true },
    ],
    purchase: [
      { id: 'p1', name: 'currency', type: 'string', description: 'Currency in 3-letter ISO 4217 format', example: 'USD', valueType: 'iso-code', anonymize: false, default: true },
      { id: 'p2', name: 'value', type: 'numeric', description: 'The monetary value of the event', example: '9.99', valueType: 'decimal', anonymize: false, default: true },
      { id: 'p5', name: 'transaction_id', type: 'string', description: 'Unique identifier for the transaction', example: 'T12345', valueType: 'text', anonymize: true, default: true },
    ]
  };

  // Effect to update properties when event changes
  if (activeProperties.length === 0 && selectedEventId && MOCK_PROPERTIES[selectedEventId] && activeProperties !== MOCK_PROPERTIES[selectedEventId]) {
    // In a real app this would be a useEffect, but for this mock we just render what we have
    // However, to make checkboxes work we need state.
  }

  // Initialize state when event changes
  const currentEventProperties = MOCK_PROPERTIES[selectedEventId] || [];

  const handleSelectProperty = (propId) => {
    if (selectedProperties.includes(propId)) {
      setSelectedProperties(selectedProperties.filter(id => id !== propId));
    } else {
      setSelectedProperties([...selectedProperties, propId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProperties(currentEventProperties.map(p => p.id));
    } else {
      setSelectedProperties([]);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-700';
      case 'numeric': return 'bg-purple-100 text-purple-700';
      case 'array': return 'bg-orange-100 text-orange-700';
      case 'boolean': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <span>Project Library</span>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-slate-900">Properties</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Properties Manager</h2>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex overflow-hidden">
        {/* Left Panel: Events List */}
        <div className="w-1/4 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {EVENTS.map(event => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEventId(event.id);
                  setSelectedProperties([]);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between group",
                  selectedEventId === event.id
                    ? "bg-white shadow-sm text-blue-600 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {event.name}
                {selectedEventId === event.id && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Properties Table */}
        <div className="flex-1 flex flex-col">
          {/* Action Bar (conditional) */}
          {selectedProperties.length > 0 ? (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-blue-900">{selectedProperties.length} selected</span>
                <div className="h-4 w-px bg-blue-200"></div>
                <button
                  onClick={() => setShowSyncModal(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                  <Activity className="w-4 h-4" /> Sync
                </button>
                <button className="px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-50 flex items-center gap-2">
                  <X className="w-4 h-4" /> Remove
                </button>
              </div>
              <button
                onClick={() => setSelectedProperties([])}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                Clear selection
              </button>
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">{EVENTS.find(e => e.id === selectedEventId)?.name}</h3>
              <button className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Property
              </button>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={handleSelectAll}
                      checked={currentEventProperties.length > 0 && selectedProperties.length === currentEventProperties.length}
                    />
                  </th>
                  <th className="px-6 py-3">Property Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 w-32">Value Type</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 w-24 text-center">Anonymize</th>
                  <th className="px-6 py-3">Example</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentEventProperties.length > 0 ? (
                  currentEventProperties.map((prop) => (
                    <tr key={prop.id} className={cn("hover:bg-slate-50 group", selectedProperties.includes(prop.id) && "bg-blue-50/30")}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedProperties.includes(prop.id)}
                          onChange={() => handleSelectProperty(prop.id)}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{prop.name}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-mono font-medium", getTypeColor(prop.type))}>
                          {prop.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs bg-slate-100 text-slate-600 font-medium">
                          {prop.valueType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 relative group-hover:text-slate-800">
                        {prop.description}
                        <button className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Settings className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {prop.anonymize ? (
                          <div className="mx-auto w-8 h-4 bg-blue-600 rounded-full relative">
                            <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        ) : (
                          <div className="mx-auto w-8 h-4 bg-slate-200 rounded-full relative">
                            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{prop.example}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 text-slate-400 hover:text-slate-600">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      No properties found for this event.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fade-in shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Synchronize Properties</h3>
            <p className="text-slate-500 text-sm mb-6">
              This will update <span className="font-bold text-slate-900">{selectedProperties.length} properties</span> across all other events where they appear in this Tracking Plan.
            </p>

            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Impact Analysis</p>
                <p className="mt-1 opacity-80">This will modify metadata for matching properties in 3 other events.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSelectedProperties([]);
                }}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md"
              >
                Confirm Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SCANNER PAGE ---
const ScannerPage = ({ scanUrl, setScanUrl, handleScan, isScanning, scanError, scanHistory, onSelectHistory }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Website Tracker Scanner</h2>
        <p className="text-slate-500 text-lg">Analyze any website to discover tracking tags, analytics, and data collection practices.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-blue-100 p-8 border border-slate-100">
        <div className="relative flex items-center">
          <Globe className="absolute left-4 text-slate-400 w-6 h-6" />
          <input
            type="text"
            placeholder="Enter website URL (e.g. https://example.com)"
            className="w-full pl-14 pr-32 py-4 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-lg"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            disabled={isScanning}
          />
          <button
            onClick={handleScan}
            disabled={isScanning || !scanUrl.trim()}
            className={cn(
              "absolute right-2 px-6 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
              isScanning
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
            )}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Scan
              </>
            )}
          </button>
        </div>

        {scanError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Scan Failed</p>
              <p className="text-sm text-red-600">{scanError}</p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="mt-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Intelligent Crawl in Progress</p>
                <p className="text-sm text-slate-500">Simulating real user journey to capture tracking events</p>
              </div>
            </div>
            {/* Journey Steps Preview */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
              {[
                { icon: Globe, label: 'Loading page', active: true },
                { icon: Cookie, label: 'Cookie consent', active: false },
                { icon: Target, label: 'Analyzing site', active: false },
                { icon: Package, label: 'Viewing products', active: false },
                { icon: ShoppingCart, label: 'Add to cart', active: false },
                { icon: CreditCard, label: 'Checkout', active: false },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                    step.active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
                  )}>
                    <step.icon className="w-3.5 h-3.5" />
                    {step.label}
                  </div>
                  {idx < 5 && <ArrowRight className="w-3 h-3 text-slate-300 mx-1 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { icon: Navigation, title: "Smart Navigation", desc: "Simulates real user journeys through your site", highlight: true },
          { icon: Eye, title: "Tag Detection", desc: "Discover all tracking pixels and scripts" },
          { icon: ShieldCheck, title: "Privacy Analysis", desc: "Identify GDPR/CCPA compliance issues" },
          { icon: BarChart3, title: "Vendor Insights", desc: "Categorize and analyze data collectors" }
        ].map((feature, i) => (
          <div key={i} className={cn(
            "p-6 rounded-xl border transition-all",
            feature.highlight
              ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg hover:border-blue-300"
              : "bg-white border-slate-200 hover:shadow-lg hover:border-blue-200"
          )}>
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
              feature.highlight ? "bg-blue-100" : "bg-blue-50"
            )}>
              <feature.icon className={cn("w-6 h-6", feature.highlight ? "text-blue-600" : "text-blue-600")} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              {feature.title}
              {feature.highlight && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded-full font-bold">NEW</span>
              )}
            </h3>
            <p className="text-sm text-slate-500">{feature.desc}</p>
          </div>
        ))}
      </div>

      {scanHistory && scanHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Recent Scans</h3>
          <div className="space-y-2">
            {scanHistory.slice(0, 5).map((scan, i) => (
              <button
                key={i}
                onClick={() => onSelectHistory(scan)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 truncate max-w-md">{scan.url}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("text-lg font-bold", getScoreColor(scan.overall?.score || 0))}>
                    {scan.overall?.score || 0}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- ISSUE CARD (Expandable issue display card for inline display) ---
const IssueCard = ({ issue, isExpanded, onToggle, results }) => {
  const affectedEvents = issue.affectedEvents || issue.affected_events || [];

  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      hoverBg: 'hover:bg-red-100',
      badgeBg: 'bg-red-500',
      badgeText: 'text-white',
      iconColor: 'text-red-500'
    },
    important: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      hoverBg: 'hover:bg-yellow-100',
      badgeBg: 'bg-yellow-500',
      badgeText: 'text-white',
      iconColor: 'text-yellow-500'
    },
    optimization: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      hoverBg: 'hover:bg-blue-100',
      badgeBg: 'bg-blue-500',
      badgeText: 'text-white',
      iconColor: 'text-blue-500'
    }
  };

  const severityEmoji = {
    critical: '🔴',
    important: '🟡',
    optimization: '🔵'
  };

  const config = severityConfig[issue.severity] || severityConfig.important;
  const emoji = severityEmoji[issue.severity] || '🟡';

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      config.bg,
      config.border,
      isExpanded ? "shadow-md" : ""
    )}>
      {/* Collapsed Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          config.hoverBg,
          "transition-colors rounded-lg"
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Severity Badge */}
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0",
            config.badgeBg,
            config.badgeText
          )}>
            <span>{emoji}</span>
            <span className="capitalize hidden sm:inline">{issue.severity}</span>
          </span>

          {/* Message */}
          <span className="text-sm font-medium text-slate-800 truncate">
            {issue.message || issue.label}
          </span>

          {/* Affected Count */}
          <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200 shrink-0">
            {issue.count || affectedEvents.length} event{(issue.count || affectedEvents.length) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Expand/Collapse Chevron */}
        <ChevronRight className={cn(
          "w-5 h-5 text-slate-400 transition-transform ml-2 shrink-0",
          isExpanded && "rotate-90"
        )} />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-4 bg-white rounded-b-lg space-y-4">
          {/* Rule ID & Score */}
          <div className="flex items-center gap-4 flex-wrap">
            {issue.ruleId && (
              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                {issue.ruleId}
              </span>
            )}
            {issue.scoreDeduction && (
              <span className="text-xs text-red-600 font-medium">
                -{issue.scoreDeduction} points
              </span>
            )}
          </div>

          {/* Full Description */}
          {issue.description && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</h5>
              <p className="text-sm text-slate-700">{issue.description}</p>
            </div>
          )}

          {/* Recommendation */}
          {issue.recommendation && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h5 className="text-xs font-semibold text-blue-800 uppercase mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Recommendation
              </h5>
              <p className="text-sm text-blue-700">{issue.recommendation}</p>
            </div>
          )}

          {/* Documentation Link */}
          {issue.docUrl && (
            <a
              href={issue.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Documentation
            </a>
          )}

          {/* Affected Events List */}
          {affectedEvents.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Affected Events ({affectedEvents.length})
              </h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {affectedEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">
                        {event.event_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      {event.url && (
                        <span className="truncate max-w-[200px]" title={event.url}>
                          {event.url}
                        </span>
                      )}
                      {event.timestamp && (
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- ISSUE SEVERITY SECTION (Groups issues by severity level) ---
const IssueSeveritySection = ({
  severity,
  issues,
  expandedIssues,
  onToggleIssue,
  results
}) => {
  if (!issues || issues.length === 0) return null;

  const severityConfig = {
    critical: {
      title: 'Critical Issues',
      description: 'Must be fixed immediately - blocking tracking functionality',
      headerBg: 'bg-red-100',
      headerBorder: 'border-red-200',
      headerText: 'text-red-800',
      emoji: '🔴'
    },
    important: {
      title: 'Important Issues',
      description: 'Should be addressed soon - impacting data quality',
      headerBg: 'bg-yellow-100',
      headerBorder: 'border-yellow-200',
      headerText: 'text-yellow-800',
      emoji: '🟡'
    },
    optimization: {
      title: 'Optimization Suggestions',
      description: 'Nice to have - improve tracking accuracy',
      headerBg: 'bg-blue-100',
      headerBorder: 'border-blue-200',
      headerText: 'text-blue-800',
      emoji: '🔵'
    }
  };

  const config = severityConfig[severity] || severityConfig.important;

  const totalAffected = issues.reduce((sum, issue) =>
    sum + (issue.count || issue.affectedEvents?.length || 0), 0
  );

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        config.headerBg,
        config.headerBorder
      )}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <div>
            <h4 className={cn("font-bold", config.headerText)}>
              {config.title}
            </h4>
            <p className="text-xs text-slate-600">{config.description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn("text-2xl font-bold", config.headerText)}>
            {issues.length}
          </span>
          <p className="text-xs text-slate-500">{totalAffected} events affected</p>
        </div>
      </div>

      {/* Issue Cards */}
      <div className="space-y-2">
        {issues.map((issue, idx) => (
          <IssueCard
            key={issue.ruleId || `${severity}-${idx}`}
            issue={{ ...issue, severity }}
            isExpanded={expandedIssues[issue.ruleId || `${severity}-${idx}`]}
            onToggle={() => onToggleIssue(issue.ruleId || `${severity}-${idx}`)}
            results={results}
          />
        ))}
      </div>
    </div>
  );
};

// --- AI AUDIT SLIDER (displays detailed AI analysis results) ---
const AIAuditSlider = ({ isOpen, onClose, aiData, vendorKey }) => {
  const [expandedEvent, setExpandedEvent] = useState(null);

  if (!isOpen || !aiData) return null;

  const config = VENDOR_CONFIG[vendorKey] || {};
  const problemDiagnosis = aiData.problem_diagnosis || {};
  const eventDetails = aiData.event_details || {};
  const events = aiData.events || [];

  // Get events with issues (errors or warnings)
  const eventsWithIssues = events.filter(e => e.status === 'error' || e.status === 'warning');

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Slider Panel */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-hidden flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-slate-900">AI Analysis Report</h3>
                <div className="flex items-center gap-2 mt-1">
                  <VendorLogo vendorKey={vendorKey} size="sm" />
                  <span className="text-sm text-slate-600">{aiData.solution_name}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Score Summary */}
          <div className="mt-4 flex items-center gap-4">
            <div className={cn(
              "px-4 py-2 rounded-lg font-bold text-2xl",
              aiData.score >= 90 ? "bg-green-100 text-green-700" :
                aiData.score >= 75 ? "bg-blue-100 text-blue-700" :
                  aiData.score >= 50 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
            )}>
              {aiData.score}<span className="text-sm font-normal">/100</span>
            </div>
            <div className="flex-1">
              <span className={cn(
                "text-sm font-semibold px-3 py-1 rounded-full",
                aiData.score_label === 'High' ? "bg-green-100 text-green-700" :
                  aiData.score_label === 'Good' ? "bg-blue-100 text-blue-700" :
                    aiData.score_label === 'Medium' ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
              )}>
                {aiData.score_label}
              </span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" /> {aiData.success_count}
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="w-4 h-4" /> {aiData.warning_count}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" /> {aiData.error_count}
              </span>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Problem Diagnosis Section */}
          {(problemDiagnosis.errors?.length > 0 || problemDiagnosis.warnings?.length > 0) && (
            <div className="mb-6">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Problem Diagnosis
              </h4>

              {/* Errors */}
              {problemDiagnosis.errors?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-red-600 uppercase mb-2">Errors ({problemDiagnosis.errors.length})</p>
                  <div className="space-y-2">
                    {problemDiagnosis.errors.map((error, i) => (
                      <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">{error.label}</p>
                            <p className="text-xs text-red-600 mt-1">
                              Type: {error.type} {error.field && `• Field: ${error.field}`} • {error.count} occurrence(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {problemDiagnosis.warnings?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-600 uppercase mb-2">Warnings ({problemDiagnosis.warnings.length})</p>
                  <div className="space-y-2">
                    {problemDiagnosis.warnings.map((warning, i) => (
                      <div key={i} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">{warning.label}</p>
                            <p className="text-xs text-yellow-600 mt-1">
                              Type: {warning.type} {warning.field && `• Field: ${warning.field}`} • {warning.count} occurrence(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Events with Issues */}
          <div className="mb-6">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Event Analysis ({events.length} events)
            </h4>

            {eventsWithIssues.length === 0 ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700">All events validated successfully by AI</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsWithIssues.map((event, i) => {
                  const details = eventDetails[event.event_id] || {};
                  const isExpanded = expandedEvent === event.event_id;

                  return (
                    <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Event Header - Clickable */}
                      <button
                        onClick={() => setExpandedEvent(isExpanded ? null : event.event_id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            event.status === 'error' ? "bg-red-500" :
                              event.status === 'warning' ? "bg-yellow-500" :
                                "bg-green-500"
                          )} />
                          <div className="text-left">
                            <p className="font-medium text-slate-900">{event.event_name}</p>
                            <p className="text-xs text-slate-500">ID: {event.event_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {event.issue_preview?.slice(0, 2).map((issue, j) => (
                            <span key={j} className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                              {issue.length > 30 ? issue.slice(0, 30) + '...' : issue}
                            </span>
                          ))}
                          <ChevronRight className={cn(
                            "w-4 h-4 text-slate-400 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && details && (
                        <div className="border-t border-slate-200 p-4 bg-slate-50">
                          {/* Issues with Recommendations */}
                          {details.issues?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Issues & Recommendations</p>
                              <div className="space-y-3">
                                {details.issues.map((issue, j) => (
                                  <div key={j} className={cn(
                                    "p-3 rounded-lg",
                                    issue.severity === 'error' ? "bg-red-50 border border-red-100" : "bg-yellow-50 border border-yellow-100"
                                  )}>
                                    <div className="flex items-start gap-2 mb-2">
                                      {issue.severity === 'error' ? (
                                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                      ) : (
                                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                                      )}
                                      <div>
                                        <p className={cn(
                                          "text-sm font-medium",
                                          issue.severity === 'error' ? "text-red-800" : "text-yellow-800"
                                        )}>
                                          {issue.message}
                                        </p>
                                        {issue.field && (
                                          <p className="text-xs text-slate-500 mt-0.5">Field: {issue.field}</p>
                                        )}
                                      </div>
                                    </div>
                                    {issue.recommendation && (
                                      <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                                        <p className="text-xs text-blue-600 flex items-start gap-1">
                                          <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                          <span>{issue.recommendation}</span>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Parameters */}
                          {details.parameters?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Parameters ({details.parameters.length})</p>
                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-slate-100">
                                    <tr>
                                      <th className="text-left p-2 text-slate-600">Parameter</th>
                                      <th className="text-left p-2 text-slate-600">Value</th>
                                      <th className="text-left p-2 text-slate-600">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {details.parameters.slice(0, 10).map((param, j) => (
                                      <tr key={j} className="border-t border-slate-100">
                                        <td className="p-2 font-mono text-slate-700">{param.name}</td>
                                        <td className="p-2 font-mono text-slate-600 break-all max-w-[200px]">
                                          {typeof param.value === 'object'
                                            ? JSON.stringify(param.value).slice(0, 50) + '...'
                                            : String(param.value || '(empty)').slice(0, 50)
                                          }
                                        </td>
                                        <td className="p-2">
                                          <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs",
                                            param.status === 'success' ? "bg-green-100 text-green-700" :
                                              param.status === 'warning' ? "bg-yellow-100 text-yellow-700" :
                                                "bg-red-100 text-red-700"
                                          )}>
                                            {param.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {details.parameters.length > 10 && (
                                  <p className="text-xs text-slate-400 p-2 text-center bg-slate-50">
                                    +{details.parameters.length - 10} more parameters
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Events Summary */}
          <div>
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              All Events Overview
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-800">{events.length}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{aiData.success_count}</p>
                  <p className="text-xs text-slate-500">Success</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{aiData.warning_count}</p>
                  <p className="text-xs text-slate-500">Warning</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{aiData.error_count}</p>
                  <p className="text-xs text-slate-500">Error</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" />
            Analyzed by Claude AI • {aiData.pixel_id}
          </p>
        </div>
      </div>
    </>
  );
};

// --- TAG DETECTION VIEW ---
const TagDetectionView = ({ results }) => {
  const [selectedTag, setSelectedTag] = useState(null);
  const [expandedTags, setExpandedTags] = useState({});

  // Group requests by vendor + pixel ID
  const groupRequestsByTag = () => {
    const tags = {};

    results.requests?.forEach((req, index) => {
      const vendor = detectVendor(req.domain, req.url, req.params);
      if (!vendor) return;

      const pixelId = extractPixelId(req, vendor) || 'unknown';
      const eventName = extractEventName(req, vendor) || 'unknown';
      const tagKey = `${vendor}_${pixelId}`;

      if (!tags[tagKey]) {
        tags[tagKey] = {
          vendor,
          pixelId,
          vendorConfig: VENDOR_CONFIG[vendor],
          category: categorizeVendor(req.domain),
          events: [],
          eventCounts: {},
          successCount: 0,
          warningCount: 0,
          errorCount: 0,
          requests: []
        };
      }

      // Count events
      tags[tagKey].eventCounts[eventName] = (tags[tagKey].eventCounts[eventName] || 0) + 1;

      // Parse query params for consent mode detection
      let queryParams = {};
      try {
        const url = new URL(req.url);
        for (const [key, value] of url.searchParams.entries()) {
          queryParams[key] = value;
        }
      } catch (e) { }

      // Check for consent mode
      const hasConsentMode = queryParams.gcd || queryParams.gcs || queryParams.npa;

      // Determine health based on solution data if available
      const solutionData = results.solutions?.[vendor];
      const eventData = solutionData?.events?.find(e => e.request_id === req.requestId);

      if (eventData) {
        if (eventData.status === 'success') tags[tagKey].successCount++;
        else if (eventData.status === 'warning') tags[tagKey].warningCount++;
        else if (eventData.status === 'error') tags[tagKey].errorCount++;
      } else {
        tags[tagKey].successCount++; // Default to success if no validation data
      }

      tags[tagKey].events.push({
        eventName,
        url: req.url,
        status: req.status,
        method: req.method,
        params: queryParams,
        hasConsentMode,
        requestId: req.requestId,
        eventData
      });

      tags[tagKey].requests.push(req);
    });

    return tags;
  };

  const tags = groupRequestsByTag();
  const tagList = Object.entries(tags);

  // Category counts
  const categoryCounts = {
    analytics: 0,
    advertising: 0,
    social: 0,
    consent: 0,
    other: 0
  };

  tagList.forEach(([_, tag]) => {
    const cat = tag.category || 'other';
    if (categoryCounts[cat] !== undefined) {
      categoryCounts[cat]++;
    } else {
      categoryCounts.other++;
    }
  });

  const toggleExpand = (tagKey) => {
    setExpandedTags(prev => ({ ...prev, [tagKey]: !prev[tagKey] }));
  };

  const getHealthStatus = (tag) => {
    if (tag.errorCount > 0) return 'error';
    if (tag.warningCount > 0) return 'warning';
    return 'success';
  };

  const getHealthColor = (status) => {
    if (status === 'error') return 'bg-red-500';
    if (status === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'analytics': return BarChart3;
      case 'advertising': return Target;
      case 'social': return Globe;
      case 'consent': return ShieldCheck;
      default: return Layers;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'analytics': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'advertising': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'social': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'consent': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {tagList.length} Tags Detected
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Tracking pixels and measurement IDs found on this site
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-3 flex-wrap">
          {Object.entries(categoryCounts).map(([category, count]) => {
            if (count === 0) return null;
            const Icon = getCategoryIcon(category);
            return (
              <div
                key={category}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border",
                  getCategoryColor(category)
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium capitalize">{category}</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tagList.map(([tagKey, tag]) => {
          const isExpanded = expandedTags[tagKey];
          const health = getHealthStatus(tag);
          const eventCount = tag.events.length;
          const uniqueEvents = Object.keys(tag.eventCounts).length;

          return (
            <div
              key={tagKey}
              className={cn(
                "bg-white rounded-xl border transition-all",
                isExpanded ? "border-blue-300 shadow-lg" : "border-slate-200 hover:shadow-md"
              )}
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(tagKey)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <VendorLogo vendorKey={tag.vendor} size="lg" />
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {tag.vendorConfig?.name || tag.vendor}
                      </h4>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {tag.pixelId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      getHealthColor(health)
                    )} />
                    <ChevronRight className={cn(
                      "w-4 h-4 text-slate-400 transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600">{eventCount} events</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm text-slate-600">{uniqueEvents} types</span>
                  </div>
                  {tag.events.some(e => e.hasConsentMode) && (
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs text-purple-600">Consent</span>
                    </div>
                  )}
                </div>

                {/* Event Type Pills */}
                <div className="flex gap-1.5 flex-wrap mt-3">
                  {Object.entries(tag.eventCounts).slice(0, 4).map(([eventName, count]) => (
                    <span
                      key={eventName}
                      className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                    >
                      {eventName} ({count})
                    </span>
                  ))}
                  {Object.keys(tag.eventCounts).length > 4 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                      +{Object.keys(tag.eventCounts).length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  {/* Health Summary */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-slate-600">{tag.successCount} success</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-xs text-slate-600">{tag.warningCount} warnings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs text-slate-600">{tag.errorCount} errors</span>
                    </div>
                  </div>

                  {/* Events List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tag.events.map((event, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white rounded border border-slate-100 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-800">{event.eventName}</span>
                          <div className="flex items-center gap-2">
                            {event.hasConsentMode && (
                              <span className="text-purple-600 flex items-center gap-0.5">
                                <ShieldCheck className="w-3 h-3" />
                              </span>
                            )}
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-xs",
                              event.status >= 200 && event.status < 300
                                ? "bg-green-100 text-green-700"
                                : event.status >= 400
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                            )}>
                              {event.status || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Tracking Params Preview */}
                        {(() => {
                          const trackingParams = filterTrackingParams(event.params);
                          const paramEntries = Object.entries(trackingParams).slice(0, 3);
                          if (paramEntries.length === 0) return null;

                          return (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {paramEntries.map(([key, value]) => (
                                <span
                                  key={key}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-xs border",
                                    getParamCategoryColor(categorizeParam(key))
                                  )}
                                >
                                  {key}={decodeUrl(String(value)).slice(0, 20)}
                                  {String(value).length > 20 && '...'}
                                </span>
                              ))}
                              {Object.keys(trackingParams).length > 3 && (
                                <span className="text-slate-400 text-xs">
                                  +{Object.keys(trackingParams).length - 3}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Category Badge */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border",
                      getCategoryColor(tag.category)
                    )}>
                      {(() => {
                        const Icon = getCategoryIcon(tag.category);
                        return <Icon className="w-3 h-3" />;
                      })()}
                      <span className="capitalize">{tag.category}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {tagList.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Eye className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Tags Detected</h3>
          <p className="text-slate-500">No tracking pixels or measurement IDs were found on this page.</p>
        </div>
      )}
    </div>
  );
};

// --- HOURS SIMULATOR (Time/Cost Calculator) ---
const HoursSimulator = () => {
  const [hoursPerMonth, setHoursPerMonth] = useState(30);
  const [hourlyRate, setHourlyRate] = useState(150);
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [currency, setCurrency] = useState('EUR');

  // Calculations
  const hoursPerYear = hoursPerMonth * 12;
  const annualCostPerPerson = hoursPerYear * hourlyRate;
  const totalAnnualCost = annualCostPerPerson * numberOfPeople;
  const totalHoursPerYear = hoursPerYear * numberOfPeople;

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Presets for common scenarios
  const presets = [
    { label: 'Junior Analyst', hours: 20, rate: 80 },
    { label: 'Senior Analyst', hours: 30, rate: 150 },
    { label: 'Manager', hours: 15, rate: 200 },
    { label: 'Director', hours: 10, rate: 300 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-6 h-6" />
          <h2 className="text-xl font-bold">Simulateur de Temps Perdu</h2>
        </div>
        <p className="text-slate-300 text-sm">
          Calculez le coût interne du temps perdu en analyse manuelle, stress et charge de travail
        </p>
      </div>

      {/* Main Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Paramètres
          </h3>

          {/* Currency Toggle */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              onClick={() => setCurrency('EUR')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1",
                currency === 'EUR' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Euro className="w-4 h-4" /> EUR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1",
                currency === 'USD' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <DollarSign className="w-4 h-4" /> USD
            </button>
          </div>

          {/* Hours per month */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Heures perdues par mois (par personne)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="80"
                value={hoursPerMonth}
                onChange={(e) => setHoursPerMonth(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-lg min-w-[100px]">
                <input
                  type="number"
                  value={hoursPerMonth}
                  onChange={(e) => setHoursPerMonth(Number(e.target.value))}
                  className="w-12 bg-transparent text-right font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-slate-500 text-sm">h/mois</span>
              </div>
            </div>
          </div>

          {/* Hourly rate */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Taux horaire chargé
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="500"
                step="10"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-lg min-w-[120px]">
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-16 bg-transparent text-right font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-slate-500 text-sm">{currency}/h</span>
              </div>
            </div>
          </div>

          {/* Number of people */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Nombre de personnes concernées
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5, 10].map(num => (
                <button
                  key={num}
                  onClick={() => setNumberOfPeople(num)}
                  className={cn(
                    "w-12 h-10 rounded-lg font-bold transition-all",
                    numberOfPeople === num
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {num}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="100"
                value={numberOfPeople}
                onChange={(e) => setNumberOfPeople(Math.max(1, Number(e.target.value)))}
                className="w-16 h-10 px-3 rounded-lg border border-slate-200 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Profils prédéfinis
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setHoursPerMonth(preset.hours);
                    setHourlyRate(preset.rate);
                  }}
                  className="p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-900">{preset.label}</span>
                  <span className="text-xs text-slate-500 block">
                    {preset.hours}h/mois • {preset.rate}{currency}/h
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Per Person Results */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-wide">
              Par personne
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-slate-600">Heures par an</span>
                <span className="text-2xl font-bold text-slate-900">{hoursPerYear}h</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600">Coût annuel</span>
                <span className="text-2xl font-bold text-amber-600">{formatCurrency(annualCostPerPerson)}</span>
              </div>
            </div>
          </div>

          {/* Total Results (when multiple people) */}
          {numberOfPeople > 1 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
              <h3 className="text-sm font-medium text-red-600 mb-4 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Impact total ({numberOfPeople} personnes)
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-red-100">
                  <span className="text-red-700">Heures totales par an</span>
                  <span className="text-2xl font-bold text-red-900">{totalHoursPerYear.toLocaleString('fr-FR')}h</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-red-700">Coût total annuel</span>
                  <span className="text-3xl font-bold text-red-600">{formatCurrency(totalAnnualCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Single person big result */}
          {numberOfPeople === 1 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
              <h3 className="text-sm font-medium text-amber-700 mb-2 uppercase tracking-wide">
                Coût caché annuel
              </h3>
              <div className="text-4xl font-bold text-amber-600 mb-2">{formatCurrency(totalAnnualCost)}</div>
              <p className="text-sm text-amber-700">
                {hoursPerMonth}h/mois × 12 mois × {formatCurrency(hourlyRate)}/h
              </p>
            </div>
          )}

          {/* Insight Card */}
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">Ce que cela représente</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {Math.round(totalHoursPerYear / 8)} jours de travail perdus par an</li>
                  <li>• {Math.round(totalHoursPerYear / 40)} semaines à temps plein</li>
                  <li>• Temps non consacré à l'analyse stratégique et l'innovation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-slate-900 p-5 rounded-xl text-white">
            <h4 className="font-bold mb-2">Réduisez ce coût avec Tag Insight</h4>
            <p className="text-sm text-slate-300 mb-4">
              Automatisez l'audit de vos tags et récupérez ce temps pour des activités à forte valeur ajoutée.
            </p>
            <button className="w-full bg-white text-slate-900 py-2 rounded-lg font-bold hover:bg-slate-100 transition-colors">
              Démarrer un scan
            </button>
          </div>
        </div>
      </div>

      {/* Formula breakdown */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <p className="text-center text-slate-600 text-sm">
          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 mr-2">
            {hoursPerMonth}h × 12 mois = {hoursPerYear}h/an
          </span>
          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">
            {hoursPerYear}h × {formatCurrency(hourlyRate)}/h = {formatCurrency(annualCostPerPerson)}/an
          </span>
          {numberOfPeople > 1 && (
            <span className="font-mono bg-red-50 px-2 py-1 rounded border border-red-200 ml-2">
              × {numberOfPeople} = {formatCurrency(totalAnnualCost)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

// --- REVERSE REPORT PAGE (Main audit view matching screenshots) ---
const ReverseReportPage = ({ results, onNewScan }) => {
  const [activeTab, setActiveTab] = useState('requests'); // Default to requests tab now
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedIssues, setExpandedIssues] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [aiResults, setAiResults] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [aiSlider, setAiSlider] = useState({ open: false, vendorKey: null });
  const [showExportModal, setShowExportModal] = useState(false);

  // Function to analyze with AI
  const analyzeWithAI = async (vendorKey) => {
    if (!results?.solutions?.[vendorKey]) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Get the raw requests for this vendor
      const solution = results.solutions[vendorKey];
      const vendorRequests = results.requests.filter(req => {
        const domain = req.domain?.toLowerCase() || '';
        const config = VENDOR_CONFIG[vendorKey];
        return config?.domains.some(d => domain.includes(d));
      });

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: vendorRequests,
          vendor: vendorKey
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Analysis failed');
      }

      // Store AI results
      setAiResults(prev => ({
        ...prev,
        [vendorKey]: data
      }));

      // Automatically open the AI slider to show results
      setAiSlider({ open: true, vendorKey });

      console.log(`[AI Analysis] ${vendorKey} complete:`, data);
    } catch (error) {
      console.error('[AI Analysis] Error:', error);
      setAnalysisError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <FileText className="w-16 h-16 text-slate-200 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Report Data</h3>
        <p className="text-slate-500 mb-6">Run a scan to generate a reverse report</p>
        <button onClick={onNewScan} className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800">
          Start New Scan
        </button>
      </div>
    );
  }

  const solutions = Object.entries(results.solutions || {});
  const currentSolution = selectedSolution ? results.solutions[selectedSolution] : null;

  // Toggle expanded state for issue cards
  const toggleIssueExpand = (issueKey) => {
    setExpandedIssues(prev => ({
      ...prev,
      [issueKey]: !prev[issueKey]
    }));
  };

  // Generate grouped issues from actual data - includes full event details with URLs
  // Now returns bySeverity structure for the new UI
  const generateGroupedIssues = () => {
    const bySeverity = {
      critical: [],
      important: [],
      optimization: []
    };
    const errors = {};
    const warnings = {};

    solutions.forEach(([key, solution]) => {
      // Check if AI results have bySeverity data
      const aiData = aiResults?.[key];
      if (aiData?.problem_diagnosis?.bySeverity) {
        // Use AI-generated severity grouping
        const pd = aiData.problem_diagnosis.bySeverity;
        ['critical', 'important', 'optimization'].forEach(sev => {
          pd[sev]?.forEach(issue => {
            const existingIdx = bySeverity[sev].findIndex(i =>
              i.ruleId === issue.ruleId || (!issue.ruleId && i.type === issue.type && i.field === issue.field)
            );
            if (existingIdx === -1) {
              bySeverity[sev].push({
                ...issue,
                affectedEvents: issue.affectedEvents || []
              });
            }
          });
        });
      }

      // Also process events for legacy format and to augment severity data
      solution.events?.forEach(event => {
        event.issues?.forEach(issue => {
          // Determine severity key
          const severityKey = issue.severityMeta?.level ||
            (issue.severity === 'error' || issue.severity === 'critical' ? 'critical' :
              issue.severity === 'warning' ? 'important' : 'optimization');

          const groupKey = issue.ruleId || `${issue.type}:${issue.field || 'general'}`;

          // Add to bySeverity if not already present from AI data
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
              severityMeta: issue.severityMeta,
              message: issue.message,
              description: issue.description,
              recommendation: issue.recommendation,
              docUrl: issue.docUrl,
              scoreDeduction: issue.scoreDeduction,
              count: 0,
              label: '',
              affectedEvents: []
            };
            bySeverity[severityKey].push(existingGroup);
          }

          // Only increment if this event isn't already in the affected list
          const eventAlreadyAdded = existingGroup.affectedEvents.some(e => e.event_id === event.event_id);
          if (!eventAlreadyAdded) {
            existingGroup.count++;
            existingGroup.affectedEvents.push({
              event_id: event.event_id,
              event_name: event.event_name,
              url: event.page_url || event.url,
              request_url: event.url,
              timestamp: event.timestamp,
              solution_name: solution.solution_name,
              vendor_key: key,
              status: event.status,
              raw_request: event.raw_request,
              parameters: event.parameters
            });
          }

          // Legacy grouping for backward compatibility
          const legacyGroups = issue.severity === 'error' || severityKey === 'critical' ? errors : warnings;
          if (!legacyGroups[groupKey]) {
            legacyGroups[groupKey] = {
              type: issue.type,
              field: issue.field,
              severity: issue.severity,
              ruleId: issue.ruleId,
              message: issue.message,
              description: issue.description,
              recommendation: issue.recommendation,
              docUrl: issue.docUrl,
              scoreDeduction: issue.scoreDeduction,
              count: 0,
              label: '',
              affected_event_ids: [],
              affected_events: []
            };
          }
          legacyGroups[groupKey].count++;
          legacyGroups[groupKey].affected_event_ids.push(event.event_id);
          legacyGroups[groupKey].affected_events.push({
            event_id: event.event_id,
            event_name: event.event_name,
            url: event.page_url || event.url,
            request_url: event.url,
            timestamp: event.timestamp,
            solution_name: solution.solution_name,
            vendor_key: key,
            status: event.status,
            raw_request: event.raw_request,
            parameters: event.parameters
          });
        });
      });
    });

    // Generate labels
    const formatLabel = (group) => {
      if (group.ruleId && group.message) {
        return `${group.ruleId}: ${group.message}`;
      }
      const count = group.count;
      const eventWord = count === 1 ? 'event' : 'events';
      if (group.type === 'missing_parameter') {
        return `${count} ${eventWord} missing ${group.field || 'required parameter'}`;
      }
      if (group.type === 'malformed_value') {
        return `${count} ${eventWord} with invalid ${group.field || 'value'}`;
      }
      if (group.type === 'rule_violation' && group.message) {
        return group.message;
      }
      return `${count} ${eventWord} with ${group.type} issues`;
    };

    // Apply labels to all groups
    Object.keys(bySeverity).forEach(sev => {
      bySeverity[sev].forEach(g => { g.label = formatLabel(g); });
    });

    return {
      bySeverity,
      errors: Object.values(errors).map(g => ({ ...g, label: formatLabel(g) })),
      warnings: Object.values(warnings).map(g => ({ ...g, label: formatLabel(g) }))
    };
  };

  const groupedIssues = generateGroupedIssues();

  // Get effective data - use AI results if available, otherwise use client-side scoring
  const getEffectiveSolution = (vendorKey) => {
    if (aiResults?.[vendorKey]) {
      return aiResults[vendorKey];
    }
    return results.solutions[vendorKey];
  };

  // Filter events by search
  const filterEvents = (events) => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(e =>
      e.event_name.toLowerCase().includes(query) ||
      e.url?.toLowerCase().includes(query)
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Audit Slider */}
      <AIAuditSlider
        isOpen={aiSlider.open}
        onClose={() => setAiSlider({ open: false, vendorKey: null })}
        aiData={aiSlider.vendorKey ? aiResults?.[aiSlider.vendorKey] : null}
        vendorKey={aiSlider.vendorKey}
      />

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        results={results}
        aiResults={aiResults}
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reverse Report</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500">{results.url}</p>
            {results.siteType && <SiteTypeBadge siteType={results.siteType} />}
          </div>
          {/* Compact Journey Timeline */}
          {results.journey && results.journey.length > 0 && (
            <div className="mt-3">
              <JourneyTimeline journey={results.journey} requests={results.requests} compact />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewScan}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" /> New Scan
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export as PDF
          </button>
        </div>
      </div>

      {/* Full Journey Timeline */}
      {results.journey && results.journey.length > 0 && (
        <JourneyTimeline journey={results.journey} requests={results.requests} />
      )}

      {/* Analysis Error */}
      {analysisError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">AI Analysis Error</p>
            <p className="text-sm text-red-600">{analysisError}</p>
          </div>
          <button onClick={() => setAnalysisError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Analysis Loading */}
      {isAnalyzing && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-4">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <div>
            <p className="font-semibold text-blue-800">Analyzing with Claude AI...</p>
            <p className="text-sm text-blue-600">This may take a few moments</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {['requests', 'tag-detection', 'site-health', 'solutions-audit', 'issues-diagnosis'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab === 'requests' && <Activity className="w-4 h-4" />}
              {tab === 'tag-detection' && <Eye className="w-4 h-4" />}
              {tab === 'requests' ? `All Requests (${results.requests?.length || 0})` :
                tab === 'tag-detection' ? 'Tag Detection' :
                  tab === 'site-health' ? 'Site Health' :
                    tab === 'solutions-audit' ? 'Solutions Audit' :
                      'Issues Diagnosis'}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Tab - NEW */}
      {activeTab === 'requests' && (
        <RequestBrowser
          requests={results.requests}
          selectedRequest={selectedRequest}
          onSelectRequest={setSelectedRequest}
        />
      )}

      {/* Tag Detection Tab */}
      {activeTab === 'tag-detection' && (
        <TagDetectionView results={results} />
      )}

      {/* Site Health Tab */}
      {activeTab === 'site-health' && (
        <div className="space-y-6">
          {/* Score + Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            {/* Score Gauge */}
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-4">
                <ScoreGauge score={results.overall.score} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-500 text-xs mb-1">Site Score</p>
                  <p className={cn("text-lg font-bold truncate", getScoreColor(results.overall.score))}>
                    {results.overall.score_label}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <StatCard label="Success" value={results.overall.success_count} color="green" />
            <StatCard label="Warnings" value={results.overall.warning_count} color="yellow" />
            <StatCard label="Errors" value={results.overall.error_count} color="red" />
          </div>

          {/* Detected Solutions */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Detected solutions ({solutions.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {solutions.map(([key, solution]) => {
                // Use AI results if available
                const aiData = aiResults?.[key];
                const displayScore = aiData?.score ?? solution.score;
                const displayEvents = aiData?.events_audited ?? solution.events_audited;
                const displaySuccess = aiData?.success_count ?? solution.event_success_count;
                const displayWarning = aiData?.warning_count ?? solution.event_warning_count;
                const displayError = aiData?.error_count ?? solution.event_error_count;

                return (
                  <div key={key} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <VendorLogo vendorKey={solution.vendor_key || key} size="lg" />
                        <div>
                          <h4 className="font-bold text-slate-900">{aiData?.solution_name || solution.solution_name}</h4>
                          <p className="text-xs text-slate-500">{displayEvents} events</p>
                        </div>
                      </div>
                      {aiData && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">AI</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-500">Score</p>
                        <p className={cn("text-2xl font-bold", getScoreColor(displayScore))}>
                          {displayScore}<span className="text-slate-400 text-sm">/100</span>
                        </p>
                      </div>
                      <ScoringCircles
                        success={displaySuccess}
                        warning={displayWarning}
                        error={displayError}
                      />
                    </div>

                    {/* AI Analysis Status with details */}
                    {aiData && (
                      <div
                        className="mb-3 p-3 bg-purple-50 border border-purple-100 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => setAiSlider({ open: true, vendorKey: key })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Zap className="w-4 h-4 text-purple-500" />
                              <span className="text-xs font-semibold text-purple-700">AI Analysis Complete</span>
                            </div>
                            <p className="text-xs text-purple-600">{aiData.score_label} - {aiData.events?.length || 0} events analyzed</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-purple-400" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedSolution(key);
                          setActiveTab('solutions-audit');
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                      >
                        View Audit
                      </button>
                      {aiData ? (
                        <>
                          <button
                            onClick={() => setAiSlider({ open: true, vendorKey: key })}
                            className="flex-1 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> AI Report
                          </button>
                          <button
                            onClick={() => analyzeWithAI(key)}
                            disabled={isAnalyzing}
                            className="px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm font-medium"
                            title="Re-analyze with AI"
                          >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => analyzeWithAI(key)}
                          disabled={isAnalyzing}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1",
                            isAnalyzing
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-purple-600 text-white hover:bg-purple-700"
                          )}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-3 h-3" /> AI Audit
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Issues - Top issues from severity groupings */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Main issues</h3>
            <div className="space-y-3">
              {/* Show top 3 critical issues */}
              {groupedIssues.bySeverity?.critical?.slice(0, 3).map((issue, i) => (
                <IssueCard
                  key={`critical-${i}`}
                  issue={issue}
                  isExpanded={expandedIssues[`overview-critical-${i}`]}
                  onToggle={() => toggleIssueExpand(`overview-critical-${i}`)}
                  results={results}
                />
              ))}
              {/* Show top 2 important issues if no critical */}
              {(!groupedIssues.bySeverity?.critical?.length) && groupedIssues.bySeverity?.important?.slice(0, 2).map((issue, i) => (
                <IssueCard
                  key={`important-${i}`}
                  issue={issue}
                  isExpanded={expandedIssues[`overview-important-${i}`]}
                  onToggle={() => toggleIssueExpand(`overview-important-${i}`)}
                  results={results}
                />
              ))}
              {/* No issues - all good */}
              {!groupedIssues.bySeverity?.critical?.length && !groupedIssues.bySeverity?.important?.length && !groupedIssues.bySeverity?.optimization?.length && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-slate-700">All tracking parameters validated successfully</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Solutions Audit Tab */}
      {activeTab === 'solutions-audit' && (
        <div className="space-y-6">
          {/* Solution selector */}
          {!selectedSolution && (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">Select a solution to view detailed audit</p>
              <div className="flex justify-center gap-4 flex-wrap">
                {solutions.map(([key, solution]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedSolution(key)}
                    className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <VendorLogo vendorKey={solution.vendor_key || key} size="sm" />
                    <span className="font-medium">{solution.solution_name}</span>
                    <span className={cn("font-bold", getScoreColor(solution.score))}>{solution.score}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Solution Details */}
          {currentSolution && (
            <>
              {/* Solution Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <VendorLogo vendorKey={currentSolution.vendor_key || selectedSolution} size="xl" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{currentSolution.solution_name}</h3>
                    <p className="text-sm text-slate-500">{currentSolution.pixel_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center px-4">
                    <p className="text-sm text-slate-500">Events</p>
                    <p className="text-xl font-bold text-slate-900">{currentSolution.events_audited}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm text-slate-500">Score</p>
                    <p className={cn("text-xl font-bold", getScoreColor(currentSolution.score))}>
                      {currentSolution.score}/100
                    </p>
                  </div>
                  <ScoringCircles
                    success={currentSolution.event_success_count}
                    warning={currentSolution.event_warning_count}
                    error={currentSolution.event_error_count}
                  />
                  <button
                    onClick={() => setSelectedSolution(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    Back to All
                  </button>
                </div>
              </div>

              {/* Events Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium flex items-center gap-2">
                    <VendorLogo vendorKey={currentSolution.vendor_key || selectedSolution} size="sm" className="w-4 h-4" />
                    {currentSolution.solution_name}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-blue-900"
                      onClick={() => setSelectedSolution(null)}
                    />
                  </div>
                </div>

                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Solution</th>
                      <th className="px-6 py-3">Event</th>
                      <th className="px-6 py-3">URL</th>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Scoring</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filterEvents(currentSolution.events).map((event, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setDetailModal(event)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <VendorLogo vendorKey={currentSolution.vendor_key || selectedSolution} size="sm" />
                            <div>
                              <p className="font-medium text-slate-900">{currentSolution.solution_name}</p>
                              <p className="text-xs text-slate-400">{currentSolution.pixel_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <EventStatusBadge status={event.event_name} />
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                          {event.page_url || event.url}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(event.timestamp).toLocaleDateString()}
                          <br />
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4">
                          <ScoringCircles
                            success={event.scoring.success_count}
                            warning={event.scoring.warning_count}
                            error={event.scoring.error_count}
                            size="small"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Issues Diagnosis Tab - NEW: Inline expandable cards grouped by severity */}
      {activeTab === 'issues-diagnosis' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            {/* Diagnosis Stats - Now shows 4 columns */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard label="Critical" value={groupedIssues.bySeverity?.critical?.length || 0} color="red" />
              <StatCard label="Important" value={groupedIssues.bySeverity?.important?.length || 0} color="yellow" />
              <StatCard label="Optimization" value={groupedIssues.bySeverity?.optimization?.length || 0} color="blue" />
              <StatCard label="Success" value={results.overall.success_count} color="green" />
            </div>

            {/* Severity Filter Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {[
                {
                  key: 'all',
                  label: 'All Issues',
                  count: (groupedIssues.bySeverity?.critical?.length || 0) +
                    (groupedIssues.bySeverity?.important?.length || 0) +
                    (groupedIssues.bySeverity?.optimization?.length || 0)
                },
                { key: 'critical', label: 'Critical', count: groupedIssues.bySeverity?.critical?.length || 0, emoji: '🔴' },
                { key: 'important', label: 'Important', count: groupedIssues.bySeverity?.important?.length || 0, emoji: '🟡' },
                { key: 'optimization', label: 'Optimization', count: groupedIssues.bySeverity?.optimization?.length || 0, emoji: '🔵' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setSeverityFilter(filter.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                    severityFilter === filter.key
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {filter.emoji && <span>{filter.emoji}</span>}
                  {filter.label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-xs",
                    severityFilter === filter.key ? "bg-white/20" : "bg-slate-100"
                  )}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Issues by Severity - Using new inline expandable cards */}
            <div className="space-y-6">
              {(severityFilter === 'all' || severityFilter === 'critical') && (
                <IssueSeveritySection
                  severity="critical"
                  issues={groupedIssues.bySeverity?.critical || []}
                  expandedIssues={expandedIssues}
                  onToggleIssue={toggleIssueExpand}
                  results={results}
                />
              )}

              {(severityFilter === 'all' || severityFilter === 'important') && (
                <IssueSeveritySection
                  severity="important"
                  issues={groupedIssues.bySeverity?.important || []}
                  expandedIssues={expandedIssues}
                  onToggleIssue={toggleIssueExpand}
                  results={results}
                />
              )}

              {(severityFilter === 'all' || severityFilter === 'optimization') && (
                <IssueSeveritySection
                  severity="optimization"
                  issues={groupedIssues.bySeverity?.optimization || []}
                  expandedIssues={expandedIssues}
                  onToggleIssue={toggleIssueExpand}
                  results={results}
                />
              )}

              {/* No Issues State */}
              {(!groupedIssues.bySeverity?.critical?.length &&
                !groupedIssues.bySeverity?.important?.length &&
                !groupedIssues.bySeverity?.optimization?.length) && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                    <h4 className="font-bold text-slate-900 mb-2">No Issues Found</h4>
                    <p className="text-slate-500">All tracking parameters are properly configured</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <VendorLogo vendorKey={currentSolution?.vendor_key || selectedSolution} size="lg" />
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{currentSolution?.solution_name}</h3>
                    <p className="text-sm text-slate-500">{detailModal.event_name}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-sm">
                  Parameters
                </button>
                {detailModal.issues?.length > 0 && (
                  <span className="px-4 py-2 rounded-lg text-red-600 bg-red-50 text-sm font-medium">
                    {detailModal.issues.length} Issue{detailModal.issues.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Success" value={detailModal.scoring.success_count} color="green" />
                <StatCard label="Warnings" value={detailModal.scoring.warning_count} color="yellow" />
                <StatCard label="Errors" value={detailModal.scoring.error_count} color="red" />
              </div>

              {/* Parameters */}
              {detailModal.parameters && detailModal.parameters.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-800 mb-3">Parameters</h4>
                  <div className="space-y-2">
                    {detailModal.parameters.map((param, i) => (
                      <div key={i} className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        param.status === 'success' ? "bg-green-50 border-green-100" :
                          param.status === 'warning' ? "bg-yellow-50 border-yellow-100" :
                            "bg-red-50 border-red-100"
                      )}>
                        <div>
                          <span className="font-medium text-slate-700">{param.name}</span>
                          {param.message && (
                            <p className="text-xs text-slate-500 mt-1">{param.message}</p>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm font-mono",
                          param.value ? "text-slate-600" : "text-slate-400 italic"
                        )}>
                          {param.value || 'missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {detailModal.issues && detailModal.issues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">Issues</h4>
                  <div className="space-y-2">
                    {detailModal.issues.map((issue, i) => (
                      <div key={i} className={cn(
                        "p-3 rounded-lg border",
                        issue.severity === 'error' ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={cn(
                            "w-4 h-4",
                            issue.severity === 'error' ? "text-red-500" : "text-yellow-500"
                          )} />
                          <span className="font-medium text-slate-700">{issue.message}</span>
                        </div>
                        <p className="text-xs text-slate-500 ml-6">{issue.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!detailModal.issues || detailModal.issues.length === 0) && (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-slate-700">No issues found for this event</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- TRACKING PLAN PAGE ---
const TrackingPlanPage = ({ results }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tracking Plan</h2>
        <p className="text-slate-500">Define and validate your tracking implementation</p>
      </div>
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
        <LayoutDashboard className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h3>
        <p className="text-slate-500">Tracking plan validation will be available in a future update.</p>
      </div>
    </div>
  );
};

// --- RESULTS PAGE ---
const ResultsPage = ({ results, onNewScan }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Eye className="w-16 h-16 text-slate-200 mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Scan Results</h3>
        <p className="text-slate-500 mb-6">Run a scan to see tracking analysis</p>
        <button onClick={onNewScan} className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800">
          Start New Scan
        </button>
      </div>
    );
  }

  const filteredRequests = results.requests.filter(req =>
    filterCategory === 'all' || categorizeVendor(req.domain) === filterCategory
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Raw Scan Results</h2>
          <p className="text-slate-500">{results.url}</p>
        </div>
        <button onClick={onNewScan} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800">
          New Scan
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-slate-900">{results.stats.total}</div>
          <div className="text-sm text-slate-500">Total Requests</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-blue-600">{results.stats.byCategory?.analytics || 0}</div>
          <div className="text-sm text-slate-500">Analytics</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-orange-600">{results.stats.byCategory?.advertising || 0}</div>
          <div className="text-sm text-slate-500">Advertising</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-green-600">{results.stats.byCategory?.consent || 0}</div>
          <div className="text-sm text-slate-500">Consent</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'analytics', 'advertising', 'social', 'consent', 'other'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              filterCategory === cat ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Domain</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.map((req, i) => {
              const category = categorizeVendor(req.domain);
              const colors = getCategoryColor(category);
              return (
                <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedRequest(req)}>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.domain}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded text-xs font-bold", colors.bg, colors.text)}>{category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded text-xs font-mono", req.method === 'POST' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600")}>
                      {req.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {req.status ? (
                      <span className={cn("flex items-center gap-1 text-xs font-bold", req.status >= 200 && req.status < 300 ? "text-green-600" : "text-red-600")}>
                        {req.status >= 200 && req.status < 300 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {req.status}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRequest(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedRequest.domain}</h3>
                <p className="text-sm text-slate-500">{selectedRequest.method} Request</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-96">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Full URL</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg font-mono text-xs break-all">{selectedRequest.url}</div>
              </div>
              {selectedRequest.params && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Query Parameters</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-lg font-mono text-xs break-all">{selectedRequest.params}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Remaining pages (simplified) ---
const OverviewPage = ({ results }) => {
  if (!results) return <div className="text-center py-12"><p className="text-slate-500">Run a scan first</p></div>;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border"><div className="text-3xl font-bold">{results.stats.total}</div><div className="text-sm text-slate-500">Total</div></div>
        <StatCard label="Score" value={results.overall?.score || 0} color="green" />
        <StatCard label="Warnings" value={results.overall?.warning_count || 0} color="yellow" />
        <StatCard label="Errors" value={results.overall?.error_count || 0} color="red" />
      </div>
    </div>
  );
};

const VendorAnalysisPage = ({ results }) => {
  if (!results) return <div className="text-center py-12"><p className="text-slate-500">Run a scan first</p></div>;
  const solutions = Object.values(results.solutions || {});
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Vendor Analysis</h2>
      <div className="grid grid-cols-3 gap-4">
        {solutions.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border">
            <h3 className="font-bold">{s.solution_name}</h3>
            <p className={cn("text-2xl font-bold mt-2", getScoreColor(s.score))}>{s.score}/100</p>
            <p className="text-sm text-slate-500">{s.events_audited} events</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConsentModePage = ({ results }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-900">Consent Mode V2</h2>
    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-yellow-600" />
        <p className="text-yellow-800">Consent mode analysis coming soon.</p>
      </div>
    </div>
  </div>
);

const VendorListPage = ({ results }) => {
  if (!results) return <div className="text-center py-12"><p className="text-slate-500">Run a scan first</p></div>;
  const domains = [...new Set(results.requests.map(r => r.domain))];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Vendor List</h2>
      <div className="bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Domain</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Requests</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {domains.map((d, i) => {
              const cat = categorizeVendor(d);
              const colors = getCategoryColor(cat);
              const count = results.requests.filter(r => r.domain === d).length;
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-6 py-3">{d}</td>
                  <td className="px-6 py-3"><span className={cn("px-2 py-1 rounded text-xs font-bold", colors.bg, colors.text)}>{cat}</span></td>
                  <td className="px-6 py-3">{count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CookieScannerPage = ({ results }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-900">Cookie Scanner</h2>
    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600" />
        <p className="text-yellow-800">Full cookie scanning requires browser extension. Network requests shown.</p>
      </div>
    </div>
  </div>
);

export default App;
