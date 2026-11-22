# 🛒 QuickStore — Mini Checkout & Browser Test Suite

[![Tests Status](https://img.shields.io/badge/playwright-passing-brightgreen.svg)](tests/checkout.spec.js)
[![Track](https://img.shields.io/badge/Hackathon-Fynd%20SDET%20Intern-blue.svg)](https://hackhub-e8264fc8.serverless.boltic.app/)
[![Engine](https://img.shields.io/badge/Playwright-v1.50-green.svg)](https://playwright.dev/)

> **Submission for Fynd Hiring Hackathon (Nov 2026) — SDET Intern Track**  
> Challenge: **Mini Checkout and Browser Test Suite**

---

## 📌 Project Overview

This repository contains a lightweight, responsive, single-page checkout application (**QuickStore**) paired with an automated end-to-end browser test suite built with **Playwright**.

The project fulfills all requirements of the SDET Intern challenge:
1. **Single-Page Checkout:** Two synthetic products with fixed pricing, dynamic cart manipulation, real-time line/order total calculation, required field validation, and confirmation reference generation.
2. **Mistake Handling & Edge Cases:** Blocks empty-cart submissions, blocks missing required inputs, preserves entered customer data on validation failures, and prevents duplicate order confirmations caused by rapid double-clicking.
3. **Automated Browser Test Suite:** Three primary requirement checks and three supplementary edge/risk checks built with web-first assertions, clean-state isolation, and zero arbitrary delays.
4. **Comprehensive Test Plan & Results:** Prioritized risk matrix, manual test logs, defect observations, and full reproduction steps.

---

## 📂 Directory Structure

```text
├── index.html               # Single-page checkout user interface
├── server.js                # Built-in lightweight zero-dependency HTTP server
├── package.json             # NPM dependencies & test execution scripts
├── playwright.config.js     # Playwright configuration (webServer, reporter, projects)
├── TEST_PLAN.md             # Formal Test Plan, Risk Matrix & Manual Test Logs
├── README.md                # Setup, run commands, architecture & evaluation guide
├── src/
│   ├── app.js               # Application logic, cart state & double-click protection
│   └── style.css            # Responsive, accessible modern stylesheet
└── tests/
    └── checkout.spec.js     # Playwright automated test suite (6 robust E2E checks)
```

---

## 🛍️ Synthetic Products Catalog

| Product ID | Product Name | Fixed Price | Features |
| :--- | :--- | :--- | :--- |
| `prod-1` | **Wireless Ergonomic Mouse** | **$45.00** | Dual Bluetooth & 2.4GHz wireless |
| `prod-2` | **Mechanical Gaming Keyboard** | **$75.00** | 75% hot-swappable tactile switches |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18.x or newer recommended)
- **npm** (v9.x or newer)

### 1. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```
Install Playwright browser binaries (Chromium):
```bash
npx playwright install chromium
```

### 2. Run the Web Application
Start the local server:
```bash
npm start
```
The application will be live at: **`http://localhost:3000`**

---

## 🧪 Automated Browser Test Suite

The test suite runs against a live local instance (managed automatically by Playwright's `webServer` lifecycle).

### Run All Tests (Headless)
```bash
npm test
```

### Run Tests in Headed Mode (Watch the Browser Live)
```bash
npm run test:headed
```

### Run Tests with Interactive UI Runner
```bash
npm run test:ui
```

### View Detailed HTML Report & Traces
```bash
npm run test:report
```

---

## 🔍 Automated Test Cases Breakdown

Each test begins from a clean browser state (`beforeEach` navigates to `/`) and relies strictly on Playwright's web-first assertions:

| Test Name | Key Assertions & Verifications |
| :--- | :--- |
| **Check 1: Successful Checkout Produces Confirmation** | Adds items ($45 + $75 = $120), inputs customer name, places order. Asserts confirmation view appears, order reference matches regex `^ORD-\d{8}-[A-Z0-9]+$`, customer name matches, and line items summarize accurately. |
| **Check 2: Missing Field Blocks Checkout & Preserves Input** | Populates optional email and address, leaves required Name blank. Clicks Place Order. Asserts error message appears, confirmation is NOT displayed, and customer's entered email/address are **preserved** (not wiped). |
| **Check 3: Quantity Change Updates Exact Totals** | Adds items, uses `+` button, `-` button, and direct text input. Asserts line totals update ($45 × 3 = $135; $75 × 4 = $300) and order total updates accurately. |
| **Check 4: Empty Cart Blocks Checkout** | Clicks Place Order with an empty cart. Asserts validation banner appears and checkout is prevented while preserving entered name. |
| **Check 5: Rapid Double-Click Protection** | Fires two rapid concurrent click events at "Place Order". Asserts exactly one order confirmation is created with a single reference ID, and button is disabled during submission. |
| **Check 6: Journey Reset / Clean State** | Places an order, then clicks "Place Another Order". Asserts cart is cleared to 0 items and customer fields return to clean initial state. |

---

## 📋 Test Plan & Manual Testing Summary

For the full test plan, risk matrix, and manual test records, see [TEST_PLAN.md](file:///c:/Users/Asus-2025/Downloads/New%20Begin/TEST_PLAN.md).

### Summary of Manual Tests:
- **Empty Cart Manual Check:** Verified empty cart checkout displays warning alert and leaves form inputs untouched. Result: **PASS**.
- **Rapid Double-Click Manual Check:** Verified double-clicking Place Order acquires submission lock immediately, disables button, and creates exactly one confirmation. Result: **PASS**.
- **Defects & Quality Observations:** Whitespace-only name validation was reinforced using `.trim()`, and direct quantity inputs were guarded against `<= 0` values.

---

## 💡 Key Architectural Highlights for Evaluation

1. **Deterministic Double-Click Prevention:**
   The `handlePlaceOrder` handler checks `state.isSubmitting`. If already in progress, additional clicks return immediately. The button is also synchronously disabled and transitions to `"Processing Order..."`.
2. **Form State Preservation:**
   When validation errors occur, form inputs are retained in the DOM. The user does not lose their progress.
3. **No Flaky Sleep Calls:**
   All Playwright checks use auto-retrying web-first locators (`getByTestId`, `toBeVisible`, `toHaveText`).
4. **Self-Contained & Reproducible:**
   Zero external backend, database, or cloud dependencies required. Standard Node.js built-in HTTP server provides instant startup on any operating system.
