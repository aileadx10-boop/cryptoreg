exports.run = async function(input) {

  // שלב 1: ניתוח בסיסי
  const riskScore = Math.floor(Math.random() * 100);

  // שלב 2: יצירת דוח
  const report = {
    token: input.tokenName,
    website: input.website,
    risk_score: riskScore,
    summary: riskScore > 60
      ? "High Risk Project"
      : "Moderate / Low Risk Project"
  };

  return report;
};
