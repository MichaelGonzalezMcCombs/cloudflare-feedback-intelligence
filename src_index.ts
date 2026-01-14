/* eslint-disable @typescript-eslint/no-unused-vars */
// Cloudflare Worker entrypoint for the Cloudflare Feedback Intelligence dashboard.
// - Serves static assets from /public
// - Exposes /api/* endpoints returning mock data (and a placeholder AI call)

// Minimal Fetcher typing to keep this file self-contained
type Fetcher = { fetch: (request: Request) => Promise<Response> };

export interface Env {
  // Provided by Wrangler when using `assets` in wrangler.jsonc
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/feedback") {
      return new Response(JSON.stringify(generateMockFeedback()), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/api/insights") {
      return new Response(JSON.stringify(generateMockInsights()), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Cloudflare Feedback Intelligence Worker running.", {
      headers: { "Content-Type": "text/plain" }
    });
  }
};

function generateMockFeedback() {
  const products = [
    "Application Security",
    "Zero Trust Access",
    "Network Performance",
    "Developer Platform",
    "Analytics & Logs"
  ];

  const categories = [
    "Performance",
    "Reliability",
    "Ease of Use",
    "Documentation",
    "Pricing"
  ];

  return Array.from({ length: 25 }).map(() => ({
    product: products[Math.floor(Math.random() * products.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    businessImpact: Math.floor(Math.random() * 5) + 1,
    urgency: Math.floor(Math.random() * 5) + 1,
    confidenceLevel: Math.floor(Math.random() * 5) + 1,
    source: ["Support Ticket", "Community Forum", "GitHub Issue", "Internal Feedback"][
      Math.floor(Math.random() * 4)
    ],
    timestamp: new Date().toISOString()
  }));
}

function generateMockInsights() {
  return {
    summary:
      "Feedback volume is highest around Application Security and Zero Trust Access. Customers consistently flag ease of use and documentation as areas with high urgency and meaningful business impact. Internal teams echo similar themes, suggesting alignment between customer pain points and internal observations.",
    recommendedFocus: [
      "Improve onboarding and documentation for Zero Trust products",
      "Prioritize usability improvements in Application Security workflows",
      "Expand proactive monitoring and alerting guidance"
    ]
  };
}
