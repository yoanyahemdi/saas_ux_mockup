# Product Requirements Document: Tag Insight Crawler

## 1. Overview

This document outlines the requirements for the Tag Insight Crawler, a tool designed to provide visibility into the data collection practices of websites, with a focus on web analytics, advertising technology (AdTech), and Consent Management Platforms (CMPs).

## 2. Problem Statement

Website owners and developers often lack a clear understanding of the data being collected by third-party tags implemented on their sites. This lack of visibility can lead to privacy compliance issues (GDPR, CCPA), performance degradation, and data leakage.

## 3. MVP Features

The Minimum Viable Product (MVP) will focus on providing a simple, easy-to-use interface for crawling a single URL and inspecting the network requests initiated by the page.

### 3.1. URL Submission

- A single web page with a form field to input a URL.
- A "Crawl" button to initiate the crawling process.

### 3.2. Crawler

- The crawler will navigate to the submitted URL using a headless browser.
- It will intercept and record all network requests made by the page.
- The crawler will specifically identify and categorize requests related to:
    - **Web Analytics:** Google Analytics, Adobe Analytics, etc.
    - **AdTech:** Google Ads, Facebook Pixel, etc.
    - **CMPs:** OneTrust, TrustArc, etc.

### 3.3. Results Display

- A dedicated results page to display the collected network requests.
- The results will be presented in a table with the following columns:
    - **Domain:** The domain of the request.
    - **Method:** The HTTP method (GET, POST, etc.).
    - **Status:** The HTTP status code.
    - **Payload:** The data sent in the request body.
    - **Parameters:** The query string parameters.
- The results page will allow for basic filtering and searching of the collected requests.

## 4. Technical Stack

- **Frontend:** HTML, CSS, JavaScript (potentially with a simple framework like Vue.js or React).
- **Backend:** Node.js with Express.js for the web server and browserless.io for the crawling functionality.
- **Deployment:** TBD

## 5. Future Enhancements

-   Crawling multiple pages of a website.
-   Simulating different user interactions (e.g., cookie consent).
-   Providing more detailed analysis and insights into the collected data.
-   Scheduled crawls and reporting.
-   User accounts and project management.
