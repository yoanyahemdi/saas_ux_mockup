# Scoring & Validation Rules

## Overview

This document defines the scoring methodology for Tag Insight audits, matching the UI mockups with:
- Site health gauge (0-100 score)
- Per-event scoring circles (green/yellow/red)
- Problem diagnosis grouping

---

## Score Calculation

### Overall Solution Score (0-100)

Displayed as a semi-circular gauge with color gradient.

```javascript
// Formula based on EVENT-LEVEL errors and warnings
error_penalty = error_event_count * 10
warning_penalty = warning_event_count * 5
score = max(0, 100 - (error_penalty + warning_penalty))
```

### Score Labels

| Score Range | Label    | Gauge Color     |
|-------------|----------|-----------------|
| 90-100      | High     | Green           |
| 75-89       | Good     | Light Green     |
| 50-74       | Medium   | Yellow          |
| 25-49       | Low      | Orange          |
| 0-24        | Critical | Red             |

---

## Per-Event Scoring

Each event displays 3 colored circles showing parameter validation results:

```
┌─────────────────────────────────────────────────────────────┐
│ Solution name    Status      URL           Scoring          │
├─────────────────────────────────────────────────────────────┤
│ Tiktok Ads Pixel Pageview   example.com   (10) (8) (4)     │
│                                            🟢  🟡  🔴       │
└─────────────────────────────────────────────────────────────┘
```

- **Green circle**: `success_count` - Parameters that passed validation
- **Yellow circle**: `warning_count` - Parameters with warnings (minor issues)
- **Red circle**: `error_count` - Parameters with errors (critical issues)

### Per-Event Status Assignment

```
if (error_count > 0) → status = "error"
else if (warning_count > 0) → status = "warning"
else → status = "success"
```

---

## Issue Types

| Type                 | Description                              | Severity  |
|---------------------|------------------------------------------|-----------|
| `missing_parameter` | Required/recommended param not found     | error/warning |
| `malformed_value`   | Parameter exists but format is invalid   | error/warning |
| `duplicate`         | Same event fired multiple times          | error/warning |
| `consent_violation` | Tracking without proper consent          | error |
| `attribution_break` | Missing attribution data                 | warning |
| `inaccessible_page` | Page couldn't be crawled                 | error |
| `missing_metadata`  | Missing page metadata                    | warning |

---

## Severity Rules

### Error Severity (Critical Issues)

Assign `severity: "error"` when:
- Missing **REQUIRED** parameter for the event type
- Duplicate **revenue/conversion** events (inflates metrics)
- Completely invalid parameter format (non-numeric value, invalid currency)
- Missing event_id on Purchase events (CAPI deduplication breaks)
- Consent violation in GDPR regions

### Warning Severity (Minor Issues)

Assign `severity: "warning"` when:
- Missing **RECOMMENDED** parameter
- Minor format issues (lowercase currency code)
- Duplicate non-conversion events
- Missing optional attribution data

---

## Parameter Validation Rules

### Currency Codes

```
✅ SUCCESS: "USD", "EUR", "GBP" (3-letter ISO 4217 uppercase)
⚠️ WARNING: "usd", "eur" (lowercase but parseable)
❌ ERROR:   "usd123", "dollar", "€" (invalid format)
```

### Numeric Values

```
✅ SUCCESS: 123.45, "123.45", 0
⚠️ WARNING: -50 (negative value)
❌ ERROR:   "abc", null (when required)
```

### Event ID (Deduplication)

```
✅ SUCCESS: Unique string present
⚠️ WARNING: Missing on non-Purchase events
❌ ERROR:   Missing on Purchase events
```

---

## Duplicate Detection

Events are duplicates if ALL conditions match:
1. Same `event_name`
2. Timestamp difference < 100ms
3. Identical critical parameters (value, currency, product IDs)

### Duplicate Severity

- **error**: Purchase, CompletePayment (revenue events)
- **warning**: PageView, AddToCart, ViewContent

---

## Vendor-Specific Rules

### Facebook Pixel

| Event           | Required                              | Recommended                    |
|-----------------|---------------------------------------|--------------------------------|
| Purchase        | value, currency, content_ids          | content_type, num_items, event_id |
| AddToCart       | content_ids, value, currency          | content_type                   |
| ViewContent     | content_ids                           | content_type, value, currency  |
| InitiateCheckout| content_ids, value, currency          | content_type, num_items        |
| PageView        | -                                     | fbp                            |

### Google Analytics 4

| Event           | Required                              | Recommended                    |
|-----------------|---------------------------------------|--------------------------------|
| purchase        | transaction_id, value, currency       | items, coupon, shipping, tax   |
| add_to_cart     | items                                 | value, currency                |
| view_item       | items                                 | value, currency                |
| begin_checkout  | items                                 | value, currency, coupon        |
| page_view       | -                                     | page_title, page_location      |

### TikTok Pixel

| Event           | Required                              | Recommended                    |
|-----------------|---------------------------------------|--------------------------------|
| CompletePayment | value, currency, contents             | content_type, event_id         |
| AddToCart       | contents                              | value, currency, content_type  |
| ViewContent     | contents                              | value, currency, content_type  |
| InitiateCheckout| contents, value, currency             | content_type                   |
| Pageview        | -                                     | -                              |

---

## UI Display Mapping

### Site Health Section

```
┌────────────────────────────────────────────────────────┐
│  ┌──────────┐    ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │    94    │    │ Success │ │Warnings │ │ Errors  │  │
│  │   /100   │    │   102   │ │   23    │ │    7    │  │
│  │   High   │    │   🟢    │ │   🟡    │ │   🔴    │  │
│  └──────────┘    └─────────┘ └─────────┘ └─────────┘  │
└────────────────────────────────────────────────────────┘
```

### Problem Diagnosis Tab

```
┌────────────────────────────────────────────────────────┐
│  All  17  │  Success  11  │  Warnings  4  │  Errors  2 │
├────────────────────────────────────────────────────────┤
│ Error type                                             │
│ ⚠️ 2 pages couldn't be crawled          [Learn more]  │
│ ⚠️ 1 page inaccessible (404, 500)       [Learn more]  │
│                                                        │
│ Error type                                             │
│ ⚠️ 2 pages with missing metadata        [Learn more]  │
│ ⚠️ 3 issues with low CTR                [Learn more]  │
└────────────────────────────────────────────────────────┘
```

### Event Detail Modal

```
┌────────────────────────────────────────────────────────┐
│  Tiktok Ads Pixel                              ✕      │
│  CNA6VGRC77UDPR9TDDP0                                 │
├────────────────────────────────────────────────────────┤
│  [View Content]  [Problem diagnosis]   [Voir V2]      │
├────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ Success │  │Warnings │  │ Errors  │               │
│  │   11    │  │    4    │  │    2    │               │
│  └─────────┘  └─────────┘  └─────────┘               │
├────────────────────────────────────────────────────────┤
│  All issues                                            │
│  [All 17] [Success 11] [Warnings 4] [Errors 2]        │
│                                                        │
│  Error type                                            │
│  ⚠️ 2 pages couldn't be crawled          [Learn more] │
└────────────────────────────────────────────────────────┘
```

---

## Validation Checklist

Before returning audit results, verify:

- [ ] `success_count + warning_count + error_count = events_audited`
- [ ] Each event status matches most severe issue
- [ ] Per-event scoring sums equal total parameters checked
- [ ] All timestamps are ISO 8601 format
- [ ] Issue labels are human-readable
- [ ] All required fields present per output_format.json
