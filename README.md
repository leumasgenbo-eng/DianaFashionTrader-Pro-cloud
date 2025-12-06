# TrouserTrader Pro

A comprehensive inventory and sales management system designed for trouser traders. This application helps track imports, calculate pricing with service charges and taxes, manage daily sales ledgers, and maintain customer relationships with AI-powered WhatsApp messaging.

## Features

*   **Dashboard**: Real-time overview of revenue, inventory value, and sales performance.
*   **Inventory Management**:
    *   Track stock by Brand, Type, Color, Size.
    *   Calculate costs including CFA exchange rates, 5% Service Charge, and 5% Misc Charge.
    *   Configurable VAT/Tax rates.
    *   Bulk stock updates and deletions.
    *   Low stock alerts.
*   **Sales Ledger**:
    *   Record daily sales with automatic stock deduction.
    *   Handle returns and refunds.
    *   Track salesman performance.
    *   Export data to Excel.
*   **Customer Management**:
    *   Track customer spending and preferences.
    *   **AI Integration**: Generate personalized WhatsApp messages for new stock arrivals using Google Gemini.

## Tech Stack

*   React 18
*   TypeScript
*   Tailwind CSS
*   Recharts (Data Visualization)
*   Google GenAI SDK (Gemini)
*   Lucide React (Icons)
*   XLSX (Excel Export)

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and add your Google Gemini API Key:
    ```
    VITE_API_KEY=your_api_key_here
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
