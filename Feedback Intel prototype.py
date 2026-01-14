# Cloudflare Feedback Intelligence (Streamlit Prototype)

import os
import io
import time
import json
import base64
import random
import string
import datetime as dt
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd
import streamlit as st

try:
    from PIL import Image
except Exception:
    Image = None

try:
    import altair as alt
except Exception:
    alt = None


# -----------------------------
# Page config + simple styling
# -----------------------------
st.set_page_config(
    page_title="Cloudflare Feedback Intelligence",
    page_icon="☁️",
    layout="wide",
)

CUSTOM_CSS = """
<style>
/* Keep it clean + modern */
.block-container { padding-top: 1.2rem; padding-bottom: 2rem; }
.small-muted { color: #6b7280; font-size: 0.85rem; }
.kpi-label { color: #6b7280; font-size: 0.9rem; }
.kpi-value { font-size: 1.8rem; font-weight: 700; }
.badge { display:inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.8rem; }
.badge-high { background: #fee2e2; color: #991b1b; }
.badge-med  { background: #ffedd5; color: #9a3412; }
.badge-low  { background: #dcfce7; color: #166534; }
hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.75rem 0; }
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# -----------------------------
# Logo loading (robust)
# -----------------------------
def _read_text_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()

def load_logo_bytes() -> Optional[bytes]:
    """
    Tries, in order:
    1) cloudflare_logo.txt (base64 text) next to this script
    2) Cloudflare logo.png next to this script
    3) cloudflare_logo.png next to this script
    Returns raw PNG bytes or None if not found.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "cloudflare_logo.txt"),
        os.path.join(script_dir, "Cloudflare logo.png"),
        os.path.join(script_dir, "cloudflare_logo.png"),
    ]

    # 1) base64 txt
    if os.path.exists(candidates[0]):
        try:
            b64 = _read_text_file(candidates[0])
            # Some base64 tools insert newlines; remove whitespace safely
            b64 = "".join(b64.split())
            return base64.b64decode(b64)
        except Exception:
            return None

    # 2/3) direct png file
    for p in candidates[1:]:
        if os.path.exists(p):
            try:
                with open(p, "rb") as f:
                    return f.read()
            except Exception:
                return None

    return None


# -----------------------------
# Keyword Library (Products + Issue Types)
# -----------------------------
PRODUCT_KEYWORDS: Dict[str, List[str]] = {
    "Zero Trust": [
        "zero trust", "access", "gateway", "warp", "tunnel", "identity", "sso", "mfa", "device posture", "dns policy",
    ],
    "WAF & Security": [
        "waf", "firewall", "ruleset", "managed rules", "bot", "ddos", "rate limit", "security event", "threat", "mitigation",
    ],
    "CDN & Caching": [
        "cdn", "cache", "caching", "purge", "ttl", "hit ratio", "origin", "edge cache", "cache key", "stale",
    ],
    "Workers & Developer Platform": [
        "worker", "workers", "durable objects", "kv", "r2", "pages", "d1", "wrangler", "deploy", "runtime", "serverless",
    ],
    "DNS": [
        "dns", "resolver", "nameserver", "zone", "dnssec", "record", "propagation", "ns", "cname", "a record",
    ],
    "Analytics & Observability": [
        "analytics", "logs", "logpush", "dashboard", "metrics", "observability", "trace", "error rate", "latency",
    ],
    "Billing & Account": [
        "billing", "invoice", "charge", "refund", "plan", "pricing", "subscription", "trial", "seat", "credit card",
    ],
    "Support Experience": [
        "support", "ticket", "sla", "response time", "agent", "case", "escalation", "help center", "documentation",
    ],
}

ISSUE_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "Outage / Service Down": [
        "down", "outage", "unavailable", "503", "502", "500", "can't access", "site is down", "incident",
    ],
    "Performance / Latency": [
        "slow", "latency", "timeout", "performance", "lag", "degraded", "high latency", "slow response",
    ],
    "Configuration / Setup": [
        "setup", "configure", "configuration", "how do i", "onboarding", "install", "getting started", "docs unclear",
    ],
    "Bug / Unexpected Behavior": [
        "bug", "broken", "doesn't work", "unexpected", "crash", "error", "regression", "failing", "glitch",
    ],
    "Authentication / Access": [
        "login", "auth", "authentication", "permission", "access denied", "forbidden", "401", "403", "mfa",
    ],
    "Pricing / Billing Confusion": [
        "pricing", "billed", "invoice", "charged", "refund", "cost", "expensive", "plan", "trial ended",
    ],
    "UX / Usability": [
        "ui", "ux", "confusing", "hard to find", "navigation", "clunky", "needs improvement", "not intuitive",
    ],
    "Feature Request": [
        "feature request", "would like", "please add", "missing", "support for", "wishlist", "enhancement",
    ],
}


# -----------------------------
# Scoring logic (simple + explainable)
# -----------------------------
FRUSTRATION_KEYWORDS = [
    "frustrated", "annoying", "terrible", "awful", "hate", "unacceptable", "ridiculous", "angry",
    "broken", "still broken", "doesn't work", "wasted", "blocking", "stuck",
]
SEVERITY_KEYWORDS = {
    5: ["outage", "down", "unavailable", "incident", "data loss", "security breach", "critical"],
    4: ["can't", "cannot", "broken", "failing", "error", "regression", "blocked", "urgent"],
    3: ["slow", "timeout", "latency", "degraded", "inconsistent"],
    2: ["confusing", "unclear", "hard to", "how do i", "docs"],
    1: ["nice to have", "would like", "feature request", "wishlist"],
}

def normalize_text(s: str) -> str:
    return (s or "").lower().strip()

def detect_product(text: str) -> str:
    t = normalize_text(text)
    for product, kws in PRODUCT_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                return product
    return "Other / Unclassified"

def detect_issue_type(text: str) -> str:
    t = normalize_text(text)
    for issue_type, kws in ISSUE_TYPE_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                return issue_type
    return "General Feedback"

def compute_issue_severity(text: str) -> int:
    t = normalize_text(text)
    for score in sorted(SEVERITY_KEYWORDS.keys(), reverse=True):
        for kw in SEVERITY_KEYWORDS[score]:
            if kw in t:
                return score
    # Default middle if unknown
    return 3

def compute_customer_frustration(text: str) -> float:
    """
    Returns a 0..1 score estimating "frustration intensity".
    We keep it simple and explainable: keyword density + severity weight.
    """
    t = normalize_text(text)
    hits = sum(1 for kw in FRUSTRATION_KEYWORDS if kw in t)
    sev = compute_issue_severity(text)
    base = min(1.0, hits / 4.0)  # 0..1
    # Severity bumps frustration probability a bit
    bump = (sev - 1) / 10.0
    return float(min(1.0, base + bump))

def frustration_bucket(frustration: float) -> str:
    if frustration >= 0.70:
        return "High"
    if frustration >= 0.40:
        return "Medium"
    return "Low"

def compute_customer_pain_level(issue_severity: int, frustration: float, volume_weight: float = 1.0) -> float:
    """
    Customer Pain Level is what we want people to act on.
    Simple, explainable formula:
        pain = severity (1..5) * (1 + frustration) * volume_weight
    """
    return float(issue_severity * (1.0 + frustration) * volume_weight)


# -----------------------------
# "AI API" Stub (for interview)
# -----------------------------
@dataclass
class CloudflareAPIConfig:
    api_base: str = "https://api.cloudflare.com/client/v4"
    api_token: Optional[str] = None  # read from st.secrets or env
    account_id: Optional[str] = None
    zone_id: Optional[str] = None

def fetch_cloudflare_feedback_via_ai_stub(cfg: CloudflareAPIConfig) -> pd.DataFrame:
    """
    This function demonstrates *how* you'd pull/aggregate inputs, then send to an AI model.

    In a real implementation:
    - Pull from Cloudflare internal sources (Support tickets, Community posts, GitHub issues, etc.)
    - Optionally pull service signals (logs/analytics) to enrich context
    - Send the text to an LLM for: summarization, classification, severity, themes, sentiment/frustration, etc.

    For the assignment demo:
    - We DO NOT actually call Cloudflare APIs here (no key)
    - We return an empty DF and the app will fall back to synthetic "live" data.
    """
    # Example pseudo-request (NOT executed):
    # headers = {"Authorization": f"Bearer {cfg.api_token}"}
    # url = f"{cfg.api_base}/accounts/{cfg.account_id}/logs/received"
    # r = requests.get(url, headers=headers, timeout=30)
    # logs = r.json()

    # Example AI call pseudo-code (NOT executed):
    # prompt = f"Classify these feedback items into product, issue_type, severity, frustration..."
    # ai_response = openai.chat.completions.create(...)
    # parsed = ...

    return pd.DataFrame()  # intentionally empty for demo


# -----------------------------
# Synthetic "Live" Data Generator
# -----------------------------
SOURCES = ["Support Ticket", "Community Forum", "Discord", "GitHub Issue", "Email", "X/Twitter"]
REGIONS = ["NA", "EMEA", "APAC", "LATAM"]
TIERS = ["Free", "Pro", "Business", "Enterprise"]

SAMPLE_TEMPLATES = [
    "We are seeing {symptom} with {product}. It started about {time_ref} and is impacting {impact_area}.",
    "{product} is {symptom}. I tried {attempted_fix} but it's still {symptom2}. This is {emotion}.",
    "Question: how do I {howto} in {product}? The docs feel {docs_quality}.",
    "Feature request for {product}: please add {feature}. This would help with {use_case}.",
    "Billing issue: got {billing_problem} after changing my plan. Need help ASAP.",
    "The dashboard shows {metric_problem} and logs aren't matching. Please investigate.",
]

def _rand_id(prefix="FB") -> str:
    return prefix + "-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

def generate_synthetic_feedback(n: int, now: dt.datetime) -> pd.DataFrame:
    rng = random.Random()
    rows = []

    products = list(PRODUCT_KEYWORDS.keys())
    issue_types = list(ISSUE_TYPE_KEYWORDS.keys())

    symptom_choices = [
        "down", "slow", "timing out", "returning 502 errors", "not applying rules", "failing deployment",
        "confusing to configure", "blocking users", "not working as expected",
    ]
    impact_areas = [
        "customer login", "checkout", "API traffic", "internal admin portal", "edge delivery", "security posture",
    ]
    attempted_fixes = [
        "clearing cache", "rolling back config", "re-deploying", "changing DNS records", "disabling a ruleset",
    ]
    howto_actions = [
        "set up SSO", "configure WAF rules", "deploy a Worker", "enable DNSSEC", "set caching TTLs",
    ]
    docs_quality = ["unclear", "hard to follow", "outdated", "too technical"]
    emotions = ["unacceptable", "frustrating", "blocking", "really annoying", "a big problem"]
    features = ["better logs export", "bulk rule editing", "more granular access controls", "improved analytics filters"]
    use_cases = ["debugging", "compliance", "faster onboarding", "reduced support burden"]
    billing_problems = ["an unexpected charge", "double billing", "a plan mismatch", "a failed refund"]

    for _ in range(n):
        product = rng.choice(products)
        src = rng.choice(SOURCES)
        region = rng.choice(REGIONS)
        tier = rng.choice(TIERS)

        template = rng.choice(SAMPLE_TEMPLATES)
        text = template.format(
            product=product,
            symptom=rng.choice(symptom_choices),
            symptom2=rng.choice(symptom_choices),
            time_ref=rng.choice(["30 minutes ago", "yesterday", "this morning", "last week"]),
            impact_area=rng.choice(impact_areas),
            attempted_fix=rng.choice(attempted_fixes),
            emotion=rng.choice(emotions),
            howto=rng.choice(howto_actions),
            docs_quality=rng.choice(docs_quality),
            feature=rng.choice(features),
            use_case=rng.choice(use_cases),
            billing_problem=rng.choice(billing_problems),
            metric_problem=rng.choice(["missing events", "spikes in errors", "wrong totals", "delayed metrics"]),
        )

        # Random time within last 14 days
        minutes_back = rng.randint(0, 14 * 24 * 60)
        created_at = now - dt.timedelta(minutes=minutes_back)

        issue_type = detect_issue_type(text)
        detected_product = detect_product(text)

        severity = compute_issue_severity(text)
        frustration = compute_customer_frustration(text)
        fr_bucket = frustration_bucket(frustration)

        rows.append(
            {
                "Feedback ID": _rand_id(),
                "Created At": created_at,
                "Source": src,
                "Customer Tier": tier,
                "Region": region,
                "Product Area": detected_product,
                "Issue Type": issue_type,
                "Issue Severity (1-5)": severity,
                "Customer Frustration (0-1)": round(frustration, 2),
                "Frustration Level": fr_bucket,
                "Feedback Text": text,
            }
        )

    df = pd.DataFrame(rows)
    df["Created At"] = pd.to_datetime(df["Created At"])
    return df


# -----------------------------
# Data refresh logic
# -----------------------------
def get_data() -> pd.DataFrame:
    """
    If API stub returns empty, fall back to synthetic data.
    Uses session state to look "live".
    """
    now = dt.datetime.now()

    # Read API config (for demo)
    cfg = CloudflareAPIConfig(
        api_token=os.getenv("CLOUDFLARE_API_TOKEN"),
        account_id=os.getenv("CLOUDFLARE_ACCOUNT_ID"),
        zone_id=os.getenv("CLOUDFLARE_ZONE_ID"),
    )

    # Try API stub (will return empty by design)
    api_df = fetch_cloudflare_feedback_via_ai_stub(cfg)
    if api_df is not None and not api_df.empty:
        return api_df

    # Synthetic "live" data
    if "synthetic_df" not in st.session_state:
        st.session_state.synthetic_df = generate_synthetic_feedback(420, now)
        st.session_state.last_refresh = now

    return st.session_state.synthetic_df


def refresh_data():
    now = dt.datetime.now()
    st.session_state.synthetic_df = generate_synthetic_feedback(420, now)
    st.session_state.last_refresh = now


# -----------------------------
# Sidebar controls
# -----------------------------
st.sidebar.title("Controls")

auto_refresh = st.sidebar.checkbox("Auto-refresh (every 30 seconds)", value=False)
if auto_refresh:
    # Simple no-dependency auto-refresh timer:
    # We update a key that changes every 30 seconds.
    tick = int(time.time() // 30)
    if st.session_state.get("_tick") != tick:
        st.session_state["_tick"] = tick
        refresh_data()

if st.sidebar.button("Refresh Data"):
    refresh_data()

st.sidebar.markdown("<hr/>", unsafe_allow_html=True)

# Filters (set after data loads)
df = get_data()

min_date = df["Created At"].min().date()
max_date = df["Created At"].max().date()
date_range = st.sidebar.date_input("Date range", value=(min_date, max_date), min_value=min_date, max_value=max_date)

all_products = sorted(df["Product Area"].unique().tolist())
all_issue_types = sorted(df["Issue Type"].unique().tolist())
all_sources = sorted(df["Source"].unique().tolist())
all_tiers = sorted(df["Customer Tier"].unique().tolist())
all_regions = sorted(df["Region"].unique().tolist())

selected_products = st.sidebar.multiselect("Product Area", all_products, default=all_products)
selected_issue_types = st.sidebar.multiselect("Issue Type", all_issue_types, default=all_issue_types)
selected_sources = st.sidebar.multiselect("Source", all_sources, default=all_sources)
selected_tiers = st.sidebar.multiselect("Customer Tier", all_tiers, default=all_tiers)
selected_regions = st.sidebar.multiselect("Region", all_regions, default=all_regions)

search_text = st.sidebar.text_input("Search feedback text", value="")

st.sidebar.markdown("<hr/>", unsafe_allow_html=True)
st.sidebar.caption("Tip: This dashboard is intentionally designed to be understandable to first-time viewers.")


# -----------------------------
# Apply filters
# -----------------------------
start_date, end_date = date_range
mask = (
    (df["Created At"].dt.date >= start_date)
    & (df["Created At"].dt.date <= end_date)
    & (df["Product Area"].isin(selected_products))
    & (df["Issue Type"].isin(selected_issue_types))
    & (df["Source"].isin(selected_sources))
    & (df["Customer Tier"].isin(selected_tiers))
    & (df["Region"].isin(selected_regions))
)

if search_text.strip():
    mask = mask & df["Feedback Text"].str.contains(search_text.strip(), case=False, na=False)

fdf = df.loc[mask].copy()

# Volume weight per issue type (optional)
# Example: outages "count more" because they usually represent more users at once
ISSUE_TYPE_VOLUME_WEIGHT = {
    "Outage / Service Down": 1.25,
    "Performance / Latency": 1.15,
    "Bug / Unexpected Behavior": 1.10,
    "Authentication / Access": 1.10,
    "Configuration / Setup": 1.00,
    "UX / Usability": 0.95,
    "Pricing / Billing Confusion": 1.05,
    "Feature Request": 0.85,
    "General Feedback": 0.90,
}

fdf["Volume Weight"] = fdf["Issue Type"].map(ISSUE_TYPE_VOLUME_WEIGHT).fillna(1.0)
fdf["Customer Pain Level"] = fdf.apply(
    lambda r: compute_customer_pain_level(r["Issue Severity (1-5)"], r["Customer Frustration (0-1)"], r["Volume Weight"]),
    axis=1,
)

last_refresh = st.session_state.get("last_refresh", dt.datetime.now())


# -----------------------------
# Header (logo + title)
# -----------------------------
logo_bytes = load_logo_bytes()

col_logo, col_title = st.columns([1, 6], vertical_alignment="center")

with col_logo:
    if logo_bytes and Image is not None:
        try:
            img = Image.open(io.BytesIO(logo_bytes))
            st.image(img, width=80)
        except Exception:
            st.write("")  # fail silently
    else:
        st.write("")

with col_title:
    st.title("Cloudflare Feedback Intelligence")
    st.markdown(
        f"<div class='small-muted'>Aggregates customer + employee feedback from multiple channels and highlights what needs attention first. "
        f"<br/>Last updated: <b>{last_refresh.strftime('%Y-%m-%d %H:%M:%S')}</b></div>",
        unsafe_allow_html=True,
    )

st.markdown("<hr/>", unsafe_allow_html=True)


# -----------------------------
# KPI Row (intuitive labels)
# -----------------------------
def pct(n, d) -> float:
    return float(0.0) if d == 0 else float(n / d)

total_items = len(fdf)
critical_items = int((fdf["Issue Severity (1-5)"] >= 4).sum())
avg_severity = float(fdf["Issue Severity (1-5)"].mean()) if total_items else 0.0
high_frustration = int((fdf["Frustration Level"] == "High").sum())
frustration_rate = pct(high_frustration, total_items)

k1, k2, k3, k4 = st.columns(4)

with k1:
    st.markdown("<div class='kpi-label'>Feedback Items</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{total_items:,}</div>", unsafe_allow_html=True)
    st.caption("Unique pieces of feedback collected across support + community channels.")

with k2:
    st.markdown("<div class='kpi-label'>Critical Customer Issues</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{critical_items:,}</div>", unsafe_allow_html=True)
    st.caption("Items likely blocking customers (Severity 4–5).")

with k3:
    st.markdown("<div class='kpi-label'>Average Issue Severity</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{avg_severity:.2f}</div>", unsafe_allow_html=True)
    st.caption("1=minor, 5=major outage/security-risk level.")

with k4:
    st.markdown("<div class='kpi-label'>High Customer Frustration Rate</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='kpi-value'>{frustration_rate*100:.1f}%</div>", unsafe_allow_html=True)
    st.caption("Share of feedback showing strong frustration or blockers.")


st.markdown("<hr/>", unsafe_allow_html=True)


# -----------------------------
# Main Charts Row
# -----------------------------
left, right = st.columns([2, 2])

# Chart 1: Where customers are hurting most (Customer Pain Level by Product Area)
with left:
    st.subheader("Where Customers Are Hurting Most")
    st.caption("Ranked by Customer Pain Level (volume-weighted severity + frustration).")

    pain_by_product = (
        fdf.groupby("Product Area", as_index=False)["Customer Pain Level"]
        .sum()
        .sort_values("Customer Pain Level", ascending=False)
        .head(10)
    )

    if alt and not pain_by_product.empty:
        chart = (
            alt.Chart(pain_by_product)
            .mark_bar()
            .encode(
                x=alt.X("Customer Pain Level:Q", title="Customer Pain Level (higher = worse)"),
                y=alt.Y("Product Area:N", sort="-x", title="Product Area"),
                tooltip=["Product Area", alt.Tooltip("Customer Pain Level:Q", format=".1f")],
            )
            .properties(height=320)
        )
        st.altair_chart(chart, use_container_width=True)
    else:
        st.dataframe(pain_by_product, width="stretch", height=320)

# Chart 2: Trend line - feedback volume + critical rate over time
with right:
    st.subheader("Trend: Feedback Volume & Critical Rate")
    st.caption("Shows whether things are getting better or worse over time.")

    trend = fdf.copy()
    trend["Date"] = trend["Created At"].dt.date

    daily = trend.groupby("Date", as_index=False).agg(
        feedback_items=("Feedback ID", "count"),
        critical_items=("Issue Severity (1-5)", lambda s: int((s >= 4).sum())),
    )
    daily["critical_rate"] = daily.apply(lambda r: 0.0 if r["feedback_items"] == 0 else r["critical_items"] / r["feedback_items"], axis=1)

    if alt and not daily.empty:
        base = alt.Chart(daily).encode(x=alt.X("Date:T", title="Date"))

        line1 = base.mark_line().encode(
            y=alt.Y("feedback_items:Q", title="Feedback Items"),
            tooltip=["Date", "feedback_items", "critical_items", alt.Tooltip("critical_rate:Q", format=".1%")],
        )

        line2 = base.mark_line(strokeDash=[6, 3]).encode(
            y=alt.Y("critical_rate:Q", title="Critical Rate"),
            tooltip=["Date", "feedback_items", "critical_items", alt.Tooltip("critical_rate:Q", format=".1%")],
        )

        st.altair_chart((line1 + line2).resolve_scale(y="independent").properties(height=320), use_container_width=True)
    else:
        st.dataframe(daily, width="stretch", height=320)


st.markdown("<hr/>", unsafe_allow_html=True)


# -----------------------------
# Secondary Row: Issue types + Frustration distribution
# -----------------------------
c1, c2 = st.columns([2, 2])

with c1:
    st.subheader("Top Issue Types")
    st.caption("What customers are reporting most often (not all are equally severe).")

    issue_counts = (
        fdf.groupby("Issue Type", as_index=False)
        .agg(feedback_items=("Feedback ID", "count"), avg_severity=("Issue Severity (1-5)", "mean"))
        .sort_values("feedback_items", ascending=False)
        .head(10)
    )

    if alt and not issue_counts.empty:
        chart = (
            alt.Chart(issue_counts)
            .mark_bar()
            .encode(
                x=alt.X("feedback_items:Q", title="Feedback Items"),
                y=alt.Y("Issue Type:N", sort="-x", title="Issue Type"),
                tooltip=["Issue Type", "feedback_items", alt.Tooltip("avg_severity:Q", format=".2f")],
            )
            .properties(height=280)
        )
        st.altair_chart(chart, use_container_width=True)
    else:
        st.dataframe(issue_counts, width="stretch", height=280)

with c2:
    st.subheader("Customer Frustration Breakdown")
    st.caption("How emotionally intense / blocked the feedback reads (keyword-based demo).")

    fr_dist = (
        fdf.groupby("Frustration Level", as_index=False)["Feedback ID"]
        .count()
        .rename(columns={"Feedback ID": "feedback_items"})
    )

    # Ensure consistent ordering
    order = ["High", "Medium", "Low"]
    fr_dist["Frustration Level"] = pd.Categorical(fr_dist["Frustration Level"], categories=order, ordered=True)
    fr_dist = fr_dist.sort_values("Frustration Level")

    if alt and not fr_dist.empty:
        chart = (
            alt.Chart(fr_dist)
            .mark_bar()
            .encode(
                x=alt.X("Frustration Level:N", title="Frustration Level"),
                y=alt.Y("feedback_items:Q", title="Feedback Items"),
                tooltip=["Frustration Level", "feedback_items"],
            )
            .properties(height=280)
        )
        st.altair_chart(chart, use_container_width=True)
    else:
        st.dataframe(fr_dist, width="stretch", height=280)


st.markdown("<hr/>", unsafe_allow_html=True)


# -----------------------------
# Feedback Explorer (table + explainability)
# -----------------------------
st.subheader("Feedback Explorer")
st.caption("Search, filter, and review individual feedback items. Use this to pull examples for prioritization.")

def render_badge(level: str) -> str:
    if level == "High":
        return "<span class='badge badge-high'>High</span>"
    if level == "Medium":
        return "<span class='badge badge-med'>Medium</span>"
    return "<span class='badge badge-low'>Low</span>"

# Table for exploring
show_cols = [
    "Created At",
    "Source",
    "Customer Tier",
    "Region",
    "Product Area",
    "Issue Type",
    "Issue Severity (1-5)",
    "Frustration Level",
    "Customer Pain Level",
    "Feedback Text",
]

table_df = fdf[show_cols].copy()
table_df["Customer Pain Level"] = table_df["Customer Pain Level"].round(2)

# Optional: show top pain first
table_df = table_df.sort_values(["Customer Pain Level", "Issue Severity (1-5)"], ascending=[False, False])

st.dataframe(
    table_df,
    width="stretch",
    height=420,
)

st.markdown("<hr/>", unsafe_allow_html=True)


# -----------------------------
# Glossary / "What does this mean?"
# -----------------------------
with st.expander("What do these terms mean? (Glossary)", expanded=True):
    st.markdown(
        """
**Feedback Items**  
A unique piece of customer or employee feedback collected from sources like Support Tickets, GitHub, Discord, Email, and social.

**Critical Customer Issues**  
Feedback items likely blocking customers (Severity 4–5). Think “site down”, “auth broken”, “deployment failing”, or “security risk”.

**Issue Type**  
The plain-English category of the feedback (Outage, Performance, Configuration, Bug, Access/Auth, Billing, UX, Feature Request).

**Issue Severity (1–5)**  
A simple scale where:
- 1 = minor inconvenience  
- 3 = meaningful friction / degraded experience  
- 5 = major outage or high-risk issue

**Customer Frustration (0–1) + Frustration Level**  
A demo-friendly estimate of how blocked or unhappy the feedback reads.  
- Low: calm questions, minor requests  
- Medium: clear friction or repeated confusion  
- High: strong negative language or clear blockers

**Customer Pain Level**  
This is the “what should we prioritize first?” metric.  
It combines severity + frustration + a small volume-weight by issue type.
Higher = customers are hurting more.
        """
    )

st.markdown("<hr/>", unsafe_allow_html=True)


# -----------------------------
# Show the "AI API" approach (for interview)
# -----------------------------
with st.expander("How this would pull live data (AI + API approach)", expanded=False):
    st.markdown(
        """
This prototype shows the intended architecture:

1) Pull feedback from multiple channels (support, community, GitHub, social).  
2) Normalize into a single schema (timestamp, source, product area, issue type, etc.).  
3) Use an AI model to classify + summarize (themes, severity, frustration) consistently.  
4) Feed the dashboard from a single “feedback warehouse” table or API.

Below is the stub function used in this app (not executed without a key).
        """
    )
    st.code(fetch_cloudflare_feedback_via_ai_stub.__doc__ or "", language="python")

st.caption("End of dashboard.")
