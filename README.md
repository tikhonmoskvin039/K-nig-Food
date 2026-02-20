# König Food - Database-Free eCommerce for Virtual Food Delivery Market

**König Food** is a **database-free, self-hosted eCommerce solution for selling Virtual Food products** (digital downloads, WordPress themes, plugins, ebooks, software, etc.) built with **Next.js 16, TypeScript, Tailwind CSS, and Redux**. It's optimized for **small stores** with up to **200 products**, making it ideal for **independent developers and small business owners** who want to sell some products online **without monthly SaaS fees** like Shopify, Snipcart, or Medusa.


## Features
- **Virtual Products Only** – Designed specifically for selling digital downloads (themes, plugins, ebooks, software, courses).
- **No Database Required** – Products are stored in JSON files.
- **Fast & Lightweight** – Built with Next.js and optimized for performance.
- **Dynamic Category Pages** – Automatic category pages at `/products/{category-slug}` with SEO-friendly URLs (e.g., "WordPress Themes" → `/products/wordpress-themes`).
- **Payment Methods**
- **Secure Digital Downloads**
- **Product Demos** – Add demo URLs to let customers preview themes, plugins, or products before purchasing.
- **Newsletter Integration (MailChimp)** – Capture leads via a newsletter signup connected to your MailChimp list.
- **Contact Form with Google reCAPTCHA v3** – Protects your inbox from spam while collecting user inquiries.
- **Order Processing via Email (Gmail SMTP)** – Uses Gmail SMTP to send order notifications to admins and customers.
- **SEO Optimized** – Fast, indexable product pages with automatic static generation.
- **Deploy Anywhere** – Works on Vercel or any static hosting.  

---

## Why Choose König Food?  
- **Zero Cost** – 100% Free & Open-Source  
- **No Vendor Lock-in** – Self-host your store, full control over your data  
- **Ideal for Developers** – Modify, extend, or integrate with any service

---

## Tech Stack
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Redux
- **Storage**: JSON-based file system (No DB required)
- **Payment Methods**:

---

## Getting Started  

### Clone the Repository
```sh
git clone https://github.com/tikhonmoskvin039/K-nig-Food.git
cd K-nig-Food
```

### Install Dependencies
```sh
pnpm install
```

### Configuration

**/configs/products.json** - Contains all the product data for your store. Each product includes fields like:
- ID, Title, Slug, ShortDescription, LongDescription
- RegularPrice, SalePrice, Currency, FeatureImageURL
- ProductImageGallery, Category

This file is the source of truth for product listings shown on the site and is fully editable without a database. Perfect for managing WordPress themes, plugins, ebooks, digital assets, and other virtual products.

**/configs/locale.en.json** - Manages all localized content for your store’s interface including:
- UI labels (buttons, messages)
- Navigation menu items
- Footer and contact info
- Social media links
- Homepage and About page content

Use this to customize language, structure, and brand messaging across your storefront.

**/configs/checkout.json** - Defines all settings related to the checkout experience:

This file allows you to customize your checkout options without any backend logic. Perfect for enabling/disabling payment methods.

**/configs/homepage.json** - Controls which sections are displayed on your homepage:
- **Banner**: Show/hide the hero banner section
- **Recent Products**: Show/hide recent products section and configure how many products to display (default: 3)
- **Brand Story**: Show/hide the brand story/about section
- **Testimonials**: Show/hide customer testimonials section
- **Newsletter**: Show/hide newsletter signup section
- **Brands/Partners**: Show/hide brands/partners section

This file allows you to customize your homepage layout without touching code. Simply set `"enabled": false` to hide any section, or adjust `"count"` for recent products.

Example:
```json
{
  "banner": { "enabled": true },
  "recentProducts": { "enabled": true, "count": 6 },
  "brandStory": { "enabled": false },
  "testimonials": { "enabled": true },
  "newsletter": { "enabled": true },
  "brands": { "enabled": false }
}
```

**/configs/products-listing.json** - Controls the products listing page settings:
- **Page Size**: Configure how many products to display per page (default: 18)

This file allows you to customize the pagination behavior on the products listing page without modifying code.

Example:
```json
{
  "pageSize": 18
}
```

To show 12 products per page instead, simply change the value to `12`.

**/configs/documentation-pages.json** - Defines all documentation pages displayed at `/documentation`:
- **Dynamic Routing**: Each page becomes accessible at `/documentation/{slug}` (e.g., `/documentation/getting-started`)
- **Content Management**: All page content, titles, descriptions managed in JSON
- **Order Control**: Set display order with the `order` field
- **Markdown Support**: Write content using markdown syntax (headings, lists, links, code blocks, bold, italic)

This file lets you create and manage a complete documentation system without touching any application code.

Example page structure:
```json
[
  {
    "slug": "getting-started",
    "title": "Getting Started",
    "description": "Learn how to set up and run König Food",
    "order": 1,
    "content": "# Getting Started\n\nWelcome to König Food!..."
  }
]
```

Each documentation page includes:
- Automatic breadcrumb navigation back to documentation index
- Previous/Next page navigation at the bottom
- Sidebar showing all documentation pages
- Full markdown rendering (headings, code blocks, lists, links)
- SEO-optimized metadata (title, description)

---

## Config-Only Customization Philosophy

**König Food is designed so you NEVER need to modify application code.** All customization happens through JSON configuration files in the `/configs` folder.

### Why Config-Only?

When you use König Food, the entire application codebase (components, pages, utilities, APIs) remains **unchanged**. You only edit JSON files to customize your store. This approach provides:

1. **Zero Coding Required** – Edit JSON files, no programming knowledge needed
2. **Safe Updates** – Pull latest König Food updates without merge conflicts
3. **Easy Backups** – Just backup the `/configs` folder to save all customizations
4. **Version Control Friendly** – Track configuration changes without code noise
5. **Fast Customization** – Change content, products, settings instantly
6. **No Breaking Changes** – Application updates won't affect your custom content

### Configuration Files Overview

All store customization happens in these files:

- **`configs/products.json`** – Your entire product catalog (add, edit, remove products)
- **`configs/locale.en.json`** – All text content, labels, contact info, navigation, pages
- **`configs/checkout.json`** – Payment method settings (enable/disable)
- **`configs/homepage.json`** – Control which homepage sections appear and how many products to show
- **`configs/products-listing.json`** – Set page size for products listing page (default: 18 products per page)
- **`configs/documentation-pages.json`** – Create and manage documentation pages with markdown content

### How It Works

Instead of editing React components or TypeScript files, you simply:

1. **Add Products**: Edit `configs/products.json` → Products appear instantly
2. **Customize Text**: Edit `configs/locale.en.json` → All UI text updates
3. **Toggle Features**: Edit `configs/homepage.json` → Sections show/hide
4. **Create Docs**: Edit `configs/documentation-pages.json` → New pages available

**Example:** Want to hide the newsletter section and show 6 recent products?

```json
// configs/homepage.json
{
  "recentProducts": { "enabled": true, "count": 6 },
  "newsletter": { "enabled": false }
}
```

**That's it!** No code changes, no rebuilding, no complexity.

### Benefits for Store Owners

- **Non-technical users** can manage the entire store
- **Developers** can update the app without affecting store content
- **Agencies** can deliver the same codebase to multiple clients
- **Updates** are just a `git pull` away without breaking customizations

This is what makes König Food perfect for small businesses and developers who want full control without complexity.

---

**/.env.local** – Stores sensitive environment variables and runtime configuration for your store:

- **Newsletter (Mailchimp)**  
  - `MAILCHIMP_API_KEY` – Your Mailchimp API key  
  - `MAILCHIMP_AUDIENCE_ID` – ID of your Mailchimp Audience/List  
  - `MAILCHIMP_SERVER_PREFIX` – Server prefix from your Mailchimp account (e.g., `us19`, `us8`)

- **Google reCAPTCHA v3**  
  - `RECAPTCHA_SECRET_KEY` – Server-side reCAPTCHA key  
  - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` – Client-side reCAPTCHA key  

- **Email Notifications (Gmail SMTP)**
  - `GMAIL_USER` – Your Gmail address (used for sending all emails AND receiving admin notifications)
  - `GMAIL_APP_PASSWORD` – Gmail App Password (NOT your regular password - see setup guide below)

Note: Never commit this file to Git or public repositories.

When deploying to Vercel, add these as Environment Variables in your project's Settings → Environment Variables panel.

---

### Gmail SMTP Setup (For All Emails)

König Food uses **one Gmail account** for all email functionality:
- ✉️ Sends order confirmation emails to customers
- ✉️ Receives admin order notifications (in the same Gmail inbox)
- ✉️ Receives contact form submissions (in the same Gmail inbox)

This is 100% free and allows sending to any email address (up to 500 emails/day).

#### Why Gmail App Password?

Gmail requires an **App Password** instead of your regular password for security. This is a 16-character password that Google generates specifically for apps.

#### How to Get Gmail App Password

**Step 1: Enable 2-Step Verification (Required)**

1. Go to your Google Account: https://myaccount.google.com/
2. Click **Security** in the left sidebar
3. Under "How you sign in to Google", click **2-Step Verification**
4. Follow the steps to enable it (if not already enabled)

**Step 2: Generate App Password**

1. After enabling 2-Step Verification, go to: https://myaccount.google.com/apppasswords
2. You might need to sign in again
3. Under "App passwords", you'll see:
   - **Select app**: Choose "Mail" or "Other (Custom name)" and enter "König Food"
   - **Select device**: Choose "Other (Custom name)" and enter "König Food"
4. Click **Generate**
5. Google will show you a 16-character password like: `abcd efgh ijkl mnop`
6. **Copy this password** - you won't be able to see it again!

**Step 3: Add to .env.local**

```env
GMAIL_USER=yourname@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**That's it!** Just 2 environment variables.

**Important Notes:**
- Use the App Password, NOT your regular Gmail password
- You can keep the spaces in the App Password or remove them (both work)
- `GMAIL_USER` is used for:
  - **Sending** all emails (customer orders, admin notifications, contact forms)
  - **Receiving** admin notifications and contact form submissions (in your Gmail inbox)
- Customer order confirmations are sent TO customers, admin notifications are sent TO yourself
- Gmail allows 500 emails per day on free accounts (more than enough for most stores)

**Email Flow:**
1. **Customer places order** → Customer receives email with download links
2. **Customer places order** → You receive admin notification in your Gmail
3. **Customer submits contact form** → You receive contact form in your Gmail

**Troubleshooting:**

If emails aren't sending:
1. Make sure 2-Step Verification is enabled
2. Make sure you're using an App Password, not your regular password
3. Check the server console for error messages
4. Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` are correctly set in `.env.local`
5. Restart your dev server after changing environment variables

---

### TypeScript Validation
```sh
npx tsc --noEmit
```

### Run the Development Server
```sh
npm run dev
```

Then open http://localhost:3000 in your browser.

### Build for Production
Before running the production server or deploying, you need to build your app:

```sh
npm run build
```

This creates an optimized production build in the `.next` directory.

### Run the Production Server
After building, start the production server:

```sh
npm run start
```

The production build is optimized for performance and should be used for deployment.

**Note:** Always run `npm run build` before `npm run start`. If you get an error about missing `.next` directory, it means you need to build first.

---

## Deployment

König Food is fully compatible with **Vercel**. All configuration files are bundled at build time, eliminating file system dependencies and ensuring seamless deployment across all platforms.

### Deploy to Vercel (Recommended)

Vercel offers the best Next.js hosting experience with zero configuration:

#### Option 1: Deploy via Vercel CLI

```sh
# Install Vercel CLI globally
npm install -g vercel

# Deploy from your project directory
vercel

# Follow the prompts to link your project
# Vercel will auto-detect Next.js and configure everything
```

#### Option 2: Deploy via GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Next.js settings
5. Add environment variables in Project Settings → Environment Variables:
   ```
   GMAIL_USER
   GMAIL_APP_PASSWORD
   MAILCHIMP_API_KEY
   MAILCHIMP_AUDIENCE_ID
   MAILCHIMP_SERVER_PREFIX
   RECAPTCHA_SECRET_KEY
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY
   ```
6. Click "Deploy"

**Build Command:** `npm run build` or `npm run build:vercel`
**Output Directory:** `.next` (auto-detected)
**Install Command:** `npm install` (auto-detected)

---

### Environment Variables for All Platforms

All three platforms require the same environment variables. Add these in your deployment platform's settings:

**Required for Email (Gmail SMTP):**
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**Required for Newsletter (MailChimp):**
```
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_AUDIENCE_ID=your-audience-id
MAILCHIMP_SERVER_PREFIX=us19
```

**Required for Contact Form (Google reCAPTCHA v3):**
```
RECAPTCHA_SECRET_KEY=your-secret-key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Keep sensitive keys (like `GMAIL_APP_PASSWORD`) without this prefix.

---

### Post-Deployment Checklist

After deploying to any platform:

1. **Verify Email Sending:**
   - Test contact form submission
   - Confirm emails arrive in your Gmail inbox

2. **Check Product Images:**
   - Verify all product images load correctly
   - Ensure lightbox functionality works

3. **Test Category Pages:**
   - Visit `/products` and click on category filters
   - Verify category URLs like `/products/wordpress-themes` work

4. **Review Documentation:**
   - Check `/documentation` page loads
   - Test navigation between doc pages

---

### Build Commands Reference

```sh
# Local development
npm run dev

# Build for Vercel (standard Next.js build)
npm run build:vercel

# Generic build (works for Vercel)
npm run build
```

---

### Troubleshooting Deployment

**Build fails with "Cannot find module" errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that all config files exist in `/configs` folder
- Verify `tsconfig.json` is properly configured

**Images not loading:**
- Check that image paths in JSON configs are correct
- Verify images exist in `/public` directory
- Use absolute paths starting with `/` (e.g., `/images/product.jpg`)

**Environment variables not working:**
- Ensure variables are set in deployment platform dashboard
- Redeploy after adding new environment variables
- Check that `NEXT_PUBLIC_` prefix is used for client-side variables

**Emails not sending:**
- Verify Gmail App Password is correct (not regular Gmail password)
- Ensure 2-Factor Authentication is enabled on Gmail account
- Check SMTP credentials are correctly set in environment variables
- Review deployment logs for email sending errors

---

### How It Works
- **Product Listings** – All product data is stored in a flat products.json file. No database or backend is needed for product management.
- **Dynamic Category Pages** – Category pages are automatically generated at build time based on product categories:
  - Each unique category in products.json gets its own page at `/products/{category-slug}`
  - Category names are converted to SEO-friendly slugs: "WordPress Themes" → `/products/wordpress-themes`
  - Uppercase letters converted to lowercase, spaces replaced with hyphens
  - All category pages are statically generated for maximum performance
  - Examples: "Forms" → `/products/forms`, "eCommerce Plugins" → `/products/ecommerce-plugins`
- **Cart & Checkout** – Users add products to a cart, which is managed entirely in the browser using LocalStorage. During checkout, users enter billing info (name and email only) and select a payment method.

### Release Notes

##### Release 1.2.3: Security & UI Improvements (08-Jan-2026)

**Security Fixes:**
- **Fixed Secret Exposure in Build Output** – Resolved critical issue where server-side secrets could be embedded in build artifacts
  - Moved environment variable access from module-level to function-level in all API routes
  - Prevents build-time inlining of sensitive credentials (Gmail passwords, Mailchimp keys)


**UI Improvements:**
- **Conditional Footer Display** – Phone and address now only display if values are provided in `locale.en.json`
  - Empty phone values no longer show "Phone: " label
  - Empty address values no longer show "Address: " label
  - Cleaner footer appearance when contact info is not needed

**Migration Notes:**
- No breaking changes - all changes are backward compatible
- Existing `.env.local` files remain compatible

##### Release 1.2.2: Gmail SMTP Integration (01-Jan-2026)

**Email Service Migration:**
- **Switched from Resend to Gmail SMTP** – No more email service restrictions or domain verification requirements
  - Free tier allows 500 emails/day (sufficient for most stores)
  - Send to any email address without domain verification
  - Uses Gmail App Password for secure authentication
  - Customer emails prioritized (sent first with download links)
  - Admin emails sent 2 seconds later to respect rate limits
- **Rate Limit Handling** – Added 2-second delay between customer and admin emails to prevent Gmail SMTP rate limiting
- **Simplified Setup** – No third-party email service signup required, just use your Gmail account
- **Removed ADMIN_EMAIL** – Simplified configuration to use only `GMAIL_USER` for both sending and receiving
- **Updated Documentation** – Added comprehensive Gmail App Password setup guide with troubleshooting steps

**Technical Improvements:**
- Replaced Resend SDK with nodemailer for Gmail SMTP
- Sequential email sending: customer first (priority), admin second (with delay)
- Enhanced email logging for debugging
- Simplified from 3 email variables to just 2: `GMAIL_USER` and `GMAIL_APP_PASSWORD`
- Admin notifications now sent to the same Gmail account that sends emails

Your support helps me keep this project alive and improve it further.
Thank you! ❤️
