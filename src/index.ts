export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // API: Feedback data with multiple sources and detailed channel context
    if (url.pathname === "/api/feedback") {
      const data = [
        { 
          id: "FB-001",
          product: "Workers", 
          category: "Bug", 
          businessImpact: 5, 
          urgency: 5, 
          confidenceLevel: 5, 
          source: "Support Ticket",
          sentiment: "Frustrated",
          title: "Cold start latency causing 503 errors in production",
          description: "Support Ticket #45678 from Enterprise customer (Acme Corp)\n\nOur e-commerce site is experiencing 503 errors during traffic spikes due to Worker cold starts. This is affecting checkout completion rates. We've tried warming strategies but they're not reliable. This is costing us real revenue - approximately $50k/day during peak hours.\n\nCustomer is requesting immediate escalation. They mentioned considering moving to Vercel if not resolved within 48 hours.",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          channel: "Zendesk",
          url: "https://support.cloudflare.com/ticket/45678"
        },
        { 
          id: "FB-002",
          product: "R2", 
          category: "Performance", 
          businessImpact: 4, 
          urgency: 4, 
          confidenceLevel: 5, 
          source: "Discord",
          sentiment: "Concerned",
          title: "Slow read performance for objects over 100MB",
          description: "Discord #r2-help channel - user @streamingdev\n\n\"We're seeing significantly slower read times for larger objects (100MB+) compared to S3. Average time is 8-12 seconds vs 2-3 seconds on S3. This impacts our video streaming application.\n\nAnyone else experiencing this? Is there a recommended approach for serving large files? Our users are complaining about buffering.\"\n\n3 other users reacted with 👍 saying they have the same issue.",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          channel: "Discord",
          url: "https://discord.com/channels/cloudflare/r2-help/msg123"
        },
        { 
          id: "FB-003",
          product: "Pages", 
          category: "Feature Request", 
          businessImpact: 3, 
          urgency: 3, 
          confidenceLevel: 4, 
          source: "GitHub Issue",
          sentiment: "Neutral",
          title: "Add support for monorepo deployments",
          description: "GitHub Issue #2847 on cloudflare/pages-action\n\nOpened by: @tech-lead-startup\nUpvotes: 47 👍\n\n\"We have a monorepo with multiple Next.js apps and would love to deploy them all from a single repo without creating separate Pages projects for each.\n\nCurrent workaround requires:\n1. Separate Pages projects per app\n2. Manual configuration duplication\n3. No shared environment variables\n\nVercel and Netlify both support this natively with their build configuration. This is blocking our team from fully migrating to Cloudflare.\"\n\nLinked to 3 duplicate issues from other users.",
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          channel: "GitHub",
          url: "https://github.com/cloudflare/pages-action/issues/2847"
        },
        { 
          id: "FB-004",
          product: "D1", 
          category: "Documentation", 
          businessImpact: 3, 
          urgency: 2, 
          confidenceLevel: 4, 
          source: "Community Forum",
          sentiment: "Confused",
          title: "Query optimization docs are incomplete",
          description: "Community Forum post by @postgres-migrator\nReplies: 12 | Views: 340\n\n\"Trying to optimize slow queries but the docs don't cover:\n- Indexing strategies and best practices\n- How to interpret EXPLAIN output\n- Common performance pitfalls\n- Connection pooling recommendations\n\nComing from Postgres, I expected more detailed guidance. The Discord is helpful but information is scattered across hundreds of messages.\n\nCould we get a comprehensive performance tuning guide?\"\n\nTop reply from community member suggests various workarounds, but notes official docs would be better.",
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          channel: "Community Forum",
          url: "https://community.cloudflare.com/t/d1-query-optimization/98765"
        },
        { 
          id: "FB-005",
          product: "Workers AI", 
          category: "Feature Request", 
          businessImpact: 4, 
          urgency: 3, 
          confidenceLevel: 5, 
          source: "X/Twitter",
          sentiment: "Excited",
          title: "Request: Support for fine-tuned models",
          description: "Twitter thread from @AIStartupCEO (8.2K followers)\nEngagement: 234 likes, 45 retweets, 12 quote tweets\n\n\"Absolutely LOVING @Cloudflare Workers AI 🔥 but would be amazing to upload fine-tuned versions of base models. Our use case requires domain-specific knowledge that generic models don't have.\n\nWilling to pay premium pricing for this. Would let us consolidate our entire AI stack on Cloudflare. @CloudflareDev any plans for this? 👀\"\n\nQuote tweets from other developers echoing the same request. Several mention they'd switch from OpenAI if this was available.",
          timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          channel: "Twitter/X",
          url: "https://twitter.com/AIStartupCEO/status/1234567890"
        },
        { 
          id: "FB-006",
          product: "Durable Objects", 
          category: "Performance", 
          businessImpact: 5, 
          urgency: 4, 
          confidenceLevel: 5, 
          source: "Email",
          sentiment: "Frustrated",
          title: "Unpredictable latency spikes in multi-region setup",
          description: "Email from: tech@realtimecollabapp.com\nTo: enterprise-support@cloudflare.com\nCC: Account Manager\n\nSubject: URGENT - Production latency issues with Durable Objects\n\n\"We're seeing random 2-5 second latency spikes that don't correlate with our code or load patterns. This is breaking our real-time collaboration features (think Google Docs competitor).\n\nOur users are complaining about lag and we're losing customers. We've:\n- Profiled all our code (not the issue)\n- Tested different regions (still happens)\n- Reduced payload sizes (no improvement)\n- Opened support ticket #45123 (no resolution yet)\n\nWe have a board meeting next week and are being asked to consider moving back to traditional Redis + WebSockets. Please escalate - we need engineering to look at this.\n\nAttached: performance logs, trace IDs, code samples\"\n\n[3 attachments]",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          channel: "Email",
          url: "mailto:tech@realtimecollabapp.com"
        },
        { 
          id: "FB-007",
          product: "KV", 
          category: "Bug", 
          businessImpact: 4, 
          urgency: 5, 
          confidenceLevel: 4, 
          source: "Support Ticket",
          sentiment: "Angry",
          title: "Data inconsistency across regions",
          description: "Support Ticket #45679 - Priority: CRITICAL\nFrom: compliance@fintech-startup.com\n\n⚠️ COMPLIANCE RISK - URGENT ESCALATION NEEDED ⚠️\n\nWe're seeing stale data being served from certain edge locations even though TTL has expired. This violates our data consistency requirements for financial transactions.\n\nSpecific examples:\n- User balance showing $1000 in US-West but $850 in EU-West (5 minutes after update)\n- Transaction status stuck in \"pending\" at certain edge locations\n\nThis is a MAJOR compliance risk for us. Our auditors are flagging this. We may need to fail our SOC 2 audit if not resolved immediately.\n\nWe need:\n1. Root cause analysis within 24 hours\n2. Temporary workaround or migration path\n3. Confirmation this won't happen again\n\nCustomer since: 2022 | Plan: Enterprise | ARR: $250K",
          timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
          channel: "Zendesk",
          url: "https://support.cloudflare.com/ticket/45679"
        },
        { 
          id: "FB-008",
          product: "Queues", 
          category: "Documentation", 
          businessImpact: 2, 
          urgency: 2, 
          confidenceLevel: 3, 
          source: "Internal",
          sentiment: "Neutral",
          title: "Missing examples for batch processing patterns",
          description: "Internal Slack from #solutions-engineering\nPosted by: Sarah Chen (Solutions Engineer)\n\n\"Hey team - getting the same questions from customers on every Queues implementation call:\n\n1. How to implement batch processing?\n2. Retry logic best practices?\n3. Dead letter queue setup?\n4. Monitoring and alerting strategies?\n\nWe need comprehensive examples in the docs. Right now I'm copy-pasting code snippets from previous customer projects which isn't scalable.\n\nCan we prioritize adding a 'Common Patterns' section to the Queues docs?\n\n🔥 reactions from 8 team members\n\nFollow-up from Alex (SE Manager): 'Adding this to our doc feedback tracker. This has come up in 12 of the last 15 Queues implementations.'\"",
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          channel: "Internal Slack",
          url: null
        },
        { 
          id: "FB-009",
          product: "Workflows", 
          category: "Feature Request", 
          businessImpact: 4, 
          urgency: 3, 
          confidenceLevel: 4, 
          source: "Discord",
          sentiment: "Hopeful",
          title: "Need conditional branching in workflow steps",
          description: "Discord #workflows channel - user @backend_wizard\n\n\"Trying to migrate from AWS Step Functions to Workflows but we need conditional logic between steps. Our use case:\n\n1. Check payment status\n2. IF successful → process order\n3. IF failed → send retry notification\n4. IF fraud detected → freeze account\n\nCurrent workaround is creating separate workflows which is messy and hard to maintain. Is conditional branching on the roadmap?\n\nLove everything else about Workflows - the DX is fantastic and the pricing is way better than Step Functions. This is literally the only thing blocking our migration.\"\n\nResponses:\n- 15 👍 reactions\n- @devrel-member: \"Great feedback! Forwarding to the product team\"\n- 4 other users saying they need this too",
          timestamp: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
          channel: "Discord",
          url: "https://discord.com/channels/cloudflare/workflows/msg456"
        },
        { 
          id: "FB-010",
          product: "Vectorize", 
          category: "Bug", 
          businessImpact: 3, 
          urgency: 3, 
          confidenceLevel: 4, 
          source: "GitHub Issue",
          sentiment: "Disappointed",
          title: "Query results differ from local testing with same embeddings",
          description: "GitHub Issue #892 on cloudflare/vectorize\nOpened by: @ml-engineer-42\nLabels: bug, needs-investigation\n\n**Describe the bug**\nGetting different similarity search results in production vs local testing with identical embeddings and query vectors.\n\n**To Reproduce**\n1. Generate embeddings using OpenAI ada-002\n2. Insert 10k vectors locally (pgvector) and to Vectorize\n3. Query with same vector\n4. Results order differs significantly (top 10 have only 3 matches)\n\n**Expected behavior**\nSimilarity scores should match (allowing for small floating point differences)\n\n**Additional context**\n- Same distance metric (cosine)\n- Same dimensions (1536)\n- Verified embeddings are identical via checksums\n\nThis makes development really difficult - can't trust local testing. Documentation doesn't mention any differences in similarity calculation between local and prod.\n\n**Comments (8):**\nOther users reporting similar issues with different embedding models.",
          timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          channel: "GitHub",
          url: "https://github.com/cloudflare/vectorize/issues/892"
        },
        { 
          id: "FB-011",
          product: "Hyperdrive", 
          category: "Performance", 
          businessImpact: 4, 
          urgency: 4, 
          confidenceLevel: 5, 
          source: "Community Forum",
          sentiment: "Concerned",
          title: "Connection pooling not working as expected",
          description: "Community Forum - Technical Discussion\nPosted by: @db-admin-joe\nCategory: Hyperdrive | Views: 890 | Replies: 23\n\n\"Still hitting connection limits on our Postgres instance despite using Hyperdrive. Expected Hyperdrive to handle pooling but we're seeing new connections for each Worker request.\n\nOur setup:\n- Heroku Postgres (200 connection limit)\n- Workers with Hyperdrive binding\n- ~1000 req/second\n- Hitting max connections after ~30 seconds\n\nAre we configuring something wrong? Docs suggest Hyperdrive should pool connections automatically.\n\nThis is blocking our migration from Heroku to Cloudflare Workers. We love Workers but can't move without solving this.\"\n\n**Top replies:**\n- Community member suggests checking connection string format\n- Another user confirms they had same issue\n- DevRel team member asked for more diagnostic info\n- No official solution yet (thread from 5 days ago)",
          timestamp: new Date(Date.now() - 84 * 60 * 60 * 1000).toISOString(),
          channel: "Community Forum",
          url: "https://community.cloudflare.com/t/hyperdrive-connection-pooling/99123"
        },
        { 
          id: "FB-012",
          product: "Analytics Engine", 
          category: "UX Friction", 
          businessImpact: 3, 
          urgency: 2, 
          confidenceLevel: 3, 
          source: "Internal",
          sentiment: "Neutral",
          title: "Dashboard UI confusing for first-time users",
          description: "Internal feedback - Customer Success Weekly Sync\nNotes by: Marcus (CS Manager)\n\n📊 Recurring Issue: Analytics Engine Onboarding\n\nTeam reports that 8 out of 10 new Analytics Engine customers need hand-holding through first setup:\n\nCommon confusion points:\n1. Difference between indexes, datasets, and queries\n2. How to structure data for optimal querying\n3. When to use blobs vs dimensions\n4. Cost implications of different approaches\n\nCustomer quotes:\n- \"The dashboard feels overwhelming\" (3 customers)\n- \"Couldn't figure out how to start without calling support\" (5 customers)\n- \"The getting started guide is too technical\" (2 customers)\n\nCompetitors (Honeycomb, Datadog) have interactive tutorials and simpler onboarding flows.\n\nAction items:\n- Create step-by-step onboarding wizard?\n- Add example datasets users can experiment with?\n- Record video walkthrough?\n\nThis is eating up 3-4 hours of CS time per new customer.",
          timestamp: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
          channel: "Internal Notion",
          url: null
        },
        { 
          id: "FB-013",
          product: "Stream", 
          category: "Bug", 
          businessImpact: 5, 
          urgency: 5, 
          confidenceLevel: 5, 
          source: "Email",
          sentiment: "Angry",
          title: "Live streams randomly dropping viewers during paid event",
          description: "Email chain - URGENT ESCALATION\nFrom: ceo@live-events-platform.com\nTo: enterprise@cloudflare.com\nCC: Legal team, Account manager\n\nSubject: IMMEDIATE ATTENTION REQUIRED - Stream failures during paid event\n\n\"Yesterday's live event was a DISASTER. Our first major paid livestream (5,000 paying customers at $50 each = $250K revenue event) had viewers randomly disconnected throughout.\n\n📊 Impact:\n- ~30% of viewers experienced drops\n- 247 refund requests so far ($12,350)\n- Trending on Twitter with negative sentiment\n- 15 customers cancelled annual subscriptions ($45K ARR)\n\nWe have:\n- Stream IDs\n- Complete logs\n- Viewer session data\n- Network traces\n\nWE NEED:\n1. Root cause analysis by EOD today\n2. Guarantee this won't happen again\n3. Discussion about SLA credits\n\nIf we don't get answers, we're forced to evaluate other providers. Our reputation is on the line and we have 3 more events this month.\n\nThis is a make-or-break moment for our partnership.\n\nAttached: Incident report, viewer complaints, Twitter thread\n\n---\nFollow-up from Account Manager: Engineering escalated. Incident response team investigating.\"",
          timestamp: new Date(Date.now() - 108 * 60 * 60 * 1000).toISOString(),
          channel: "Email",
          url: "mailto:ceo@live-events-platform.com"
        },
        { 
          id: "FB-014",
          product: "Images", 
          category: "Feature Request", 
          businessImpact: 3, 
          urgency: 3, 
          confidenceLevel: 4, 
          source: "X/Twitter",
          sentiment: "Hopeful",
          title: "Add AVIF format support",
          description: "Twitter thread from @frontend_perf (Performance Engineer, 15K followers)\nEngagement: 89 likes, 23 retweets\n\n\"Hey @Cloudflare - love the Images product but would love AVIF support! 🙏\n\nWebP is great but AVIF gives us:\n- 20-30% better compression\n- Better quality at same file size  \n- Supported in Chrome, Firefox, Safari now\n\nWould reduce our bandwidth costs significantly. Currently using a Worker workaround but native support would be cleaner and faster.\n\nIs this on the roadmap? @CloudflareDev\n\n📊 Quick comparison:\nJPEG: 150KB\nWebP: 85KB (-43%)\nAVIF: 62KB (-59%)\n\nReplies:\n- @developer1: \"Yes please! Been waiting for this\"\n- @ecom_site: \"Would save us thousands in bandwidth\"\n- @photography_blog: \"Quality is noticeably better with AVIF\"",
          timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
          channel: "Twitter/X",
          url: "https://twitter.com/frontend_perf/status/1234567891"
        },
        { 
          id: "FB-015",
          product: "Zaraz", 
          category: "Documentation", 
          businessImpact: 2, 
          urgency: 1, 
          confidenceLevel: 3, 
          source: "Internal",
          sentiment: "Neutral",
          title: "Need comprehensive GTM migration guide",
          description: "Internal Salesforce notes - from Sales Engineering\nOpportunity: E-commerce company ($500K potential deal)\nStage: Technical Evaluation\nBlocker: Migration complexity\n\n\"Prospect loves Zaraz concept (better performance, privacy-first, cost savings) but concerned about migrating from Google Tag Manager.\n\nTheir concerns:\n1. How to map GTM tags/triggers to Zaraz?\n2. What features don't have direct equivalents?\n3. Testing strategy during migration?\n4. Rollback plan if issues arise?\n5. Typical migration timeline?\n\nCurrent docs have basic comparison but not comprehensive guide.\n\nSales has had this conversation 8 times in Q4. We need:\n- Step-by-step migration playbook\n- Video walkthrough\n- Common pitfalls document\n- Before/after performance comparison\n\nThis pattern: Customer excited → Migration concerns → Delayed decision\n\nEstimated impact: 5-8 deals per quarter being delayed (average $300K each)\"",
          timestamp: new Date(Date.now() - 132 * 60 * 60 * 1000).toISOString(),
          channel: "Internal Salesforce",
          url: null
        }
      ];

      return new Response(JSON.stringify(data), {
        headers: { 
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    // API: AI Insights
    if (url.pathname === "/api/insights") {
      const insights = {
        summary:
          "Cross-channel analysis reveals: Email and support tickets show highest urgency (avg 4.5/5) and business impact. Discord and Twitter feedback requires fastest response times. GitHub issues demonstrate strong community validation through upvotes. Internal feedback highlights systemic documentation gaps causing support load. Priority: Angry customers in email and support tickets need immediate attention.",
        recommendedFocus: [
          "URGENT: Address email escalations from Enterprise customers (Stream, Durable Objects, KV) - direct revenue risk",
          "High ROI: Create migration guides mentioned in sales feedback - unblocking $2M+ in delayed deals",
          "Community Quick Wins: Respond to highly-engaged Twitter threads - public perception impact",
          "Systemic Fix: Address documentation gaps highlighted across all channels - reducing support tickets by est. 30%",
          "Process: Establish SLA for GitHub issues with 20+ upvotes - showing community priorities matter"
        ]
      };

      return new Response(JSON.stringify(insights), {
        headers: { 
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    // Serve static assets from /public directory
    return env.ASSETS.fetch(request);
  }
};
