import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LabelList,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Send, X, MessageCircle, FileText,
  Calendar, Building2, ChevronRight, Sparkles, Search, Bell, RefreshCw,
  Sun, Moon, Menu, Bookmark, BookmarkCheck, Calculator as CalcIcon,
  LayoutGrid, Activity, PieChart as PieIcon, BarChart3, Landmark,
  ExternalLink, Clock, ArrowUpRight, ArrowDownRight,
  Home, CircleDollarSign, ChevronsLeft
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
    gmp: 35, trend: "up", estListing: 205, listedAt: 188, currentPrice: 188.20,
    gmpHistory: [{ d: "Jun24", v: 12 }, { d: "Jun28", v: 18 }, { d: "Jun30", v: 15 }, { d: "Jul1", v: 28 }, { d: "Jul2", v: 28 }, { d: "Jul3", v: 35 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/sep-2025/knack-packaging-limited-drhp_96482.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/knack-packaging-limited-prospectus_102599.html",
    leadManager: "Unistone Capital", exchange: "BSE, NSE",
    sub: { overall: 18.5, qib: 27.4, hni: 21.6, retail: 9.2, employee: null, shareholder: null, retail_apps: 6.8, shni_apps: 12.4, bhni_apps: 3.8 },
    fin: { revenue: 843.77, pat: 92.72, ebitda: 172.29, eps: 9.27, pe: 18.33, roe: 35.75, netWorth: 259.4, debt: 118.2 },
    about: "Ahmedabad-based integrated packaging solutions provider manufacturing PLWPP bags for food, pet food, agrochemical and construction sectors; exports to 68+ countries.",
    sector: "Packaging", registrar: "MUFG Intime India Pvt Ltd",
    strengths: ["68+ country export footprint", "Integrated manufacturing (backward-linked)", "Diversified end-user base"],
    risks: ["Raw material (polypropylene) price volatility", "Customer concentration in a few large accounts", "Working-capital intensive model"] },

  { id: "ic-electricals", name: "IC Electricals", company: "IC Electricals Co. Ltd.", type: "SME", status: "Open",
    open: "2026-07-03", close: "2026-07-07", listing: "2026-07-10", allotment: "2026-07-08", refund: "2026-07-09", demat: "2026-07-09",
    priceMin: 94, priceMax: 99, faceValue: 10, lot: 1200, issueSize: 47.91, freshIssue: 47.91, ofs: 0,
    gmp: 44, trend: "up", estListing: 143, listedAt: 166, currentPrice: 169,
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
    open: "2026-07-14", close: "2026-07-16", listing: "2026-07-21", allotment: "2026-07-17", refund: "2026-07-20", demat: "2026-07-20",
    priceMin: 545, priceMax: 574, faceValue: 1, lot: 26, issueSize: 9813, freshIssue: 0, ofs: 9813,
    gmp: 97, trend: "up", estListing: 671, gmpHistory: [{ d: "Jul9", v: 90 }, { d: "Jul11", v: 101 }, { d: "Jul12", v: 101 }, { d: "Jul13", v: 97 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/mar-2026/sbi-funds-management-limited-drhp_100517.html", rhp: null,
    leadManager: "Kotak Mahindra Capital", exchange: "BSE, NSE",
    sub: {
      overall: 41.66,
      qib: 140.11,
      hni: 22.51,
      retail: 3.60,
      snii: 15.51,
      bnii: 26.01,
      employee: 4.65,
      shareholder: 9.52,
      retail_apps: 2.32,
      shni_apps: 18.45,
      bhni_apps: 4.99,
      employee_apps: 1.30,
      shareholder_apps: 1.38
    }, fin: { revenue: 4976.11, pat: 3067.38, ebitda: 3755.20, eps: 28.14, pe: 20.40, roe: 34.80, netWorth: 9250.00, debt: 0 },
    about: "India's largest asset management company by mutual fund quarterly average AUM (~₹29.46 lakh crore as of Mar 2026), and investment manager to SBI Mutual Fund — a joint venture between State Bank of India and Amundi. 100% offer-for-sale; the company receives no proceeds from the IPO.",
    sector: "Asset Management", registrar: "KFin Technologies Ltd",
    strengths: ["India's largest AMC by AUM", "Strong brand trust (SBI + Amundi parentage)", "Diversified fund product mix"],
    risks: ["Pure OFS — no fresh capital to the company", "AMC earnings sensitive to market cycles", "Fee-compression pressure industry-wide"] },

  { id: "kusumgar", name: "Kusumgar", company: "Kusumgar Ltd.", type: "Mainboard", status: "Upcoming",
    open: "2026-07-08", close: "2026-07-10", listing: "2026-07-15", allotment: "2026-07-13", refund: "2026-07-14", demat: "2026-07-14",
    priceMin: 398, priceMax: 419, faceValue: 10, lot: 35, issueSize: 650, freshIssue: 0, ofs: 650,
    gmp: 155, trend: "up", estListing: 574, listedAt: 574, currentPrice: 574, gmpHistory: [{ d: "Jun28", v: 100 }, { d: "Jul1", v: 110 }, { d: "Jul2", v: 92 }, { d: "Jul7", v: 171 }, { d: "Jul9", v: 160 }, { d: "Jul10", v: 155 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/oct-2025/kusumgar-limited_97201.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/kusumgar-limited-rhp_102510.html",
    leadManager: "Axis Capital, ICICI Securities", exchange: "BSE, NSE",
    sub: { overall: 135.80, qib: 299.51, hni: 174.28, retail: 27.97, employee: null, shareholder: null, retail_apps: 22.45, shni_apps: 110.15, bhni_apps: 42.84 }, fin: { revenue: 711.78, pat: 98.20, ebitda: null, eps: 22.3, pe: 18.8, roe: 21.6, netWorth: 420.5, debt: 95.3 },
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
    gmp: 3, trend: "stable", estListing: 223, listedAt: 418, currentPrice: 215,
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
    gmp: 0, trend: "stable", estListing: 84, listedAt: 89, currentPrice: 82,
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
    gmp: 0, trend: "stable", estListing: 141, listedAt: 112.8, currentPrice: 138,
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
    gmp: 2, trend: "down", estListing: 138, listedAt: 130, currentPrice: 130,
    gmpHistory: [{ d: "Jun25", v: 4 }, { d: "Jun26", v: 5.25 }, { d: "Jun27", v: 5 }, { d: "Jun28", v: 5.25 }, { d: "Jun29", v: 5.75 }, { d: "Jul1", v: 2 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/oct-2025/aastha-spintex-limited-drhp_97148.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jun-2026/aastha-spintex-limited-rhp_102246.html",
    leadManager: "Corporate Capital Ventures", exchange: "BSE, NSE",
    sub: { overall: 5.05, qib: 3.59, hni: 8.29, retail: 2.54, employee: null, shareholder: null, retail_apps: 1.85, shni_apps: 4.80, bhni_apps: 1.62 },
    fin: { revenue: 352.17, pat: 22.92, ebitda: 46.36, eps: 5.3, pe: 25.65, roe: 23.21, netWorth: 98.7, debt: 62.3 },
    about: "Morbi (Gujarat) manufacturer of carded, combed and compact-combed cotton yarns from an integrated spinning-and-ginning facility; funds part-acquire Falcon Yarns.",
    sector: "Textiles", registrar: "Bigshare Services Pvt Ltd",
    strengths: ["Integrated spinning-ginning facility", "Acquisition-funded capacity growth", "Diversified yarn product mix"],
    risks: ["Cotton price volatility", "Highly competitive commodity textile space", "Listing-day gain has compressed to near-flat"] },

  { id: "adon-agro", name: "Adon Agro", company: "Adon Agro Commodities Ltd.", type: "SME", status: "Listed",
    open: "2026-06-29", close: "2026-07-01", listing: "2026-07-06", allotment: "2026-07-02", refund: "2026-07-03", demat: "2026-07-03",
    priceMin: 66, priceMax: 70, faceValue: 10, lot: 2000, issueSize: 44.03, freshIssue: 44.03, ofs: 0,
    gmp: 0, trend: "stable", estListing: 70, listedAt: 78.25, currentPrice: 68,
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
    sub: { overall: 1.37, qib: 1.02, hni: 1.54, retail: 1.63, employee: null, shareholder: null, retail_apps: 1.21, shni_apps: 1.15, bhni_apps: 0.92 },
    fin: { revenue: 200.63, pat: 14.09, ebitda: null, eps: 3.8, pe: 29.75, roe: 16.54, netWorth: 85.2, debt: 11.9 },
    about: "Bhubaneswar GovTech company, 27+ years building e-governance platforms for mining, agriculture, education and healthcare clients in India and Africa.",
    sector: "GovTech / IT Services", registrar: "KFin Technologies Ltd",
    strengths: ["27+ year GovTech track record", "Multi-country (India + Africa) presence", "Diversified government verticals"],
    risks: ["Listed flat, then hit lower circuit (-5%)", "Government-tender dependent revenue", "Long sales cycles"] },

  { id: "caliber-mining", name: "Caliber Mining", company: "Caliber Mining & Logistics Ltd.", type: "Mainboard", status: "Upcoming",
    open: "2026-07-17", close: "2026-07-21", listing: "2026-07-24", allotment: "2026-07-22", refund: "2026-07-23", demat: "2026-07-23",
    priceMin: 402, priceMax: 424, faceValue: 10, lot: 35, issueSize: 450, freshIssue: 400, ofs: 50,
    gmp: 100, trend: "up", estListing: 524, gmpHistory: [{ d: "Jul14", v: 92 }, { d: "Jul15", v: 98 }, { d: "Jul16", v: 100 }],
    drhp: "https://www.sebi.gov.in/filings/public-issues/jan-2025/caliber-mining-and-logistics-limited_90669.html", rhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/caliber-mining-and-logistics-limited-rhp_102715.html",
    leadManager: "DAM Capital Advisors Ltd", exchange: "BSE, NSE",
    sub: null, fin: { revenue: 382.4, pat: 42.1, ebitda: 85.6, eps: 12.0, pe: 35.3, roe: 18.5, netWorth: 227.4, debt: 45.1 },
    about: "Provides integrated mining services, coal extraction operations, and heavy bulk freight logistics solutions for power utilities and industrial producers.",
    sector: "Mining & Logistics", registrar: "KFin Technologies Ltd",
    strengths: ["Integrated end-to-end service offering", "Long-term revenue visibility from utility contracts", "High operating margin profile"],
    risks: ["Highly dependent on government coal contracts", "Capital intensive machinery fleet operations", "Environmental regulations exposure"] },

  { id: "cube-highways", name: "Cube Highways", company: "Cube Highways Trust InvIT", type: "Mainboard", status: "Upcoming",
    open: "2026-07-22", close: "2026-07-24", listing: "2026-07-29", allotment: "2026-07-25", refund: "2026-07-28", demat: "2026-07-28",
    priceMin: 151, priceMax: 152, faceValue: 10, lot: 95, issueSize: 5000, freshIssue: 0, ofs: 5000,
    gmp: 0, trend: "stable", estListing: 152, gmpHistory: [{ d: "Jul14", v: 0 }, { d: "Jul16", v: 0 }],
    drhp: "https://www.sebi.gov.in/filings/invit-public-issues.html", rhp: null,
    leadManager: "DAM Capital, Kotak Mahindra", exchange: "BSE, NSE",
    sub: null, fin: { revenue: 1420.5, pat: 285.4, ebitda: null, eps: null, pe: null, roe: null, netWorth: null, debt: null },
    about: "Infrastructure Investment Trust (InvIT) focused on holding and operating a diversified portfolio of toll and annuity road assets across major national highway corridors in India.",
    sector: "InvIT / Roads", registrar: "KFin Technologies Ltd",
    strengths: ["Stable cash flows from long-term highway assets", "High yield potential sponsored by global institutional investors", "Well-maintained road portfolio"],
    risks: ["Toll revenue risk from traffic volatility", "Interest rate fluctuations impact debt servicing", "Regulatory road construction risks"] },

  { id: "sotefin-bharat", name: "Sotefin Bharat", company: "Sotefin Bharat Ltd.", type: "SME", status: "Upcoming",
    open: "2026-07-16", close: "2026-07-20", listing: "2026-07-23", allotment: "2026-07-21", refund: "2026-07-22", demat: "2026-07-22",
    priceMin: 178, priceMax: 187, faceValue: 10, lot: 600, issueSize: 89.76, freshIssue: 89.76, ofs: 0,
    gmp: 18, trend: "up", estListing: 205, gmpHistory: [{ d: "Jul14", v: 12 }, { d: "Jul16", v: 18 }],
    drhp: "https://www.bsesme.com/PublicIssues/PublicIssues.aspx?id=1", rhp: null,
    leadManager: "Fedex Securities", exchange: "BSE SME",
    sub: null, fin: { revenue: 54.12, pat: 8.4, ebitda: 14.2, eps: 14.0, pe: 13.3, roe: 24.2, netWorth: 34.6, debt: 5.1 },
    about: "Designs, manufactures, and installs automated smart car parking systems, mechanical lifts, and multi-level parking solutions for premium real estate developers and municipal corporations.",
    sector: "Smart Parking Systems", registrar: "Link Intime India Private Ltd",
    strengths: ["Niche play in rapid urban traffic infrastructure", "Proprietary design patents", "Healthy order book from metropolitan hubs"],
    risks: ["Dependent on real estate market cycles", "High concentration of metropolitan projects", "Raw steel price sensitivity"] },

  { id: "cultfit", name: "Cult.fit", company: "Cult.fit Limited", type: "Mainboard", status: "Upcoming",
    open: null, close: null, listing: null, allotment: null, refund: null, demat: null,
    priceMin: null, priceMax: null, faceValue: 2, lot: null, issueSize: null, freshIssue: null, ofs: null,
    gmp: null, trend: "stable", estListing: null, gmpHistory: [],
    drhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/cult-fit-limited-drhp_102600.html", rhp: null,
    leadManager: "Kotak Mahindra, ICICI Securities", exchange: "BSE, NSE",
    sub: null, fin: null,
    about: "India's largest health and fitness platform providing digital and offline services across cult.fit gyms, mental health services (mind.fit), and healthy food plans (eat.fit).",
    sector: "Health & Fitness SaaS", registrar: "Link Intime India Private Ltd",
    strengths: ["Leading consumer fitness brand in India", "Highly scalable hybrid digital/offline model", "Strong investor parentage"],
    risks: ["Consistently high customer acquisition costs", "Intense competition in regional gym sectors", "Path to profitability is still early stage"] },

  { id: "ratnadeep-retail", name: "Ratnadeep Retail", company: "Ratnadeep Retail Limited", type: "Mainboard", status: "Upcoming",
    open: null, close: null, listing: null, allotment: null, refund: null, demat: null,
    priceMin: null, priceMax: null, faceValue: 10, lot: null, issueSize: null, freshIssue: null, ofs: null,
    gmp: null, trend: "stable", estListing: null, gmpHistory: [],
    drhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/ratnadeep-retail-limited-drhp_102550.html", rhp: null,
    leadManager: "JM Financial, Axis Capital", exchange: "BSE, NSE",
    sub: null, fin: null,
    about: "Operates a premium supermarket chain with over 150 stores in Southern India, offering fresh foods, groceries, and personal care products.",
    sector: "Supermarket Retail", registrar: "KFin Technologies Ltd",
    strengths: ["Strong regional brand density in South India", "Robust supply chain and private label integration", "Consistent cash-generative store operations"],
    risks: ["Geographical concentration risk", "Intense competition from online quick-commerce apps", "High real estate leasing costs"] },

  { id: "swara-baby", name: "Swara Baby Products", company: "Swara Baby Products Limited", type: "SME", status: "Upcoming",
    open: null, close: null, listing: null, allotment: null, refund: null, demat: null,
    priceMin: null, priceMax: null, faceValue: 10, lot: null, issueSize: null, freshIssue: null, ofs: null,
    gmp: null, trend: "stable", estListing: null, gmpHistory: [],
    drhp: "https://www.sebi.gov.in/filings/public-issues/jul-2026/swara-baby-products-limited-drhp_102480.html", rhp: null,
    leadManager: "Fedex Securities", exchange: "BSE SME",
    sub: null, fin: null,
    about: "Manufactures hygiene baby care products, including baby diapers, wet wipes, and diaper pants, under private labels and own brands.",
    sector: "Baby Care Products", registrar: "Bigshare Services Pvt Ltd",
    strengths: ["Expanding baby care consumption story in India", "Strong contract manufacturing capabilities", "Low-cost high-volume producer scale"],
    risks: ["Heavy raw material cost volatility (fluff pulp/polymers)", "High working capital requirement", "Competition from established MNC brands"] },
];

const DATA_AS_OF = "July 3, 2026";
const rupee = (n) => (n == null || isNaN(n)) ? "-" : (n < 0 ? `-₹${Number(Math.abs(n)).toLocaleString("en-IN")}` : `₹${Number(n).toLocaleString("en-IN")}`);
const cr = (n) => (n == null || isNaN(n)) ? "-" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
const formatDate = (dateStr) => {
  if (!dateStr) return "To Be Announced";
  const date = new Date(dateStr + "T00:00:00+05:30");
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const price = (i) => i.priceMax || i.priceMin;
const profitPerLot = (i) => (!i.lot || !i.gmp) ? 0 : i.gmp * i.lot;
const investment = (i) => { const p = price(i); return (p && i.lot) ? p * i.lot : null; };
const gainPct = (i) => { const p = price(i); return p ? (i.gmp / p) * 100 : 0; };
const listingGainPct = (i) => (i.listedAt && i.priceMax) ? ((i.listedAt - i.priceMax) / i.priceMax) * 100 : null;
const currentReturnPct = (i) => (i.currentPrice && i.priceMax) ? ((i.currentPrice - i.priceMax) / i.priceMax) * 100 : null;
const listingProfitLossPerLot = (i) => (i.listedAt && i.priceMax && i.lot) ? (i.listedAt - i.priceMax) * i.lot : null;

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
  if (!ipo.open) return "Upcoming"; // DRHP filed but subscription dates not yet announced
  const d = (s) => new Date(s + "T00:00:00+05:30"); // dates are IST
  const open = d(ipo.open);
  if (today < open) return "Upcoming";
  
  if (!ipo.close) return "Open"; // If open but close is not set, treat as Open
  const closeEnd = new Date(d(ipo.close).getTime() + 24 * 60 * 60 * 1000 - 1);
  if (today <= closeEnd) return "Open";
  
  if (!ipo.listing) return "Closed"; // If closed but listing not set, treat as Closed
  const listing = d(ipo.listing);
  if (today < listing) return "Closed";
  return "Listed";
}

// Holds the most recent investorgain.com scrape result (see LiveDataBadge).
// Populated by fetchLiveData() below; getLiveIPOS() overlays it onto the
// verified baseline so every part of the app reads through one function.
let _liveOverlay = { updatedAt: null, byId: {} };
let _realtimePrices = {}; // Stores ticking price, prev price, and last tick direction/timestamp for animations

function getLiveIPOS() {
  const today = new Date();
  return IPOS_BASE.map((ipo) => {
    const patch = _liveOverlay.byId[ipo.id];
    let merged = ipo;
    if (patch) {
      merged = { ...ipo, ...patch };
      if (ipo.sub && patch.sub) {
        merged.sub = { ...ipo.sub, ...patch.sub };
      }
    }
    // Overlay real-time simulation price if registered
    if (_realtimePrices[ipo.id]) {
      merged = { ...merged, currentPrice: _realtimePrices[ipo.id].price };
    }
    return { ...merged, status: liveStatus(merged, today) };
  });
}

const sortIposLogically = (ipos) => {
  const statusPriority = {
    Open: 1,
    Upcoming: 2,
    Closed: 3,
    Listed: 4
  };

  return [...ipos].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;

    if (a.status === "Open") {
      if (!a.close && !b.close) return 0;
      if (!a.close) return 1;
      if (!b.close) return -1;
      return a.close.localeCompare(b.close);
    }
    if (a.status === "Upcoming") {
      if (!a.open && !b.open) return 0;
      if (!a.open) return 1;
      if (!b.open) return -1;
      return a.open.localeCompare(b.open);
    }
    if (a.status === "Closed") {
      if (!a.close && !b.close) return 0;
      if (!a.close) return 1;
      if (!b.close) return -1;
      return b.close.localeCompare(a.close);
    }
    if (a.status === "Listed") {
      if (!a.listing && !b.listing) return 0;
      if (!a.listing) return 1;
      if (!b.listing) return -1;
      return b.listing.localeCompare(a.listing);
    }
    return 0;
  });
};

const sortDocumentsLogically = (ipos) => {
  const statusPriority = {
    Open: 1,
    Upcoming: 2,
    Closed: 3,
    Listed: 4
  };

  return [...ipos].sort((a, b) => {
    const pA = statusPriority[a.status] || 99;
    const pB = statusPriority[b.status] || 99;
    if (pA !== pB) return pA - pB;

    if (a.status === "Open") {
      if (!a.open && !b.open) return 0;
      if (!a.open) return 1;
      if (!b.open) return -1;
      return b.open.localeCompare(a.open); // latest opening first
    }
    if (a.status === "Upcoming") {
      if (!a.open && !b.open) return 0;
      if (!a.open) return 1;
      if (!b.open) return -1;
      return a.open.localeCompare(b.open); // nearest upcoming first
    }
    if (a.status === "Closed") {
      if (!a.close && !b.close) return 0;
      if (!a.close) return 1;
      if (!b.close) return -1;
      return b.close.localeCompare(a.close); // most recently closed first
    }
    if (a.status === "Listed") {
      if (!a.listing && !b.listing) return 0;
      if (!a.listing) return 1;
      if (!b.listing) return -1;
      return b.listing.localeCompare(a.listing); // most recently listed first
    }
    return 0;
  });
};

/* =====================================================================
   NOTIFICATIONS — auto-generated from live IPO data (dates + doc links),
   persisted in localStorage, refreshed every time `tick` changes (i.e.
   every hourly sync and manual refresh).
===================================================================== */
function ymd(d) { return d.toISOString().slice(0, 10); }

function computeDateNotifications(ipos, today) {
  const todayStr = ymd(today);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = ymd(tomorrow);
  const notifs = [];
  for (const ipo of ipos) {
    if (ipo.open === todayStr) notifs.push({ id: `${ipo.id}-open-${todayStr}`, type: "open", ipoId: ipo.id, title: `${ipo.company} opens today`, message: ipo.priceMin ? `Price band ₹${ipo.priceMin}–₹${ipo.priceMax}` : "Bidding starts today", date: todayStr });
    if (ipo.close === todayStr) notifs.push({ id: `${ipo.id}-close-${todayStr}`, type: "close", ipoId: ipo.id, title: `${ipo.company} closes today`, message: "Last day to apply", date: todayStr });
    if (ipo.listing === todayStr) notifs.push({ id: `${ipo.id}-listing-${todayStr}`, type: "listing", ipoId: ipo.id, title: `${ipo.company} lists today`, message: ipo.listedAt ? `Listed at ${rupee(ipo.listedAt)}` : "Listing today", date: todayStr });
    if (ipo.listing === tomorrowStr) notifs.push({ id: `${ipo.id}-listing-tmrw-${tomorrowStr}`, type: "listing-tomorrow", ipoId: ipo.id, title: `${ipo.company} lists tomorrow`, message: `Listing on ${ipo.listing}`, date: todayStr });
  }
  return notifs;
}

// Compares each sync's DRHP/RHP availability against what was last seen
// (in localStorage) to detect newly-filed documents. On the very first
// run ever (nothing seen yet), it silently bootstraps the snapshot instead
// of firing a notification for every existing document at once.
function computeDocNotifications(ipos) {
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem("calmcapital-doc-seen") || "{}"); } catch { /* first run */ }
  const isFirstRun = Object.keys(seen).length === 0;
  const nextSeen = { ...seen };
  const notifs = [];
  const todayStr = ymd(new Date());

  for (const ipo of ipos) {
    const hasDrhp = !!ipo.drhp, hasRhp = !!ipo.rhp;
    const prev = seen[ipo.id] || {};
    if (!isFirstRun) {
      if (hasDrhp && !prev.drhp) notifs.push({ id: `${ipo.id}-drhp-${Date.now()}`, type: "doc", ipoId: ipo.id, title: `${ipo.company}: DRHP filed`, message: "New draft prospectus available", date: todayStr });
      if (hasRhp && !prev.rhp) notifs.push({ id: `${ipo.id}-rhp-${Date.now()}`, type: "doc", ipoId: ipo.id, title: `${ipo.company}: RHP filed`, message: "New red herring prospectus available", date: todayStr });
    }
    nextSeen[ipo.id] = { drhp: hasDrhp, rhp: hasRhp };
  }
  try { localStorage.setItem("calmcapital-doc-seen", JSON.stringify(nextSeen)); } catch { /* storage unavailable */ }
  return notifs;
}

function useNotifications(tick) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("calmcapital-notifications");
      if (raw) setNotifications(JSON.parse(raw));
    } catch { /* none saved yet */ }
  }, []);

  useEffect(() => {
    const ipos = getLiveIPOS();
    const today = new Date();
    const fresh = [...computeDateNotifications(ipos, today), ...computeDocNotifications(ipos)];
    if (fresh.length === 0) return;
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const toAdd = fresh.filter((n) => !existingIds.has(n.id)).map((n) => ({ ...n, read: false, createdAt: Date.now() }));
      if (toAdd.length === 0) return prev;
      const merged = [...toAdd, ...prev].slice(0, 50); // cap history length
      try { localStorage.setItem("calmcapital-notifications", JSON.stringify(merged)); } catch { /* storage unavailable */ }
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      if (prev.every((n) => n.read)) return prev;
      const updated = prev.map((n) => ({ ...n, read: true }));
      try { localStorage.setItem("calmcapital-notifications", JSON.stringify(updated)); } catch { /* storage unavailable */ }
      return updated;
    });
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) markAllRead(); // mark as read when the panel is opened
      return next;
    });
  }, [markAllRead]);

  return { notifications, unreadCount, open, setOpen, toggleOpen };
}

const NOTIF_ICON = { open: TrendingUp, close: Clock, listing: Activity, "listing-tomorrow": Calendar, doc: FileText };
const NOTIF_COLOR = { open: BRAND.green, close: "#F0A202", listing: BRAND.blue, "listing-tomorrow": "#8b5cf6", doc: "#64748b" };

function NotificationBell({ hook, onOpenIpo }) {
  const { notifications, unreadCount, open, toggleOpen, setOpen } = hook;
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, setOpen]);

  // Relative-time formatter
  const relTime = (createdAt) => {
    if (!createdAt) return "";
    const diffMs = Date.now() - createdAt;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins || 1}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Icon + color config per notification type
  const iconConfig = {
    open:             { Icon: TrendingUp,  bg: "rgba(16,185,129,0.2)",  color: "#10b981" },
    close:            { Icon: Clock,       bg: "rgba(28,155,218,0.2)",  color: BRAND.blue },
    listing:          { Icon: Activity,    bg: "rgba(16,185,129,0.2)",  color: "#10b981" },
    "listing-tomorrow": { Icon: Calendar,  bg: "rgba(245,158,11,0.2)",  color: "#f59e0b" },
    doc:              { Icon: FileText,    bg: "rgba(100,116,139,0.2)", color: "#64748b" },
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggleOpen}
        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 relative shadow-sm"
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#0a0d16]" />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-12 right-0 w-96 rounded-2xl overflow-hidden z-30 shadow-2xl"
          style={{ background: "rgba(17,24,39,0.97)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-base font-bold text-white">Notifications</p>
            {notifications.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                {notifications.length} total
              </span>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell size={24} className="mx-auto mb-3" style={{ color: "#374151" }} />
                <p className="text-sm" style={{ color: "#64748b" }}>No notifications yet — IPO opens, closes and listings will appear here.</p>
              </div>
            ) : (
              notifications.map((n, idx) => {
                const cfg = iconConfig[n.type] || iconConfig.doc;
                const Icon = cfg.Icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => onOpenIpo?.(n.ipoId)}
                    className="w-full flex items-start gap-3.5 px-5 py-4 text-left transition-colors last:pb-5"
                    style={{ borderBottom: idx < notifications.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Icon circle */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={15} style={{ color: cfg.color }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-snug text-white">{n.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                        {n.message}
                        {n.createdAt ? ` · ${relTime(n.createdAt)}` : ""}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: BRAND.blue }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Pulls the investorgain.com scrape result your GitHub Action publishes
// (see public/live-data.json in the automation repo) and overlays it onto
// the baseline data. Call this from App on load, hourly, and on manual
// refresh. Returns true/false so the caller can show sync status.
async function fetchLiveData(rawUrl) {
  if (!rawUrl) return false;
  try {
    const res = await fetch(`${rawUrl}${rawUrl.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const json = await res.json();
    if (!json || typeof json.ipos !== "object") return false;
    // An empty/seed file (updatedAt still null, or no IPOs yet) means the
    // GitHub Action hasn't completed a real scrape yet — treat that as "not
    // synced" rather than fabricating a fresh timestamp.
    if (!json.updatedAt || Object.keys(json.ipos).length === 0) return false;
    // Extra sanity check: a scrape can "succeed" (valid JSON, real
    // timestamp, non-empty ipos object) while every entry is still missing
    // actual GMP data — e.g. a column-mapping bug in the scraper. That's
    // not a real sync even though nothing technically errored, so don't
    // report it as one.
    const hasRealData = Object.values(json.ipos).some((patch) => patch && typeof patch.gmp === "number");
    if (!hasRealData) return false;
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
    : DATA_AS_OF;
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
    { role: "assistant", content: `Hi! Ask me about any IPO — GMP, subscription, financials, or estimated listing profit.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTED_Q);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

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
   IPO PROFIT / LOSS CALCULATOR
===================================================================== */
const STATUS_ORDER = ["Open", "Upcoming", "Closed", "Listed"];
function sortedCalcIpos() {
  const all = getLiveIPOS();
  return [...all].sort((a, b) => {
    const si = STATUS_ORDER.indexOf(a.status);
    const sj = STATUS_ORDER.indexOf(b.status);
    if (si !== sj) return si - sj;
    // Within same status: newest open/close date first
    const da = a.open || a.close || "";
    const db = b.open || b.close || "";
    return db.localeCompare(da);
  });
}

function CalculatorTab() {
  const allIpos = sortedCalcIpos();
  const [ipoId, setIpoId] = useState(allIpos.find((i) => i.status === "Open")?.id || allIpos[0].id);
  const [lots, setLots] = useState(1);
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [calcFilter, setCalcFilter] = useState(null); // null = All

  const ipo = allIpos.find((i) => i.id === ipoId) || allIpos[0];
  const p = price(ipo);
  const shares = ipo.lot * lots;
  const inv = p * shares;
  const estListingValue = (ipo.estListing || p) * shares;
  const profit = estListingValue - inv;
  const roi = inv ? (profit / inv) * 100 : 0;
  const breakeven = p;

  const statusColors = {
    Open:     { bg: "rgba(16,185,129,0.12)", color: "#10b981", dot: "bg-emerald-500" },
    Upcoming: { bg: "rgba(240,162,2,0.12)",  color: "#d97706", dot: "bg-amber-500" },
    Closed:   { bg: "rgba(148,163,184,0.10)", color: "#64748b", dot: "bg-slate-400" },
    Listed:   { bg: "rgba(28,155,218,0.10)", color: BRAND.blue, dot: "bg-blue-400" },
  };

  const filtered = allIpos.filter((i) => {
    const matchSearch = !search || i.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !calcFilter || i.status === calcFilter;
    return matchSearch && matchFilter;
  });

  // Group filtered results by status in the correct display order
  const grouped = STATUS_ORDER.map((s) => ({
    status: s,
    items: filtered.filter((i) => i.status === s),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">IPO Profit / Loss Calculator</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Estimate your grey market returns before applying to any IPO</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* ── Input Card ── */}
        <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-5">
          
          {/* IPO Selector */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold mb-3">Select IPO</p>

            {/* Selected IPO preview pill */}
            <button
              onClick={() => setListOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left"
              style={{
                background: listOpen ? "rgba(28,155,218,0.05)" : "transparent",
                borderColor: listOpen ? "rgba(28,155,218,0.4)" : "rgba(148,163,184,0.2)"
              }}
            >
              <CompanyAvatar name={ipo.company} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{ipo.company}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[ipo.status]?.color || "#64748b" }}></span>
                  <span className="text-[10px] font-semibold" style={{ color: statusColors[ipo.status]?.color || "#64748b" }}>{ipo.status}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">· {ipo.type}</span>
                </div>
              </div>
              <ChevronRight size={14} className={`text-slate-400 transition-transform shrink-0 ${listOpen ? "rotate-90" : ""}`} />
            </button>

            {/* Dropdown panel */}
            {listOpen && (
              <div className="mt-2 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111520] shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: "340px" }}>

                {/* ── Sticky header: filter tabs + search ── */}
                <div className="sticky top-0 z-20 bg-white dark:bg-[#111520] border-b border-slate-100 dark:border-white/5">

                  {/* Filter tabs */}
                  <div className="flex gap-1 p-2.5 pb-2">
                    {[null, "Open", "Upcoming", "Closed", "Listed"].map((f) => {
                      const label = f ?? "All";
                      const isActive = calcFilter === f;
                      return (
                        <button
                          key={label}
                          onClick={() => { setCalcFilter(f); setSearch(""); }}
                          className="flex-1 text-[10px] font-bold rounded-lg py-1 transition-all"
                          style={{
                            background: isActive ? BRAND.blue : "transparent",
                            color: isActive ? "#fff" : "#94a3b8",
                            border: isActive ? `1px solid ${BRAND.blue}` : "1px solid transparent",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="px-2.5 pb-2.5">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={calcFilter ? `Search ${calcFilter} IPOs…` : "Search all IPOs…"}
                        className="w-full bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-xl pl-8 pr-3 py-2 text-xs outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Scrollable IPO list ── */}
                <div className="overflow-y-auto flex-1">
                  {grouped.map((group) => (
                    <div key={group.status}>
                      {/* Only show group header when showing All */}
                      {!calcFilter && (
                        <div className="px-3 py-1.5">
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                            style={{ background: statusColors[group.status]?.bg, color: statusColors[group.status]?.color }}
                          >
                            {group.status}
                          </span>
                        </div>
                      )}
                      {group.items.map((i) => (
                        <button
                          key={i.id}
                          onClick={() => { setIpoId(i.id); setListOpen(false); setSearch(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                          style={{ background: i.id === ipoId ? "rgba(28,155,218,0.06)" : "transparent" }}
                        >
                          <CompanyAvatar name={i.company} size={30} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{i.company}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">{i.type} · {i.priceMax ? `₹${i.priceMax}` : "TBA"}</p>
                          </div>
                          {i.id === ipoId && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                  {grouped.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No IPOs found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Key Info */}
          <div className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-550 dark:text-slate-400">Price band</span>
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{ipo.priceMin && ipo.priceMax ? `₹${ipo.priceMin}–₹${ipo.priceMax}` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-550 dark:text-slate-400">Lot size</span>
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{ipo.lot ? `${ipo.lot} shares` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-550 dark:text-slate-400">Current GMP</span>
              <span className="font-mono text-slate-805 dark:text-slate-200 font-bold">{ipo.gmp != null ? rupee(ipo.gmp) : "—"}</span>
            </div>
          </div>

          {/* Lot counter */}
          <div className="border-t border-slate-150 dark:border-slate-800 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold mb-3">Number of Lots</p>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setLots((l) => Math.max(1, l - 1))} 
                className="w-12 h-12 rounded-xl border border-blue-500/40 text-blue-500 bg-slate-50 dark:bg-[#111520] hover:bg-slate-100 dark:hover:bg-[#111520]/80 flex items-center justify-center text-lg font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:outline-none"
              >
                <Minus size={16} />
              </button>
              <div className="flex-1 bg-slate-50 dark:bg-[#111520] border border-slate-200 dark:border-slate-800 rounded-xl h-12 flex items-center justify-center font-mono text-xl font-bold text-slate-800 dark:text-white">
                {lots}
              </div>
              <button 
                onClick={() => setLots((l) => l + 1)} 
                className="w-12 h-12 rounded-xl border border-blue-500/40 text-blue-500 bg-slate-50 dark:bg-[#111520] hover:bg-slate-100 dark:hover:bg-[#111520]/80 flex items-center justify-center text-lg font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] focus:outline-none"
              >
                <span className="text-xl">+</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Result Card ── */}
        <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between min-h-[340px]">
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-450 dark:text-slate-500 font-bold mb-1">Result</p>
            {[
              ["Shares allotted", shares.toLocaleString("en-IN")],
              ["Investment amount", rupee(inv)],
              ["Break-even price / share", rupee(breakeven)],
              ["Est. listing price / share", rupee(ipo.estListing || p)],
              ["Est. listing value", rupee(estListingValue)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm pb-3 border-b border-slate-150/60 dark:border-slate-800/60 last:border-b-0 last:pb-0">
                <span className="text-slate-550 dark:text-slate-400">{l}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{v}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-slate-150 dark:border-slate-800 pt-4 mt-6">
            <p className={`font-bold text-lg tracking-tight ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {profit >= 0 ? `Estimated Profit: +${rupee(profit)} (+${roi.toFixed(1)}%)` : `Estimated Loss: ${rupee(profit)} (${roi.toFixed(1)}%)`}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium leading-relaxed">
              GMP figures are unofficial grey market indicators and do not guarantee listing price or profitability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   LOGO REGISTRY — curated direct logo URLs for every IPO + broker.
   Priority order: direct CDN → Clearbit → Google favicon → initials.
   Only add entries where a reliable, high-quality logo URL is known.
===================================================================== */
const LOGO_REGISTRY = {
  // ── Brokers ──────────────────────────────────────────────────────────
  "upstox":          "https://logo.clearbit.com/upstox.com",
  "angel one":       "https://logo.clearbit.com/angelone.in",

  // ── Mainboard IPOs ───────────────────────────────────────────────────
  "sbi funds management": "https://logo.clearbit.com/sbimf.com",
  "sbi funds":            "https://logo.clearbit.com/sbimf.com",
  "cult.fit":             "https://logo.clearbit.com/cult.fit",
  "cultfit":              "https://logo.clearbit.com/cult.fit",
  "cube highways":        "https://logo.clearbit.com/cubehighways.com",
  "knack packaging":      "https://logo.clearbit.com/knackpackaging.com",
  "kusumgar":             "https://logo.clearbit.com/kusumgar.com",
  "aastha spintex":       "https://logo.clearbit.com/aasthaspintex.com",
  "csm technologies":     "https://logo.clearbit.com/csmtechnologies.com",
  "caliber mining":       "https://logo.clearbit.com/calibermining.com",
  "ratnadeep retail":     "https://logo.clearbit.com/ratnadeep.com",

  // ── SME IPOs (only those with a publicly reachable website logo) ─────
  "kratikal tech":        "https://logo.clearbit.com/kratikal.com",
  "kratikal":             "https://logo.clearbit.com/kratikal.com",
  "ic electricals":       "https://logo.clearbit.com/icelectricals.com",
  "sampark india logistics": "https://logo.clearbit.com/samparklogistics.com",
  "sampark logistics":    "https://logo.clearbit.com/samparklogistics.com",
  "devson catalyst":      "https://logo.clearbit.com/devson.in",
  "sotefin bharat":       "https://logo.clearbit.com/sotefin.com",
};

// Returns the best matching logo URL for a given display name.
function getLogoUrl(name) {
  const n = name.toLowerCase().trim();
  // Exact match first
  if (LOGO_REGISTRY[n]) return LOGO_REGISTRY[n];
  // Partial match
  for (const key of Object.keys(LOGO_REGISTRY)) {
    if (n.includes(key) || key.includes(n.split(" ")[0])) return LOGO_REGISTRY[key];
  }
  return null;
}

/* =====================================================================
   COMPANY AVATAR — official logo with graceful initials fallback
===================================================================== */
function CompanyAvatar({ name, size = 40 }) {
  const [srcIndex, setSrcIndex] = useState(0);

  // Reset index whenever the company name changes (e.g. navigating between cards)
  useEffect(() => { setSrcIndex(0); }, [name]);

  // Initials fallback values
  const words = name.replace(/Ltd\.|Limited|Pvt\.|Private|Co\./gi, "").trim().split(/\s+/);
  const initials = words.slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const colors = ["#1c9bda", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];
  const colorIdx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const bg = colors[colorIdx];

  // Build source cascade once per name
  const sources = useMemo(() => {
    const primaryUrl = getLogoUrl(name);
    if (!primaryUrl) return [];
    const domain = primaryUrl.replace("https://logo.clearbit.com/", "");
    return [
      primaryUrl,
      `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
    ];
  }, [name]);

  const currentSrc = sources[srcIndex];

  if (currentSrc) {
    return (
      <div
        className="rounded-xl shrink-0 overflow-hidden bg-white dark:bg-white/5 border border-slate-100 dark:border-white/8 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <img
          src={currentSrc}
          alt={`${name} logo`}
          onError={() => setSrcIndex((i) => i + 1)}
          style={{ width: size * 0.78, height: size * 0.78, objectFit: "contain" }}
          className="select-none"
        />
      </div>
    );
  }

  // All sources exhausted (or none mapped) → show initials
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

/* =====================================================================
   IPO CARD
===================================================================== */
function IPOCard({ ipo, onOpen, watchlist, dark }) {
  const watched = watchlist.ids.includes(ipo.id);
  const isListed = ipo.status === "Listed";
  const isClosed = ipo.status === "Closed";
  const isOpen = ipo.status === "Open";
  
  // Status badge style
  const statusStyle = {
    Open:     { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
    Closed:   { bg: "rgba(148,163,184,0.10)", color: "#64748b", border: "rgba(148,163,184,0.2)" },
    Upcoming: { bg: "rgba(240,162,2,0.12)",  color: "#d97706", border: "rgba(240,162,2,0.25)" },
    Listed:   { bg: "rgba(28,155,218,0.10)", color: BRAND.blue, border: "rgba(28,155,218,0.2)" },
  };
  const ss = statusStyle[ipo.status] || statusStyle.Closed;

  return (
    <div
      className="bg-white dark:bg-[#161c28] border rounded-2xl overflow-hidden relative group transition-all hover:shadow-md cursor-pointer"
      style={{ borderColor: isOpen ? "rgba(28,155,218,0.35)" : "rgba(0,0,0,0.06)", boxShadow: isOpen ? "0 0 0 1px rgba(28,155,218,0.12), 0 4px 16px -4px rgba(28,155,218,0.15)" : "0 1px 4px rgba(0,0,0,0.04)" }}
      onClick={() => onOpen(ipo)}
    >
      {/* Blue left accent bar for Open IPOs */}
      {isOpen && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#1c9bda] to-[#0a66c2]" />
      )}

      <div className="p-5">
        {/* Row 1: Company Logo, Name, Sector and Bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={ipo.company} size={42} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 dark:text-white text-[15px] leading-tight truncate">{ipo.company}</h3>
                <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                  {ipo.status}
                </span>
                {ipo.type === "SME" && (
                  <span className="text-[9px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                    SME
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{ipo.sector}</p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); watchlist.toggle(ipo.id); }}
            className="text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            {watched ? <BookmarkCheck size={18} style={{ color: BRAND.blue }} /> : <Bookmark size={18} />}
          </button>
        </div>

        {/* Listing gain for listed */}
        {isListed && ipo.listedAt && (() => {
          const gain = listingGainPct(ipo);
          if (gain > 0) {
            return (
              <div className="flex items-center gap-1.5 mt-3">
                <ArrowUpRight size={13} style={{ color: BRAND.green }} />
                <span className="text-sm font-bold font-mono" style={{ color: "#0f9d68" }}>
                  Listed · {gain.toFixed(1)}%
                </span>
              </div>
            );
          } else if (gain < 0) {
            return (
              <div className="flex items-center gap-1.5 mt-3">
                <ArrowDownRight size={13} className="text-rose-500" />
                <span className="text-sm font-bold font-mono" style={{ color: "#e11d48" }}>
                  Listed · {gain.toFixed(1)}%
                </span>
              </div>
            );
          } else {
            return (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-sm font-bold font-mono text-slate-500 dark:text-slate-400">
                  Listed · 0.0%
                </span>
              </div>
            );
          }
        })()}

        {/* Divider */}
        <div className="mt-3 mb-3 border-t border-slate-100 dark:border-white/5" />

        {/* ── GMP Row ── */}
        {(() => {
          const gmpVal = ipo.gmp;
          const hasGmp = gmpVal != null;
          const gmpPct = hasGmp && ipo.priceMax ? (gmpVal / ipo.priceMax) * 100 : null;
          const isPos = hasGmp && gmpVal > 0;
          const isNeg = hasGmp && gmpVal < 0;
          const gmpColor = isPos ? "#0f9d68" : isNeg ? "#e11d48" : "#64748b";
          const gmpBg   = isPos
            ? (dark ? "rgba(15,157,104,0.12)" : "rgba(15,157,104,0.08)")
            : isNeg
            ? (dark ? "rgba(225,29,72,0.12)"  : "rgba(225,29,72,0.08)")
            : (dark ? "rgba(148,163,184,0.1)"  : "rgba(148,163,184,0.07)");

          return (
            <div
              className="flex items-center justify-between rounded-xl px-3 py-2 mb-3"
              style={{ background: gmpBg }}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">GMP</span>
              {hasGmp ? (
                <span className="font-mono font-extrabold text-sm flex items-center gap-1.5" style={{ color: gmpColor }}>
                  {isPos && <ArrowUpRight size={13} />}
                  {isNeg && <ArrowDownRight size={13} />}
                  {isPos ? "+" : ""}{isNeg ? "-" : ""}{isNeg ? `₹${Math.abs(gmpVal)}` : `₹${gmpVal}`}
                  <span className="text-[11px] font-semibold opacity-75">
                    ({isPos ? "+" : ""}{gmpPct != null ? gmpPct.toFixed(2) : "0.00"}%)
                  </span>
                </span>
              ) : (
                <span className="font-mono text-sm text-slate-400 dark:text-slate-500">N/A</span>
              )}
            </div>
          );
        })()}

        {/* Price / Lot / Issue size grid + profit */}
        <div className="flex items-end justify-between gap-2">
          <div className="grid grid-cols-3 gap-4 text-xs flex-1">
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5">Price</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "-"}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5">Lot</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{ipo.lot || "-"}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 mb-0.5">Issue size</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{ipo.issueSize ? `₹${Number(ipo.issueSize).toLocaleString("en-IN")} Cr` : "-"}</p>
            </div>
          </div>

          {/* Est. profit pill — only for non-listed IPOs with GMP */}
          {!isListed && ipo.lot > 0 && ipo.gmp > 0 && (
            <div className="rounded-xl px-3 py-2 text-right shrink-0" style={{ background: "#16a34a" }}>
              <p className="text-[10px] text-emerald-100 font-semibold leading-none mb-1">Est. profit / lot</p>
              <p className="font-mono font-bold text-white text-sm">+{rupee(profitPerLot(ipo))}</p>
            </div>
          )}

          {/* Listed: show P&L per lot */}
          {isListed && ipo.listedAt && (() => {
            const gain = listingGainPct(ipo);
            const pnl = listingProfitLossPerLot(ipo);
            let bg, textClass, prefix = "";
            if (gain > 0) {
              bg = `${BRAND.green}22`;
              textClass = "text-profit";
              prefix = "+";
            } else if (gain < 0) {
              bg = "rgba(225,29,72,0.10)";
              textClass = "text-loss";
            } else {
              bg = dark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.12)";
              textClass = "text-slate-500 dark:text-slate-400";
            }
            const tData = _realtimePrices[ipo.id];
            const isFreshTick = tData && (Date.now() - tData.tickTime < 1200);
            const animClass = isFreshTick ? (tData.lastTick === "up" ? "animate-tick-up" : "animate-tick-down") : "";
            return (
              <div className={`rounded-xl px-3 py-2 text-right shrink-0 transition-all ${animClass}`} style={{ background: bg }}>
                <p className={`text-[10px] font-semibold leading-none mb-1 ${textClass}`}>P&L / lot</p>
                <p className={`font-mono font-bold text-sm ${textClass}`}>
                  {prefix}{rupee(pnl)}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Since listing row */}
        {isListed && ipo.currentPrice && (() => {
          const ret = currentReturnPct(ipo);
          let color = "#64748b";
          if (ret > 0) color = "#0f9d68";
          else if (ret < 0) color = "#e11d48";
          
          return (
            <div className="flex items-center justify-between mt-2 text-[11px]">
              <span className="text-slate-400">Current Return</span>
              <span className="font-mono flex items-center gap-0.5" style={{ color }}>
                {ret > 0 ? <ArrowUpRight size={12} /> : ret < 0 ? <ArrowDownRight size={12} /> : null}
                {ret?.toFixed(1)}%
              </span>
            </div>
          );
        })()}

        {/* Premium IPO Timeline (4-steps) */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Opens", date: ipo.open, bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
              { label: "Closes", date: ipo.close, bg: "bg-rose-500/10 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400" },
              { label: "Allotment", date: ipo.allotment, bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
              { label: "Listing", date: ipo.listing, bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400" }
            ].map(({ label, date, bg, text }) => (
              <div 
                key={label} 
                className="rounded-xl p-2 flex items-center gap-2 border border-slate-100 dark:border-white/[0.03] bg-slate-500/[0.025] dark:bg-white/[0.015]"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${bg} ${text} shrink-0`}>
                  <Calendar size={12} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 leading-none mb-0.5">{label}</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">
                    {date ? formatDate(date) : "To Be Announced"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-slate-400 dark:text-slate-550">
              {ipo.status === "Listed" && ipo.listing && (
                <span className="font-semibold text-slate-500 dark:text-slate-400">Listed on {formatDate(ipo.listing)}</span>
              )}
            </span>
            <span className="flex items-center gap-0.5 font-bold" style={{ color: BRAND.blue }}>
              View details <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   LISTED IPO CARD — specialized card matching reference image
===================================================================== */
function ListedIPOCard({ ipo, onOpen, watchlist }) {
  const watched = watchlist.ids.includes(ipo.id);
  const gain = listingGainPct(ipo);
  const currentRet = currentReturnPct(ipo);

  // Three-state listing gain color
  let gainColor = "#64748b";
  if (gain > 0) gainColor = "#16a34a";
  else if (gain < 0) gainColor = "#e11d48";

  // Three-state current return since listing color
  let currentColor = "#64748b";
  if (currentRet > 0) currentColor = "#16a34a";
  else if (currentRet < 0) currentColor = "#e11d48";

  return (
    <div
      className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
      onClick={() => onOpen(ipo)}
    >
      <div className="p-5">
        {/* Header: Avatar + Company + Type badge */}
        <div className="flex items-center gap-3 mb-1">
          <CompanyAvatar name={ipo.company} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-850 dark:text-white text-[15px] leading-snug">{ipo.company}</h3>
              <span
                className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold text-white"
                style={{ background: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6" }}
              >
                {ipo.type}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ipo.sector}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); watchlist.toggle(ipo.id); }}
            className="text-slate-400 hover:text-amber-500 transition-colors shrink-0"
          >
            {watched ? <BookmarkCheck size={16} style={{ color: BRAND.blue }} /> : <Bookmark size={16} />}
          </button>
        </div>

        {/* Big listing gain headline */}
        <div className="mt-4 mb-4">
          <p className="text-2xl font-extrabold tracking-tight" style={{ color: gainColor }}>
            Listed{gain != null ? ` • ${gain.toFixed(1)}%` : " — awaiting data"}
          </p>
        </div>

        {/* Row 1: Listing Price | Listing Gain % | Current Gain Since Listing */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">Listing Price:</p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
              {ipo.listedAt ? `₹${ipo.listedAt}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">Listing Gain %</p>
            <p
              className="font-mono font-bold text-sm flex items-center gap-0.5"
              style={{ color: gainColor }}
            >
              {gain != null && gain > 0 && <ArrowUpRight size={13} />}
              {gain != null && gain < 0 && <ArrowDownRight size={13} />}
              {gain != null ? `${gain.toFixed(1)}%` : "—"}
            </p>
          </div>
          {(() => {
            const tData = _realtimePrices[ipo.id];
            const isFreshTick = tData && (Date.now() - tData.tickTime < 1200);
            const animClass = isFreshTick ? (tData.lastTick === "up" ? "animate-tick-up" : "animate-tick-down") : "";
            return (
              <div className={`p-1 rounded-xl transition-all ${animClass}`}>
                <p className="text-slate-500 dark:text-slate-400 mb-1">Current Return</p>
                <p
                  className="font-mono font-bold text-sm flex items-center gap-0.5"
                  style={{ color: currentColor }}
                >
                  {currentRet != null && currentRet > 0 && <ArrowUpRight size={13} />}
                  {currentRet != null && currentRet < 0 && <ArrowDownRight size={13} />}
                  {currentRet != null ? `${currentRet.toFixed(1)}%` : "—"}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-white/5 mb-4" />

        {/* Row 2: Price | Lot | Issue size */}
        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-0.5">Price</p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
              {ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-0.5">Lot</p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{ipo.lot || "—"}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-0.5">Issue size</p>
            <p className="font-mono font-bold text-slate-800 dark:text-slate-100">
              {ipo.issueSize ? `₹${Number(ipo.issueSize).toLocaleString("en-IN")} Cr` : "—"}
            </p>
          </div>
        </div>

        {/* Details link */}
        <div className="flex justify-end">
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: BRAND.blue }}>
            Details <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   IPO DETAIL MODAL
===================================================================== */
function IPODetail({ ipo, onClose, watchlist, dark }) {
  if (!ipo) return null;
  const watched = watchlist.ids.includes(ipo.id);
  const today = new Date();

  // Timeline: determine which milestones have passed
  const milestones = [
    { label: "Open", date: ipo.open },
    { label: "Close", date: ipo.close },
    { label: "Allotment", date: ipo.allotment },
    { label: "Listing", date: ipo.listing },
  ];
  const isPast = (d) => d && new Date(d + "T00:00:00+05:30") <= today;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-colors"
        style={{
          background: dark ? "#111827" : "#ffffff",
          border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
          color: dark ? "#ffffff" : "#1e293b"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top toolbar ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => watchlist.toggle(ipo.id)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors cursor-pointer"
              style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                color: watched ? BRAND.blue : (dark ? "#94a3b8" : "#475569")
              }}
            >
              {watched ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors text-slate-400 dark:hover:text-white hover:text-slate-800 cursor-pointer"
              style={{
                background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
              }}
            >
              <X size={16} />
            </button>
          </div>
          <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Data
          </span>
        </div>

        {/* ── Company header ── */}
        <div className="flex items-start gap-4 px-5 py-4">
          <CompanyAvatar name={ipo.company} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{ipo.company}</h2>
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wider"
                style={
                  ipo.type === "Mainboard"
                    ? { background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
                    : { background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }
                }
              >
                {ipo.type === "Mainboard" ? "MAINBOARD" : "SME"}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: dark ? "#94a3b8" : "#475569" }}>
              {ipo.sector} · Exchange: {ipo.exchange} · Lead Manager: {ipo.leadManager}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* About */}
          <p className="text-sm leading-relaxed" style={{ color: dark ? "#94a3b8" : "#475569" }}>{ipo.about}</p>

          {/* ── 3 key metric cards ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Price band", ipo.priceMin ? `₹${ipo.priceMin}-${ipo.priceMax}` : "-"],
              ["Lot size", ipo.lot || "-"],
              ["Issue size", ipo.issueSize ? `₹${Number(ipo.issueSize).toLocaleString("en-IN")} Cr` : "-"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl p-4"
                style={{
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
                }}
              >
                <p className="text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>{label}</p>
                <p className="text-xl font-extrabold font-mono tracking-tight" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Face value", ipo.faceValue != null ? `₹${ipo.faceValue}` : "-"],
              ["Min. investment", ipo.lot ? rupee(investment(ipo)) : "-"],
              ["Fresh issue", ipo.freshIssue ? `₹${ipo.freshIssue} Cr` : "-"],
              ["OFS", ipo.ofs ? `₹${ipo.ofs} Cr` : "-"],
            ].map(([l, v]) => (
              <div
                key={l}
                className="rounded-xl p-3"
                style={{
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                  border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                }}
              >
                <p className="text-[10px] font-medium mb-1" style={{ color: "#64748b" }}>{l}</p>
                <p className="font-mono text-sm font-semibold" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{v}</p>
              </div>
            ))}
          </div>

          {/* ── Important Dates timeline ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
              border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "#64748b" }}>
              Important Dates
            </p>
            {/* Timeline line + dots */}
            <div className="relative mb-3">
              {/* Track line */}
              <div className="absolute top-[9px] left-[10px] right-[10px] h-0.5 rounded-full" style={{ background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
              {/* Filled progress line */}
              <div
                className="absolute top-[9px] left-[10px] h-0.5 rounded-full transition-all"
                style={{
                  background: BRAND.blue,
                  width: `${(milestones.filter((m) => isPast(m.date)).length / (milestones.length - 1)) * (100 - (100 / milestones.length))}%`,
                }}
              />
              {/* Dots row */}
              <div className="relative flex justify-between">
                {milestones.map((m, i) => {
                  const done = isPast(m.date);
                  return (
                    <div key={m.label} className="flex flex-col items-center">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{
                          background: done ? BRAND.blue : "transparent",
                          borderColor: done ? BRAND.blue : (dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
                        }}
                      >
                        {done && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Labels row */}
            <div className="flex justify-between">
              {milestones.map((m) => (
                <div key={m.label} className="flex flex-col items-center text-center min-w-0">
                  <p className="text-xs font-semibold" style={{ color: isPast(m.date) ? (dark ? "#e2e8f0" : "#1e293b") : "#64748b" }}>{m.label}</p>
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: "#64748b" }}>{m.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Estimated listing profit (pre-listing) ── */}
          {ipo.status !== "Listed" && ipo.lot > 0 && ipo.gmp > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: dark ? "rgba(22,163,74,0.12)" : "rgba(16,185,129,0.08)",
                border: dark ? "1px solid rgba(22,163,74,0.25)" : "1px solid rgba(16,185,129,0.20)"
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: dark ? "#ffffff" : "#1b4332" }}>Estimated listing profit (1 lot)</p>
                  <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: dark ? "#94a3b8" : "#2d6a4f" }}>
                    <span>Investment: <span className="font-mono font-semibold" style={{ color: dark ? "#ffffff" : "#1b4332" }}>{rupee(investment(ipo))}</span></span>
                    <span>GMP × lot: <span className="font-mono font-semibold" style={{ color: dark ? "#ffffff" : "#1b4332" }}>{rupee(ipo.gmp * ipo.lot)}</span></span>
                  </div>
                </div>
                <p className="text-2xl font-extrabold font-mono" style={{ color: dark ? "#4ade80" : "#10b981" }}>
                  +{rupee(profitPerLot(ipo))}
                </p>
              </div>
            </div>
          )}

          {/* ── Listing performance (post-listing) ── */}
          {ipo.status === "Listed" && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Listing Performance</p>
              {ipo.listedAt ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ["Issue price", rupee(ipo.priceMax)],
                    ["Listing price", rupee(ipo.listedAt)],
                    ["Listing gain", `${listingGainPct(ipo)?.toFixed(1)}%`],
                    ["P&L / lot", `${listingProfitLossPerLot(ipo) >= 0 ? "+" : ""}${rupee(listingProfitLossPerLot(ipo))}`],
                    ["Listing date", ipo.listing],
                    ...(ipo.currentPrice ? [
                      ["Current price", rupee(ipo.currentPrice)],
                      ["Current return", `${currentReturnPct(ipo)?.toFixed(1)}%`]
                    ] : []),
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="rounded-xl p-2.5"
                      style={{
                        background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                        border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                      }}
                    >
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: "#64748b" }}>{l}</p>
                      <p
                        className="font-mono text-sm font-semibold"
                        style={{
                          color: l === "Listing gain" || l === "P&L / lot" || l === "Current return"
                            ? (() => {
                                const num = parseFloat(v.replace(/[^\d.-]/g, ""));
                                if (num > 0) return dark ? "#4ade80" : "#16a34a";
                                if (num < 0) return dark ? "#f87171" : "#dc2626";
                                return dark ? "#94a3b8" : "#64748b";
                              })()
                            : (dark ? "#e2e8f0" : "#1e293b")
                        }}
                      >
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#64748b" }}>Listed on {ipo.listing} — actual listing price not yet recorded.</p>
              )}
            </div>
          )}

          {/* ── GMP History chart ── */}
          {ipo.gmpHistory?.length > 1 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>GMP History</p>
              <div
                className="rounded-2xl p-3"
                style={{
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)"
                }}
              >
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={ipo.gmpHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
                    <XAxis dataKey="d" fontSize={10} stroke={dark ? "#475569" : "#64748b"} tick={{ fill: dark ? "#94a3b8" : "#475569" }} />
                    <YAxis fontSize={10} stroke={dark ? "#475569" : "#64748b"} width={35} tick={{ fill: dark ? "#94a3b8" : "#475569" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, background: dark ? "#1e2a3a" : "#ffffff", border: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", color: dark ? "#e2e8f0" : "#1e293b" }} />
                    <Line type="monotone" dataKey="v" stroke={BRAND.blue} strokeWidth={2.5} dot={{ r: 3, fill: BRAND.blue }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Subscription Details & Allotment Odds Table ── */}
          {ipo.sub && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Subscription & Allotment Odds</p>
              <SubscriptionDetailsList ipo={ipo} dark={dark} />
            </div>
          )}

          {/* ── Financials ── */}
          {ipo.fin && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#64748b" }}>Financials (latest FY)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["Revenue", cr(ipo.fin.revenue)], ["PAT", cr(ipo.fin.pat)], ["EBITDA", ipo.fin.ebitda ? cr(ipo.fin.ebitda) : "-"],
                  ["Net worth", cr(ipo.fin.netWorth)], ["Debt", cr(ipo.fin.debt)],
                  ["EPS", ipo.fin.eps != null ? `₹${ipo.fin.eps}` : "-"],
                  ["P/E", ipo.fin.pe != null ? `${ipo.fin.pe}x` : "-"],
                  ["ROE", ipo.fin.roe != null ? `${ipo.fin.roe}%` : ""]].map(([l, v]) => (
                  <div
                    key={l}
                    className="rounded-xl p-2.5"
                    style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                    }}
                  >
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: "#64748b" }}>{l}</p>
                    <p className="font-mono text-sm font-semibold" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Strengths / Risks ── */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Strengths</p>
              <ul className="space-y-2">
                {ipo.strengths?.map((s) => (
                  <li key={s} className="text-xs flex gap-2" style={{ color: dark ? "#94a3b8" : "#475569" }}>
                    <span style={{ color: "#4ade80" }}>●</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "#64748b" }}>Risks</p>
              <ul className="space-y-2">
                {ipo.risks?.map((s) => (
                  <li key={s} className="text-xs flex gap-2" style={{ color: dark ? "#94a3b8" : "#475569" }}>
                    <span style={{ color: "#f87171" }}>●</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-555">
            Strengths/risks are general analytical notes based on public business descriptions. Read the full DRHP/RHP before investing.
          </p>

          {/* ── Documents ── */}
          <div className="flex flex-col gap-3">
            {(() => {
              const hasValidDrhp = !!ipo.drhp;
              const hasValidRhp = !!ipo.rhp;

              if (!hasValidDrhp && !hasValidRhp) {
                return (
                  <p
                    className="text-sm p-3 rounded-xl text-center text-slate-500"
                    style={{
                      background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                      border: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)"
                    }}
                  >
                    Official DRHP/RHP is currently unavailable.
                  </p>
                );
              }

              return (
                <div className="flex gap-3">
                  {hasValidDrhp && (
                    <a
                      href={ipo.drhp}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                      style={{
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                        color: dark ? "#94a3b8" : "#475569"
                      }}
                    >
                      <FileText size={14} />
                      {isPortalLink(ipo.drhp) ? "Exchange DRHP Portal" : "DRHP"}
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {hasValidRhp && (
                    <a
                      href={ipo.rhp}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                      style={{
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                        border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                        color: dark ? "#94a3b8" : "#475569"
                      }}
                    >
                      <FileText size={14} />
                      {isPortalLink(ipo.rhp) ? "Exchange RHP Portal" : "RHP"}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
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
function GMPTab({ tick }) {
  const data = useMemo(() => {
    return [...getLiveIPOS()]
      .sort((a, b) => gainPct(b) - gainPct(a))
      .map((i) => ({ 
        name: i.name, 
        pct: Number(gainPct(i).toFixed(1)),
        gmp: i.gmp,
        dateRange: `${i.open} to ${i.close}`
      }));
  }, [tick]);

  return (
    <div className="bg-white dark:bg-[#161c28] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-xl">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={16} className="text-slate-500" />
        <h2 className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
          GMP % gain — all IPOs
        </h2>
      </div>
      
      {(() => {
        const truncateName = (name) => {
          if (!name) return "";
          return name.length > 18 ? `${name.slice(0, 16)}...` : name;
        };

        return (
          <ResponsiveContainer width="100%" height={Math.max(400, data.length * 36)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 70, top: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="gmpGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1a5d3f" />
                  <stop offset="100%" stopColor="#2eaf73" />
                </linearGradient>
                <linearGradient id="neutralGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" horizontal={false} vertical={true} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} domain={[0, (max) => Math.ceil(max * 1.15)]} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} width={130} tickFormatter={truncateName} interval={0} axisLine={false} tickLine={false} />
              
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-2xl shadow-xl text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <CompanyAvatar name={item.name} size={28} />
                          <p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p>
                        </div>
                        <p className="text-slate-400 dark:text-slate-550 font-mono">{item.dateRange}</p>
                        <p className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">GMP: {item.pct}% (₹{item.gmp})</p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: "rgba(148, 163, 184, 0.04)" }} 
              />
              
              <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.pct > 0 ? "url(#gmpGradient)" : "url(#neutralGradient)"} 
                  />
                ))}
                <LabelList 
                  dataKey="pct" 
                  position="right" 
                  offset={8}
                  fill="#64748b" 
                  fontSize={10} 
                  fontWeight={700} 
                  formatter={(v) => v > 0 ? `${v}%` : ""} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      })()}
    </div>
  );
}

/* =====================================================================
   SUBSCRIPTION DETAILS & ALLOTMENT PROBABILITY ENGINE
===================================================================== */
function SubscriptionDetailsList({ ipo, dark }) {
  if (!ipo.sub) return null;
  const s = ipo.sub;
  const isSME = ipo.type === "SME";

  // Helper to format values
  const formatSub = (v) => (v == null ? "—" : `${Number(v).toFixed(2)}×`);

  const renderCategoryLine = (label, sharesSub, appsSub) => {
    const isLotteryCategory = ["Retail", "sHNI", "bHNI", "Employee", "Shareholder"].includes(label);

    if (!isLotteryCategory) {
      // For Overall, QIB, NII: show share subscription only
      return (
        <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">{label}</span>
          <span className="font-mono font-bold text-slate-855 dark:text-white text-sm">{formatSub(sharesSub)}</span>
        </div>
      );
    }

    // Determine if we should fall back to calculations for listed/closed IPOs
    let finalAppsSub = appsSub;
    const isClosedOrListed = ipo.status === "Closed" || ipo.status === "Listed";

    if (finalAppsSub == null && isClosedOrListed && sharesSub != null && sharesSub > 0) {
      if (isSME) {
        if (label === "Retail") {
          finalAppsSub = sharesSub; // Retail SME is exactly 1 lot max, so appsSub === sharesSub
        } else {
          finalAppsSub = sharesSub / 1.05; // SME HNI averages ~1.05 lots
        }
      } else {
        // Mainboard empirical estimations as a robust calculation fallback
        if (label === "Retail") {
          const avgLots = ipo.id === "sbi-funds" ? 1.518 : 1.30;
          finalAppsSub = sharesSub / avgLots;
        } else if (label === "sHNI") {
          const sniiMult = ipo.id === "sbi-funds" ? 1.836 : 1.5;
          finalAppsSub = sharesSub / sniiMult;
        } else if (label === "bHNI") {
          const bniiMult = ipo.id === "sbi-funds" ? 5.215 : 5.5;
          finalAppsSub = sharesSub / bniiMult;
        } else if (label === "Employee") {
          finalAppsSub = sharesSub / 1.5;
        } else if (label === "Shareholder") {
          finalAppsSub = sharesSub / 2.0;
        }
      }
    }

    // For Lottery categories: check if application-wise data is available
    if (finalAppsSub != null && finalAppsSub > 0) {
      const odds = Math.round(finalAppsSub);
      const oddsText = odds <= 1 ? "1 in 1 (Guaranteed)" : `~1 in ${odds} allotment`;
      return (
        <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 gap-1">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">{label}</span>
          <div className="flex flex-wrap items-center sm:justify-end gap-1.5 text-right">
            <span className="font-mono font-bold text-slate-855 dark:text-white text-sm">
              {Number(finalAppsSub).toFixed(2)}×
            </span>
            <span className="text-xs text-slate-405 dark:text-slate-500 font-medium">(applications)</span>
            <span className="text-slate-300 dark:text-white/10 select-none hidden sm:inline">•</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{oddsText}</span>
          </div>
        </div>
      );
    } else {
      // Fallback: Pending status
      return (
        <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0 gap-1">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase">{label}</span>
          <div className="flex flex-wrap items-center sm:justify-end gap-2 text-right">
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 uppercase tracking-wider">
              Pending
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-550 font-medium italic">
              Allotment odds will be updated once application-wise data is available.
            </span>
          </div>
        </div>
      );
    }
  };

  const lines = [];

  // 1. Overall
  lines.push(renderCategoryLine("Overall", s.overall));

  // 2. QIB
  lines.push(renderCategoryLine("QIB", s.qib));

  // 3. NII
  const niiShares = s.hni || s.nii;
  lines.push(renderCategoryLine("NII", niiShares));

  // 4. Retail
  lines.push(renderCategoryLine("Retail", s.retail, s.retail_apps));

  if (!isSME) {
    // 5. sHNI
    lines.push(renderCategoryLine("sHNI", s.snii, s.shni_apps || s.snii_apps));

    // 6. bHNI
    lines.push(renderCategoryLine("bHNI", s.bnii, s.bhni_apps));
  }

  // 7. Employee (if applicable)
  if (s.employee !== undefined && s.employee !== null) {
    lines.push(renderCategoryLine("Employee", s.employee, s.employee_apps));
  }

  // 8. Shareholder (if applicable)
  if (s.shareholder !== undefined && s.shareholder !== null) {
    lines.push(renderCategoryLine("Shareholder", s.shareholder, s.shareholder_apps));
  }

  // 9. GMP (if available)
  if (ipo.gmp !== undefined && ipo.gmp !== null) {
    lines.push(
      <div key="GMP" className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
        <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase font-semibold">GMP</span>
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{rupee(ipo.gmp)}</span>
      </div>
    );
  }

  // 10. Estimated Listing Price (if available)
  const estListing = ipo.estListing || (ipo.priceMax && ipo.gmp != null ? ipo.priceMax + ipo.gmp : null);
  if (estListing !== undefined && estListing !== null) {
    lines.push(
      <div key="EstListing" className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/5 last:border-0">
        <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wide uppercase font-semibold">Estimated Listing Price</span>
        <span className="font-mono font-bold text-slate-850 dark:text-white text-sm">{rupee(estListing)}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/50 dark:bg-white/[0.015] rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-inner space-y-0.5 text-sm">
      {lines}
    </div>
  );
}

/* =====================================================================
   SUBSCRIPTIONS TAB
===================================================================== */
function SubscriptionsTab({ dark }) {
  const withSub = sortIposLogically(getLiveIPOS().filter((i) => i.sub));

  const statusBadge = {
    Open:     { bg: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)", color: "#10b981", border: dark ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(16,185,129,0.2)" },
    Closed:   { bg: dark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.08)", color: dark ? "#94a3b8" : "#64748b", border: dark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(148,163,184,0.15)" },
    Upcoming: { bg: dark ? "rgba(240,162,2,0.12)" : "rgba(240,162,2,0.08)",  color: "#d97706", border: dark ? "1px solid rgba(240,162,2,0.25)" : "1px solid rgba(240,162,2,0.2)" },
    Listed:   { bg: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)", color: BRAND.blue, border: dark ? "1px solid rgba(28,155,218,0.25)" : "1px solid rgba(28,155,218,0.2)" },
  };

  const getIpoDay = (ipo) => {
    if (ipo.status !== "Open" || !ipo.open) return null;
    const today = new Date();
    const d = (s) => new Date(s + "T00:00:00+05:30");
    const open = d(ipo.open);
    const diffTime = today - open;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
          IPO Subscriptions & Allotment Odds
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {withSub.map((ipo) => {
          const badge = statusBadge[ipo.status] || statusBadge.Closed;
          const ipoDay = getIpoDay(ipo);

          return (
            <div
              key={ipo.id}
              className="rounded-3xl p-5 hover:shadow-lg transition-all flex flex-col justify-between"
              style={{
                background: dark ? "#111827" : "#ffffff",
                border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)",
                boxShadow: dark ? "none" : "0 4px 12px rgba(0,0,0,0.03)"
              }}
            >
              <div>
                {/* Header row: logo + company name + badges */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyAvatar name={ipo.company} size={38} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-tight leading-snug text-slate-800 dark:text-white truncate">{ipo.company}</p>
                      <span
                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider mt-1 inline-block"
                        style={{
                          background: ipo.type === "Mainboard" ? "rgba(28,155,218,0.12)" : "rgba(139,92,246,0.12)",
                          color: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6"
                        }}
                      >
                        {ipo.type}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-xl border leading-none shrink-0"
                    style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}
                  >
                    {ipo.status}
                  </span>
                </div>

                {/* Sub-header subscription status */}
                <p className="text-xs font-semibold mb-4" style={{ color: dark ? "#94a3b8" : "#64748b" }}>
                  {ipo.status === "Open" ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Day {ipoDay || 1} Updates
                    </span>
                  ) : (
                    <span>Final Subscription Figures</span>
                  )}
                </p>

                {/* Premium List layout */}
                <SubscriptionDetailsList ipo={ipo} dark={dark} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



/* =====================================================================
   FINANCIALS TAB
===================================================================== */
function FinancialsTab({ dark }) {
  const withFin = getLiveIPOS().filter((i) => i.fin);

  const MetricBox = ({ label, value, isNA, span = 1 }) => (
    <div
      className={`rounded-xl p-3 flex flex-col justify-between min-h-[72px] ${span === 2 ? "col-span-2" : ""}`}
      style={{
        background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.05)"
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: dark ? "#64748b" : "#94a3b8" }}>{label}</span>
      <span
        className="text-sm font-bold font-mono mt-1"
        style={{ color: isNA ? (dark ? "#475569" : "#94a3b8") : (dark ? "#f1f5f9" : "#1e293b") }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
        Company Financial Metrics Grid
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {withFin.map((ipo) => {
          const f = ipo.fin;
          const roeVal = f.roe != null ? `${f.roe}%` : "-";
          const epsVal = f.eps != null ? `₹${f.eps}` : "-";
          const peVal  = f.pe  != null ? `${f.pe}x`  : "-";

          return (
            <div
              key={ipo.id}
              className="rounded-2xl p-4 hover:shadow-lg transition-all"
              style={{
                background: dark ? "#111827" : "#ffffff",
                border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)",
                boxShadow: dark ? "none" : "0 4px 12px rgba(0,0,0,0.03)"
              }}
            >
              {/* Company logo + name */}
              <div className="flex items-center gap-2.5 mb-4">
                <CompanyAvatar name={ipo.company} size={34} />
                <div>
                  <p className="text-sm font-bold tracking-tight leading-snug" style={{ color: dark ? "#ffffff" : "#1e293b" }}>{ipo.company}</p>
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider mt-0.5 inline-block"
                    style={{
                      background: ipo.type === "Mainboard" ? "rgba(28,155,218,0.12)" : "rgba(139,92,246,0.12)",
                      color: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6"
                    }}
                  >
                    {ipo.type}
                  </span>
                </div>
              </div>

              {/* Row 1: Revenue + PAT (equal halves) */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <MetricBox label="Revenue" value={cr(f.revenue)} />
                <MetricBox label="PAT"     value={cr(f.pat)} />
              </div>

              {/* Row 2: ROE + EPS + P/E */}
              <div className="grid grid-cols-3 gap-2">
                <MetricBox label="ROE" value={roeVal} isNA={f.roe == null} />
                <MetricBox label="EPS" value={epsVal} isNA={f.eps == null} />
                <MetricBox label="P/E" value={peVal}  isNA={f.pe == null} />
              </div>
            </div>
          );
        })}
      </div>
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
      {sortDocumentsLogically(getLiveIPOS()).map((ipo) => (
        <div key={ipo.id} className="flex items-center justify-between glass glass-hover rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CompanyAvatar name={ipo.company} size={30} />
            <div>
              <span className="text-sm text-slate-700 dark:text-slate-200 font-medium block leading-snug">{ipo.company}</span>
              <span
                className="text-[9px] font-bold uppercase px-1 py-0.5 rounded tracking-wider mt-0.5 inline-block"
                style={{
                  background: ipo.type === "Mainboard" ? "rgba(28,155,218,0.12)" : "rgba(139,92,246,0.12)",
                  color: ipo.type === "Mainboard" ? BRAND.blue : "#8b5cf6"
                }}
              >
                {ipo.type}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center justify-end">
            {(() => {
              const hasValidDrhp = !!ipo.drhp;
              const hasValidRhp = !!ipo.rhp;

              if (!hasValidDrhp && !hasValidRhp) {
                return (
                  <span className="text-xs text-slate-400 max-w-[220px] text-right leading-tight">
                    Official DRHP/RHP is currently unavailable.
                  </span>
                );
              }

              return (
                <>
                  {hasValidDrhp && (
                    <a href={ipo.drhp} target="_blank" rel="noreferrer" title={isPortalLink(ipo.drhp) ? "Search on Exchange DRHP Portal" : "Official DRHP"} className="text-xs glass-inset hover:bg-white hover:shadow-sm rounded-lg px-2.5 py-1.5 text-slate-600 font-medium">
                      {isPortalLink(ipo.drhp) ? "DRHP Portal ↗" : "DRHP ↗"}
                    </a>
                  )}
                  {hasValidRhp && (
                    <a href={ipo.rhp} target="_blank" rel="noreferrer" title={isPortalLink(ipo.rhp) ? "Search on Exchange RHP Portal" : "Official RHP"} className="text-xs glass-inset hover:bg-white hover:shadow-sm rounded-lg px-2.5 py-1.5 text-slate-600 font-medium">
                      {isPortalLink(ipo.rhp) ? "RHP Portal ↗" : "RHP ↗"}
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================
   WATCHLIST TAB
===================================================================== */
function WatchlistTab({ watchlist, onOpen, dark }) {
  const items = sortIposLogically(getLiveIPOS().filter((i) => watchlist.ids.includes(i.id)));
  if (!watchlist.ready) return <p className="text-sm text-slate-400">Loading watchlist…</p>;
  
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center -mx-5 -mt-5"
        style={{
          minHeight: "calc(100vh - 80px)",
          background: dark
            ? "radial-gradient(circle at 50% 40%, rgba(45,120,185,0.4) 0%, rgba(15,23,42,0) 60%)"
            : "radial-gradient(circle at 50% 40%, rgba(28,155,218,0.15) 0%, rgba(248,250,252,0) 65%)",
        }}
      >
        {/* Glowing bookmark icon */}
        <div className="relative mb-8 flex justify-center items-center">
          {/* Inner intense glow */}
          <div
            className="absolute"
            style={{
              width: "60px",
              height: "80px",
              background: dark ? "white" : "rgba(28,155,218,0.3)",
              filter: "blur(24px)",
              opacity: dark ? 0.8 : 0.6
            }}
          />
          {/* Outer soft blue glow */}
          <div
            className="absolute"
            style={{
              width: "120px",
              height: "120px",
              background: dark ? "rgba(100,180,255,0.4)" : "rgba(28,155,218,0.2)",
              filter: "blur(40px)"
            }}
          />
          <Bookmark
            size={88}
            fill={dark ? "white" : "#1c9bda"}
            stroke={dark ? "white" : "#1c9bda"}
            strokeWidth={1}
            className="relative z-10"
            style={{ filter: dark ? "drop-shadow(0px 10px 15px rgba(0,0,0,0.5))" : "drop-shadow(0px 8px 12px rgba(28,155,218,0.25))" }}
          />
        </div>

        <h3
          className="text-[28px] font-bold tracking-tight mb-3 relative z-10"
          style={{
            color: dark ? "#ffffff" : "#1e293b",
            textShadow: dark ? "0 2px 10px rgba(0,0,0,0.5)" : "none"
          }}
        >
          No IPOs saved yet.
        </h3>
        <p className="text-[15px] relative z-10" style={{ color: dark ? "#94a3b8" : "#475569" }}>
          Tap the bookmark icon on any IPO card to track it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={onOpen} watchlist={watchlist} dark={dark} />)}
    </div>
  );
}

/* =====================================================================
   DEMAT TAB
===================================================================== */
function DematTab({ dark }) {
  const brokers = [
    {
      name: "Upstox",
      logo: "Upstox",
      desc: "Best for IPOs, Fast Investing & Trading",
      bgColor: "bg-purple-600/10 dark:bg-purple-600/20 border-purple-500/30",
      textColor: "text-purple-600 dark:text-purple-400",
      accentColor: "#7c3aed",
      features: [
        "₹0 Brokerage on Mutual Funds & IPOs",
        "Quick UPI-based IPO Applications",
        "Free Demat Account Opening*",
        "Advanced TradingView Charts"
      ],
      link: "https://upstox.onelink.me/0H1s/65BZGJ"
    },
    {
      name: "Angel One",
      logo: "Angel One",
      desc: "India's Leading Full-Service Digital Broker",
      bgColor: "bg-blue-600/10 dark:bg-blue-600/20 border-blue-500/30",
      textColor: "text-blue-600 dark:text-blue-400",
      accentColor: "#1d4ed8",
      features: [
        "Free Demat Account Opening*",
        "Easy IPO Applications with UPI",
        "Research Tools & ARQ Prime Recommendations",
        "Investment in Stocks, IPOs & Mutual Funds"
      ],
      link: "https://angel-one.onelink.me/Wjgr/rto3bsne"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-white mb-2">
          Open a Free Demat Account
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Get ready to invest in IPOs. Choose from our handpicked, leading stockbrokers to start your investment journey today.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {brokers.map((broker) => (
          <div 
            key={broker.name}
            className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Logo / Header */}
              <div className="flex items-center gap-4 mb-4">
                <CompanyAvatar name={broker.name} size={56} />
                <div>
                  <h3 className="text-lg font-bold text-slate-850 dark:text-white leading-tight">{broker.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{broker.desc}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-white/5 my-4" />

              {/* Key Features */}
              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Key Benefits</p>
                <ul className="space-y-2">
                  {broker.features.map((feat) => (
                    <li key={feat} className="text-xs flex gap-2 text-slate-600 dark:text-slate-350">
                      <span className="text-emerald-500 font-bold">✓</span> {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA Button */}
            <a 
              href={broker.link} 
              target="_blank" 
              rel="noreferrer"
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition-all text-center"
              style={{ background: broker.accentColor }}
            >
              Open Free Account
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>

      <div className="text-center max-w-xl mx-auto mt-6">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
          *Disclaimer: Demat account opening fees, maintenance charges, and brokerage rates are subject to change based on each broker's respective terms, pricing schedules, and active promotional offers. Please read all scheme details carefully before opening an account.
        </p>
      </div>
    </div>
  );
}

/* =====================================================================
   STAT CARD
===================================================================== */
function StatCard({ icon: Icon, label, value, tint, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      className={`bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-200
        ${clickable ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-900 active:scale-95" : ""}`}
    >
      <div>
        <p className="text-3xl font-extrabold text-slate-850 dark:text-white font-mono tracking-tight leading-none">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold tracking-wide">{label}</p>
        {clickable && <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-1 tracking-wider uppercase">View all →</p>}
      </div>
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: tint }}>
        <Icon size={18} color="#ffffff" strokeWidth={2.2} />
      </div>
    </div>
  );
}

/* =====================================================================
   MAIN APP
===================================================================== */
// Single switch to turn the AI Assistant back on once Anthropic billing/
// credits are set up (or a different provider is wired in) — no other code
// needs to change, this just hides its nav entry and header shortcut.
const AI_ASSISTANT_ENABLED = false;

const NAV = [
  { id: "ai", label: "AI Assistant", icon: Sparkles },
  { id: "overview", label: "Overview", icon: Home },
  { id: "open", label: "Open IPOs", icon: CircleDollarSign },
  { id: "closed", label: "Closed IPOs", icon: Clock },
  { id: "upcoming", label: "Upcoming IPOs", icon: Calendar },
  { id: "listed", label: "Listed IPOs", icon: Building2 },
  { id: "gmp", label: "GMP Trends", icon: TrendingUp },
  { id: "subscriptions", label: "Subscriptions", icon: LayoutGrid },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "docs", label: "DRHP / RHP", icon: FileText },
  { id: "calculator", label: "IPO Calculator", icon: CalcIcon },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "demat", label: "Open Demat Account", icon: Landmark },
].filter((n) => n.id !== "ai" || AI_ASSISTANT_ENABLED);

export default function App() {
  const [tab, setTab] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("calmcapital-theme");
      if (saved !== null) return JSON.parse(saved);
    } catch { /* storage unavailable */ }
    return true; // default default
  });

  // Write theme changes to local storage
  useEffect(() => {
    try {
      localStorage.setItem("calmcapital-theme", JSON.stringify(dark));
    } catch { /* storage unavailable */ }
  }, [dark]);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0); // bumped hourly + on manual refresh to force re-derive live status/data
  const [dataUrl, setDataUrl] = useState("/live-data.json"); // same-origin file this repo's GitHub Action keeps updated — works automatically, no setup needed
  const [lastSync, setLastSync] = useState(null);
  const [syncOk, setSyncOk] = useState(null);
  const watchlist = useWatchlist();
  const notifHook = useNotifications(tick);

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

  // Initial sync + 30-min auto-refresh, exactly as requested.
  useEffect(() => {
    if (dataUrl) syncNow(dataUrl);
    const periodic = setInterval(() => { syncNow(); setTick((t) => t + 1); }, 30 * 60 * 1000);
    return () => clearInterval(periodic);
  }, [dataUrl, syncNow]);

  // Real-time ticking price simulation for listed IPOs
  useEffect(() => {
    // Populate baseline prices for any listed IPOs that have a currentPrice
    const initPrices = () => {
      const listed = getLiveIPOS().filter((i) => i.status === "Listed" && i.currentPrice);
      listed.forEach((i) => {
        if (!_realtimePrices[i.id]) {
          _realtimePrices[i.id] = {
            price: i.currentPrice,
            prevPrice: i.currentPrice,
            lastTick: null,
            tickTime: 0
          };
        }
      });
    };

    initPrices();

    const interval = setInterval(() => {
      initPrices(); // Ensure newly loaded live overlays also register baseline prices
      const listed = getLiveIPOS().filter((i) => i.status === "Listed" && i.currentPrice);
      if (listed.length === 0) return;

      // Select 1 to 2 random listed companies to update their prices
      const count = Math.floor(Math.random() * 2) + 1;
      let didChange = false;

      for (let j = 0; j < count; j++) {
        const item = listed[Math.floor(Math.random() * listed.length)];
        const data = _realtimePrices[item.id];
        if (!data) continue;

        // Fluctuates within [-0.25%, +0.25%] range
        const pct = (Math.random() * 0.5 - 0.25) / 100;
        const newPrice = Math.round((data.price * (1 + pct)) * 100) / 100;

        if (newPrice !== data.price && newPrice > 0) {
          _realtimePrices[item.id] = {
            price: newPrice,
            prevPrice: data.price,
            lastTick: newPrice > data.price ? "up" : "down",
            tickTime: Date.now()
          };
          didChange = true;
        }
      }

      if (didChange) {
        setTick((t) => t + 1);
      }
    }, 4500); // Ticks every 4.5 seconds

    return () => clearInterval(interval);
  }, []);

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

  const groupedFiltered = (status) => sortIposLogically(filtered.filter((i) => i.status === status));

  return (
    <div className={dark ? "dark" : ""}>
      <div className="h-screen flex overflow-hidden" style={{
        background: dark
          ? "radial-gradient(circle at 30% 50%, rgba(28,155,218,0.18), transparent 60%), radial-gradient(circle at 80% 20%, rgba(174,215,104,0.06), transparent 50%), #0a0d16"
          : "#f1f5f9",
        color: dark ? "#e2e8f0" : "#1e293b",
      }}>
        <style>{`
          .glass {
            background: ${dark ? "linear-gradient(180deg, rgba(22, 28, 42, 0.95), rgba(15, 20, 32, 0.95))" : "#ffffff"};
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};
            box-shadow: ${dark ? "0 12px 40px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)" : "0 10px 30px -10px rgba(148, 163, 184, 0.16), 0 1px 2px rgba(0,0,0,0.02)"};
            transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
          }
          .glass-inset {
            background: ${dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"};
            border: 1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
            transition: background 0.2s ease, border-color 0.2s ease;
          }
          .glass-hover:hover {
            box-shadow: ${dark ? "0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 16px 36px -12px rgba(148, 163, 184, 0.25)"};
            border-color: ${dark ? "rgba(28,155,218,0.3)" : "rgba(28,155,218,0.2)"};
            transform: translateY(-2px);
          }
          select { appearance: none; }
          * { scrollbar-width: thin; scrollbar-color: ${dark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"} transparent; }
          *::-webkit-scrollbar { width: 6px; height: 6px; }
          *::-webkit-scrollbar-thumb { background: ${dark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}; border-radius: 999px; }
          *::-webkit-scrollbar-thumb:hover { background: ${dark ? "rgba(255,255,255,0.2)" : "rgba(148,163,184,0.5)"}; }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .tab-enter { animation: fadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
          button, a { transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease; }
          button:active { transform: scale(0.97); }
          input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 3px ${dark ? "rgba(28,155,218,0.25)" : "rgba(28,155,218,0.12)"}; border-color: ${BRAND.blue} !important; }

          /* Dark-mode text contrast overrides */
          .dark .text-slate-800 { color: #f8fafc; }
          .dark .text-slate-700 { color: #f1f5f9; }
          .dark .text-slate-600 { color: #e2e8f0; }
          .dark .text-slate-500 { color: #cbd5e1; }
          .dark .text-slate-400 { color: #94a3b8; }
          .dark .text-slate-300 { color: #64748b; }
          .text-profit { color: #16a34a; }
          .dark .text-profit { color: #4ade80; font-weight: 600; }
          .text-loss { color: #dc2626; }
          .dark .text-loss { color: #f87171; font-weight: 600; }
          .dark .border-black\\/5 { border-color: rgba(255,255,255,0.06); }
          .dark .border-black\\/10 { border-color: rgba(255,255,255,0.1); }
          .dark .bg-white\\/70, .dark .bg-white\\/80, .dark .bg-white\\/5, .dark .bg-white\\/10 { background: rgba(255,255,255,0.04); }
          .dark .bg-white\\/95 { background: rgba(10,13,22,0.98); }
          .dark .border-white { border-color: rgba(255,255,255,0.08); }
          .dark .shadow-2xl { box-shadow: 0 25px 60px -15px rgba(0,0,0,0.85); }
          .dark .hover\\:bg-white:hover { background: rgba(255,255,255,0.06) !important; }
        `}</style>

        {/* SIDEBAR */}
        <aside className={`${sidebarOpen ? "w-60" : "w-0"} transition-all duration-300 overflow-hidden shrink-0 border-r`}
          style={{ 
            borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(219,234,254,0.8)",
            background: dark ? "#0a0d16" : "#f0f7ff"
          }}>
          <div className="w-60 p-4 flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-start justify-between mb-4 pt-1">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Calm Capital Logo" className="w-9 h-9 object-contain rounded-xl" />
                <div className="flex flex-col">
                  <p className="text-sm font-bold tracking-tight leading-tight" style={{ color: dark ? "#fff" : "#1e293b" }}>Calm Capital</p>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mt-0.5" style={{ color: dark ? "#94a3b8" : "#64748b" }}>Designed by Discipline</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-black/5 rounded-lg mt-0.5">
                <ChevronsLeft size={15} />
              </button>
            </div>

            <nav className="mt-4 space-y-0.5 flex-1 overflow-y-auto">
              {NAV.map((n) => {
                const isActive = tab === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setTab(n.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm relative transition-colors"
                    style={isActive
                      ? {
                          background: dark ? "rgba(28,155,218,0.12)" : "rgba(28,155,218,0.08)",
                          color: BRAND.blue,
                          fontWeight: 700,
                          borderLeft: `3px solid ${BRAND.blue}`,
                          paddingLeft: "9px",
                        }
                      : {
                          color: dark ? "#94a3b8" : "#475569",
                          fontWeight: 500,
                          paddingLeft: "12px",
                        }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(28,155,218,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <n.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                    {n.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* HEADER */}
          <header className="flex items-center gap-3 px-5 py-4 border-b sticky top-0 z-20 backdrop-blur-lg"
            style={{ 
              borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", 
              background: dark ? "rgba(10,13,22,0.8)" : "rgba(255,255,255,0.8)" 
            }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg mr-1">
                <Menu size={18} />
              </button>
            )}

            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for company IPOs..."
                className="w-full bg-white dark:bg-[#0e1320] border border-slate-200 dark:border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-sm outline-none shadow-sm focus:glow-blue placeholder:text-slate-400 text-slate-800 dark:text-slate-200" />
            </div>

            <div className="ml-auto flex items-center gap-2.5 relative">
              <div className="hidden sm:flex items-center">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 text-slate-600 dark:text-slate-300 shadow-sm cursor-default">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-semibold tracking-tight">Live Prices</span>
                </div>
              </div>

              <button onClick={refresh} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
              <NotificationBell hook={notifHook} onOpenIpo={(ipoId) => { const found = getLiveIPOS().find((i) => i.id === ipoId); if (found) setSelected(found); }} />
              <button onClick={() => setDark((d) => !d)} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-[#121625]/30 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 shadow-sm">
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-5 py-5 max-w-5xl w-full mx-auto">
            <div key={tab} className="tab-enter">
            {tab === "overview" && (
              <div className="space-y-5">
                {/* Page title */}
                <div>
                  <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                    Calm Capital - Institutional-Grade IPO Analysis
                  </h1>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard icon={ArrowUpRight} label="Open IPOs" value={counts.Open} tint={BRAND.blue} onClick={() => setTab("open")} />
                  <StatCard icon={Clock} label="Closed IPOs" value={counts.Closed} tint={BRAND.blue} onClick={() => setTab("closed")} />
                  <StatCard icon={Calendar} label="Upcoming" value={counts.Upcoming} tint={BRAND.blue} onClick={() => setTab("upcoming")} />
                  <StatCard icon={LayoutGrid} label="Listed" value={counts.Listed} tint={BRAND.blue} onClick={() => setTab("listed")} />
                </div>

                {/* IPO lists grouped by status */}
                {["Open", "Closed", "Upcoming", "Listed"].map((status) => groupedFiltered(status).length > 0 && (
                  <section key={status}>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {groupedFiltered(status).map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={setSelected} watchlist={watchlist} dark={dark} />)}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {["open", "closed", "upcoming"].includes(tab) && (
              <div>
                {groupedFiltered(tab[0].toUpperCase() + tab.slice(1)).length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedFiltered(tab[0].toUpperCase() + tab.slice(1)).map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={setSelected} watchlist={watchlist} dark={dark} />)}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                    <Calendar size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-slate-500 text-sm">
                      {tab === "upcoming"
                        ? "There are currently no upcoming IPOs. Please check back later."
                        : `There are currently no ${tab} IPOs.`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "listed" && (
              <div className="space-y-4">
                <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Listed IPOs</h1>
                {groupedFiltered("Listed").length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {groupedFiltered("Listed").map((ipo) => <IPOCard key={ipo.id} ipo={ipo} onOpen={setSelected} watchlist={watchlist} dark={dark} />)}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#161c28] border border-slate-150 dark:border-white/5 rounded-2xl p-12 text-center">
                    <Building2 size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-slate-500 text-sm">No listed IPOs found.</p>
                  </div>
                )}
              </div>
            )}

            {tab === "gmp" && <GMPTab tick={tick} />}
            {tab === "subscriptions" && <SubscriptionsTab dark={dark} />}
            {tab === "financials" && <FinancialsTab dark={dark} />}
            {tab === "docs" && <DocumentsTab />}
            {tab === "calculator" && <CalculatorTab />}
            {tab === "watchlist" && <WatchlistTab watchlist={watchlist} onOpen={setSelected} dark={dark} />}
            {tab === "demat" && <DematTab dark={dark} />}
            {AI_ASSISTANT_ENABLED && tab === "ai" && <div className="glass rounded-2xl p-5"><AssistantPane embedded tick={tick} /></div>}
            </div>
          </main>
        </div>
      </div>

      <IPODetail ipo={selected} onClose={() => setSelected(null)} watchlist={watchlist} dark={dark} />
    </div>
  );
}
