const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const target = `    let moneyBlocked = 0;
    let todaysActions = 0;
    let totalOutstanding = 0;
    let approvedPending = 0;

    let delayPenaltyCount = 0;

    // Process Shipments
    shipments.forEach(s => {
        if(s.Shipment_Status === 'Delayed') {
            delayed++;
            delayPenaltyCount++;
        }
        if(s.Duty_Status === 'Pending') dutyPending++;
        if(s.Current_Stage === 'Dispatch Planned') readyForDelivery++;

        // Money Blocked Approximation

    let moneyBlocked = 0;

    // Calculate precise Money Blocked according to formula
    const costing = getBatchData("COSTING", null);

    shipments.forEach(s => {
        if(s.Shipment_Status !== 'Completed') {
            moneyBlocked += (Number(s.Invoice_Value) || 0);

            // Add pending expenses from COSTING
            const costData = costing.find(c => c.Job_No === s.Job_No);
            if(costData) {
                // If duty is pending, add to blocked
                if(s.Duty_Status === 'Pending') moneyBlocked += (Number(costData.Duty) || 0);

                // Add other pending expenses (assuming they are pending if shipment is active)
                moneyBlocked += (Number(costData.CHA_Chg) || 0) +
                                (Number(costData.Shipping) || 0) +
                                (Number(costData.Transport) || 0) +
                                (Number(costData.Other) || 0);
            }
        }
    });
    });`;

const replacement = `    let moneyBlocked = 0;
    let todaysActions = 0;
    let totalOutstanding = 0;
    let approvedPending = 0;

    let delayPenaltyCount = 0;

    // Pull COSTING data ONCE for precise "Other Expenses"
    const costing = getBatchData("COSTING", null);

    // Process Shipments
    shipments.forEach(s => {
        if(s.Shipment_Status === 'Delayed') {
            delayed++;
            delayPenaltyCount++;
        }
        if(s.Duty_Status === 'Pending') dutyPending++;
        if(s.Current_Stage === 'Dispatch Planned') readyForDelivery++;

        // Calculate precise Money Blocked according to formula
        if(s.Shipment_Status !== 'Completed') {
            moneyBlocked += (Number(s.Invoice_Value) || 0);

            // Add pending expenses from COSTING
            const costData = costing.find(c => c.Job_No === s.Job_No);
            if(costData) {
                // If duty is pending, add to blocked
                if(s.Duty_Status === 'Pending') moneyBlocked += (Number(costData.Duty) || 0);

                // Add other pending expenses
                moneyBlocked += (Number(costData.CHA_Chg) || 0) +
                                (Number(costData.Shipping) || 0) +
                                (Number(costData.Transport) || 0) +
                                (Number(costData.Other) || 0);
            }
        }
    });`;

code = code.replace(target, replacement);
fs.writeFileSync('Code.gs', code);
console.log('Fixed Money Blocked double loop logic.');
