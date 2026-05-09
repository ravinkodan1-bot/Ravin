const MASTER_SHEET_ID = "1oh5Nsb8wSjUtXov_8Hz_ifLOt1J1FYe-LN0ynjzIe3Q";

const SUBMISSION_SHEET_ID = "1n-7Lgd4_S4oUHWh_v4EV3OmHThB_mvR76qu28ToGD5k";



function doGet() {

  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle("Transit Entry Form")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');

}



function getMasterData() {

  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);



  // PARTIES

  const partySheet = ss.getSheetByName("Parties");

  const partyData = partySheet
    .getRange(2,1,partySheet.getLastRow()-1,2)
    .getValues();

  let parties = [];

  partyData.forEach(r => {

    if(r[0] && r[1]){

      parties.push({

        code : r[0].toString(),
        name : r[1].toString()

      });

    }

  });




  // BRANDS

  const brandSheet = ss.getSheetByName("Brands");

  const brandData = brandSheet
    .getRange(2,1,brandSheet.getLastRow()-1,2)
    .getValues();

  let brands = [];

  brandData.forEach(r => {

    if(r[0] && r[1]){

      brands.push({

        code : r[0].toString(),
        name : r[1].toString()

      });

    }

  });




  return {

    parties : parties,
    brands : brands

  };

}




function saveData(obj){

  try{

    const ss = SpreadsheetApp.openById(SUBMISSION_SHEET_ID);

    const sheet = ss.getSheetByName("Submissions");



    sheet.appendRow([

      new Date(),

      obj.fromParty,
      obj.fromPartyCode,

      obj.toParty,
      obj.toPartyCode,

      obj.qty,

      obj.brandName,
      obj.brandCode,

      obj.vehicleNo,

      obj.remarks

    ]);


    return "Success";

  }

  catch(err){

    return err.toString();

  }

}