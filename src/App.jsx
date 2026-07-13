import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Send, X, MessageCircle, FileText,
  Calendar, Building2, ChevronRight, Sparkles, Search, Bell, RefreshCw,
  Sun, Moon, Menu, Bookmark, BookmarkCheck, Calculator as CalcIcon,
  LayoutGrid, Activity, PieChart as PieIcon, BarChart3, Landmark,
  ExternalLink, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

/* =====================================================================
   BRAND TOKENS
===================================================================== */
const BRAND = { blue: "#1c9bda", green: "#aed768", white: "#ffffff" };

/* =====================================================================
   DATA — real, researched figures. Data as of July 3, 2026.
   Estimated profit = GMP × lot size.
===================================================================== */
const IPOS_BASE = [
  { id: "knack-packaging", name: "Knack Packaging", company: "Knack Packaging Ltd.", type: "Mainboard", status: "Open",
    open: "2026-07-01", close: "2026-07-03", listing: "2026-07-08", allotment: "2026-07-04", refund: "2026-07-07", demat: "2026-07-07",
    priceMin: 161, priceMax: 170, faceValue: 10, lot: 88, issueSize: 439.5, freshIssue: 439.5, ofs: 0,
    gmp: 35, trend: "up", estListing: 205,
    gmpHistory: [{ d: "Jun24", v: 12 }, { d: "Jun28", v: 18 }, { d: "Jun30", v: 15 }, { d: "Jul1", v: 28 }, { d: "Jul2", v: 28 }, { d: "Jul3", v: 35 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/sep-2025/knack-packaging-limited-drhp_96482.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/knack-packaging-limited-prospectus_102599.html",
    leadManager: "Unistone Capital", exchange: "BSE, NSE",
    sub: { overall: 18.5, qib: 27.4, hni: 21.6, retail: 9.2, employee: null, shareholder: null },
    fin: { revenue: 843.77, pat: 92.72, ebitda: 172.29, eps: 9.27, pe: 18.33, roe: 35.75, netWorth: 259.4, debt: 118.2 },
    about: "Ahmedabad-based integrated packaging solutions provider manufacturing PLWPP bags for food, pet food, agrochemical and construction sectors; exports to 68+ countries.",
    sector: "Packaging", registrar: "MUFG Intime India Pvt Ltd",
    strengths: ["68+ country export footprint", "Integrated manufacturing (backward-linked)", "Diversified end-user base"],
    risks: ["Raw material (polypropylene) price volatility", "Customer concentration in a few large accounts", "Working-capital intensive model"] },

  { id: "ic-electricals", name: "IC Electricals", company: "IC Electricals Co. Ltd.", type: "SME", status: "Open",
    open: "2026-07-03", close: "2026-07-07", listing: "2026-07-10", allotment: "2026-07-08", refund: "2026-07-09", demat: "2026-07-09",
    priceMin: 94, priceMax: 99, faceValue: 10, lot: 1200, issueSize: 47.91, freshIssue: 47.91, ofs: 0,
    gmp: 44, trend: "up", estListing: 143,
    gmpHistory: [{ d: "Jun27", v: 20 }, { d: "Jun30", v: 30 }, { d: "Jul1", v: 35 }, { d: "Jul2", v: 40 }, { d: "Jul3", v: 44 }],
    drhp: "https://nsearchives.nseindia.com/emerge/corporates/content/Registration_30092025221533_DRHP_ICEL_30092025.pdf", rhp: null,
    leadManager: "Corpwis Advisors", exchange: "NSE Emerge",
    sub: { overall: 0.4, qib: 0, hni: 0.3, retail: 0.6, employee: null, shareholder: null },
    fin: { revenue: 143.81, pat: 14.10, ebitda: 19.5, eps: 7.7, pe: 12.9, roe: 18.4, netWorth: 76.5, debt: 22.1 },
    about: "Manufactures electronic equipment for Indian Railways (ERRUs, vigilance control devices, passenger info systems) under a B2G model, plus railway electrification EPC work.",
    sector: "Railway Electricals", registrar: "Skyline Financial Services Pvt Ltd",
    strengths: ["B2G model with Indian Railways", "Growing electrification order book", "Niche technical certification moat"],
    risks: ["Concentrated government-client dependency", "Tender-based revenue is lumpy", "Working capital tied up in receivables"] },

  { id: "sbi-funds", name: "SBI Funds Management", company: "SBI Funds Management Ltd.", type: "Mainboard", status: "Upcoming",
    open: "2026-07-14", close: "2026-07-16", listing: "2026-07-22", allotment: "2026-07-17", refund: "2026-07-21", demat: "2026-07-21",
    priceMin: 0, priceMax: 0, faceValue: 10, lot: 0, issueSize: 0, freshIssue: 0, ofs: 0,
    gmp: 91, trend: "down", estListing: 0, gmpHistory: [{ d: "Jun28", v: 90 }, { d: "Jul1", v: 101 }, { d: "Jul2", v: 101 }, { d: "Jul3", v: 91 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/mar-2026/sbi-funds-management-limited-drhp_100517.html", rhp: null,
    leadManager: "TBD", exchange: "BSE, NSE",
    sub: null, fin: null,
    about: "One of India's largest asset management companies (AUM > ₹10 lakh crore). Pure offer-for-sale by SBI & Amundi; price band not yet announced.",
    sector: "Asset Management", registrar: "KFin Technologies Ltd",
    strengths: ["Market-leading AUM scale", "Strong brand trust (SBI parentage)", "Diversified fund product mix"],
    risks: ["Pure OFS — no fresh capital to the company", "AMC earnings sensitive to market cycles", "Fee-compression pressure industry-wide"] },

  { id: "kusumgar", name: "Kusumgar", company: "Kusumgar Ltd.", type: "Mainboard", status: "Upcoming",
    open: "2026-07-08", close: "2026-07-10", listing: "2026-07-15", allotment: "2026-07-13", refund: "2026-07-14", demat: "2026-07-14",
    priceMin: 398, priceMax: 419, faceValue: 10, lot: 35, issueSize: 650, freshIssue: 0, ofs: 650,
    gmp: 155, trend: "up", estListing: 574, gmpHistory: [{ d: "Jun28", v: 100 }, { d: "Jul1", v: 110 }, { d: "Jul2", v: 92 }, { d: "Jul7", v: 171 }, { d: "Jul9", v: 160 }, { d: "Jul10", v: 155 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/oct-2025/kusumgar-limited_97201.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/kusumgar-limited-rhp_102510.html",
    leadManager: "Axis Capital, ICICI Securities", exchange: "BSE, NSE",
    sub: { overall: 135.80, qib: 299.51, hni: 174.28, retail: 27.97, employee: null, shareholder: null }, fin: { revenue: 711.78, pat: 98.20, ebitda: null, eps: 22.3, pe: 18.8, roe: 21.6, netWorth: 420.5, debt: 95.3 },
    about: "Mumbai-based manufacturer of engineered synthetic fabrics (aerospace & defence, industrial, automotive, outdoor). IPO is entirely an offer for sale.",
    sector: "Engineered Fabrics", registrar: "Bigshare Services Pvt Ltd",
    strengths: ["Aerospace & defence qualified supplier", "High-margin specialty fabric mix", "Decades-long promoter track record"],
    risks: ["Entirely OFS — no fresh growth capital raised", "Niche end markets limit volume scale", "Import dependency for certain chemicals"] },

  { id: "devson-catalyst", name: "Devson Catalyst", company: "Devson Catalyst Ltd.", type: "SME", status: "Upcoming",
    open: "2026-07-09", close: "2026-07-13", listing: "2026-07-17", allotment: "2026-07-14", refund: "2026-07-16", demat: "2026-07-16",
    priceMin: 112, priceMax: 118, faceValue: 10, lot: 1200, issueSize: 42.34, freshIssue: 42.34, ofs: 0,
    gmp: 6, trend: "stable", estListing: 124, gmpHistory: [{ d: "Jul1", v: 0 }, { d: "Jul2", v: 6 }, { d: "Jul3", v: 6 }],
    drhp: "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents", rhp: null,
    leadManager: "Corpwis Advisors", exchange: "NSE Emerge",
    sub: null, fin: { revenue: 322.58, pat: 28.13, ebitda: null, eps: 25.0, pe: 15.5, roe: 45.97, netWorth: 61.2, debt: 18.4 },
    about: "Gujarat-based manufacturer of catalysts, adsorbents and ceramic balls for refineries, petrochemical, steel and fertilizer producers; exports to 15+ countries.",
    sector: "Specialty Chemicals", registrar: "MUFG Intime India Pvt Ltd",
    strengths: ["High ROE (45.97%)", "Import-substitution positioning", "15+ country export base"],
    risks: ["Small-cap SME liquidity risk", "Customer concentration in refining sector", "Raw material import dependency"] },

  { id: "happy-steels", name: "Happy Steel", company: "Happy Steel Ltd.", type: "SME", status: "Upcoming",
    open: "2026-07-09", close: "2026-07-13", listing: "2026-07-17", allotment: "2026-07-14", refund: "2026-07-16", demat: "2026-07-16",
    priceMin: 66, priceMax: 66, faceValue: 10, lot: 2000, issueSize: 15.8, freshIssue: 15.8, ofs: 0,
    gmp: 0, trend: "stable", estListing: 66, gmpHistory: [],
    drhp: "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents", rhp: null,
    leadManager: "Swastika Investmart", exchange: "NSE Emerge",
    sub: null, fin: null,
    about: "Ludhiana (Punjab) manufacturer of forged & precision-machined axles, spline shafts and spindles for automotive OEMs and Tier-1 suppliers.",
    sector: "Auto Components", registrar: "Bigshare Services Pvt Ltd",
    strengths: ["OEM/Tier-1 supplier relationships", "Precision forging capability", "Export presence"],
    risks: ["Cyclical auto-sector demand exposure", "Fixed-price band signals modest demand so far", "Raw steel price volatility"] },

  { id: "kratikal-tech", name: "Kratikal Tech", company: "Kratikal Tech Ltd.", type: "SME", status: "Listed",
    open: "2026-06-30", close: "2026-07-02", listing: "2026-07-07", allotment: "2026-07-03", refund: "2026-07-04", demat: "2026-07-04",
    priceMin: 128, priceMax: 135, faceValue: 10, lot: 1000, issueSize: 39.69, freshIssue: 39.69, ofs: 0,
    gmp: 34, trend: "up", estListing: 169, listedAt: 168, currentPrice: 174,
    gmpHistory: [{ d: "Jun25", v: 14 }, { d: "Jun27", v: 22 }, { d: "Jun29", v: 28 }, { d: "Jun30", v: 32 }, { d: "Jul1", v: 41 }, { d: "Jul2", v: 34 }],
    drhp: "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents", rhp: null,
    leadManager: "Fedex Securities", exchange: "NSE Emerge",
    sub: { overall: 45.2, qib: 38.6, hni: 72.4, retail: 28.1, employee: null, shareholder: null },
    fin: { revenue: 36.86, pat: 6.14, ebitda: 9.08, eps: 3.1, pe: 24.5, roe: 26.8, netWorth: 22.9, debt: 3.1 },
    about: "AI-driven SaaS cybersecurity company (Threatcop, AutoSecT) serving BFSI, fintech, telecom and healthcare clients across India, UAE and USA. CERT-In empanelled.",
    sector: "Cybersecurity", registrar: "KFin Technologies Ltd",
    strengths: ["CERT-In empanelled", "SaaS recurring-revenue model", "Multi-geography client base"],
    risks: ["Intense competition from global cybersecurity vendors", "Small revenue base vs valuation", "Talent-retention risk in tech"] },

  { id: "teja-engineering", name: "Teja Engineering", company: "Teja Engineering Industries Ltd.", type: "SME", status: "Listed",
    open: "2026-06-30", close: "2026-07-02", listing: "2026-07-07", allotment: "2026-07-03", refund: "2026-07-04", demat: "2026-07-04",
    priceMin: 220, priceMax: 220, faceValue: 10, lot: 600, issueSize: 37.36, freshIssue: 37.36, ofs: 0,
    gmp: 3, trend: "stable", estListing: 223, listedAt: 220, currentPrice: 215,
    gmpHistory: [{ d: "Jun27", v: 0 }, { d: "Jun29", v: 0 }, { d: "Jun30", v: 0 }, { d: "Jul1", v: 0 }, { d: "Jul2", v: 3 }],
    drhp: "https://nsearchives.nseindia.com/emerge/corporates/content/Registration_07042025160753_DRHP.pdf", rhp: null,
    leadManager: "B.N. Rathi Securities", exchange: "NSE Emerge",
    sub: { overall: 1.2, qib: 0, hni: 1.4, retail: 1.0, employee: null, shareholder: null },
    fin: { revenue: 55.23, pat: 4.02, ebitda: null, eps: 10.5, pe: 20.9, roe: 16.8, netWorth: 24.0, debt: 8.7 },
    about: "Bharuch (Gujarat) engineering services firm across Oil & Gas, Power and Energy — O&M, erection & commissioning, calibration, overhaul/decommissioning.",
    sector: "Engineering Services (O&M)", registrar: "KFin Technologies Ltd",
    strengths: ["Long-term O&M contracts", "Diversified oil/gas/power clients", "Asset-light services model"],
    risks: ["Weak grey-market response pre-listing", "Client concentration risk", "Margins tied to contract renewals"] },

  { id: "vinit-mobile", name: "Vinit Mobile", company: "Vinit Mobile Ltd.", type: "SME", status: "Listed",
    open: "2026-06-30", close: "2026-07-02", listing: "2026-07-07", allotment: "2026-07-03", refund: "2026-07-04", demat: "2026-07-04",
    priceMin: 150, priceMax: 158, faceValue: 10, lot: 800, issueSize: 34.13, freshIssue: 34.13, ofs: 0,
    gmp: 15, trend: "up", estListing: 173, listedAt: 160, currentPrice: 165,
    gmpHistory: [{ d: "Jun27", v: 0 }, { d: "Jun29", v: 0 }, { d: "Jun30", v: 30 }, { d: "Jul1", v: 25 }, { d: "Jul2", v: 15 }],
    drhp: "https://nsearchives.nseindia.com/emerge/corporates/content/Registration_26122025011500_VML_DRHP.pdf", rhp: null,
    leadManager: "Comfort Securities", exchange: "BSE SME",
    sub: { overall: 0.02, qib: 0, hni: 0.01, retail: 0.04, employee: null, shareholder: null },
    fin: { revenue: 97.4, pat: 6.8, ebitda: null, eps: 11.04, pe: 14.31, roe: 19.2, netWorth: 35.6, debt: 12.9 },
    about: "Surat-based multi-brand mobile phone retail chain with 35 company-owned stores across Gujarat and Rajasthan, plus selective B2B bulk supply.",
    sector: "Consumer Electronics Retail", registrar: "Bigshare Services Pvt Ltd",
    strengths: ["Established multi-brand retail footprint", "Diversified OEM relationships", "Regional market density"],
    risks: ["Severely undersubscribed issue (0.02x)", "Thin retail margins", "High competition from e-commerce"] },

  { id: "sampark-logistics", name: "Sampark India Logistics", company: "Sampark India Logistics Ltd.", type: "SME", status: "Listed",
    open: "2026-06-30", close: "2026-07-02", listing: "2026-07-07", allotment: "2026-07-03", refund: "2026-07-04", demat: "2026-07-04",
    priceMin: 80, priceMax: 84, faceValue: 10, lot: 1600, issueSize: 27.22, freshIssue: 27.22, ofs: 0,
    gmp: 0, trend: "stable", estListing: 84, listedAt: 84, currentPrice: 82,
    gmpHistory: [{ d: "Jun28", v: 3 }, { d: "Jun30", v: 2 }, { d: "Jul1", v: 1 }, { d: "Jul2", v: 0 }],
    drhp: "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents", rhp: null,
    leadManager: "Corpwis Advisors", exchange: "NSE Emerge",
    sub: { overall: 2.1, qib: 1.4, hni: 3.2, retail: 1.8, employee: null, shareholder: null },
    fin: { revenue: 201.62, pat: 8.69, ebitda: 16.16, eps: 5.9, pe: 11.86, roe: 19.8, netWorth: 43.9, debt: 27.1 },
    about: "Carrying-and-forwarding agent offering freight forwarding, warehousing and distribution via 50 branch offices across 18 states and 8 leased warehouses.",
    sector: "Logistics", registrar: "Maashitla Securities Pvt Ltd",
    strengths: ["Pan-India 50-branch network", "Asset-light C&F model", "Diversified client industries"],
    risks: ["Thin net margins typical of logistics", "Fuel-cost sensitivity", "Fragmented, competitive sector"] },

  { id: "atharva-polyplast", name: "Atharva Polyplast", company: "Atharva Poly-Plast Ltd.", type: "SME", status: "Listed",
    open: "2026-06-30", close: "2026-07-02", listing: "2026-07-07", allotment: "2026-07-03", refund: "2026-07-04", demat: "2026-07-04",
    priceMin: 55, priceMax: 60, faceValue: 10, lot: 2000, issueSize: 27.0, freshIssue: 27.0, ofs: 0,
    gmp: 8, trend: "down", estListing: 68, listedAt: 65, currentPrice: 60,
    gmpHistory: [{ d: "Jun22", v: 10 }, { d: "Jun27", v: 7 }, { d: "Jun29", v: 9 }, { d: "Jun30", v: 8 }, { d: "Jul1", v: 8 }, { d: "Jul2", v: 8 }],
    drhp: "https://www.bsesme.com/PublicIssues/PublicIssues.aspx?id=1", rhp: null,
    leadManager: "Swastika Investmart", exchange: "BSE SME",
    sub: { overall: 3.4, qib: 2.8, hni: 5.1, retail: 2.2, employee: null, shareholder: null },
    fin: { revenue: 49.06, pat: 5.29, ebitda: null, eps: 3.37, pe: 17.83, roe: 26.65, netWorth: 19.8, debt: 6.4 },
    about: "Satara (Maharashtra) manufacturer of precision injection-moulded plastic components for furniture, home-appliance and automotive OEMs / Tier-1 suppliers.",
    sector: "Plastics", registrar: "MUFG Intime India Pvt Ltd",
    strengths: ["Precision moulding capability", "OEM/Tier-1 relationships", "High ROE (26.65%)"],
    risks: ["Small-cap scale limits pricing power", "Polymer input-cost volatility", "Post-listing GMP has been softening"] },

  { id: "seemax-resources", name: "Seemax Resources", company: "Seemax Resources Ltd.", type: "SME", status: "Listed",
    open: "2026-06-30", close: "2026-07-02", listing: "2026-07-07", allotment: "2026-07-03", refund: "2026-07-04", demat: "2026-07-04",
    priceMin: 134, priceMax: 141, faceValue: 10, lot: 1000, issueSize: 19.74, freshIssue: 19.74, ofs: 0,
    gmp: 0, trend: "stable", estListing: 141, listedAt: 141, currentPrice: 138,
    gmpHistory: [{ d: "Jun28", v: 2 }, { d: "Jun30", v: 1 }, { d: "Jul1", v: 0 }, { d: "Jul2", v: 0 }],
    drhp: "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents", rhp: null,
    leadManager: "Fedex Securities", exchange: "NSE Emerge",
    sub: { overall: 1.6, qib: 0.8, hni: 2.4, retail: 1.3, employee: null, shareholder: null },
    fin: { revenue: 14.46, pat: 2.24, ebitda: 4.85, eps: 7.46, pe: 20.74, roe: 48.65, netWorth: 8.9, debt: 4.2 },
    about: "Vadodara-based rental & trading of material handling equipment (forklifts, cranes, pallet/reach trucks); ~95% revenue from recurring rentals.",
    sector: "Material Handling Equipment", registrar: "Cameo Corporate Services Ltd",
    strengths: ["~95% recurring rental revenue", "Very high ROE (48.65%)", "Diversified industrial client base"],
    risks: ["Tiny revenue base (₹14.46 Cr)", "Capital-intensive fleet ownership", "No GMP premium at listing"] },

  { id: "aastha-spintex", name: "Aastha Spintex", company: "Aastha Spintex Ltd.", type: "Mainboard", status: "Listed",
    open: "2026-06-29", close: "2026-07-01", listing: "2026-07-06", allotment: "2026-07-02", refund: "2026-07-03", demat: "2026-07-03",
    priceMin: 125, priceMax: 136, faceValue: 10, lot: 110, issueSize: 170, freshIssue: 130, ofs: 40,
    gmp: 2, trend: "down", estListing: 138, listedAt: 136, currentPrice: 130,
    gmpHistory: [{ d: "Jun25", v: 4 }, { d: "Jun26", v: 5.25 }, { d: "Jun27", v: 5 }, { d: "Jun28", v: 5.25 }, { d: "Jun29", v: 5.75 }, { d: "Jul1", v: 2 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/oct-2025/aastha-spintex-limited-drhp_97148.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jun-2026/aastha-spintex-limited-rhp_102246.html",
    leadManager: "Corporate Capital Ventures", exchange: "BSE, NSE",
    sub: { overall: 5.05, qib: 3.59, hni: 8.29, retail: 2.54, employee: null, shareholder: null },
    fin: { revenue: 352.17, pat: 22.92, ebitda: 46.36, eps: 5.3, pe: 25.65, roe: 23.21, netWorth: 98.7, debt: 62.3 },
    about: "Morbi (Gujarat) manufacturer of carded, combed and compact-combed cotton yarns from an integrated spinning-and-ginning facility; funds part-acquire Falcon Yarns.",
    sector: "Textiles", registrar: "Bigshare Services Pvt Ltd",
    strengths: ["Integrated spinning-ginning facility", "Acquisition-funded capacity growth", "Diversified yarn product mix"],
    risks: ["Cotton price volatility", "Highly competitive commodity textile space", "Listing-day gain has compressed to near-flat"] },

  { id: "adon-agro", name: "Adon Agro", company: "Adon Agro Commodities Ltd.", type: "SME", status: "Listed",
    open: "2026-06-29", close: "2026-07-01", listing: "2026-07-06", allotment: "2026-07-02", refund: "2026-07-03", demat: "2026-07-03",
    priceMin: 66, priceMax: 70, faceValue: 10, lot: 2000, issueSize: 44.03, freshIssue: 44.03, ofs: 0,
    gmp: 0, trend: "stable", estListing: 70, listedAt: 70, currentPrice: 68,
    gmpHistory: [{ d: "Jun26", v: 2 }, { d: "Jun28", v: 1 }, { d: "Jun29", v: 0 }, { d: "Jul1", v: 0 }],
    drhp: "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents", rhp: null,
    leadManager: "Fedex Securities", exchange: "NSE Emerge",
    sub: { overall: 0.9, qib: 0.5, hni: 1.1, retail: 0.8, employee: null, shareholder: null },
    fin: { revenue: 220.76, pat: 16.74, ebitda: null, eps: 3.0, pe: 23.36, roe: 22.1, netWorth: 45.8, debt: 31.5 },
    about: "Navi Mumbai sourcer/importer/distributor of dry fruits, nuts, seeds and berries — sold in bulk and under retail brand 'Hunger Nuts'.",
    sector: "Agri-Commodities", registrar: "KFin Technologies Ltd",
    strengths: ["Growing branded retail line (Hunger Nuts)", "Diversified sourcing geography", "Rising consumer demand for dry fruits"],
    risks: ["Import/currency exposure", "Undersubscribed issue (0.9x)", "Low-margin commodity trading core"] },

  { id: "csm-technologies", name: "CSM Technologies", company: "CSM Technologies Ltd.", type: "Mainboard", status: "Listed",
    open: "2026-06-24", close: "2026-06-29", listing: "2026-07-02", allotment: "2026-06-30", refund: "2026-07-01", demat: "2026-07-01",
    priceMin: 107, priceMax: 113, faceValue: 10, lot: 132, issueSize: 145.78, freshIssue: 100, ofs: 45.78,
    gmp: 0, trend: "stable", estListing: 113, listedAt: 113, currentPrice: 107.35,
    gmpHistory: [{ d: "Jun24", v: 8 }, { d: "Jun26", v: 5 }, { d: "Jun27", v: 4 }, { d: "Jun29", v: 0 }, { d: "Jul1", v: 0 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/sep-2025/csm-technologies-limited-drhp_96901.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jun-2026/csm-technologies-limited-rhp_102194.html",
    leadManager: "Corporate Capital Ventures", exchange: "BSE, NSE",
    sub: { overall: 1.37, qib: 1.02, hni: 1.54, retail: 1.63, employee: null, shareholder: null },
    fin: { revenue: 200.63, pat: 14.09, ebitda: null, eps: 3.8, pe: 29.75, roe: 16.54, netWorth: 85.2, debt: 11.9 },
    about: "Bhubaneswar GovTech company, 27+ years building e-governance platforms for mining, agriculture, education and healthcare clients in India and Africa.",
    sector: "GovTech / IT Services", registrar: "KFin Technologies Ltd",
    strengths: ["27+ year GovTech track record", "Multi-country (India + Africa) presence", "Diversified government verticals"],
    risks: ["Listed flat, then hit lower circuit (-5%)", "Government-tender dependent revenue", "Long sales cycles"] },
];

const DATA_AS_OF = "July 3, 2026";
const rupee = (n) => n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;
const cr = (n) => n == null ? "N/A" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
const price = (i) => i.priceMax || i.priceMin;
const profitPerLot = (i) => (!i.lot || !i.gmp) ? 0 : i.gmp * i.lot;
const investment = (i) => price(i) * i.lot;
const gainPct = (i) => { const p = price(i); return p ? (i.gmp / p) * 100 : 0; };
const listingGainPct = (i) => (i.listedAt && i.priceMax) ? ((i.listedAt - i.priceMax) / i.priceMax) * 100 : null;
const currentReturnPct = (i) => (i.currentPrice && i.listedAt) ? ((i.currentPrice - i.listedAt) / i.listedAt) * 100 : null;

// A few SME IPOs don't have a confirmed direct SEBI/exchange document URL yet —
// for those we link to the exchange's official offer-documents portal instead
// of a third-party aggregator. This flags that case so the button can say so
// honestly rather than implying it's the exact filing.
const PORTAL_URLS = new Set([
  "https://www.nseindia.com/companies-listing/corporate-filings-offer-documents",
  "https://www.bsesme.com/PublicIssues/PublicIssues.aspx?id=1",
]);
const isPortalLink = (url) => PORTAL_URLS.has(url);

// Computes the IPO's status live from today's date instead of a fixed field,
// so "Open"/"Upcoming"/"Closed"/"Listed" is always correct for whatever day
// the dashboard is opened on — not just the day the data was last refreshed.
function liveStatus(ipo, today) {
  const d = (s) => new Date(s + "T00:00:00+05:30"); // dates are IST
  const open = d(ipo.open), close = d(ipo.close), listing = d(ipo.listing);
  if (today < open) return "Upcoming";
  if (today <= close) return "Open";
  if (today < listing) return "Closed";
  return "Listed";
}

// Holds the most recent investorgain.com scrape result (see LiveDataBadge).
// Populated by fetchLiveData() below; getLiveIPOS() overlays it onto the
// verified baseline so every part of the app reads through one function.
let _liveOverlay = { updatedAt: null, byId: {} };

function getLiveIPOS() {
  const today = new Date();
  return IPOS_BASE.map((ipo) => {
    const patch = _liveOverlay.byId[ipo.id];
    const merged = patch ? { ...ipo, ...patch } : ipo;
    return { ...merged, status: liveStatus(merged, today) };
  });
}

// Pulls the investorgain.com scrape result your GitHub Action publishes
// (see public/live-data.json in the automation repo) and overlays it onto
// the baseline data. Call this from App on load, hourly, and on manual
// refresh. Returns true/false so the caller can show sync status.
async function fetchLiveData(rawUrl) {
  if (!rawUrl) return false;
  try {
    const res = await fetch(`${rawUrl}${rawUrl.includes("?") ? "&" : "?"}t=${Date.now()}`);
    if (!res.ok) return false;
    const json = await res.json();
    if (!json || typeof json.ipos !== "object") return false;
    // An empty/seed file (updatedAt still null, or no IPOs yet) means the
    // GitHub Action hasn't completed a real scrape yet — treat that as "not
    // synced" rather than fabricating a fresh timestamp.
    if (!json.updatedAt || Object.keys(json.ipos).length === 0) return false;
    _liveOverlay = { updatedAt: json.updatedAt, byId: json.ipos };
    return true;
  } catch {
    return false;
  }
}

// Single source of truth for "how fresh is this data" — read live everywhere
// it's displayed (sidebar footer, AI assistant) instead of ever hardcoding a date.
function formatDataAsOf() {
  return _liveOverlay.updatedAt
    ? new Date(_liveOverlay.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : `${DATA_AS_OF} baseline — live sync pending first Action run`;
}

const STATUS_COLOR = { Open: BRAND.green, Closed: "#94A3B8", Upcoming: "#F0A202", Listed: BRAND.blue };
const TrendIcon = ({ trend, size = 13 }) =>
  trend === "up" ? <TrendingUp size={size} style={{ color: BRAND.green }} /> :
  trend === "down" ? <TrendingDown size={size} className="text-rose-500" /> :
  <Minus size={size} className="text-slate-400" />;

/* =====================================================================
   PERSISTENT WATCHLIST (survives reloads via browser localStorage)
===================================================================== */
function useWatchlist() {
  const [ids, setIds] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipo-watchlist");
      if (raw) setIds(JSON.parse(raw));
    } catch { /* no saved watchlist yet, or storage unavailable (e.g. private browsing) */ }
    setReady(true);
  }, []);

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("ipo-watchlist", JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { ids, toggle, ready };
}

/* =====================================================================
   AI ASSISTANT (Claude via artifact API proxy)
===================================================================== */
function buildSystemPrompt() {
  const rows = getLiveIPOS().map((i) =>
    `${i.name} (${i.type}, ${i.status}): price ₹${i.priceMin}-₹${i.priceMax}, lot ${i.lot}, GMP ₹${i.gmp} (${gainPct(i).toFixed(1)}%), ` +
    `est. profit/lot ₹${profitPerLot(i)}, issue ₹${i.issueSize} Cr, open ${i.open} close ${i.close} listing ${i.listing}, sector ${i.sector}` +
    `${i.fin ? `, revenue ${cr(i.fin.revenue)}, PAT ${cr(i.fin.pat)}, ROE ${i.fin.roe}%, P/E ${i.fin.pe}x` : ""}` +
    `${i.sub ? `, subscription ${i.sub.overall}x overall` : ""}` +
    `${i.currentPrice ? `, currently trading ₹${i.currentPrice} (${currentReturnPct(i)?.toFixed(1)}% since listing)` : ""}.`
  ).join("\n");
  return `You are an IPO intelligence assistant for Indian stock market IPOs. Data as of ${formatDataAsOf()}. ` +
    `Answer using ONLY this dataset — be concise, use ₹ figures, use markdown tables when comparing multiple IPOs, ` +
    `and clearly note this is not investment advice when giving any recommendation or listing prediction.\n\nDATA:\n${rows}`;
}

async function askClaude(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ max_tokens: 800, system: buildSystemPrompt(), messages }),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an unreadable response (HTTP ${res.status}). The /api/chat function may not be deployed correctly.`);
  }
  if (!res.ok) throw new Error(data?.error || `Assistant request failed (HTTP ${res.status})`);
  return (data.content || []).map((b) => b.text || "").join("\n").trim() || "Sorry, I couldn't generate a response just now.";
}

// Generates 3-4 short, contextually relevant follow-up questions based on how
// the conversation has gone so far, so suggestions never disappear after the
// first click — they evolve with the conversation instead.
async function getFollowUpQuestions(conversation) {
  const transcript = conversation.slice(-6).map((m) => `${m.role}: ${m.content}`).join("\n");
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 200,
        system: buildSystemPrompt() +
          "\n\nBased on the conversation so far, suggest 3-4 short, specific follow-up questions the user might ask next about these IPOs. " +
          "Respond with ONLY a JSON array of strings, nothing else — no markdown, no code fences, no preamble.",
        messages: [{ role: "user", content: `Conversation so far:\n${transcript}\n\nSuggest the follow-up questions now.` }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Suggestion request failed");
    const text = (data.content || []).map((b) => b.text || "").join("").trim();
    const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4).filter((q) => typeof q === "string");
  } catch { /* fall through to default set below */ }
  return DEFAULT_SUGGESTED_Q;
}

const DEFAULT_SUGGESTED_Q = [
  "Which open IPO has the best estimated listing profit?",
  "Compare Knack Packaging and IC Electricals financials",
  "Which SME IPOs are undersubscribed?",
  "What are the risks of Kusumgar?",
];

function AssistantPane({ embedded, tick }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: `Hi! Ask me about any IPO — GMP, subscription, financials, or estimated listing profit. Data as of ${formatDataAsOf()}.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTED_Q);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  // `tick` is bumped hourly (and on manual refresh) by the parent App, so this
  // label re-renders with the latest investorgain sync time automatically —
  // it is never a fixed/hardcoded string.
  const freshnessLabel = useMemo(() => formatDataAsOf(), [tick]);

  const send = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await askClaude(next.map((m) => ({ role: m.role, content: m.content })));
      const withReply = [...next, { role: "assistant", content: reply }];
      setMessages(withReply);
      // Refresh suggestions in the background so they're ready right after
      // the answer lands, without blocking the visible reply.
      setSuggestLoading(true);
      getFollowUpQuestions(withReply)
        .then(setSuggestions)
        .finally(() => setSuggestLoading(false));
    } catch (err) {
      console.error("Assistant error:", err);
      const msg = err?.message || "Unknown error";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Couldn't reach the assistant: ${msg}\n\nIf you're the site owner: check that ANTHROPIC_API_KEY is set in Vercel → Settings → Environment Variables, that you redeployed after adding it, and that your Anthropic account has billing/credits enabled at console.anthropic.com.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${embedded ? "h-[70vh]" : "h-full"}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pb-2">
        <Sparkles size={11} />
        <span>Data as of {freshnessLabel}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === "user"
                ? { background: `${BRAND.blue}18`, color: "#0b4a6b" }
                : { background: "rgba(255,255,255,0.7)", color: "#334155", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400 px-2">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap items-center gap-2 py-2">
        {suggestLoading && <span className="text-[11px] text-slate-400 px-1">Updating suggestions…</span>}
        {!suggestLoading && suggestions.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={loading}
            className="text-xs bg-white/70 border border-black/5 rounded-full px-3 py-1.5 text-slate-600 hover:border-black/10 disabled:opacity-50">
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about any IPO…"
          className="flex-1 bg-white/80 border border-black/10 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        />
        <button onClick={() => send()} disabled={loading} className="rounded-xl px-3.5 flex items-center justify-center text-white disabled:opacity-50"
          style={{ background: BRAND.blue }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
   IPO CALCULATOR
===================================================================== */
function CalculatorTab() {
  const [ipoId, setIpoId] = useState(getLiveIPOS().find((i) => i.status === "Open")?.id || getLiveIPOS()[0].id);
  const [lots, setLots] = useState(1);
  const ipo = getLiveIPOS().find((i) => i.id === ipoId);
  const p = price(ipo);
  const shares = ipo.lot * lots;
  const inv = p * shares;
  const estListingValue = (ipo.estListing || p) * shares;
  const profit = estListingValue - inv;
  const roi = inv ? (profit / inv) * 100 : 0;
  const breakeven = p; // break-even listing price per share

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Choose IPO</p>
        <select value={ipoId} onChange={(e) => setIpoId(e.target.value)}
          className="w-full bg-white/80 border border-black/10 rounded-xl px-3 py-2 text-sm text-slate-700 mb-4">
          {getLiveIPOS().map((i) => <option key={i.id} value={i.id}>{i.company}</option>)}
        </select>

        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Number of lots</p>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setLots((l) => Math.max(1, l - 1))} className="w-9 h-9 rounded-xl bg-white/80 border border-black/10 text-slate-600">−</button>
          <span className="font-mono text-lg text-slate-800 w-10 text-center">{lots}</span>
          <button onClick={() => setLots((l) => l + 1)} className="w-9 h-9 rounded-xl bg-white/80 border border-black/10 text-slate-600">+</button>
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p>Price band: <span className="font-mono text-slate-700">₹{ipo.priceMin}-₹{ipo.priceMax}</span></p>
          <p>Lot size: <span className="font-mono text-slate-700">{ipo.lot} shares</span></p>
          <p>Current GMP: <span className="font-mono text-slate-700">{rupee(ipo.gmp)}</span></p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Result</p>
        {[
          ["Shares allotted", shares.toLocaleString("en-IN")],
          ["Investment amount", rupee(inv)],
          ["Break-even price / share", rupee(breakeven)],
          ["Est. listing price / share", rupee(ipo.estListing || p)],
          ["Est. listing value", rupee(estListingValue)],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-slate-500">{l}</span>
            <span className="font-mono text-slate-800">{v}</span>
          </div>
        ))}
        <div className="border-t border-black/10 pt-3 flex justify-between items-center">
          <span className="text-sm text-slate-600">Estimated profit</span>
          <span className="font-mono text-lg font-medium" style={{ color: profit >= 0 ? "#0f9d68" : "#e11d48" }}>
            {profit >= 0 ? "+" : ""}{rupee(profit)} ({roi.toFixed(1)}%)
          </span>
        </div>
        <p className="text-[11px] text-slate-400 pt-2">Based on current GMP — grey-market premiums are informal and can change rapidly before listing. Not investment advice.</p>
      </div>
    </div>
  );
}

/* =====================================================================
   IPO CARD
===================================================================== */
function IPOCard({ ipo, onOpen, watchlist }) {
  const watched = watchlist.ids.includes(ipo.id);
  return (
    <div className="glass rounded-2xl p-4 hover:shadow-lg transition-shadow relative group">
      <button
        onClick={(e) => { e.stopPropagation(); watchlist.toggle(ipo.id); }}
        className="absolute top-4 right-4 text-slate-400 hover:text-amber-500 z-10"
        title={watched ? "Remove from watchlist" : "Add to watchlist"}
      >
        {watched ? <BookmarkCheck size={17} style={{ color: BRAND.blue }} /> : <Bookmark size={17} />}
      </button>

      <button onClick={() => onOpen(ipo)} className="w-full text-left">
        <div className="pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-slate-800 font-semibold">{ipo.company}</h3>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white" style={{ background: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6" }}>{ipo.type}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{ipo.sector}</p>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={ipo.trend} />
            <span className="font-mono text-sm font-medium" style={{ color: ipo.gmp > 0 ? "#0f9d68" : "#64748b" }}>{rupee(ipo.gmp)}</span>
            <span className="text-[11px] text-slate-400">GMP · {gainPct(ipo).toFixed(1)}%</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[ipo.status]}22`, color: STATUS_COLOR[ipo.status] }}>{ipo.status}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div><p className="text-slate-400">Price</p><p className="font-mono text-slate-700">{ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "TBD"}</p></div>
          <div><p className="text-slate-400">Lot</p><p className="font-mono text-slate-700">{ipo.lot || "TBD"}</p></div>
          <div><p className="text-slate-400">Issue size</p><p className="font-mono text-slate-700">{ipo.issueSize ? `₹${ipo.issueSize} Cr` : "TBD"}</p></div>
        </div>

        {ipo.lot > 0 && ipo.gmp > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl px-3 py-2" style={{ background: `${BRAND.green}22` }}>
            <span className="text-[11px]" style={{ color: "#3f6212" }}>Est. profit / lot</span>
            <span className="font-mono font-medium" style={{ color: "#3f6212" }}>+{rupee(profitPerLot(ipo))}</span>
          </div>
        )}

        {ipo.status === "Listed" && ipo.currentPrice && (
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Since listing</span>
            <span className="font-mono flex items-center gap-0.5" style={{ color: currentReturnPct(ipo) >= 0 ? "#0f9d68" : "#e11d48" }}>
              {currentReturnPct(ipo) >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {currentReturnPct(ipo)?.toFixed(1)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><Calendar size={11} /> {ipo.open} → {ipo.close}</span>
          <span className="flex items-center gap-1" style={{ color: BRAND.blue }}>Details <ChevronRight size={12} /></span>
        </div>
      </button>
    </div>
  );
}

/* =====================================================================
   IPO DETAIL MODAL
===================================================================== */
function IPODetail({ ipo, onClose, watchlist }) {
  if (!ipo) return null;
  const watched = watchlist.ids.includes(ipo.id);
  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur border border-white shadow-2xl rounded-3xl max-w-3xl w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-black/5 flex items-start justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl text-slate-800 font-semibold">{ipo.company}</h2>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full text-white" style={{ background: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6" }}>{ipo.type}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[ipo.status]}22`, color: STATUS_COLOR[ipo.status] }}>{ipo.status}</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{ipo.sector} · Exchange: {ipo.exchange} · Lead Manager: {ipo.leadManager}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => watchlist.toggle(ipo.id)} className="text-slate-400 hover:text-amber-500">
              {watched ? <BookmarkCheck size={20} style={{ color: BRAND.blue }} /> : <Bookmark size={20} />}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed">{ipo.about}</p>

          {/* IPO Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Price band", ipo.priceMin ? `₹${ipo.priceMin}-₹${ipo.priceMax}` : "TBD"],
              ["Face value", `₹${ipo.faceValue}`],
              ["Lot size", ipo.lot || "TBD"],
              ["Min. investment", ipo.lot ? rupee(investment(ipo)) : "TBD"],
              ["Issue size", ipo.issueSize ? `₹${ipo.issueSize} Cr` : "TBD"],
              ["Fresh issue", ipo.freshIssue ? `₹${ipo.freshIssue} Cr` : "—"],
              ["OFS", ipo.ofs ? `₹${ipo.ofs} Cr` : "—"],
              ["Registrar", ipo.registrar],
            ].map(([l, v]) => (
              <div key={l} className="glass-inset rounded-xl p-3">
                <p className="text-[11px] text-slate-400">{l}</p>
                <p className="font-mono text-slate-800 text-sm mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div>
            <SectionLabel icon={Clock}>Important Dates</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {[["Open", ipo.open], ["Close", ipo.close], ["Allotment", ipo.allotment], ["Refund", ipo.refund], ["Demat credit", ipo.demat], ["Listing", ipo.listing]].map(([l, v]) => (
                <div key={l} className="glass-inset rounded-xl p-2.5"><p className="text-[10px] text-slate-400">{l}</p><p className="font-mono text-slate-700">{v}</p></div>
              ))}
            </div>
          </div>

          {/* Estimated profit */}
          {ipo.lot > 0 && ipo.gmp > 0 && (
            <div className="rounded-2xl p-4" style={{ background: `${BRAND.green}1c`, border: `1px solid ${BRAND.green}55` }}>
              <p className="text-xs mb-2 font-medium" style={{ color: "#3f6212" }}>Estimated listing profit (1 lot)</p>
              <div className="grid grid-cols-3 gap-3 text-sm font-mono">
                <div><p className="text-[11px] text-slate-500">Investment</p><p className="text-slate-800">{rupee(investment(ipo))}</p></div>
                <div><p className="text-[11px] text-slate-500">GMP × lot</p><p style={{ color: "#0f9d68" }}>+{rupee(profitPerLot(ipo))}</p></div>
                <div><p className="text-[11px] text-slate-500">Est. listing price</p><p className="text-slate-800">{rupee(ipo.estListing)}</p></div>
              </div>
            </div>
          )}

          {/* Listed performance */}
          {ipo.status === "Listed" && (
            <div>
              <SectionLabel icon={Activity}>Listing Performance</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="glass-inset rounded-xl p-2.5"><p className="text-[10px] text-slate-400">Issue price</p><p className="font-mono text-slate-700">{rupee(ipo.priceMax)}</p></div>
                <div className="glass-inset rounded-xl p-2.5"><p className="text-[10px] text-slate-400">Listing price</p><p className="font-mono text-slate-700">{rupee(ipo.listedAt)}</p></div>
                <div className="glass-inset rounded-xl p-2.5"><p className="text-[10px] text-slate-400">Listing gain</p><p className="font-mono" style={{ color: listingGainPct(ipo) >= 0 ? "#0f9d68" : "#e11d48" }}>{listingGainPct(ipo)?.toFixed(1)}%</p></div>
                <div className="glass-inset rounded-xl p-2.5"><p className="text-[10px] text-slate-400">Current / return</p><p className="font-mono" style={{ color: currentReturnPct(ipo) >= 0 ? "#0f9d68" : "#e11d48" }}>{rupee(ipo.currentPrice)} ({currentReturnPct(ipo)?.toFixed(1)}%)</p></div>
              </div>
            </div>
          )}

          {/* GMP history chart */}
          {ipo.gmpHistory?.length > 1 && (
            <div>
              <SectionLabel icon={BarChart3}>GMP History</SectionLabel>
              <div className="glass-inset rounded-xl p-3">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={ipo.gmpHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="d" fontSize={11} stroke="#94a3b8" />
                    <YAxis fontSize={11} stroke="#94a3b8" width={35} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(0,0,0,0.06)" }} />
                    <Line type="monotone" dataKey="v" stroke={BRAND.blue} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Subscription */}
          {ipo.sub && (
            <div>
              <SectionLabel icon={PieIcon}>Subscription</SectionLabel>
              <div className="space-y-2">
                {[["Overall", ipo.sub.overall], ["QIB", ipo.sub.qib], ["HNI / NII", ipo.sub.hni], ["Retail", ipo.sub.retail]].map(([l, v]) => (
                  <div key={l}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{l}</span><span className="font-mono text-slate-700">{v}x</span></div>
                    <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v / Math.max(...Object.values(ipo.sub).filter((x) => x != null))) * 100)}%`, background: BRAND.blue }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financials */}
          {ipo.fin && (
            <div>
              <SectionLabel icon={Landmark}>Financials (latest FY)</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {[["Revenue", cr(ipo.fin.revenue)], ["PAT", cr(ipo.fin.pat)], ["EBITDA", ipo.fin.ebitda ? cr(ipo.fin.ebitda) : "N/A"],
                  ["Net worth", cr(ipo.fin.netWorth)], ["Debt", cr(ipo.fin.debt)], ["EPS", `₹${ipo.fin.eps}`], ["P/E", `${ipo.fin.pe}x`], ["ROE", `${ipo.fin.roe}%`]].map(([l, v]) => (
                  <div key={l} className="glass-inset rounded-xl p-2.5"><p className="text-[10px] text-slate-400">{l}</p><p className="font-mono text-slate-700">{v}</p></div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths / Risks */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <SectionLabel>Strengths</SectionLabel>
              <ul className="space-y-1.5">
                {ipo.strengths?.map((s) => (
                  <li key={s} className="text-xs text-slate-600 flex gap-1.5"><span style={{ color: BRAND.green }}>●</span>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel>Risks</SectionLabel>
              <ul className="space-y-1.5">
                {ipo.risks?.map((s) => (
                  <li key={s} className="text-xs text-slate-600 flex gap-1.5"><span className="text-rose-400">●</span>{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 -mt-2">Strengths/risks are general analytical notes based on public business descriptions, not exhaustive DRHP risk factors. Read the full DRHP/RHP before investing.</p>

          {/* Documents */}
          {(ipo.drhp || ipo.rhp) && (
            <div className="flex gap-3 pt-1">
              {ipo.drhp && (
                <a href={ipo.drhp} target="_blank" rel="noreferrer"
                  title={isPortalLink(ipo.drhp) ? "Exact DRHP not yet confirmed — opens the official exchange filings portal to search for it" : "Official DRHP filing"}
                  className="flex-1 flex items-center justify-center gap-2 glass-inset hover:bg-white rounded-xl py-2.5 text-sm text-slate-700">
                  <FileText size={14} /> {isPortalLink(ipo.drhp) ? "Find DRHP on exchange" : "DRHP"} <ExternalLink size={11} className="text-slate-400" />
                </a>
              )}
              {ipo.rhp && (
                <a href={ipo.rhp} target="_blank" rel="noreferrer"
                  title={isPortalLink(ipo.rhp) ? "Exact RHP not yet confirmed — opens the official exchange filings portal to search for it" : "Official RHP filing"}
                  className="flex-1 flex items-center justify-center gap-2 glass-inset hover:bg-white rounded-xl py-2.5 text-sm text-slate-700">
                  <FileText size={14} /> {isPortalLink(ipo.rhp) ? "Find RHP on exchange" : "RHP"} <ExternalLink size={11} className="text-slate-400" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="text-xs uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5">
      {Icon && <Icon size={13} />} {children}
    </p>
  );
}

/* =====================================================================
   GMP TRENDS TAB
===================================================================== */
function GMPTab() {
  const data = useMemo(() => [...getLiveIPOS()].sort((a, b) => gainPct(b) - gainPct(a)).map((i) => ({ name: i.name, pct: Number(gainPct(i).toFixed(1)) })), []);
  return (
    <div className="glass rounded-2xl p-4">
      <SectionLabel icon={BarChart3}>GMP % gain — all IPOs</SectionLabel>
      <ResponsiveContainer width="100%" height={Math.max(340, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
          <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={150} interval={0} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(0,0,0,0.06)" }} formatter={(v) => [`${v}%`, "Est. gain"]} />
          <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
            {data.map((d, idx) => <Cell key={idx} fill={d.pct > 15 ? BRAND.green : d.pct > 0 ? "#c8e6a0" : "#cbd5e1"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =====================================================================
   SUBSCRIPTIONS TAB
===================================================================== */
function SubscriptionsTab() {
  const withSub = getLiveIPOS().filter((i) => i.sub);
  return (
    <div className="space-y-3">
      {withSub.map((ipo) => (
        <div key={ipo.id} className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-800">{ipo.company}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[ipo.status]}22`, color: STATUS_COLOR[ipo.status] }}>{ipo.status}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[["Overall", ipo.sub.overall], ["QIB", ipo.sub.qib], ["HNI", ipo.sub.hni], ["Retail", ipo.sub.retail]].map(([l, v]) => (
              <div key={l} className="glass-inset rounded-xl p-2 text-center">
                <p className="text-slate-400">{l}</p>
                <p className="font-mono text-slate-700 mt-0.5">{v}x</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   FINANCIALS TAB
===================================================================== */
function FinancialsTab() {
  const withFin = getLiveIPOS().filter((i) => i.fin);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {withFin.map((ipo) => (
        <div key={ipo.id} className="glass rounded-2xl p-4">
          <p className="text-sm font-medium text-slate-800 mb-2">{ipo.company}</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-slate-400">Revenue</p><p className="font-mono text-slate-700">{cr(ipo.fin.revenue)}</p></div>
            <div><p className="text-slate-400">PAT</p><p className="font-mono text-slate-700">{cr(ipo.fin.pat)}</p></div>
            <div><p className="text-slate-400">ROE</p><p className="font-mono text-slate-700">{ipo.fin.roe}%</p></div>
            <div><p className="text-slate-400">EPS</p><p className="font-mono text-slate-700">₹{ipo.fin.eps}</p></div>
            <div><p className="text-slate-400">P/E</p><p className="font-mono text-slate-700">{ipo.fin.pe}x</p></div>
            <div><p className="text-slate-400">EBITDA</p><p className="font-mono text-slate-700">{ipo.fin.ebitda ? cr(ipo.fin.ebitda) : "N/A"}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   DOCUMENTS TAB
===================================================================== */
function DocumentsTab() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-1">Mainboard IPOs link to official SEBI filings. SME IPOs (NSE Emerge / BSE SME) aren't filed with SEBI by regulation — those link to the exchange-hosted offer document instead.</p>
      {getLiveIPOS().map((ipo) => (
        <div key={ipo.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-400" />
            <span className="text-sm text-slate-700">{ipo.company}</span>
          </div>
          <div className="flex gap-2">
            {ipo.drhp && <a href={ipo.drhp} target="_blank" rel="noreferrer" title={isPortalLink(ipo.drhp) ? "Opens exchange portal to search" : "Official DRHP"} className="text-xs glass-inset hover:bg-white rounded-lg px-2.5 py-1 text-slate-600">{isPortalLink(ipo.drhp) ? "Find DRHP ↗" : "DRHP"}</a>}
            {ipo.rhp && <a href={ipo.rhp} target="_blank" rel="noreferrer" title={isPortalLink(ipo.rhp) ? "Opens exchange portal to search" : "Official RHP"} className="text-xs glass-inset hover:bg-white rounded-lg px-2.5 py-1 text-slate-600">{isPortalLink(ipo.rhp) ? "Find RHP ↗" : "RHP"}</a>}
            {!ipo.drhp && !ipo.rhp && <span className="text-xs text-slate-400">Not available</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   WATCHLIST TAB
===================================================================== */
function WatchlistTab({ watchlist, onOpen }) {
  const items = getLiveIPOS().filter((i) => watchlist.ids.includes(i.id));
  if (!watchlist.ready) return <p className="text-sm text-slate-400">Loading watchlist…</p>;
  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Bookmark size={28} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">No IPOs saved yet. Tap the bookmark icon on any IPO card to track it here.</p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={onOpen} watchlist={watchlist} />)}
    </div>
  );
}

/* =====================================================================
   STAT CARD
===================================================================== */
function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="glass rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${tint}22` }}>
          <Icon size={16} style={{ color: tint }} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-800 font-mono">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

/* =====================================================================
   MAIN APP
===================================================================== */
const NAV = [
  { id: "ai", label: "AI Assistant", icon: Sparkles },
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "open", label: "Open IPOs", icon: TrendingUp },
  { id: "closed", label: "Closed IPOs", icon: Clock },
  { id: "upcoming", label: "Upcoming IPOs", icon: Calendar },
  { id: "listed", label: "Listed IPOs", icon: Activity },
  { id: "gmp", label: "GMP Trends", icon: BarChart3 },
  { id: "subscriptions", label: "Subscriptions", icon: PieIcon },
  { id: "financials", label: "Financials", icon: Landmark },
  { id: "docs", label: "DRHP / RHP", icon: FileText },
  { id: "calculator", label: "Calculator", icon: CalcIcon },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
];

export default function App() {
  const [tab, setTab] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, setDark] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0); // bumped hourly + on manual refresh to force re-derive live status/data
  const [dataUrl, setDataUrl] = useState("/live-data.json"); // same-origin file this repo's GitHub Action keeps updated — works automatically, no setup needed
  const [showSourceInput, setShowSourceInput] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncOk, setSyncOk] = useState(null);
  const watchlist = useWatchlist();

  // Load a previously-saved investorgain live-data source URL (see LIVE_DATA_SETUP.md
  // from the automation repo — this points at your GitHub Action's public/live-data.json).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ipo-live-data-url");
      if (saved) setDataUrl(saved);
    } catch { /* not set yet, or storage unavailable */ }
  }, []);

  const syncNow = useCallback(async (url) => {
    const target = url ?? dataUrl;
    if (!target) return;
    const ok = await fetchLiveData(target);
    setSyncOk(ok);
    if (ok) setLastSync(_liveOverlay.updatedAt);
    setTick((t) => t + 1);
  }, [dataUrl]);

  // Initial sync + hourly auto-refresh, exactly as requested.
  useEffect(() => {
    if (dataUrl) syncNow(dataUrl);
    const hourly = setInterval(() => { syncNow(); setTick((t) => t + 1); }, 60 * 60 * 1000);
    return () => clearInterval(hourly);
  }, [dataUrl, syncNow]);

  const saveDataUrl = async (url) => {
    setDataUrl(url);
    try { localStorage.setItem("ipo-live-data-url", url); } catch { /* storage unavailable */ }
    if (url) syncNow(url);
  };

  const filtered = useMemo(() => {
    const all = getLiveIPOS();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((i) => i.company.toLowerCase().includes(q) || i.sector.toLowerCase().includes(q));
  }, [query, tick]);

  const counts = useMemo(() => {
    const all = getLiveIPOS();
    return {
      Open: all.filter((i) => i.status === "Open").length,
      Closed: all.filter((i) => i.status === "Closed").length,
      Upcoming: all.filter((i) => i.status === "Upcoming").length,
      Listed: all.filter((i) => i.status === "Listed").length,
      avgGmpPct: (all.reduce((s, i) => s + gainPct(i), 0) / all.length).toFixed(1),
      totalIssue: all.reduce((s, i) => s + (i.issueSize || 0), 0),
    };
  }, [tick]);

  const refresh = () => { setRefreshing(true); syncNow().finally(() => setTimeout(() => setRefreshing(false), 900)); };

  const groupedFiltered = (status) => filtered.filter((i) => i.status === status);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="h-screen flex overflow-hidden" style={{
        background: dark ? "#0b1220" : "linear-gradient(160deg, #eef7fc 0%, #f4faee 45%, #ffffff 100%)",
        color: dark ? "#e2e8f0" : "#1e293b",
      }}>
        <style>{`
          .glass { background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)"}; backdrop-filter: blur(14px); border: 1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)"}; box-shadow: 0 4px 24px rgba(28,155,218,0.06); }
          .glass-inset { background: ${dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)"}; border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}; }
          select { appearance: none; }
        `}</style>

        {/* SIDEBAR */}
        <aside className={`${sidebarOpen ? "w-64" : "w-0"} transition-all overflow-hidden shrink-0 border-r`}
          style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}>
          <div className="w-64 p-5 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.green})` }}>IQ</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: dark ? "#fff" : "#1e293b" }}>IPO Intelligence</p>
                <p className="text-[10px] text-slate-400">AI-powered IPO analysis</p>
              </div>
            </div>

            <nav className="mt-6 space-y-1 flex-1 overflow-y-auto">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => setTab(n.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors"
                  style={tab === n.id
                    ? { background: `${BRAND.blue}18`, color: BRAND.blue, fontWeight: 600 }
                    : { color: dark ? "#94a3b8" : "#64748b" }}>
                  <n.icon size={16} /> {n.label}
                </button>
              ))}
            </nav>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }}>
              <p className="text-[10px] text-slate-400">
                {lastSync
                  ? `Data as of ${new Date(lastSync).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                  : `Baseline data (${DATA_AS_OF}) — live sync pending first Action run`}
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* HEADER */}
          <header className="flex items-center gap-3 px-5 py-4 border-b sticky top-0 z-20 backdrop-blur-lg"
            style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", background: dark ? "rgba(11,18,32,0.7)" : "rgba(255,255,255,0.6)" }}>
            <button onClick={() => setSidebarOpen((s) => !s)} className="text-slate-400 hover:text-slate-700"><Menu size={18} /></button>

            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company or sector…"
                className="w-full glass-inset rounded-xl pl-8 pr-3 py-2 text-sm outline-none" style={{ color: dark ? "#e2e8f0" : "#334155" }} />
            </div>

            <div className="ml-auto flex items-center gap-2 relative">
              <button
                onClick={() => setShowSourceInput((s) => !s)}
                className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full"
                style={{ background: syncOk === true ? `${BRAND.green}22` : "rgba(148,163,184,0.18)", color: syncOk === true ? "#3f6212" : "#64748b" }}
                title={lastSync ? `Last synced ${new Date(lastSync).toLocaleString("en-IN")}` : "Auto-syncing from this repo's GitHub Action every hour — waiting for its first successful run"}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: syncOk === true ? BRAND.green : "#94a3b8" }} />
                {syncOk === true ? "Live Data" : "Awaiting first sync"}
              </button>

              {showSourceInput && (
                <div className="absolute top-11 right-0 w-80 glass rounded-2xl p-4 z-30 shadow-xl">
                  <p className="text-xs text-slate-500 mb-2">
                    This site auto-syncs from <span className="font-mono">/live-data.json</span>, kept fresh by this repo's GitHub Action (scrapes investorgain.com every 2 hours). No setup needed once the Action is enabled and has run once.
                  </p>
                  <p className="text-xs text-slate-500 mb-2">Only change this if you want to point at a different source:</p>
                  <input
                    defaultValue={dataUrl}
                    onKeyDown={(e) => e.key === "Enter" && saveDataUrl(e.currentTarget.value.trim())}
                    placeholder="/live-data.json"
                    className="w-full glass-inset rounded-xl px-3 py-2 text-xs outline-none mb-2"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString("en-IN")}` : "No successful sync yet"}</span>
                    <button onClick={() => setShowSourceInput(false)} className="text-xs px-2.5 py-1 rounded-lg text-white" style={{ background: BRAND.blue }}>Done</button>
                  </div>
                </div>
              )}

              <button onClick={refresh} className="w-9 h-9 rounded-xl glass-inset flex items-center justify-center text-slate-500">
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button className="w-9 h-9 rounded-xl glass-inset flex items-center justify-center text-slate-500 relative">
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
              </button>
              <button onClick={() => setDark((d) => !d)} className="w-9 h-9 rounded-xl glass-inset flex items-center justify-center text-slate-500">
                {dark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <button onClick={() => setTab("ai")} className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-white" style={{ background: BRAND.blue }}>
                <MessageCircle size={14} /> Ask AI
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-5 py-5 max-w-5xl w-full mx-auto">
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={TrendingUp} label="Open IPOs" value={counts.Open} tint={BRAND.green} />
                  <StatCard icon={Clock} label="Closed IPOs" value={counts.Closed} tint="#94a3b8" />
                  <StatCard icon={Calendar} label="Upcoming" value={counts.Upcoming} tint="#F0A202" />
                  <StatCard icon={Activity} label="Listed" value={counts.Listed} tint={BRAND.blue} />
                </div>

                {["Open", "Closed", "Upcoming", "Listed"].map((status) => groupedFiltered(status).length > 0 && (
                  <section key={status}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                      <h2 className="text-sm font-semibold text-slate-700">{status}</h2>
                      <span className="text-xs text-slate-400">{groupedFiltered(status).length}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {groupedFiltered(status).map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={setSelected} watchlist={watchlist} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {["open", "closed", "upcoming", "listed"].includes(tab) && (
              <div className="grid sm:grid-cols-2 gap-3">
                {groupedFiltered(tab[0].toUpperCase() + tab.slice(1)).map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={setSelected} watchlist={watchlist} />)}
              </div>
            )}

            {tab === "gmp" && <GMPTab />}
            {tab === "subscriptions" && <SubscriptionsTab />}
            {tab === "financials" && <FinancialsTab />}
            {tab === "docs" && <DocumentsTab />}
            {tab === "calculator" && <CalculatorTab />}
            {tab === "watchlist" && <WatchlistTab watchlist={watchlist} onOpen={setSelected} />}
            {tab === "ai" && <div className="glass rounded-2xl p-5"><AssistantPane embedded tick={tick} /></div>}
          </main>
        </div>
      </div>

      <IPODetail ipo={selected} onClose={() => setSelected(null)} watchlist={watchlist} />
    </div>
  );
}
