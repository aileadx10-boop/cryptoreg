exports.run = async function (input) {
  let riskScore = 0;

  const tokenName = input.tokenName || "";
  const website = input.website || "";

  // Rule 1: Website must use HTTPS
  if (!website.startsWith("https://")) {
    riskScore += 30;
  }

  // Rule 2: Token name too short
  if (tokenName.length < 3) {
    riskScore += 20;
  }

  // Rule 3: Suspicious words in token name
  const suspiciousWords = ["guaranteed", "profit", "100x", "instant"];
  suspiciousWords.forEach((word) => {
    if (tokenName.toLowerCase().includes(word)) {
      riskScore += 25;
    }
  });

  // Rule 4: Fetch website content
  try {
    const response = await fetch(website);
    const html = await response.text();

    const websiteRedFlags = [
      "guaranteed returns",
      "double your money",
      "risk free",
      "limited time offer",
      "act now"
    ];

    websiteRedFlags.forEach((phrase) => {
      if (html.toLowerCase().includes(phrase)) {
        riskScore += 15;
      }
    });

  } catch (error) {
    // Website not reachable
    riskScore += 40;
  }

  if (riskScore > 100) riskScore = 100;

  let summary = "Low Risk";

  if (riskScore > 60) {
    summary = "High Risk Project";
  } else if (riskScore > 30) {
    summary = "Moderate Risk";
  }

  return {
    token: tokenName,
    website: website,
    risk_score: riskScore,
    summary: summary
  };
};
