export interface TopicGroup {
  label: string;
  topics: string[];
}

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    label: "Equity Sectors",
    topics: [
      "Technology", "Semiconductors", "AI & Machine Learning", "Cloud Computing",
      "Cybersecurity", "Healthcare", "Pharmaceuticals & Biotech", "Financials & Banking",
      "Insurance", "Real Estate / REITs", "Energy", "Utilities", "Consumer Staples",
      "Consumer Discretionary", "Industrials", "Materials", "Telecoms",
      "Media & Entertainment", "Defence & Aerospace", "Clean Energy & ESG",
    ],
  },
  {
    label: "Foreign Exchange",
    topics: [
      "USD Index (DXY)", "EUR/USD", "GBP/USD", "USD/JPY", "USD/CNY", "AUD/USD",
      "USD/CHF", "EM FX", "Dollar Strength", "Currency Wars", "FX Volatility",
      "Carry Trade", "Capital Flows", "Current Account", "Trade Balance",
      "Purchasing Power Parity",
    ],
  },
  {
    label: "Commodities",
    topics: [
      "Brent Crude", "WTI Crude", "Natural Gas", "OPEC+ Production",
      "Oil Inventories (EIA)", "Energy Transition", "Coal", "Gold", "Silver",
      "Copper", "Iron Ore", "Aluminium", "Lithium", "Rare Earths",
      "Agricultural Commodities", "Wheat", "Corn", "Soybeans", "Soft Commodities",
      "Commodity Supercycle", "Supply Chain Disruptions",
    ],
  },
  {
    label: "Credit & Banking",
    topics: [
      "Bank Earnings", "Net Interest Margin", "Loan Growth", "Non-Performing Loans",
      "Bank Capital Ratios (CET1)", "Basel III/IV", "Deposit Flows", "Regional Banks",
      "Shadow Banking", "Private Credit", "Leveraged Loans", "CLOs", "Securitisation",
      "Distressed Debt", "Bankruptcy & Restructuring", "Credit Rating Actions",
      "Moody's / S&P / Fitch Downgrades",
    ],
  },
  {
    label: "Geopolitics & Macro Risk",
    topics: [
      "US-China Relations", "Taiwan Strait", "Russia-Ukraine", "Middle East Conflict",
      "NATO", "Sanctions & Export Controls", "Energy Security", "Food Security",
      "Deglobalisation", "Reshoring & Nearshoring", "Semiconductor Supply Chain",
      "Critical Minerals", "Belt and Road Initiative", "BRICS Expansion",
      "G7/G20 Summits", "UN Security Council",
    ],
  },
  {
    label: "Fiscal Policy & Government",
    topics: [
      "US Federal Budget", "Budget Deficit", "National Debt", "Debt-to-GDP",
      "Infrastructure Spending", "Fiscal Stimulus", "Tax Policy", "Corporate Tax",
      "Capital Gains Tax", "Austerity", "Government Shutdown",
      "Sovereign Credit Rating", "MMT", "Universal Basic Income",
    ],
  },
  {
    label: "Emerging Markets",
    topics: [
      "China Economy", "China Property Sector", "Evergrande",
      "China Tech Regulation", "India Growth", "Brazil Policy", "Turkey Inflation",
      "South Africa", "Indonesia", "Mexico Nearshoring", "EM Capital Flows",
      "EM Currency Crisis", "Dollarisation", "IMF Bailouts", "World Bank Lending",
      "Frontier Markets",
    ],
  },
  {
    label: "Private Markets",
    topics: [
      "Private Equity", "Venture Capital", "Private Credit", "Infrastructure Funds",
      "Real Assets", "Fund Raising Environment", "Dry Powder", "LBO Activity",
      "PE Exits & IPO Pipeline", "Secondaries Market", "Co-investments",
      "Family Offices", "Endowment Allocations",
    ],
  },
  {
    label: "Real Estate",
    topics: [
      "Commercial Real Estate", "Office Vacancy", "Retail Real Estate",
      "Industrial & Logistics", "Data Centres", "Residential Housing",
      "Mortgage Rates", "Housing Starts", "Case-Shiller Index", "REITs",
      "Property Developers",
    ],
  },
  {
    label: "Regulation & Policy",
    topics: [
      "SEC Regulation", "Dodd-Frank", "MiFID II", "Basel IV", "Bank Regulation",
      "Crypto Regulation", "Antitrust & Big Tech", "ESG Regulation", "SFDR",
      "Taxonomy Regulation", "Climate Disclosure",
    ],
  },
  {
    label: "ESG & Sustainability",
    topics: [
      "Net Zero Commitments", "Carbon Markets", "EU ETS", "Carbon Border Tax",
      "Climate Risk", "Physical Risk", "Transition Risk", "ESG Ratings",
      "Green Bonds", "Sustainability-Linked Bonds",
    ],
  },
];

// Flat list of all topics for backward compatibility
export const TOPIC_CHIPS = ["All News", ...TOPIC_GROUPS.flatMap((g) => g.topics)] as const;

export const MARKET_INSTRUMENTS: Record<string, { symbol: string; finnhubSymbol: string }> = {
  "US 10Y Yield": { symbol: "US10Y",  finnhubSymbol: "TLT" },
  "S&P 500":      { symbol: "SPX",    finnhubSymbol: "SPY" },
  "EUR/USD":      { symbol: "EURUSD", finnhubSymbol: "OANDA:EUR_USD" },
  "Gold":         { symbol: "XAU",    finnhubSymbol: "OANDA:XAU_USD" },
  "Brent Crude":  { symbol: "BRENT",  finnhubSymbol: "OANDA:BRENT_USD" },
  "DXY Index":    { symbol: "DXY",    finnhubSymbol: "OANDA:DXY" },
};

export const ENTITY_TYPE_COLORS: Record<string, string> = {
  focus: "#f59e0b",
  companies: "#60a5fa",
  people: "#a78bfa",
  policies: "#34d399",
  markets: "#fb923c",
  topics: "#e879f9",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  Bullish: "#00f5d4",
  Bearish: "#ff4d6d",
  Neutral: "#fb8500",
};

export const TOPIC_KEYWORDS: Record<string, string[]> = {
  // Equity Sectors
  Technology: ["technology", "tech", "software", "AAPL", "MSFT", "GOOG", "META"],
  Semiconductors: ["semiconductor", "chip", "NVDA", "AMD", "INTC", "TSM", "ASML", "wafer"],
  "AI & Machine Learning": ["AI", "artificial intelligence", "machine learning", "GPT", "LLM", "deep learning", "neural"],
  "Cloud Computing": ["cloud", "AWS", "Azure", "GCP", "SaaS", "IaaS", "PaaS"],
  Cybersecurity: ["cybersecurity", "cyber", "hack", "ransomware", "data breach", "PANW", "CRWD"],
  Healthcare: ["healthcare", "hospital", "pharma", "FDA", "drug", "clinical trial"],
  "Pharmaceuticals & Biotech": ["pharmaceutical", "biotech", "drug pipeline", "clinical", "FDA approval"],
  "Financials & Banking": ["bank", "financial", "JPM", "GS", "MS", "lending"],
  Insurance: ["insurance", "underwriting", "reinsurance", "premium", "actuarial"],
  "Real Estate / REITs": ["real estate", "REIT", "property", "housing"],
  Energy: ["energy", "oil", "gas", "crude", "OPEC", "brent", "renewable", "solar", "nuclear"],
  Utilities: ["utility", "power grid", "electricity", "water", "regulated"],
  "Consumer Staples": ["consumer staples", "grocery", "CPG", "P&G", "Unilever"],
  "Consumer Discretionary": ["consumer discretionary", "retail", "luxury", "AMZN", "TSLA"],
  Industrials: ["industrial", "manufacturing", "aerospace", "machinery"],
  Materials: ["materials", "chemicals", "steel", "mining", "commodity"],
  Telecoms: ["telecom", "5G", "broadband", "wireless", "T-Mobile", "Verizon"],
  "Media & Entertainment": ["media", "entertainment", "streaming", "Disney", "Netflix"],
  "Defence & Aerospace": ["defence", "defense", "military", "aerospace", "Lockheed", "Raytheon"],
  "Clean Energy & ESG": ["clean energy", "ESG", "renewable", "solar", "wind", "hydrogen"],

  // Foreign Exchange
  "USD Index (DXY)": ["DXY", "dollar index"],
  "EUR/USD": ["EUR/USD", "euro dollar"],
  "GBP/USD": ["GBP/USD", "cable", "pound dollar"],
  "USD/JPY": ["USD/JPY", "yen"],
  "USD/CNY": ["USD/CNY", "yuan", "renminbi"],
  "AUD/USD": ["AUD/USD", "aussie dollar"],
  "USD/CHF": ["USD/CHF", "swiss franc"],
  "EM FX": ["emerging market currency", "EM FX"],
  "Dollar Strength": ["dollar strength", "strong dollar", "greenback"],
  "Currency Wars": ["currency war", "competitive devaluation"],
  "FX Volatility": ["FX volatility", "forex volatility"],
  "Carry Trade": ["carry trade"],
  "Capital Flows": ["capital flows", "capital flight"],
  "Current Account": ["current account"],
  "Trade Balance": ["trade balance", "trade deficit", "trade surplus"],
  "Purchasing Power Parity": ["purchasing power parity", "PPP"],

  // Commodities
  "Brent Crude": ["brent", "brent crude"],
  "WTI Crude": ["WTI", "west texas"],
  "Natural Gas": ["natural gas", "LNG", "henry hub"],
  "OPEC+ Production": ["OPEC", "OPEC+", "oil production", "output cut"],
  "Oil Inventories (EIA)": ["EIA", "oil inventory", "crude stockpile"],
  "Energy Transition": ["energy transition", "green energy"],
  Coal: ["coal", "thermal coal"],
  Gold: ["gold", "XAU", "bullion"],
  Silver: ["silver", "XAG"],
  Copper: ["copper", "Dr. Copper"],
  "Iron Ore": ["iron ore"],
  Aluminium: ["aluminium", "aluminum"],
  Lithium: ["lithium", "lithium-ion"],
  "Rare Earths": ["rare earth", "neodymium", "cobalt"],
  "Agricultural Commodities": ["agricultural commodity", "crop", "harvest"],
  Wheat: ["wheat"],
  Corn: ["corn", "maize"],
  Soybeans: ["soybean", "soy"],
  "Soft Commodities": ["soft commodity", "sugar", "coffee", "cocoa", "cotton"],
  "Commodity Supercycle": ["commodity supercycle"],
  "Supply Chain Disruptions": ["supply chain", "logistics", "shipping", "port congestion"],

  // Credit & Banking
  "Bank Earnings": ["bank earnings", "bank results", "bank profit"],
  "Net Interest Margin": ["net interest margin", "NIM"],
  "Loan Growth": ["loan growth", "credit growth"],
  "Non-Performing Loans": ["non-performing loan", "NPL", "bad debt"],
  "Bank Capital Ratios (CET1)": ["CET1", "capital ratio", "tier 1"],
  "Basel III/IV": ["Basel III", "Basel IV", "Basel"],
  "Deposit Flows": ["deposit", "deposit flight", "bank run"],
  "Regional Banks": ["regional bank", "community bank"],
  "Shadow Banking": ["shadow banking", "non-bank lending"],
  "Private Credit": ["private credit", "direct lending"],
  "Leveraged Loans": ["leveraged loan", "leveraged finance"],
  CLOs: ["CLO", "collateralised loan"],
  Securitisation: ["securitisation", "securitization", "ABS", "MBS"],
  "Distressed Debt": ["distressed debt", "distressed"],
  "Bankruptcy & Restructuring": ["bankruptcy", "restructuring", "chapter 11"],
  "Credit Rating Actions": ["credit rating", "rating action", "downgrade", "upgrade"],
  "Moody's / S&P / Fitch Downgrades": ["Moody", "S&P", "Fitch", "downgrade"],

  // Geopolitics & Macro Risk
  "US-China Relations": ["US-China", "US China", "trade war", "decoupling"],
  "Taiwan Strait": ["Taiwan", "cross-strait"],
  "Russia-Ukraine": ["Russia", "Ukraine", "Kremlin", "Kyiv"],
  "Middle East Conflict": ["Middle East", "Israel", "Gaza", "Iran", "Houthi"],
  NATO: ["NATO", "alliance"],
  "Sanctions & Export Controls": ["sanctions", "export control", "embargo"],
  "Energy Security": ["energy security", "energy independence"],
  "Food Security": ["food security", "famine", "food crisis"],
  Deglobalisation: ["deglobalisation", "deglobalization", "protectionism"],
  "Reshoring & Nearshoring": ["reshoring", "nearshoring", "onshoring", "friend-shoring"],
  "Semiconductor Supply Chain": ["chip supply", "semiconductor supply", "fab"],
  "Critical Minerals": ["critical mineral", "strategic resource"],
  "Belt and Road Initiative": ["belt and road", "BRI"],
  "BRICS Expansion": ["BRICS", "BRICS+"],
  "G7/G20 Summits": ["G7", "G20", "summit"],
  "UN Security Council": ["UN Security Council", "UNSC"],

  // Fiscal Policy & Government
  "US Federal Budget": ["federal budget", "congressional budget"],
  "Budget Deficit": ["budget deficit", "fiscal deficit"],
  "National Debt": ["national debt", "government debt", "public debt"],
  "Debt-to-GDP": ["debt-to-GDP", "debt ratio"],
  "Infrastructure Spending": ["infrastructure", "infrastructure bill"],
  "Fiscal Stimulus": ["fiscal stimulus", "stimulus package", "spending bill"],
  "Tax Policy": ["tax policy", "tax reform"],
  "Corporate Tax": ["corporate tax", "corporation tax"],
  "Capital Gains Tax": ["capital gains tax", "CGT"],
  Austerity: ["austerity", "spending cuts"],
  "Government Shutdown": ["government shutdown", "shutdown"],
  "Sovereign Credit Rating": ["sovereign rating", "sovereign credit"],
  MMT: ["MMT", "modern monetary theory"],
  "Universal Basic Income": ["UBI", "universal basic income"],

  // Emerging Markets
  "China Economy": ["China economy", "China GDP", "Chinese economy"],
  "China Property Sector": ["China property", "Chinese real estate", "property crisis"],
  Evergrande: ["Evergrande", "Country Garden"],
  "China Tech Regulation": ["China tech", "Chinese tech crackdown", "Ant Group"],
  "India Growth": ["India growth", "Indian economy", "Modi"],
  "Brazil Policy": ["Brazil", "Lula", "Brazilian"],
  "Turkey Inflation": ["Turkey", "Turkish lira", "Erdogan"],
  "South Africa": ["South Africa", "rand", "Eskom"],
  Indonesia: ["Indonesia", "rupiah"],
  "Mexico Nearshoring": ["Mexico nearshoring", "Mexican economy"],
  "EM Capital Flows": ["EM capital", "emerging market flows"],
  "EM Currency Crisis": ["EM currency crisis", "emerging market crisis"],
  Dollarisation: ["dollarisation", "dollarization"],
  "IMF Bailouts": ["IMF bailout", "IMF program", "IMF loan"],
  "World Bank Lending": ["World Bank", "IBRD"],
  "Frontier Markets": ["frontier market", "frontier economy"],

  // Private Markets
  "Private Equity": ["private equity", "PE fund", "buyout"],
  "Venture Capital": ["venture capital", "VC", "startup funding"],
  "Infrastructure Funds": ["infrastructure fund"],
  "Real Assets": ["real assets"],
  "Fund Raising Environment": ["fundraising", "fund raising"],
  "Dry Powder": ["dry powder", "uncommitted capital"],
  "LBO Activity": ["LBO", "leveraged buyout"],
  "PE Exits & IPO Pipeline": ["PE exit", "IPO pipeline", "IPO"],
  "Secondaries Market": ["secondaries", "secondary market"],
  "Co-investments": ["co-investment", "coinvestment"],
  "Family Offices": ["family office"],
  "Endowment Allocations": ["endowment", "university fund"],

  // Real Estate
  "Commercial Real Estate": ["commercial real estate", "CRE"],
  "Office Vacancy": ["office vacancy", "office occupancy"],
  "Retail Real Estate": ["retail real estate", "mall", "shopping centre"],
  "Industrial & Logistics": ["logistics real estate", "warehouse", "industrial property"],
  "Data Centres": ["data centre", "data center", "colocation"],
  "Residential Housing": ["residential housing", "housing market"],
  "Mortgage Rates": ["mortgage rate", "mortgage"],
  "Housing Starts": ["housing starts", "building permits"],
  "Case-Shiller Index": ["Case-Shiller", "home price index"],
  REITs: ["REIT", "real estate investment trust"],
  "Property Developers": ["property developer", "homebuilder"],

  // Regulation & Policy
  "SEC Regulation": ["SEC", "securities regulation"],
  "Dodd-Frank": ["Dodd-Frank"],
  "MiFID II": ["MiFID", "MiFID II"],
  "Basel IV": ["Basel IV"],
  "Bank Regulation": ["bank regulation", "banking regulation"],
  "Crypto Regulation": ["crypto regulation", "digital asset regulation", "stablecoin"],
  "Antitrust & Big Tech": ["antitrust", "antitrust big tech", "monopoly"],
  "ESG Regulation": ["ESG regulation", "ESG disclosure"],
  SFDR: ["SFDR", "sustainable finance disclosure"],
  "Taxonomy Regulation": ["taxonomy regulation", "EU taxonomy"],
  "Climate Disclosure": ["climate disclosure", "TCFD", "ISSB"],

  // ESG & Sustainability
  "Net Zero Commitments": ["net zero", "carbon neutral", "climate pledge"],
  "Carbon Markets": ["carbon market", "carbon credit", "offset"],
  "EU ETS": ["EU ETS", "emissions trading"],
  "Carbon Border Tax": ["CBAM", "carbon border", "carbon tariff"],
  "Climate Risk": ["climate risk", "climate change"],
  "Physical Risk": ["physical risk", "extreme weather", "flood", "wildfire"],
  "Transition Risk": ["transition risk", "stranded asset"],
  "ESG Ratings": ["ESG rating", "MSCI ESG", "Sustainalytics"],
  "Green Bonds": ["green bond"],
  "Sustainability-Linked Bonds": ["sustainability-linked bond", "SLB"],

  // Legacy mappings kept for backward compat
  Tech: ["technology", "tech", "AI", "semiconductor", "chip", "software", "NVDA", "AAPL", "MSFT", "GOOG", "META"],
  Fed: ["federal reserve", "fed", "fomc", "powell", "rate", "monetary policy"],
  ECB: ["ecb", "european central bank", "lagarde", "eurozone"],
  Inflation: ["inflation", "CPI", "PPI", "consumer price", "deflation", "price"],
  Labor: ["labor", "employment", "jobs", "payroll", "unemployment", "wage", "NFP", "non-farm"],
  Crypto: ["crypto", "bitcoin", "ethereum", "BTC", "digital asset", "blockchain", "stablecoin"],
};

export const TRENDING_BLOCKLIST = new Set([
  // News wire services / media organizations
  "Reuters", "AP", "Bloomberg", "Financial Times", "Associated Press",
  "Wall Street Journal", "CNBC", "CNN", "BBC", "The Guardian",
  "Washington Post", "New York Times", "WSJ", "FT",
  // Overly generic geopolitical/macro terms
  "Geopolitics", "Global Markets", "Global Economy", "World Economy",
  "Financial Markets", "Stock Market", "Markets", "Economy", "Finance",
  "News", "Report", "Update", "Analysis",
]);

export const TIME_WINDOW_DAYS: Record<string, number> = {
  "7D": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 3650,
};
