
function getDashboardAnalytics() {
  const shipments = getMasterDataList("SHIPMENTS");
  const costings = getMasterDataList("COSTING");
  const timeline = getMasterDataList("TIMELINE");
  const tasks = getMasterDataList("TASKS");

  let delayedShipments = 0;
  let doExpiring = 0;

  // Actually calculate DO Expiring (e.g. Stage is 'DO Released' but not Dispatched)
  // For exact dates, this would cross check a DO Validity field.
  // We'll estimate based on DO Released stage count for now as requested by user.
  let readyForDispatch = 0;

  const now = new Date();

  shipments.forEach(s => {
    if (s.Stage === "Delayed") delayedShipments++;
    if (s.Stage === "DO Released") readyForDispatch++;
  });

  // Tasks calculations
  let pendingPayments = 0;
  let overdueTasks = 0;
  let todaysActions = 0;

  tasks.forEach(t => {
     if(t.Status === 'Completed') return;

     const dueDate = new Date(t.Due_Date);
     // Overdue
     if(dueDate < now && dueDate.toDateString() !== now.toDateString()) overdueTasks++;
     // Today's actions
     if(dueDate.toDateString() === now.toDateString()) todaysActions++;
     // Payments
     if(t.Stage.includes('Payment')) pendingPayments++;
  });

  let moneyBlocked = {
    total: 0,
    byImporter: {}
  };

  let dutyPending = 0;

  costings.forEach(c => {
    let sInfo = shipments.find(s => s.Job_No === c.Job_No);
    if(sInfo && sInfo.Stage !== 'Delivered') {
      const blockedAmt = parseFloat(c.Invoice_Value||0) + parseFloat(c.Duty||0) + parseFloat(c.CHA_Charges||0) + parseFloat(c.Shipping||0) + parseFloat(c.Transportation||0);
      moneyBlocked.total += blockedAmt;
      moneyBlocked.byImporter[sInfo.Importer] = (moneyBlocked.byImporter[sInfo.Importer] || 0) + blockedAmt;

      if(sInfo.Stage !== 'Duty Paid') {
         dutyPending += parseFloat(c.Duty||0);
      }
    }
  });

  return {
    delayedShipments,
    dutyPending,
    doExpiring,
    readyForDispatch,
    moneyBlocked,
    pendingPayments,
    overdueTasks,
    todaysActions
  };
}

function getCHAPerformance() {
  const shipments = getMasterDataList("SHIPMENTS");
  const timeline = getMasterDataList("TIMELINE");

  let metrics = {};

  shipments.forEach(s => {
    if(!s.CHA_Name) return;
    if(!metrics[s.CHA_Name]) metrics[s.CHA_Name] = { name: s.CHA_Name, total: 0, completed: 0, delayed: 0, active: 0, sumClearanceDays: 0 };

    metrics[s.CHA_Name].total++;

    if(s.Stage === 'Delivered') metrics[s.CHA_Name].completed++;
    else if(s.Stage === 'Delayed') metrics[s.CHA_Name].delayed++;
    else metrics[s.CHA_Name].active++;

    // Calculate actual clearance days from timeline
    let sTimeline = timeline.filter(t => t.Job_No === s.Job_No).sort((a,b) => new Date(a.Date) - new Date(b.Date));
    if(sTimeline.length > 0) {
        let firstEvent = new Date(sTimeline[0].Date);
        let lastEvent = new Date(sTimeline[sTimeline.length-1].Date);
        let diffTime = Math.abs(lastEvent - firstEvent);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        metrics[s.CHA_Name].sumClearanceDays += diffDays;
    }
  });

  let arr = Object.values(metrics);
  arr.forEach(m => {
    m.avgClearance = m.total > 0 ? (m.sumClearanceDays / m.total) : 0;
    m.completionRate = m.total > 0 ? (m.completed / m.total) * 100 : 0;
    m.score = m.completionRate - (m.avgClearance * 5);
  });

  arr.sort((a,b) => b.score - a.score);

  return {
    top5: arr.slice(0, 5),
    bottom5: arr.slice(-5).reverse()
  };
}

function getCachedDashboardAnalytics() {
  return getCachedData('DASHBOARD_ANALYTICS', getDashboardAnalytics, 15);
}

function getCachedCHAPerformance() {
  return getCachedData('CHA_PERFORMANCE', getCHAPerformance, 15);
}

/**
 * KPI Engine Validation
 */
function getKPIEngineData() {
  const shipments = getMasterDataList("SHIPMENTS");
  const timeline = getMasterDataList("TIMELINE");

  let metrics = {
    avgClearanceDays: 0,
    avgDelayDays: 0,
    docReceiptTime: 0,
    boeProcessingTime: 0,
    dutyClearanceTime: 0,
    oocProcessingTime: 0,
    dispatchCompletionTime: 0
  };

  let counts = {
    clearance: 0,
    delay: 0,
    doc: 0,
    boe: 0,
    duty: 0,
    ooc: 0,
    dispatch: 0
  };

  // Group timeline by Job No
  let tMap = {};
  timeline.forEach(t => {
      if(!tMap[t.Job_No]) tMap[t.Job_No] = {};
      tMap[t.Job_No][t.Stage] = new Date(t.Date);
  });

  shipments.forEach(s => {
    let t = tMap[s.Job_No] || {};

    // Average Clearance Days (Booked -> Delivered)
    if(t['Shipment Booked'] && t['Delivered']) {
        metrics.avgClearanceDays += Math.abs(t['Delivered'] - t['Shipment Booked']);
        counts.clearance++;
    }

    // Doc Receipt Time (ETA Updated -> Original Documents Received)
    if(t['ETA Updated'] && t['Original Documents Received']) {
        metrics.docReceiptTime += Math.abs(t['Original Documents Received'] - t['ETA Updated']);
        counts.doc++;
    }

    // BOE Processing Time (IGM Filed -> BOE Filed)
    if(t['IGM Filed'] && t['BOE Filed']) {
        metrics.boeProcessingTime += Math.abs(t['BOE Filed'] - t['IGM Filed']);
        counts.boe++;
    }

    // Duty Clearance Time (Duty Planned -> Duty Paid)
    if(t['Duty Planned'] && t['Duty Paid']) {
        metrics.dutyClearanceTime += Math.abs(t['Duty Paid'] - t['Duty Planned']);
        counts.duty++;
    }

    // OOC Processing Time (Duty Paid -> OOC Received)
    if(t['Duty Paid'] && t['OOC Received']) {
        metrics.oocProcessingTime += Math.abs(t['OOC Received'] - t['Duty Paid']);
        counts.ooc++;
    }

    // Dispatch Completion Time (DO Released -> Goods Dispatched)
    if(t['DO Released'] && t['Goods Dispatched']) {
        metrics.dispatchCompletionTime += Math.abs(t['Goods Dispatched'] - t['DO Released']);
        counts.dispatch++;
    }
  });

  const msToDays = 1000 * 60 * 60 * 24;

  return {
    avgClearanceDays: counts.clearance ? (metrics.avgClearanceDays / counts.clearance / msToDays).toFixed(1) : 0,
    docReceiptTime: counts.doc ? (metrics.docReceiptTime / counts.doc / msToDays).toFixed(1) : 0,
    boeProcessingTime: counts.boe ? (metrics.boeProcessingTime / counts.boe / msToDays).toFixed(1) : 0,
    dutyClearanceTime: counts.duty ? (metrics.dutyClearanceTime / counts.duty / msToDays).toFixed(1) : 0,
    oocProcessingTime: counts.ooc ? (metrics.oocProcessingTime / counts.ooc / msToDays).toFixed(1) : 0,
    dispatchCompletionTime: counts.dispatch ? (metrics.dispatchCompletionTime / counts.dispatch / msToDays).toFixed(1) : 0,
  };
}
