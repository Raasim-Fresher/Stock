document.getElementById('file-input').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
        reader.onload = function (e) {
            const jsonData = JSON.parse(e.target.result);
            generateDashboard(jsonData);
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
        };
        reader.readAsArrayBuffer(file);
    }
});

function generateDashboard(data) {
    const funds = {};
    const sectorData = {};
    let totalInvested = 0;
    let totalCurrent = 0;
    const stockPerformance = [];

    data.forEach(item => {
        const name = item['Fund/Equity name'];
        let investedMoney = parseFloat((item['Invested Money'] || "0").replace(/[^\d.-]/g, '')) || 0;
        let currentValue = parseFloat((item['Current Value'] || "0").replace(/[^\d.-]/g, '')) || 0;
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
    const invested = equityNames.map(name => funds[name].invested);
    const currentValues = equityNames.map(name => funds[name].currentValue);
    const profitLossPercent = equityNames.map(name => ((funds[name].currentValue - Math.abs(funds[name].invested)) / Math.abs(funds[name].invested)) * 100);

    // Portfolio Allocation Chart
    Plotly.newPlot('allocation-chart', [{
        values: invested,
        labels: equityNames,
        type: 'pie'
    }], { title: 'Portfolio Allocation', height: 600 });

    // Invested vs Current Value Chart
    Plotly.newPlot('invested-vs-current-chart', [
        { x: equityNames, y: invested, name: 'Invested', type: 'bar' },
        { x: equityNames, y: currentValues, name: 'Current', type: 'bar' }
    ], { title: 'Invested vs Current Value', barmode: 'group', height: 450 });

    // Profit & Loss Percentage Chart
    Plotly.newPlot('profit-loss-percent-chart', [{
        x: equityNames,
        y: profitLossPercent,
        type: 'bar'
    }], { title: 'Profit & Loss Percentage', height: 400 });

    // Display profit summary
    const totalProfit = totalCurrent - totalInvested;
    const totalProfitPercentage = (totalProfit / totalInvested) * 100;
    document.getElementById('total-profit').innerHTML = `<b>Total Profit: ₹${totalProfit.toLocaleString('en-IN')}</b>`;
    document.getElementById('profit-percentage').innerHTML = `<b>Profit Percentage: ${totalProfitPercentage.toFixed(2)}%</b>`;
}
