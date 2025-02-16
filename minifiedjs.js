document.getElementById('file-input').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
        reader.onload = function (e) {
            const jsonData = JSON.parse(e.target.result);
            generateDashboard(jsonData);
            calculateXIRR(jsonData);

        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            generateDashboard(jsonData);
            calculateXIRR(jsonData);

        };
        reader.readAsArrayBuffer(file);
    }
});

function generateDashboard(data) {

    document.getElementById('total-profit').style.color = "#007bff"; // Blue
    document.getElementById('profit-percentage').style.color = "#8e44ad"; // Purple
    document.getElementById('total-profit').style.fontSize = "20px";
    document.getElementById('profit-percentage').style.fontSize = "20px";

    const funds = {};
    const sectorData = {};
    const invested = [];
    const currentValues = [];
    const profitLossPercent = [];
    let totalInvested = 0;
    let totalCurrent = 0;
    const stockPerformance = [];

    data.forEach(item => {
        const name = item['Fund/Equity name'];

        // Ensure values are strings before using replace
        let investedMoney = item['Invested Money'] || "0";
        let currentValue = item['Current Value'] || "0";

        if (typeof investedMoney !== "string") investedMoney = investedMoney.toString();
        if (typeof currentValue !== "string") currentValue = currentValue.toString();

        // Remove non-numeric characters and convert to float
        investedMoney = parseFloat(investedMoney.replace(/[^\d.-]/g, '')) || 0;
        currentValue = parseFloat(currentValue.replace(/[^\d.-]/g, '')) || 0;

        const sector = item['Sector'] || 'Uncategorized';

        if (!funds[name]) {
            funds[name] = { invested: 0, currentValue: 0 };
        }
        funds[name].invested += investedMoney;
        funds[name].currentValue += currentValue;

        sectorData[sector] = (sectorData[sector] || 0) + investedMoney;

        totalInvested += investedMoney;
        totalCurrent += currentValue;
    });

    const equityNames = Object.keys(funds);
    equityNames.forEach(name => {
        const investedAmt = funds[name].invested;
        const currentAmt = funds[name].currentValue;
        invested.push(investedAmt);
        currentValues.push(currentAmt);
        const profitLoss = ((currentAmt - Math.abs(investedAmt)) / Math.abs(investedAmt)) * 100;
        profitLossPercent.push(profitLoss);
        stockPerformance.push({ name, profitLoss });
    });


    // Portfolio Allocation Chart
    Plotly.newPlot('allocation-chart', [{
        values: invested,
        labels: equityNames,
        type: 'pie'
    }], {
        title: 'Portfolio Allocation',
        height: 600,
        layout: {
            legend: {
                orientation: 'h',
                x: 0.5,
                xanchor: 'center',
                y: -0.2,
                yanchor: 'top'
            }
        }
    });

    // Invested vs Current Value Chart
    Plotly.newPlot('invested-vs-current-chart', [{
        x: equityNames,
        y: invested,
        name: 'Invested Value',
        type: 'bar',
        text: invested.map(val => val.toFixed(2) + ' Lakhs'),
        textposition: 'outside',
    }, {
        x: equityNames,
        y: currentValues,
        name: 'Current Value',
        type: 'bar',
        text: currentValues.map(val => val.toFixed(2) + ' Lakhs'),
        textposition: 'outside',
    }], {
        title: 'Invested vs Current Value',
        barmode: 'group',
        height: 450
    });

    // Profit & Loss Percentage Chart
    Plotly.newPlot('profit-loss-percent-chart', [{
        x: equityNames,
        y: profitLossPercent,
        type: 'bar',
        text: profitLossPercent.map(val => val.toFixed(2) + '%'),
        textposition: 'outside',
    }], {
        title: 'Profit & Loss Percentage',
        height: 400
    });

    // Sector Allocation Chart
    Plotly.newPlot('sector-allocation-chart', [{
        values: Object.values(sectorData),
        labels: Object.keys(sectorData),
        type: 'pie',
        hoverinfo: 'label+percent+value',
        hovertemplate: '<b>%{label}</b><br>Investment: %{value}<br>Percent: %{percent:.2f}%<extra></extra>'
    }], {
        title: 'Sector Allocation',
        showlegend: true,
        height: 600
    });

    // Overall Invested vs Current Value and Profit Percentage Chart
    const totalInvestedInLakhs = totalInvested / 100000;
    const totalCurrentInLakhs = totalCurrent / 100000;
    const totalProfit = totalCurrent - totalInvested;
    const totalProfitInLakhs = totalProfit / 100000;
    const totalProfitPercentage = (totalProfit / totalInvested) * 100;

    Plotly.newPlot('overall-invested-vs-current-chart', [{
        x: ['Invested Value', 'Current Value'],
        y: [totalInvested, totalCurrent],
        type: 'bar',
        text: [
            `₹${totalInvested.toLocaleString('en-IN')}`,
            `₹${totalCurrent.toLocaleString('en-IN')}`
        ],
        textposition: 'outside',
        marker: { color: ['#92C5F9', '#4394E5'] }
    }], {
        title: 'Invested vs Current Value',
        height: 450
    });
    // Top 3 Losers Chart
    stockPerformance.sort((a, b) => a.profitLoss - b.profitLoss); // Sort by profitLoss
    const topLosers = stockPerformance.slice(0, 3);
    Plotly.newPlot('top-losers-chart', [{
        x: topLosers.map(item => item.name),
        y: topLosers.map(item => item.profitLoss),
        type: 'bar',
        text: topLosers.map(item => item.profitLoss.toFixed(2) + '%'),
        textposition: 'outside',
        marker: { color: '#FF6347' }
    }], {
        title: 'Top 3 Losers',
        height: 400
    });

    // Top 3 Performers Chart
    stockPerformance.sort((a, b) => b.profitLoss - a.profitLoss); // Sort by profitLoss descending
    const topPerformers = stockPerformance.slice(0, 3);
    Plotly.newPlot('top-performers-chart', [{
        x: topPerformers.map(item => item.name),
        y: topPerformers.map(item => item.profitLoss),
        type: 'bar',
        text: topPerformers.map(item => item.profitLoss.toFixed(2) + '%'),
        textposition: 'outside',
        marker: { color: '#4CAF50' }
    }], {
        title: 'Top 3 Performers',
        height: 400
    });


    // Positive Performance Stocks (Profit > 0)
    const positiveStocks = stockPerformance.filter(stock => stock.profitLoss > 0);
    Plotly.newPlot('positive-performance-chart', [{
        x: positiveStocks.map(item => item.name),
        y: positiveStocks.map(item => item.profitLoss),
        type: 'bar',
        text: positiveStocks.map(item => item.profitLoss.toFixed(2) + '%'),
        textposition: 'outside',
        marker: { color: '#4CAF50' }  // Green for positive performance
    }], {
        title: 'Positive Performance Stocks',
        height: 400
    });

    // Negative Performance Stocks (Profit < 0)
    const negativeStocks = stockPerformance.filter(stock => stock.profitLoss < 0);
    Plotly.newPlot('negative-performance-chart', [{
        x: negativeStocks.map(item => item.name),
        y: negativeStocks.map(item => item.profitLoss),
        type: 'bar',
        text: negativeStocks.map(item => item.profitLoss.toFixed(2) + '%'),
        textposition: 'outside',
        marker: { color: '#FF6347' }  // Red for negative performance
    }], {
        title: 'Negative Performance Stocks',
        height: 400
    });

    document.getElementById('total-profit').innerHTML = `<b>Total Profit: ₹${totalProfit.toLocaleString('en-IN')}</b>`;
    document.getElementById('profit-percentage').innerHTML = `<b>Profit Percentage: ${totalProfitPercentage.toFixed(2)}%</b>`;


    const monthlyInvestment = {};
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

data.forEach(item => {
    if (!item["Date"]) return; // Skip if Date is missing

    let investedMoney = item["Invested Money"] || "0";

    // Ensure it's a string before using .replace()
    if (typeof investedMoney !== "string") {
        investedMoney = investedMoney.toString();
    }

    // Remove non-numeric characters and convert to float
    investedMoney = parseFloat(investedMoney.replace(/[^\d.-]/g, "")) || 0;

    let date;
    try {
        if (typeof item["Date"] === "number") {
            // If the date is a number (Excel serial number), convert it
            date = new Date((item["Date"] - 25569) * 86400 * 1000); // Convert Excel serial date to JS date
        } else {
            date = new Date(item["Date"]);
        }

        if (isNaN(date.getTime())) throw new Error(); // Check for invalid dates
    } catch {
        console.warn("Skipping invalid date:", item["Date"]);
        return;
    }

    // Generate Month-Year key (format: "Jan 2024")
    const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    monthlyInvestment[monthYear] = (monthlyInvestment[monthYear] || 0) + investedMoney;
});

// Sort months correctly based on actual date values
const sortedMonths = Object.keys(monthlyInvestment).sort((a, b) => {
    const [monthA, yearA] = a.split(" ");
    const [monthB, yearB] = b.split(" ");
    return new Date(`${yearA}-${monthNames.indexOf(monthA) + 1}-01`) - new Date(`${yearB}-${monthNames.indexOf(monthB) + 1}-01`);
});

// Ensure all months are represented
const investments = sortedMonths.map(month => (monthlyInvestment[month] || 0) / 1000).map(val => val.toFixed(2));

// Plot the chart
Plotly.newPlot('monthly-investment-chart', [{
    x: sortedMonths,
    y: investments,
    type: 'bar',
    text: investments.map(val => val + 'K'),
    textposition: 'outside',
    marker: { color: '#2196F3' }
}], {
    title: 'Monthly Investment Trend (in Thousands)',
    height: 450,
    xaxis: { title: 'Month', type: 'category' },
    yaxis: { title: 'Investment (in K)' }
});


const yearlyInvestment = {};

// Extract and process yearly investment data
data.forEach(item => {
if (!item["Date"]) return;

let investedMoney = item["Invested Money"] || "0";

// Ensure it's a string before using .replace()
if (typeof investedMoney !== "string") {
investedMoney = investedMoney.toString();
}

// Remove non-numeric characters and convert to float
investedMoney = parseFloat(investedMoney.replace(/[^\d.-]/g, "")) || 0;

let date;
try {
if (typeof item["Date"] === "number") {
    // If the date is a number (Excel serial number), convert it
    date = new Date((item["Date"] - 25569) * 86400 * 1000);
} else {
    date = new Date(item["Date"]);
}

if (isNaN(date.getTime())) throw new Error();
} catch {
console.warn("Skipping invalid date:", item["Date"]);
return;
}

// Get the year from the date
const year = date.getFullYear();
yearlyInvestment[year] = (yearlyInvestment[year] || 0) + investedMoney;
});

// Sort years
const sortedYears = Object.keys(yearlyInvestment).sort((a, b) => a - b);
const yearlyInvestments = sortedYears.map(year => (yearlyInvestment[year] || 0) / 1000).map(val => val.toFixed(2));

// Create a new chart for yearly investment
Plotly.newPlot('yearly-investment-chart', [{
x: sortedYears,
y: yearlyInvestments,
type: 'bar',
text: yearlyInvestments.map(val => val + 'K'),
textposition: 'outside',
marker: { color: '#FF9800' } // Orange color
}], {
title: 'Yearly Investment Trend (in Thousands)',
height: 450,
xaxis: { title: 'Year', type: 'category' },
yaxis: { title: 'Investment (in K)' }
});

}

    
function calculateXIRR(data) {
const cashFlowsByStock = {};
const today = new Date();
const xirrResults = [];

data.forEach(record => {
const name = record["Fund/Equity name"];
const investedMoney = parseFloat(record["Invested Money"].replace('₹', '').replace(',', ''));
const purchaseDate = new Date(record["Date"]);
const purchasedUnits = parseFloat(record["Purchased Units"]);
const currentUnitPrice = parseFloat(record["Current Unit Price"].replace('₹', '').replace(',', ''));
const currentValue = purchasedUnits * currentUnitPrice;

if (!cashFlowsByStock[name]) cashFlowsByStock[name] = { cashFlows: [], totalInvested: 0, totalCurrentValue: 0 };

cashFlowsByStock[name].cashFlows.push({ amount: -investedMoney, date: purchaseDate });
cashFlowsByStock[name].totalInvested += investedMoney;
cashFlowsByStock[name].totalCurrentValue += currentValue;
});

for (const stockName in cashFlowsByStock) {
const { cashFlows, totalInvested, totalCurrentValue } = cashFlowsByStock[stockName];
cashFlows.push({ amount: totalCurrentValue, date: today });

const xirrValue = computeXIRR(cashFlows);
xirrResults.push({ stock: stockName, invested: totalInvested, currentValue: totalCurrentValue, xirr: xirrValue });

}

plotXIRRChart(xirrResults);
}

function computeXIRR(cashFlows) {
const guess = 0.1;
const maxIterations = 1000;
const tolerance = 1e-6;

function npv(rate) {
return cashFlows.reduce((sum, flow) => {
  const years = (flow.date - cashFlows[0].date) / (365 * 24 * 60 * 60 * 1000);
  return sum + flow.amount / Math.pow(1 + rate, years);
}, 0);
}

let rate = guess;
for (let i = 0; i < maxIterations; i++) {
const npvValue = npv(rate);
const derivative = (npv(rate + tolerance) - npvValue) / tolerance;

if (Math.abs(npvValue) < tolerance) {
  return rate * 100;
}

rate -= npvValue / derivative;
}

return rate * 100;
}

function plotXIRRChart(data) {
const stocks = data.map(d => d.stock);
const xirrValues = data.map(d => d.xirr);
const investedValues = data.map(d => d.invested);
const currentValues = data.map(d => d.currentValue);

const trace1 = {
x: stocks,
y: investedValues,
name: 'Invested Money',
type: 'bar'
};

const trace2 = {
x: stocks,
y: currentValues,
name: 'Current Value',
type: 'bar'
};

const trace3 = {
x: stocks,
y: xirrValues,
name: 'XIRR (%)',
type: 'scatter',
mode: 'lines+markers',
yaxis: 'y2'
};

const layout = {
title: 'XIRR, Invested, and Current Values for Stocks',
barmode: 'group',
yaxis: { title: 'Amount (₹)' },
yaxis2: {
  title: 'XIRR (%)',
  overlaying: 'y',
  side: 'right'
}
};

Plotly.newPlot('chartContainer', [trace1, trace2, trace3], layout);
}
